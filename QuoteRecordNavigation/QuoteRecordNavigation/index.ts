/// <reference types="powerapps-component-framework" />

import { IInputs, IOutputs } from "./generated/ManifestTypes";

interface CodeValue {
    code?: unknown;
}

interface ApiMember {
    relation?: CodeValue;
    gender?: unknown;
    dateOfBirth?: unknown;
    salaryType?: unknown;
    visaLocation?: unknown;
    category?: unknown;
    maritalStatus?: unknown;
}

interface ApiCategory {
    categoryCode?: unknown;
}

interface ProductSelectionResponse {
    categories?: ApiCategory[];
}

interface ApiQuoteResponse {
    quoteNumber?: unknown;
    companyName?: unknown;
    contactPersonName?: unknown;
    email?: unknown;
    businessNature?: CodeValue;
    businessType?: unknown;
    cityState?: CodeValue;
    contactNumber?: unknown;
    country?: unknown;
    id?: unknown;
    lob?: unknown;
    location?: unknown;
    medicalQuestions?: unknown;
    medicalDeclaredMembers?: unknown;
    members?: ApiMember[];
    policyStartDate?: unknown;
    productSelectionResponse?: ProductSelectionResponse;
    sourceOfBusiness?: unknown;
    status?: unknown;
    totalMembers?: unknown;
    totalPremium?: unknown;
}

