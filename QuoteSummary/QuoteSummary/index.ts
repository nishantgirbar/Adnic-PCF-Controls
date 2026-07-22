import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class QuoteSummaryPCF implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private container!: HTMLDivElement;
    private context!: ComponentFramework.Context<IInputs>;
    private symbolUrl = (window as any).Xrm?.Utility?.getGlobalContext?.().getClientUrl() + "/WebResources/adnic_dirham_symbol";
    private whiteSymbolUrl = (window as any).Xrm?.Utility?.getGlobalContext?.().getClientUrl() + "/WebResources/adnic_UAEDirham";

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {

        this.context = context;
        this.container = container;

        this.showLoader();
        this.loadData();
    }

    private showLoader(): void {

        this.container.innerHTML = `
            <div class="loader">
                Loading Summary...
            </div>
        `;
    }

    private apiUrl: string = "";
    private async getEnvironmentVariableValue(
        schemaName: string
    ): Promise<string> {

        try {

            // ✅ Get Environment Variable Definition
            const definitionResult =
                await this.context.webAPI.retrieveMultipleRecords(
                    "environmentvariabledefinition",
                    `?$select=environmentvariabledefinitionid,schemaname&$filter=schemaname eq '${schemaName}'`
                );

            console.log(
                "Definition Result:",
                definitionResult
            );

            if (definitionResult.entities.length === 0) {

                console.error(
                    "Environment Variable Definition not found"
                );

                return "";
            }

            const definitionId =
                definitionResult.entities[0]
                    .environmentvariabledefinitionid;

            console.log(
                "Definition Id:",
                definitionId
            );

            // ✅ Get Environment Variable Value
            const valueResult =
                await this.context.webAPI.retrieveMultipleRecords(
                    "environmentvariablevalue",
                    `?$select=value&$filter=_environmentvariabledefinitionid_value eq '${definitionId}'`
                );

            console.log(
                "Value Result:",
                valueResult
            );

            if (valueResult.entities.length > 0) {

                const value =
                    valueResult.entities[0].value || "";

                console.log(
                    "Environment Variable Value:",
                    value
                );

                return value;
            }

            console.error(
                "Environment Variable Value not found"
            );

        } catch (error) {

            console.error(
                "Environment Variable Error:",
                error
            );
        }

        return "";
    }

    private async loadData(): Promise<void> {

        try {

            const quoteId =
                this.context.parameters.quoterecordId.raw;

            const quoteNumber =
                this.context.parameters.quoteNumber.raw;

            if (!quoteId) {

                throw new Error(
                    "Quote ID missing"
                );
            }

            console.log(
                "Loading Quote Summary..."
            );

            // ✅ Build API URL from Environment Variables
            if (!this.apiUrl) {

                const baseUrl =
                    await this.getEnvironmentVariableValue(
                        "adnic_BaseServiceUrl"
                    );

                const environmentName =
                    await this.getEnvironmentVariableValue(
                        "adnic_EnvironmentName"
                    );

                const quoteApi = "quote-management/api/v1/sme-quotes";

                // ✅ Final API URL
                this.apiUrl =
                    `${baseUrl}${environmentName}/${quoteApi}`;

                console.log(
                    "Final API URL:",
                    this.apiUrl
                );
            }

            if (!this.apiUrl) {

                throw new Error(
                    "API URL is empty"
                );
            }

            // ✅ Final Quote API
            const finalUrl =
                `${this.apiUrl}/${quoteId}?quoteNumber=${quoteNumber}`;

            console.log(
                "Calling API:",
                finalUrl
            );

            const response =
                await fetch(finalUrl);

            if (!response.ok) {

                throw new Error(
                    "API failed"
                );
            }

            const apiData =
                await response.json();

            console.log(
                "API Response:",
                apiData
            );

            const data =
                this.mapApiToUI(apiData);

            console.log(
                "Mapped UI Data:",
                data
            );

            this.render(data);

        } catch (error) {

            console.error(
                "Load Data Error:",
                error
            );

            this.container.innerHTML = `
            <div class="loader error">
                Failed to load Quote Summary
            </div>
        `;
        }
    }

    private mapApiToUI(api: any): any {

        const members = Array.isArray(api.members)
            ? api.members
            : [];

        const policyStartDate = api.policyStartDate;
        const productType = this.getProductType(api);
        const isEbpProduct = productType === "EBP";
        const productDetails =
            this.parseProductDetailsJson(
                this.context.parameters.adnic_productdetails?.raw || ""
            );
        const useJsonProductDetails =
            productType === "EBP" &&
            productDetails.length > 0;

        const categories =
            useJsonProductDetails
                ? productDetails
                : api.productSelectionResponse?.categories || [];

        const categoryPremiums = Array.isArray(api.categoryPremiums)
            ? api.categoryPremiums
            : [];

        const customerEbpPlan = productType === "SME"
            ? this.getCustomerEbpPlan()
            : undefined;

        const plans: any[] = categories.map((cat: any) => {

            const categoryCode =
                this.getCategoryCode(cat);

            const planDetailsSource =
                productType === "SME" &&
                    this.isEbpCategory(categoryCode) &&
                    customerEbpPlan
                    ? customerEbpPlan
                    : cat;

            const benefits =
                planDetailsSource === customerEbpPlan
                    ? this.getBenefitsArray(customerEbpPlan)
                    : this.getDisplayBenefits(
                        planDetailsSource,
                        useJsonProductDetails
                    );

            const matchedCategoryMembers = members.filter(
                (m: any) =>
                    this.normalizeCategory(m.category) ===
                    this.normalizeCategory(categoryCode)
            );

            const categoryMembers =
                isEbpProduct &&
                    this.isEbpCategory(categoryCode)
                    ? this.getEbpMembers(members)
                    : matchedCategoryMembers;

            const categoryPremium =
                categoryPremiums.find(
                    (p: any) =>
                        this.normalizeCategory(p.categoryName) ===
                        this.normalizeCategory(cat.categoryCode)
                );

            const totalPremium = Number(
                categoryPremium?.currentPremium || 0
            );

            const showSingleMemberPremium =
                isEbpProduct ||
                this.normalizeCategory(
                    categoryPremium?.categoryName
                ) === "LSB";

            return {

                category: categoryCode,

                network:
                    productType === "SME" && this.isEbpCategory(categoryCode)
                        ? "ECare"
                        : this.getNetworkProvider(cat),



                networkType:
                    productType === "SME" && this.isEbpCategory(categoryCode)
                        ? "Basic EBP Plan"
                        : this.getNetworkType(cat),

                benefits:
                    this.mapBenefits(benefits),

                isEbp: this.isEbpCategory(categoryCode),

                totalMembers:
                    categoryMembers.length,

                memberBreakdown:
                    showSingleMemberPremium
                        ? this.getMemberPremiums(
                            categoryMembers,
                            true
                        )
                        : this.getMemberBreakdown(
                            categoryMembers,
                            policyStartDate,
                            productType
                        ),

                memberBreakdownLabel:
                    showSingleMemberPremium
                        ? "Member Premium"
                        : "Member Breakdown",

                totalPremium:
                    this.formatCurrency(
                        totalPremium
                    )
            };
        });

        const ebpPremium = categoryPremiums.find(
            (p: any) =>
                this.isEbpCategory(p.categoryName)
        );

        const ebpMembers = this.getEbpMembers(members);

        const hasEbpCategory =
            categories.some((cat: any) =>
                this.isEbpCategory(this.getCategoryCode(cat))
            ) ||
            categoryPremiums.some((p: any) =>
                this.isEbpCategory(p.categoryName)
            ) ||
            members.some((m: any) =>
                this.isEbpCategory(m.category)
            );

        const hasMappedEbpPlan = plans.some((plan: any) =>
            this.isEbpCategory(plan.category)
        );

        if (!hasMappedEbpPlan &&
            (ebpPremium || ebpMembers.length || hasEbpCategory)) {

            const ebpCategorySource =
                (productType === "SME" ? customerEbpPlan : undefined) ||
                this.getEbpCategorySource(categories);

            plans.push({
                category: "EBP",
                network: productType === "SME"
                    ? "ECare"
                    : this.getNetworkProvider(ebpCategorySource),
                networkType:
                    productType === "SME"
                        ? "Basic EBP Plan"
                        : this.getNetworkType(ebpCategorySource),
                benefits: this.mapBenefits(
                    this.getBenefitsArray(ebpCategorySource)
                ),
                isEbp: true,
                totalMembers: ebpMembers.length,
                memberBreakdown: this.getMemberPremiums(
                    ebpMembers,
                    isEbpProduct ||
                    this.normalizeCategory(
                        ebpPremium?.categoryName
                    ) === "LSB"
                ),
                memberBreakdownLabel: "Member Premium",
                totalPremium: this.formatCurrency(
                    Number(ebpPremium?.currentPremium || 0)
                )
            });
        }

        return {
            productType: productType,
            quoteNumber:
                api.quoteNumber || "-",

            quotation: {

                clientName:
                    api.companyName || "-",

                contact:
                    api.contactNumber || "-",

                email:
                    api.email || "-",

                company:
                    api.companyName || "-",

                startDate:
                    this.formatDate(
                        api.policyStartDate
                    ),

                endDate:
                    this.formatDate(
                        api.policyEndDate
                    ),

                issuedDate:
                    this.formatDate(
                        api.createdAt
                    )
            },

            plans,

            grandTotal:
                this.formatCurrency(
                    Number(
                        api.currentTotalPremium || 0
                    )
                )
        };
    }

    private normalizeCategory(value: any): string {

        return String(value || "")
            .trim()
            .toUpperCase()
            .replace(/^CAT-/, "");
    }

    private getCategoryCode(category: any): string {

        return String(
            category?.categoryCode ||
            category?.categoryName ||
            category?.category ||
            "-"
        );
    }

    private isEbpCategory(value: any): boolean {

        const category = this.normalizeCategory(value);

        return category === "EBP" || category === "LSB";
    }

    private getEbpMembers(members: any[]): any[] {

        return members.filter((member: any) =>
            this.isEbpCategory(member.category) ||
            String(member.salaryType || "").trim().toUpperCase() === "LSB" ||
            String(member.visaLocation || "").trim().toUpperCase() === "LSB"
        );
    }

    private getEbpCategorySource(categories: any[]): any {

        return categories.find((cat: any) =>
            this.isEbpCategory(this.getCategoryCode(cat))
        ) ||
            categories.find((cat: any) =>
                this.getBenefitsArray(cat).length
            );
    }

    private getCustomerEbpPlan(): any {

        return {
            benefits: [
                {
                    name: "Consultation",
                    value: "20% Coinsurance"
                },
                {
                    name: "Copay on Lab/Diagnostic",
                    value: "20% Copay for All OP Services"
                },
                {
                    name: "Pharmacy Co-pay",
                    value: "30% Copay for Medication"
                },
                {
                    name: "Pharmacy Limit",
                    value: "Maximum AED 2,500"
                },
                {
                    name: "Co-Pay on all IP Services",
                    value: "20% Copay for IP Services"
                }
            ]
        };
    }

    private getNetworkProvider(category: any): string {

        return String(
            category?.productSelection?.networkProviderName ||
            category?.networkProvider?.name ||
            category?.networkProviderName ||
            category?.networkProvider ||
            "-"
        );
    }

    private getNetworkType(category: any): string {

        return String(
            category?.productSelection?.networkTypeName ||
            category?.network?.name ||
            category?.networkTypeName ||
            category?.networkType ||
            category?.plan ||
            "-"
        );
    }

    private parseProductDetailsJson(raw: string): any[] {

        if (!raw) {
            return [];
        }

        try {

            const parsed =
                JSON.parse(raw);

            if (Array.isArray(parsed)) {
                return parsed;
            }

            if (Array.isArray(parsed?.categories)) {
                return parsed.categories;
            }
        }
        catch (error) {
            console.warn(
                "Unable to parse product details JSON",
                error
            );
        }

        return [];
    }

    private getBenefitsArray(category: any): any[] {

        if (Array.isArray(category?.benefits)) {
            return category.benefits;
        }

        if (Array.isArray(category?.benefits?.benefits)) {
            return category.benefits.benefits;
        }

        if (Array.isArray(category?.details)) {
            return category.details;
        }

        if (Array.isArray(category?.planDetails)) {
            return category.planDetails;
        }

        return [];
    }

    private getDisplayBenefits(
        category: any,
        fromProductDetailsJson: boolean
    ): any[] {

        const benefits =
            this.getBenefitsArray(category);

        if (!fromProductDetailsJson) {
            return benefits;
        }

        const topLevelBenefits = [
            {
                name: "Plan",
                value:
                    category?.plan ||
                    category?.network?.name
            },
            {
                name: "Annual Limit",
                value:
                    category?.annualLimit
            },
            {
                name: "Territorial Coverage",
                value:
                    category?.territorialCoverage
            }
        ].filter((benefit: any) =>
            benefit.value !== undefined &&
            benefit.value !== null &&
            benefit.value !== ""
        );

        return [
            ...topLevelBenefits,
            ...benefits
        ];
    }

    private mapBenefits(benefits: any[]): Array<{
        name: string;
        value: string;
    }> {

        return benefits.map((benefit: any) => ({
            name: String(
                benefit.benefitName ||
                benefit.name ||
                "-"
            ),
            value: String(
                benefit.benefitValue ||
                benefit.value ||
                "-"
            ).replace(/\bAED\b/gi, this.getDirhamSymbol())
        }));
    }

    private getProductType(api: any): string {

        const configuredProductType =
            this.context.parameters.adnic_name?.raw;

        const productType = String(
            configuredProductType ||
            api.productType ||
            api.productCode ||
            api.productName ||
            api.productSelectionResponse?.productType ||
            ""
        )
            .trim()
            .toUpperCase();

        if (productType) {
            return productType;
        }

        const hasEbpCategory = [
            ...(api.productSelectionResponse?.categories || []),
            ...(api.categoryPremiums || []),
            ...(api.members || [])
        ].some((item: any) =>
            this.isEbpCategory(
                item.categoryCode ||
                item.categoryName ||
                item.category
            )
        );

        // The quote-summary endpoint is SME by default; legacy EBP responses
        // are identified from their EBP/LSB category when no product is sent.
        return hasEbpCategory ? "EBP" : "SME";
    }

  private getPlanDisplayLabel(category: string): string {

    const normalized = this.normalizeCategory(category);

    if (normalized === "EBP" || normalized === "LSB") {
        return "Category EBP";
    }

    return `Category ${normalized}`;
}

    private getMemberBreakdown(
        members: any[],
        policyStartDate: string | undefined,
        productType: string
    ): string[] {

        const employeeMembers = (members || []);
            
            /*
            .filter((member: any) =>
                this.isEmployee(member)
            );
            */

        if (!employeeMembers.length) {
            return [];
        }

        const groups: Record<string, {
            count: number;
            premium: number;
        }> = {};

        employeeMembers.forEach((m: any) => {

            const age =
                this.calculateAge(
                    m.dateOfBirth,
                    policyStartDate
                );

            const ageBand =
                this.getAgeBand(age, productType);

            const gender =
                m.gender === "M"
                    ? "M"
                    : m.gender === "F"
                        ? "F"
                        : "U";

              const employeeType =
                 this.isEmployee(m)
                    ? "E ONLY"
                    : "D ONLY";

            const maritalStatus =
                m.maritalStatus ||
                m.maritalStatusName ||
                "UNKNOWN";

            const emirate =
                m.visaLocation ||
                m.emirate ||
                m.city ||
                "N/A";

            const category =
                m.category || " ";

            const premium =
                Number(
                    m.premium?.finalPremium ||
                    m.premiumAmount ||
                    m.premium ||
                    0
                );

            const key =
                `Age ${ageBand} (${gender}) [${emirate} ${employeeType}] [${category}] ${maritalStatus}`;

            if (!groups[key]) {

                groups[key] = {
                    count: 0,
                    premium: 0
                };
            }

            groups[key].count += 1;
            groups[key].premium += premium;
        });

        return Object.keys(groups).map(key => {

            const group = groups[key];

            return `${key} × ${group.count} ${this.getDirhamSymbol()}${group.premium.toLocaleString(
                "en-US",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            )}`;
        });
    }

    private getAgeBand(age: number, productType: string): string {

        if (productType === "SME") {
            if (age <= 17) return "0-17";
            if (age <= 24) return "18-24";
            if (age <= 29) return "25-29";
            if (age <= 34) return "30-34";
            if (age <= 39) return "35-39";
            if (age <= 44) return "40-44";
            if (age <= 49) return "45-49";
            if (age <= 54) return "50-54";
            if (age <= 59) return "55-59";
            if (age <= 64) return "60-64";
            return "65+";
        }

        if (productType === "DIFC") {
            if (age <= 17) return "0-17";
            if (age <= 35) return "18-35";
            if (age <= 45) return "36-45";
            if (age <= 54) return "46-54";
            if (age <= 65) return "55-65";
            return "65+";
        }

        const start = Math.floor(age / 5) * 5;
        return `${start}-${start + 4}`;
    }

    private getMemberPremiums(
        members: any[],
        showOnlyOnce: boolean
    ): string[] {

        const employees = (members || []).filter((member: any) =>
            this.isEmployee(member)
        );

        const membersToDisplay = showOnlyOnce
            ? employees.slice(0, 1)
            : employees;

        return membersToDisplay.map((member: any) => {
            const premium = Number(
                member.premium?.finalPremium ||
                member.premiumAmount ||
                member.premium ||
                0
            );

            return this.formatCurrency(premium);
        });
    }

    private isEmployee(member: any): boolean {

        const relation =
            member?.relation?.code ||
            member?.relation?.name ||
            member?.relation?.display ||
            member?.relation ||
            member?.relationship?.code ||
            member?.relationship ||
            member?.relationCode ||
            "";

        return String(relation)
            .trim()
            .toUpperCase() === "EMPLOYEE";
    }

    private calculateAge(
        dateOfBirth: string,
        policyStartDate?: string
    ): number {

        const dob =
            new Date(dateOfBirth);

        if (isNaN(dob.getTime())) {
            return 0;
        }

        const referenceDate = policyStartDate
            ? new Date(policyStartDate)
            : new Date();

        if (isNaN(referenceDate.getTime())) {
            return 0;
        }

        const diff =
            referenceDate.getTime() - dob.getTime();

        const ageDate =
            new Date(diff);

        return Math.abs(
            ageDate.getUTCFullYear() - 1970
        );
    }

    private formatDate(
        dateStr: string
    ): string {

        if (!dateStr) {
            return "-";
        }

        const date =
            new Date(dateStr);

        if (isNaN(date.getTime())) {
            return "-";
        }

        return date.toLocaleDateString(
            "en-GB",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );
    }

    private formatCurrency(
        value: number
    ): string {

        return `${this.getDirhamSymbol()} ${value.toLocaleString(
            undefined,
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        )}`;
    }

    private getDirhamSymbol(): string {

        return `<img src="${this.symbolUrl}" alt="Dirham" class="currency-symbol" />`;
    }

    //whiteSymbolUrl
    private getDirhamWhiteSymbol(): string {

        return `<img src="${this.whiteSymbolUrl}" alt="Dirham" class="currency-symbol" />`;
    }

    private render(data: any): void {

        this.container.innerHTML = `

        <div class="quote-wrapper">

            <div class="title">
                Quote Summary Page
            </div>

            <div class="subtitle">
                Quote #
                <span class="quote-number">
                    ${data.quoteNumber}
                </span>
            </div>

            <!-- QUOTATION DETAILS -->

            <div class="section">

                <div class="section-title blue">
                    Quotation Details
                </div>

                ${this.row(
            "Qtn Number",
            data.quoteNumber,
            0
        )}

                ${this.row(
            "Client Name",
            data.quotation.clientName,
            1
        )}

                ${this.row(
            "Contact Number",
            data.quotation.contact,
            2
        )}

                ${this.row(
            "Email",
            data.quotation.email,
            3
        )}

                ${this.row(
            "Insurance Company",
            data.quotation.company,
            4
        )}

                ${this.row(
            "Start Date",
            data.quotation.startDate,
            5
        )}

                ${this.row(
            "End Date",
            data.quotation.endDate,
            6
        )}

                ${this.row(
            "Issued Date",
            data.quotation.issuedDate,
            7
        )}

            </div>

            <!-- CATEGORY DETAILS -->

            ${data.plans.map((plan: any) => `

                <div class="section">

                    <div class="section-title blue">
                       ${data.productType === "EBP"
                           ? " Plan Type : EBP/Enhanced EBP Plan "
                           : data.productType === "SME" && String(plan.category).toUpperCase().includes("EBP")
                               ? "EBP Plan"
                               : "Enhanced Plan"} - ${this.getPlanDisplayLabel(plan.category)} 
                    </div>

                    <div class="plan-grid">

                        <div>

                            ${this.planRow(
                    "Network Provider",
                    plan.network
                )}

                       ${this.planRow(
                    plan.isEbp || data.productType === "EBP"
                        ? "Plan Type"
                        : "Network Type",
                    plan.networkType
                )}

                            ${plan.benefits
                .map((b: any) =>
                    this.planRow(
                        b.name,
                        b.value
                    )
                )
                .join("")}

                        </div>

                        <div>

                            ${this.planRow(
                    "Total Members",
                    `<span class="red">${plan.totalMembers}</span>`
                )}

                            <div class="plan-row">

                            <div class="label">
                                ${plan.memberBreakdownLabel}
                            </div>

                            <div class="value red">

                                ${plan.memberBreakdown
                .map(
                    (item: string) =>
                        `<div class="member-breakdown-row">${item}</div>`
                )
                .join("")}

                            </div>

                            </div>

                            ${this.planRow(
                    "Category Premium",
                    `<span class="red">${plan.totalPremium}</span>`
                )}

                        </div>

                    </div>

                </div>

            `).join("")}

            <!-- PREMIUM CALCULATIONS -->

            <div class="section">

                <div class="section-title blue premium-calculations-title">
                    Premium Calculations (in ${this.getDirhamWhiteSymbol()})
                </div>

                <div class="matrix-table" style="--plan-count: ${Math.max(data.plans.length, 1)};">

                    <div class="matrix-header">

                        <div>#</div>

                        ${data.plans.map((plan: any) => `
                            <div>
                               ${this.getPlanDisplayLabel(plan.category)}
                            </div>
                        `).join("")}

                    </div>

                    <!-- MEMBERS -->

                    <div class="matrix-row">

                        <div class="matrix-label">
                            No. Of Members
                        </div>

                        ${data.plans.map((plan: any) => `

                            <div>
                                ${plan.totalMembers}
                            </div>

                        `).join("")}

                    </div>

                    <!-- NETWORK -->

                    <div class="matrix-row">

                        <div class="matrix-label">
                            Network
                        </div>

                       ${data.plans.map((plan: any) => `

                        <div>
                           ${data.productType === "SME" && plan.isEbp
                                ? "Basic EBP Plan"
                                : plan.networkType
                            }
                    </div>

                        `).join("")}

                    </div>

                    <!-- PREMIUM -->

                    <div class="matrix-row">

                        <div class="matrix-label">
                            Total Premium
                        </div>

                        ${data.plans.map((plan: any) => `

                            <div class="red">
                                ${plan.totalPremium}
                            </div>

                        `).join("")}

                    </div>

                    <!-- GRAND TOTAL -->

                    <div class="matrix-footer">

                        <div class="matrix-label">
                            Grand Total
                        </div>

                        <div class="matrix-total-value red">

                            ${data.grandTotal}

                        </div>

                    </div>

                </div>

            </div>

        </div>
        `;
    }

    private row(
        label: string,
        value: any,
        index: number
    ): string {

        return `
            <div class="quote-detail-row ${index % 2 === 0 ? "alt" : ""}">
                <div class="quote-detail-label">${label}</div>
                <div class="quote-detail-value">${value || "-"}</div>
            </div>
        `;
    }

    private planRow(
        label: string,
        value: any
    ): string {

        return `
            <div class="plan-row">
                <div class="label">${label}</div>
                <div class="value">
                    : ${value || "-"}
                </div>
            </div>
        `;
    }

    public updateView(
        context: ComponentFramework.Context<IInputs>
    ): void {

        this.context = context;
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void { }
}
