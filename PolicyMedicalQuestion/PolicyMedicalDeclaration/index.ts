import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import * as ReactDOMClient from "react-dom/client";
import MedicalControlUI, { Member, MemberDocument, Question } from "./MedicalControlUI";

export class PolicyMedicalQuestionControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private root!: ReactDOMClient.Root;
    private notifyOutputChanged!: () => void;
    private outputData = "";
    private questions: Question[] = [];
    private members: Member[] = [];
    private error = "";
    private memberError = "";
    private lastMemberData = "";
    private context!: ComponentFramework.Context<IInputs>;
    private documents: MemberDocument[] = [];
    private documentApiUrl = "";
    private lastQuoteNumber = "";

    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void,
        _state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
        this.notifyOutputChanged = notifyOutputChanged;
        this.context = context;
        this.root = ReactDOMClient.createRoot(container);
        this.updateView(context);
        void this.loadDocumentApiUrl();
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this.context = context;
        const incomingJson = context.parameters.medicalJson.raw || "";
        if (incomingJson !== this.outputData) {
            this.outputData = incomingJson;
            this.readQuestions(incomingJson);
        }
        const incomingMemberData = context.parameters.memberData.raw || "";
        if (incomingMemberData !== this.lastMemberData) {
            this.lastMemberData = incomingMemberData;
            this.readMembers(incomingMemberData);
        }
        const quoteNumber = String(context.parameters.quoteNumber.raw || "");
        if (quoteNumber !== this.lastQuoteNumber) {
            this.lastQuoteNumber = quoteNumber;
            void this.loadDocuments();
        }
        this.render();
    }

    private render(): void {
        this.root.render(React.createElement(MedicalControlUI, {
            questions: this.questions, members: this.members, documents: this.documents, loading: false,
            error: [this.error, this.memberError].filter(Boolean).join(" "),
            onQuestionsChange: (questions: Question[]) => {
                this.questions = questions;
                this.setOutputFromQuestions();
                this.notifyOutputChanged();
                this.render();
            }
        }));
    }

    private async getEnvironmentVariableValue(schemaName: string): Promise<string> {
        const definitions = await this.context.webAPI.retrieveMultipleRecords(
            "environmentvariabledefinition",
            `?$select=environmentvariabledefinitionid&$filter=schemaname eq '${schemaName}'`
        );
        if (!definitions.entities.length) return "";
        const definitionId = definitions.entities[0].environmentvariabledefinitionid;
        const values = await this.context.webAPI.retrieveMultipleRecords(
            "environmentvariablevalue",
            `?$select=value&$filter=_environmentvariabledefinitionid_value eq '${definitionId}'`
        );
        return String(values.entities[0]?.value || "");
    }

    private async loadDocumentApiUrl(): Promise<void> {
        try {
            const [baseUrl, environmentName] = await Promise.all([
                this.getEnvironmentVariableValue("adnic_BaseServiceUrl"),
                this.getEnvironmentVariableValue("adnic_EnvironmentName")
            ]);
            if (!baseUrl || !environmentName) return;
            this.documentApiUrl = `${baseUrl.replace(/\/$/, "")}/${environmentName.replace(/^\//, "")}/document-service/api/v1/documents`;
            await this.loadDocuments();
        } catch (e) {
            console.error("Failed to load document service configuration", e);
        }
    }

    private async loadDocuments(): Promise<void> {
        if (!this.documentApiUrl || !this.lastQuoteNumber) {
            this.documents = [];
            this.render();
            return;
        }
        try {
            const response = await fetch(`${this.documentApiUrl}?referenceType=QUOTE&referenceId=${encodeURIComponent(this.lastQuoteNumber)}`);
            if (!response.ok) throw new Error(`Failed to load documents (${response.status})`);
            const result = await response.json();
            this.documents = Array.isArray(result) ? result : [];
        } catch (e) {
            console.error("Failed to load medical member documents", e);
            this.documents = [];
        }
        this.render();
    }

    private readMembers(json: string): void {
        this.memberError = "";
        this.members = [];
        if (!json.trim()) return;

        try {
            const parsed = JSON.parse(json);
            const value = parsed?.members?.members ?? parsed?.members ?? parsed;
            const items = Array.isArray(value)
                ? value
                : value && typeof value === "object" ? [value] : [];

            this.members = items
                .filter((item: any) => item?.medicalDeclared === true ||
                    String(item?.medicalDeclared ?? "").trim().toLowerCase() === "true")
                .map((item: any, index: number) => ({
                    id: String(item?.id ?? item?.memberId ?? index + 1),
                    serialNo: Number(item?.serialNo) || index + 1,
                    relation: String(item?.relation?.displayName ?? item?.relation?.code ?? item?.relation ?? ""),
                    gender: String(item?.gender ?? ""),
                    dob: String(item?.dateOfBirth ?? item?.dob ?? ""),
                    salary: String(item?.salaryType ?? item?.salary ?? ""),
                    visa: String(item?.visaLocation ?? item?.visa ?? ""),
                    category: String(item?.category ?? ""),
                    marital: String(item?.maritalStatus ?? item?.marital ?? "")
                }));
        } catch (error) {
            console.error("Policy member JSON is invalid.", error);
            this.memberError = "Member data field contains invalid JSON.";
        }
    }

    private setOutputFromQuestions(): void {
        this.outputData = JSON.stringify({
            medicalQuestions: {
                medicalQuestions: this.questions.length === 1
                    ? this.toJsonQuestion(this.questions[0])
                    : this.questions.map(q => this.toJsonQuestion(q))
            }
        });
    }

    private readQuestions(json: string): void {
        this.error = "";
        this.questions = [];
        if (!json.trim()) return;
        try {
            const parsed = JSON.parse(json);
            const value = parsed?.medicalQuestions?.medicalQuestions ?? parsed?.medicalQuestions;
            const items = Array.isArray(value) ? value : value && typeof value === "object" ? [value] : [];
            this.questions = items.map((item: any, index: number) => ({
                id: Number(item?.id) || index + 1,
                question: String(item?.question || ""),
                answer: item?.answer === true ||
                    String(item?.answer || "").trim().toLowerCase() === "yes" ||
                    String(item?.answer || "").trim().toLowerCase() === "true",
                category: String(item?.category || "")
            }));
        } catch (error) {
            console.error("Policy medical JSON is invalid.", error);
            this.error = "Medical JSON field contains invalid JSON.";
        }
    }

    private toJsonQuestion(question: Question): object {
        return {
            id: String(question.id), question: question.question,
            answer: question.answer ? "Yes" : "No", category: question.category
        };
    }

    public getOutputs(): IOutputs { return { medicalJson: this.outputData || "{}" }; }
    public destroy(): void { this.root.unmount(); }
}
