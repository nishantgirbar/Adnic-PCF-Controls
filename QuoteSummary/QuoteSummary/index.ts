import { IInputs, IOutputs } from "./generated/ManifestTypes";

const EBP_FALLBACK_CONFIG = {
    networkProvider: "Ecare",
    networkType: "General Network",
    benefits: [
        {
            name: "Plan Type",
            value: "Basic EBP Plan"
        },
        {
            name: "Network Provider",
            value: "Ecare"
        },
        {
            name: "Consultation",
            value: "20% Coinsurance"
        },
        {
            name: "Co-pay on Lab/Diagnostic",
            value: "20% Co-pay for All OP Services"
        },
        {
            name: "Pharmacy Co-Pay",
            value: "30% Co-pay for Medication"
        },
        {
            name: "Pharmacy Limit",
            value: "Maximum __DIRHAM__ 2,500"
        },
        {
            name: "Co-Pay on all IP Services",
            value: "20% Co-pay for IP Services"
        }
    ]
};

export class QuoteSummaryPCF implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private container!: HTMLDivElement;
    private context!: ComponentFramework.Context<IInputs>;
    private symbolUrl = (window as any).Xrm?.Utility?.getGlobalContext?.().getClientUrl() + "/WebResources/adnic_dirham_symbol";

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

            const quoteApi ="quote-management/api/v1/sme-quotes";

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

        const categories =
            api.productSelectionResponse?.categories ||
            [];

        const categoryPremiums = Array.isArray(api.categoryPremiums)
            ? api.categoryPremiums
            : [];

        const plans: any[] = categories.map((cat: any) => {

            const benefits =
                Array.isArray(cat.benefits)
                    ? cat.benefits
                    : [];

            const categoryMembers = members.filter(
                (m: any) =>
                    this.normalizeCategory(m.category) ===
                    this.normalizeCategory(cat.categoryCode)
            );

            const categoryPremium =
                categoryPremiums.find(
                    (p: any) =>
                        this.normalizeCategory(p.categoryName) ===
                        this.normalizeCategory(cat.categoryCode)
                );

            const totalPremium = Number(
                categoryPremium?.currentPremium || 0
            );

            return {

                category: cat.categoryCode,

                network:
                    cat.productSelection?.networkProviderName || "-",

                networkType:
                    cat.productSelection?.networkTypeName || "-",

                benefits: benefits.map((b: any) => ({
                    name: String(
                        b.benefitName || "-"
                    ),
                    value: String(
                        b.benefitValue || "-"
                    )
                })),

                totalMembers:
                    categoryMembers.length,

                memberBreakdown:
                    this.getMemberBreakdown(
                        categoryMembers,
                        policyStartDate
                    ),

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

        const ebpMembers = members.filter(
            (m: any) =>
                this.isEbpCategory(m.category)
        );

        const hasEbpCategory =
            categories.some((cat: any) =>
                this.isEbpCategory(cat.categoryCode)
            ) ||
            categoryPremiums.some((p: any) =>
                this.isEbpCategory(p.categoryName)
            ) ||
            members.some((m: any) =>
                this.isEbpCategory(m.category)
            );

        if (ebpPremium || ebpMembers.length || hasEbpCategory) {

            const ebpBenefitsSource =
                categories.find((cat: any) =>
                    this.isEbpCategory(cat.categoryCode) &&
                    Array.isArray(cat.benefits) &&
                    cat.benefits.length
                ) ||
                categories.find((cat: any) =>
                    Array.isArray(cat.benefits) &&
                    cat.benefits.length
                );

            const ebpBenefits =
                (ebpBenefitsSource?.benefits || [])
                    .filter((b: any) => {
                        const name = String(b.benefitName || "").toLowerCase();
                        return name.includes("annual") ||
                            name.includes("territorial") ||
                            name.includes("network");
                    })
                    .map((b: any) => ({
                        name: String(b.benefitName || "-"),
                        value: String(b.benefitValue || "-")
                    }));

            const fallbackBenefits = EBP_FALLBACK_CONFIG.benefits.map((benefit: any) => ({
                ...benefit,
                value: benefit.value.replace("__DIRHAM__", this.getDirhamSymbol())
            }));

            plans.push({
                category: "EBP",
                benefits: fallbackBenefits,
                totalMembers: ebpMembers.length,
                memberBreakdown: this.getMemberBreakdown(ebpMembers, policyStartDate),
                totalPremium: this.formatCurrency(
                    Number(ebpPremium?.currentPremium || 0)
                )
            });
        }

        return {

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

    private isEbpCategory(value: any): boolean {

        const category = this.normalizeCategory(value);

        return category === "EBP" || category === "LSB";
    }

    private getPlanDisplayLabel(category: string): string {

        return category === "EBP"
            ? "EBP"
            : `Category ${category}`;
    }

    private getMemberBreakdown(
        members: any[],
        policyStartDate?: string
    ): string[] {

        if (!members?.length) {
            return [];
        }

        const groups: Record<string, {
            count: number;
            premium: number;
        }> = {};

        members.forEach((m: any) => {

            const age =
                this.calculateAge(
                    m.dateOfBirth,
                    policyStartDate
                );

            const start =
                Math.floor(age / 5) * 5;

            const end =
                start + 4;

            const gender =
                m.gender === "M"
                    ? "M"
                    : m.gender === "F"
                    ? "F"
                    : "U";

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
                `Age ${start}-${end} (${gender}) [${emirate}] [${category}] ${maritalStatus}`;

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
                        Enhanced Plan - ${this.getPlanDisplayLabel(plan.category)}
                    </div>

                    <div class="plan-grid">

                        <div>

                            ${this.isEbpCategory(plan.category) ? "" : `
                            ${this.planRow(
                                "Network Provider",
                                plan.network
                            )}

                            ${this.planRow(
                                "Network Type",
                                plan.networkType
                            )}
                            `}

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
                                Member Breakdown
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
                                "Total Premium",
                                `<span class="red">${plan.totalPremium}</span>`
                            )}

                        </div>

                    </div>

                </div>

            `).join("")}

            <!-- PREMIUM CALCULATIONS -->

            <div class="section">

                <div class="section-title blue">
                    Premium Calculations (in ${this.getDirhamSymbol()})
                </div>

                <div class="matrix-table">

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
                                ${plan.networkType}
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
            <div class="row ${index % 2 === 0 ? "alt" : ""}">
                <div class="label">${label}</div>
                <div class="value">${value || "-"}</div>
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

    public destroy(): void {}
}