export class QuoteRecordNavigation implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private static readonly entityName = "adnic_quote";
    private static readonly formId = "093b4a5c-b226-f111-8341-70a8a522d03b";
    private container!: HTMLDivElement;
    private context!: ComponentFramework.Context<IInputs>;
    private lastRenderKey = "";
    private apiUrl = "";

    public init(
        context: ComponentFramework.Context<IInputs>,
        _notifyOutputChanged: () => void,
        _state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this.context = context;
        this.container = container;
        this.container.classList.add("adnic-record-navigation");
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this.context = context;

        const renderKey = [
            context.parameters.quoteNumber.raw ?? "",
            context.parameters.quoteId.raw ?? "",
            context.parameters.quoteIterationNumber.raw ?? "",
            context.mode.isControlDisabled ? "disabled" : "enabled"
        ].join("\u001f");

        if (renderKey === this.lastRenderKey) {
            return;
        }

        this.lastRenderKey = renderKey;
        this.render();
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
        this.container.replaceChildren();
    }

    private render(): void {
        this.container.replaceChildren();

        const currentQuoteNumber = String(
            this.context.parameters.quoteNumber.raw ?? ""
        ).trim();
        const quoteNumbers = this.generateQuoteNumbers(
            currentQuoteNumber,
            this.context.parameters.quoteIterationNumber.raw
        );

        if (quoteNumbers.length === 0) {
            const empty = document.createElement("span");
            empty.className = "adnic-record-navigation__empty";
            empty.textContent = "\u2014";
            this.container.appendChild(empty);
            return;
        }

        quoteNumbers.forEach((quoteNumber, index) => {
            if (quoteNumber === currentQuoteNumber) {
                const current = document.createElement("span");
                current.className = "adnic-record-navigation__current";
                current.textContent = quoteNumber;
                current.setAttribute("aria-current", "page");
                this.container.appendChild(current);
            } else {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "adnic-record-navigation__link";
                button.textContent = quoteNumber;
                button.title = `Open quote ${quoteNumber}`;
                button.disabled = this.context.mode.isControlDisabled;
                button.addEventListener("click", () => void this.openQuote(quoteNumber, button));
                this.container.appendChild(button);
            }

            if (index < quoteNumbers.length - 1) {
                const separator = document.createElement("span");
                separator.className = "adnic-record-navigation__separator";
                separator.textContent = " | ";
                separator.setAttribute("aria-hidden", "true");
                this.container.appendChild(separator);
            }
        });
    }

    private generateQuoteNumbers(
        currentQuoteNumber: string,
        rawIterationNumber: number | null
    ): string[] {
        if (!currentQuoteNumber) {
            return [];
        }

        const iterationNumber = Math.max(0, Math.trunc(rawIterationNumber ?? 0));

        if (iterationNumber === 0) {
            return [currentQuoteNumber];
        }

        const baseQuoteNumber = currentQuoteNumber.replace(/-\d+$/, "");
        return Array.from(
            { length: iterationNumber + 1 },
            (_value, index) => index === 0
                ? baseQuoteNumber
                : `${baseQuoteNumber}-${index}`
        );
    }

    private async openQuote(quoteNumber: string, button: HTMLButtonElement): Promise<void> {
        button.classList.remove("adnic-record-navigation__error");
        button.setAttribute("aria-busy", "true");
        button.disabled = true;

        try {
            const quoteId = await this.importQuote(quoteNumber);

            await this.context.navigation.openForm({
                entityName: QuoteRecordNavigation.entityName,
                entityId: quoteId,
                formId: QuoteRecordNavigation.formId,
                openInNewWindow: true
            });
        } catch (error) {
            button.classList.add("adnic-record-navigation__error");
            const message = error instanceof Error ? error.message : "The quote could not be opened.";
            await this.context.navigation.openAlertDialog({ text: message });
        } finally {
            button.removeAttribute("aria-busy");
            button.disabled = this.context.mode.isControlDisabled;
        }
    }

    private async importQuote(requestedQuoteNumber: string): Promise<string> {
          const quoteId = String(this.context.parameters.quoteId.raw ?? "").trim();

        if (!quoteId) {
            throw new Error(
                "Quote ID has not been populated on the Dataverse record. Please try again."
            );
        }

        const apiUrl = await this.getQuoteApiUrl();
        const url =
            `${apiUrl}/${encodeURIComponent(quoteId)}` +
            `?quoteNumber=${encodeURIComponent(requestedQuoteNumber)}`;
        const response = await fetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            throw new Error(
                `Quote API failed for "${requestedQuoteNumber}" (${response.status} ${response.statusText}).`
            );
        }

        const result = await response.json() as ApiQuoteResponse;
        const quoteNumber = this.stringValue(result.quoteNumber) || requestedQuoteNumber;
        const lob = this.nullableValue(result.lob);
        const categories = result.productSelectionResponse?.categories ?? [];
        const members = result.members ?? [];
        const categoryDetails = categories
            .map(category => this.nullableValue(category.categoryCode))
            .filter(categoryCode => categoryCode !== null);
        const memberList = members.map(member => ({
            relation: this.nullableValue(member.relation?.code),
            gender: member.gender === "M" ? "Male" : member.gender === "F" ? "Female" : member.gender,
            dateOfBirth: this.nullableValue(member.dateOfBirth),
            salaryType: this.nullableValue(member.salaryType),
            visaLocation: this.nullableValue(member.visaLocation),
            category: this.nullableValue(member.category),
            maritalStatus: this.nullableValue(member.maritalStatus)
        }));

        if (typeof lob === "string") {
            sessionStorage.setItem("selected_product", lob);
        }

        const entity: ComponentFramework.WebApi.Entity = {
            adnic_quotenumber: quoteNumber,
            adnic_companyname: this.nullableValue(result.companyName),
            adnic_contactpersonname: this.nullableValue(result.contactPersonName),
            adnic_email: this.nullableValue(result.email),
            adnic_hideandshow: true,
            adnic_businessnature: this.nullableValue(result.businessNature?.code),
            adnic_country: this.nullableValue(result.country),
            adnic_city: this.nullableValue(result.cityState?.code),
            adnic_location: this.nullableValue(result.location),
            adnic_contactnumber: this.nullableValue(result.contactNumber),
            adnic_quotetype: this.nullableValue(result.businessType),
            adnic_status: this.nullableValue(result.status),
            adnic_totalpremium: this.numberValue(result.totalPremium),
            adnic_totalmembers: this.stringValue(result.totalMembers) || null,
            adnic_adnic_quoteid: this.stringValue(result.id) || null,
            adnic_name: lob,
            adnic_policystart: this.nullableValue(result.policyStartDate),
            adnic_sourceofbusiness: this.nullableValue(result.sourceOfBusiness),
            adnic_uploadedcategories: JSON.stringify(categoryDetails),
            adnic_memberlistjson: JSON.stringify(memberList),
            adnic_medicaldeclarationjson: JSON.stringify({
                questions: result.medicalQuestions ?? [],
                medicalDeclaredMembers: result.medicalDeclaredMembers ?? []
            }),
            adnic_productdetailjson: JSON.stringify(this.convertProductResponse(categories))
        };
        const createResponse = await this.context.webAPI.createRecord(
            QuoteRecordNavigation.entityName,
            entity
        );

        return this.cleanGuid(createResponse.id);
    }
    
    private async getQuoteApiUrl(): Promise<string> {
        if (this.apiUrl) {
            return this.apiUrl;
        }

        const baseUrl = await this.getEnvironmentVariableValue("adnic_BaseServiceUrl");
        const environmentName = await this.getEnvironmentVariableValue("adnic_EnvironmentName");

        if (!baseUrl) {
            throw new Error(
                'Environment variable "adnic_BaseServiceUrl" is empty or was not found.'
            );
        }

        const urlParts = [
            baseUrl.replace(/\/+$/, ""),
            environmentName.replace(/^\/+|\/+$/g, ""),
            "quote-management/api/v1/sme-quotes"
        ].filter(Boolean);

        this.apiUrl = urlParts.join("/");
        return this.apiUrl;
    }

    private async getEnvironmentVariableValue(schemaName: string): Promise<string> {
        const escapedSchemaName = schemaName.replace(/'/g, "''");
        const definitionResult = await this.context.webAPI.retrieveMultipleRecords(
            "environmentvariabledefinition",
            `?$select=environmentvariabledefinitionid,defaultvalue` +
            `&$filter=schemaname eq '${escapedSchemaName}'&$top=1`
        );
        const definition = definitionResult.entities[0];

        if (!definition) {
            throw new Error(`Environment variable definition "${schemaName}" was not found.`);
        }

        const definitionId = definition.environmentvariabledefinitionid;

        if (typeof definitionId !== "string") {
            throw new Error(`Environment variable definition "${schemaName}" has no ID.`);
        }

        const valueResult = await this.context.webAPI.retrieveMultipleRecords(
            "environmentvariablevalue",
            `?$select=value&$filter=_environmentvariabledefinitionid_value eq ` +
            `'${this.cleanGuid(definitionId)}'&$top=1`
        );
        const currentValue = valueResult.entities[0]?.value;

        if (typeof currentValue === "string" && currentValue.trim()) {
            return currentValue.trim();
        }

        const defaultValue = definition.defaultvalue;
        return typeof defaultValue === "string" ? defaultValue.trim() : "";
    }

    private convertProductResponse(categories: ApiCategory[]): ApiCategory[] {
        return categories;
    }

    private nullableValue(value: unknown): ComponentFramework.WebApi.Entity[string] {
        return value === undefined ? null : value as ComponentFramework.WebApi.Entity[string];
    }

    private stringValue(value: unknown): string {
        if (typeof value === "string") {
            return value;
        }

        return value === null || value === undefined ? "" : String(value);
    }

    private numberValue(value: unknown): number | null {
        if (value === null || value === undefined || value === "") {
            return null;
        }

        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }

    private cleanGuid(value: string): string {
        return value.trim().replace(/[{}]/g, "");
    }
}
