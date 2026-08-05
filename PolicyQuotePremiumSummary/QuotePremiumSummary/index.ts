import { IInputs, IOutputs } from "./generated/ManifestTypes";

interface PremiumColumn {
    category: string;
    planName: string;
    networkProvider: string;
    networkType: string;
    benefits: Array<{ name: string; value: string }>;
    memberCount: number;
    memberBreakdown: string[];
    premium: number;
}

interface PremiumViewModel {
    columns: PremiumColumn[];
    grandTotal: number;
}

export class PolicyQuotePremiumSummary implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private container!: HTMLDivElement;
    private lastInput: string | null = null;
    private lastShowPlanDetails = false;
    private readonly symbolUrl = (window as any).Xrm?.Utility?.getGlobalContext?.().getClientUrl()
        + "/WebResources/adnic_dirham_symbol";

    public init(
        context: ComponentFramework.Context<IInputs>,
        _notifyOutputChanged: () => void,
        _state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this.container = container;
        this.renderFromInput(
            context.parameters.quoteApiResponse.raw,
            context.parameters.showPlanDetails.raw === true
        );
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        const input = context.parameters.quoteApiResponse.raw;
        const showPlanDetails = context.parameters.showPlanDetails.raw === true;
        if (input !== this.lastInput || showPlanDetails !== this.lastShowPlanDetails) {
            this.renderFromInput(input, showPlanDetails);
        }
    }

    private renderFromInput(raw: string | null, showPlanDetails: boolean): void {
        this.lastInput = raw;
        this.lastShowPlanDetails = showPlanDetails;

        if (!raw || !raw.trim()) {
            this.renderMessage("Quote response is not available.");
            return;
        }

        try {
            const parsed = JSON.parse(raw);
            const response = this.unwrapResponse(parsed);
            this.render(this.mapResponse(response), showPlanDetails);
        } catch (error) {
            console.error("Invalid Quote API response JSON.", error);
            this.renderMessage("The Quote API response is not valid JSON.", true);
        }
    }

    private unwrapResponse(value: any): any {
        let result = value;
        const wrapperNames = ["response", "data", "body", "result", "value"];

        for (let index = 0; index < 3 && result && typeof result === "object"; index++) {
            const wrapperName = wrapperNames.find(name =>
                result[name] !== undefined &&
                !Array.isArray(result[name]) &&
                (typeof result[name] === "object" || typeof result[name] === "string")
            );

            if (!wrapperName) {
                break;
            }

            result = result[wrapperName];
            if (typeof result === "string") {
                result = JSON.parse(result);
            }
        }

        return result || {};
    }

    private mapResponse(api: any): PremiumViewModel {
        const members = Array.isArray(api.members) ? api.members : [];
        const rawCategories = api.productSelectionResponse?.categories;
        const categories = Array.isArray(rawCategories)
            ? rawCategories
            : Array.isArray(rawCategories?.categories)
                ? rawCategories.categories
                : Array.isArray(api.categories)
                    ? api.categories
                    : [];
        const premiums = Array.isArray(api.categoryPremiums)
            ? api.categoryPremiums
            : Array.isArray(api.pricingResponse?.categoryPremiums)
                ? api.pricingResponse.categoryPremiums
                : [];

        const categoryKeys: string[] = [];
        const addCategory = (value: unknown): void => {
            const key = this.normalizeCategory(value);
            if (key && categoryKeys.indexOf(key) === -1) {
                categoryKeys.push(key);
            }
        };

        categories.forEach((category: any) =>
            addCategory(category?.categoryCode || category?.categoryName || category?.category)
        );
        premiums.forEach((premium: any) =>
            addCategory(premium?.categoryName || premium?.categoryCode || premium?.category)
        );
        members.forEach((member: any) => addCategory(member?.category));

        const columns = categoryKeys.map(categoryKey => {
            const category = categories.find((item: any) =>
                this.normalizeCategory(item?.categoryCode || item?.categoryName || item?.category) === categoryKey
            );
            const categoryPremium = premiums.find((item: any) =>
                this.normalizeCategory(item?.categoryName || item?.categoryCode || item?.category) === categoryKey
            );
            const categoryMembers = members.filter((member: any) =>
                this.normalizeCategory(member?.category) === categoryKey
            );
            const productType = this.getProductType(api);

            return {
                category: this.displayCategory(categoryKey),
                planName: this.getPlanName(category, api),
                networkProvider: this.getNetworkProvider(category),
                networkType: this.getNetworkType(category),
                benefits: this.getBenefits(category),
                memberCount: categoryMembers.length,
                memberBreakdown: this.getMemberBreakdown(
                    categoryMembers,
                    api.policyStartDate,
                    productType
                ),
                premium: this.toNumber(
                    categoryPremium?.currentPremium ??
                    categoryPremium?.finalPremium ??
                    categoryPremium?.totalPremium ??
                    categoryPremium?.premium
                )
            };
        });

        const calculatedTotal = columns.reduce((total, column) => total + column.premium, 0);
        const grandTotal = this.toNumber(
            api.pricingResponse?.totalFinalPremium ??
            api.pricingResponse?.currentTotalPremium ??
            api.currentTotalPremium ??
            api.premiumSummary?.grandTotal ??
            api.totalPremium ??
            api.grandTotal ??
            calculatedTotal
        );

        return { columns, grandTotal };
    }

    private normalizeCategory(value: unknown): string {
        const normalized = String(value ?? "")
            .trim()
            .toUpperCase()
            .replace(/^CAT(?:EGORY)?[\s_-]*/, "");

        // The Quote API uses LSB and EBP for the same Essential Benefits
        // category in different parts of the response.
        return normalized === "LSB" ? "EBP" : normalized;
    }

    private displayCategory(value: string): string {
        return value;
    }

    private getPlanName(category: any, api: any): string {
        const explicitName =
            category?.planType ||
            category?.planName ||
            category?.productSelection?.planName;

        if (explicitName) {
            return String(explicitName);
        }

        const categoryCode = this.normalizeCategory(
            category?.categoryCode || category?.categoryName || category?.category
        );
        const productType = String(api.productType || api.productCode || "").toUpperCase();

        return categoryCode === "EBP" || categoryCode === "LSB" || productType === "EBP"
            ? "EBP plan"
            : "Enhanced plan";
    }

    private getNetworkProvider(category: any): string {
        return String(
            category?.productSelection?.networkProviderName ??
            category?.networkProvider?.name ??
            category?.networkProviderName ??
            category?.networkProvider ??
            "-"
        );
    }

    private getNetworkType(category: any): string {
        return String(
            category?.productSelection?.networkTypeName ??
            category?.network?.name ??
            category?.networkTypeName ??
            category?.networkType ??
            category?.plan ??
            "-"
        );
    }

    private getBenefits(category: any): Array<{ name: string; value: string }> {
        let benefits: any[] = [];

        if (Array.isArray(category?.benefits)) {
            benefits = category.benefits;
        } else if (Array.isArray(category?.benefits?.benefits)) {
            benefits = category.benefits.benefits;
        } else if (Array.isArray(category?.details)) {
            benefits = category.details;
        } else if (Array.isArray(category?.planDetails)) {
            benefits = category.planDetails;
        }

        return benefits
            .map((benefit: any) => ({
                name: String(benefit?.benefitName ?? benefit?.name ?? "").trim(),
                value: String(benefit?.benefitValue ?? benefit?.value ?? "-").trim()
            }))
            .filter(benefit => Boolean(benefit.name));
    }

    private getProductType(api: any): string {
        const productType = String(
            api.productType ??
            api.productCode ??
            api.productName ??
            api.productSelectionResponse?.productType ??
            ""
        ).trim().toUpperCase();

        if (productType) {
            return productType;
        }

        const items = [
            ...(Array.isArray(api.productSelectionResponse?.categories)
                ? api.productSelectionResponse.categories
                : Array.isArray(api.productSelectionResponse?.categories?.categories)
                    ? api.productSelectionResponse.categories.categories
                    : []),
            ...(Array.isArray(api.categoryPremiums)
                ? api.categoryPremiums
                : Array.isArray(api.pricingResponse?.categoryPremiums)
                    ? api.pricingResponse.categoryPremiums
                    : []),
            ...(Array.isArray(api.members) ? api.members : [])
        ];

        return items.some((item: any) => {
            const category = this.normalizeCategory(
                item?.categoryCode ?? item?.categoryName ?? item?.category
            );
            return category === "EBP" || category === "LSB";
        }) ? "EBP" : "SME";
    }

    private getMemberBreakdown(
        members: any[],
        policyStartDate: string | undefined,
        productType: string
    ): string[] {
        const groups: Record<string, { count: number; premium: number }> = {};

        members.forEach((member: any) => {
            const age = this.calculateAge(member?.dateOfBirth, policyStartDate);
            const ageBand = this.getAgeBand(age, productType);
            const gender = String(member?.gender ?? "U").trim().toUpperCase().charAt(0) || "U";
            const employeeType = this.isEmployee(member) ? "E ONLY" : "D ONLY";
            const emirate = String(
                member?.visaLocation ?? member?.emirate ?? member?.city ?? "N/A"
            );
            const maritalStatus = String(
                member?.maritalStatus ?? member?.maritalStatusName ?? "UNKNOWN"
            );
            const category = String(member?.category ?? "");
            const key =
                `Age ${ageBand} (${gender}) [${emirate} ${employeeType}] ` +
                `[${category}] ${maritalStatus}`;
            const premium = this.toNumber(
                member?.premium?.finalPremium ??
                member?.premiumAmount ??
                member?.premium
            );

            if (!groups[key]) {
                groups[key] = { count: 0, premium: 0 };
            }
            groups[key].count += 1;
            groups[key].premium += premium;
        });

        return Object.keys(groups).map(key =>
            `${key} × ${groups[key].count} AED ${this.formatAmount(groups[key].premium)}`
        );
    }

    private isEmployee(member: any): boolean {
        const relation =
            member?.relation?.code ??
            member?.relation?.name ??
            member?.relation?.display ??
            member?.relation ??
            member?.relationship?.code ??
            member?.relationship ??
            member?.relationCode ??
            "";

        return String(relation).trim().toUpperCase() === "EMPLOYEE";
    }

    private calculateAge(dateOfBirth: string | undefined, policyStartDate?: string): number {
        const dob = new Date(dateOfBirth ?? "");
        const referenceDate = new Date(policyStartDate ?? "");

        if (isNaN(dob.getTime()) || isNaN(referenceDate.getTime())) {
            return 0;
        }

        let age = referenceDate.getFullYear() - dob.getFullYear();
        const beforeBirthday =
            referenceDate.getMonth() < dob.getMonth() ||
            (referenceDate.getMonth() === dob.getMonth() &&
                referenceDate.getDate() < dob.getDate());

        if (beforeBirthday) {
            age -= 1;
        }
        return Math.max(age, 0);
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

    private toNumber(value: unknown): number {
        if (typeof value === "number") {
            return Number.isFinite(value) ? value : 0;
        }

        const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
        return Number.isFinite(parsed) ? parsed : 0;
    }

    private formatAmount(value: number): string {
        return value.toLocaleString("en-AE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    private render(viewModel: PremiumViewModel, showPlanDetails: boolean): void {
        this.container.replaceChildren();

        const wrapper = this.element("div", "premium-summary-wrapper");

        if (showPlanDetails && viewModel.columns.length) {
            const details = this.element("div", "plan-details-list");
            viewModel.columns.forEach(column =>
                details.appendChild(this.renderPlanDetails(column))
            );
            wrapper.appendChild(details);
        }

        const card = this.element("section", "premium-card");
        card.setAttribute("aria-label", "Premium Calculations");
        card.appendChild(this.element("h2", "premium-title", "Premium Calculations (in AED)"));

        if (!viewModel.columns.length) {
            card.appendChild(this.element("div", "premium-message", "No category premium details were found."));
            wrapper.appendChild(card);
            this.container.appendChild(wrapper);
            return;
        }

        const grid = this.element("div", "premium-grid");
        grid.style.setProperty("--category-count", String(viewModel.columns.length));
        grid.setAttribute("role", "table");

        const header = this.element("div", "premium-row premium-header");
        header.setAttribute("role", "row");
        header.appendChild(this.cell("#", "premium-label", "columnheader"));
        viewModel.columns.forEach(column => {
            const cell = this.cell("", "premium-plan-heading", "columnheader");
            cell.appendChild(this.element("div", "premium-plan-name", column.planName));
            cell.appendChild(this.element("div", "premium-category", `Category - ${column.category}`));
            header.appendChild(cell);
        });
        grid.appendChild(header);

        grid.appendChild(this.dataRow(
            "No. Of Members",
            viewModel.columns.map(column => String(column.memberCount))
        ));
        grid.appendChild(this.dataRow(
            "Total Premium",
            viewModel.columns.map(column => `AED ${this.formatAmount(column.premium)}`)
        ));

        const footer = this.element("div", "premium-footer");
        footer.appendChild(this.element("div", "premium-footer-label", "Grand Total"));
        footer.appendChild(this.element(
            "div",
            "premium-grand-total",
            `AED ${this.formatAmount(viewModel.grandTotal)}`
        ));
        grid.appendChild(footer);
        card.appendChild(grid);
        wrapper.appendChild(card);
        this.container.appendChild(wrapper);
    }

    private renderPlanDetails(column: PremiumColumn): HTMLElement {
        const section = document.createElement("section");
        section.className = "plan-details-card";
        section.setAttribute("aria-label", `${column.planName} ${column.category}`);

        section.appendChild(this.element(
            "h2",
            "plan-details-title",
            `Plan Type: ${column.planName}`
        ));

        const body = this.element("div", "plan-details-body");
        const entries: Array<{ label: string; value: string; multiline?: boolean }> = [
            { label: "Network Provider", value: column.networkProvider },
            { label: "Network Type", value: column.networkType },
            ...column.benefits.map(benefit => ({
                label: benefit.name,
                value: benefit.value
            })),
            { label: "Total Members", value: String(column.memberCount) },
            {
                label: "Member Breakdown",
                value: column.memberBreakdown.length
                    ? column.memberBreakdown.join("\n")
                    : "-",
                multiline: true
            },
            {
                label: "Total Premium",
                value: `AED ${this.formatAmount(column.premium)}`
            }
        ];

        entries.forEach(entry => {
            const row = this.element(
                "div",
                `plan-detail-row${entry.multiline ? " plan-detail-multiline" : ""}`
            );
            row.appendChild(this.element("div", "plan-detail-label", entry.label));
            row.appendChild(this.element("div", "plan-detail-separator", ":"));
            row.appendChild(this.element("div", "plan-detail-value", entry.value));
            body.appendChild(row);
        });

        section.appendChild(body);
        return section;
    }

    private dataRow(label: string, values: string[]): HTMLDivElement {
        const row = this.element("div", "premium-row");
        row.setAttribute("role", "row");
        row.appendChild(this.cell(label, "premium-label", "rowheader"));
        values.forEach(value => row.appendChild(this.cell(value, "premium-value", "cell")));
        return row;
    }

    private cell(text: string, className: string, role: string): HTMLDivElement {
        const cell = this.element("div", className, text);
        cell.setAttribute("role", role);
        return cell;
    }

    private dirhamIcon(): HTMLImageElement {
        const image = document.createElement("img");
        image.className = "dirham-icon";
        image.src = this.symbolUrl;
        image.alt = "UAE Dirham";
        return image;
    }

    private appendTextWithDirham(container: HTMLElement, value: string): void {
        const parts = value.split(/\bAED\b/gi);
        parts.forEach((part, index) => {
            if (index > 0) container.appendChild(this.dirhamIcon());
            container.append(part);
        });
    }

    private element(tag: string, className: string, text?: string): HTMLDivElement {
        const element = document.createElement(tag) as HTMLDivElement;
        element.className = className;
        if (text !== undefined) {
            this.appendTextWithDirham(element, text);
        }
        return element;
    }

    private renderMessage(message: string, isError = false): void {
        this.container.replaceChildren();
        const element = this.element(
            "div",
            `premium-message${isError ? " premium-error" : ""}`,
            message
        );
        element.setAttribute("role", isError ? "alert" : "status");
        this.container.appendChild(element);
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
        this.container.replaceChildren();
    }
}
