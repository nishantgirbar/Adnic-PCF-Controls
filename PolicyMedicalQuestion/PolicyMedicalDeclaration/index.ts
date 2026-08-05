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
    private lastRequestedQuoteNumber = "";
    private documentRequestSequence = 0;
    private documentsLoading = false;

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
        const quoteNumber = this.getQuoteNumber();
        if (this.documentApiUrl && quoteNumber !== this.lastRequestedQuoteNumber) {
            void this.loadDocuments(quoteNumber);
        }
        this.render();
    }

    private render(): void {
        this.root.render(React.createElement(MedicalControlUI, {
            questions: this.questions, members: this.members, documents: this.documents,
            loading: this.documentsLoading,
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
            if (!baseUrl || !environmentName) {
                console.error("Document service configuration is missing.", {
                    hasBaseUrl: !!baseUrl,
                    hasEnvironmentName: !!environmentName
                });
                return;
            }
            this.documentApiUrl =
                `${baseUrl.trim().replace(/\/$/, "")}/${environmentName.trim().replace(/^\/|\/$/g, "")}` +
                "/document-service/api/v1/documents";
            await this.loadDocuments(this.getQuoteNumber());
        } catch (e) {
            console.error("Failed to load document service configuration", e);
        }
    }

    private getQuoteNumber(): string {
        const boundQuoteNumber = String(this.context.parameters.quoteNumber?.raw || "").trim();
        if (boundQuoteNumber) return boundQuoteNumber;

        try {
            const formContext = (window as any).Xrm?.Page;
            return String(
                formContext?.getAttribute("adnic_quotenumber")?.getValue() ||
                formContext?.getAttribute("adnic_name")?.getValue() ||
                ""
            ).trim();
        } catch (error) {
            console.warn("Unable to read quote number from the form.", error);
            return "";
        }
    }

    private async loadDocuments(requestedQuoteNumber?: string): Promise<void> {
        if (!this.documentApiUrl) {
            console.debug("Document service call is waiting for API configuration.");
            return;
        }

        const quoteNumber = String(requestedQuoteNumber || this.getQuoteNumber()).trim();
        if (!quoteNumber) {
            console.error(
                "Document service call skipped because quoteNumber is empty. " +
                "Bind the quoteNumber input or ensure adnic_quotenumber/adnic_name exists on the form."
            );
            this.documents = [];
            this.lastRequestedQuoteNumber = "";
            this.render();
            return;
        }

        if (quoteNumber === this.lastRequestedQuoteNumber && this.documentsLoading) return;

        this.lastRequestedQuoteNumber = quoteNumber;
        const requestSequence = ++this.documentRequestSequence;
        this.documentsLoading = true;
        this.render();

        try {
            const requestUrl =
                `${this.documentApiUrl}?referenceType=QUOTE&referenceId=${encodeURIComponent(quoteNumber)}`;
            console.info("[PolicyMedicalQuestion] Calling document service.", { requestUrl, quoteNumber });
            const response = await fetch(requestUrl);
            if (!response.ok) throw new Error(`Failed to load documents (${response.status})`);
            const result = await response.json();
            if (requestSequence !== this.documentRequestSequence) return;

            const responseDocuments = Array.isArray(result)
                ? result
                : Array.isArray(result?.documents)
                    ? result.documents
                    : Array.isArray(result?.data)
                        ? result.data
                        : [];
            this.documents = responseDocuments.map((document: any) => ({
                ...document,
                comment: String(document?.comment ?? document?.comments ?? document?.remarks ?? "")
            }));
            console.info("[PolicyMedicalQuestion] Document service response loaded.", {
                quoteNumber,
                documentCount: this.documents.length
            });
        } catch (e) {
            if (requestSequence !== this.documentRequestSequence) return;
            console.error("Failed to load medical member documents", e);
            this.documents = [];
        } finally {
            if (requestSequence === this.documentRequestSequence) {
                this.documentsLoading = false;
                this.render();
            }
        }
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
                .map((item: any, index: number) => ({ item, originalIndex: index }))
                .filter(({ item }) => item?.medicalDeclared === true ||
                    String(item?.medicalDeclared ?? "").trim().toLowerCase() === "true")
                .map(({ item, originalIndex }) => ({
                    id: String(item?.id ?? item?.memberId ?? originalIndex + 1),
                    serialNo: Number(item?.serialNo) || originalIndex + 1,
                    relation: String(item?.relation?.displayName ?? item?.relation?.code ?? item?.relation ?? ""),
                    gender: String(item?.gender ?? ""),
                    dob: String(item?.dateOfBirth ?? item?.dob ?? ""),
                    salary: String(item?.salaryType ?? item?.salary ?? ""),
                    visa: String(item?.visaLocation ?? item?.visa ?? ""),
                    category: String(item?.category ?? ""),
                    marital: String(item?.maritalStatus ?? item?.marital ?? ""),
                    comments: String(item?.comments ?? item?.comment ?? item?.remarks ?? "")
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
