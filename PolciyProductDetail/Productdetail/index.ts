/// <reference types="powerapps-component-framework" />
import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class PolicyProductDetail implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private readonly categoryColumnWidth = "minmax(160px, 1fr)";
    private container!: HTMLDivElement;
    private context!: ComponentFramework.Context<IInputs>;
    private lastRaw: string | null = null;
    private updatedData: any = null;
    private categoryPremiums: any[] = [];
    private comparisonPremiums: any[] = [];
    private comparisonLoading = false;
    private comparisonError = "";
    private policyPremiumCalculated = false;
    private lastPolicyId: string | null = null;
    private lastShowComparison = false;
    private requestVersion = 0;
    private readonly symbolUrl = (window as any).Xrm?.Utility?.getGlobalContext?.().getClientUrl()
        + "/WebResources/adnic_dirham_symbol";

    public init(
        context: ComponentFramework.Context<IInputs>,
        _notifyOutputChanged: () => void,
        _state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this.context = context;
        this.container = container;

        const card = document.createElement("div");
        card.className = "card policy-product-detail";

        const header = document.createElement("div");
        header.className = "top-section";

        const gridWrapper = document.createElement("div");
        gridWrapper.className = "grid-wrapper";

        card.appendChild(header);
        card.appendChild(gridWrapper);
        this.container.appendChild(card);
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this.context = context;
        const raw = context.parameters.productDetailsInput?.raw || "";
        const policyId = context.parameters.policyId?.raw || null;
        const showComparison = context.parameters.showPolicyQuotePremiumComparison?.raw === true;

        const inputChanged = this.lastRaw !== raw;
        const comparisonChanged = this.lastPolicyId !== policyId || this.lastShowComparison !== showComparison;
        if (!inputChanged && !comparisonChanged) return;
        this.lastRaw = raw;
        this.lastPolicyId = policyId;
        this.lastShowComparison = showComparison;

        const header = this.container.querySelector(".top-section") as HTMLDivElement;
        const wrapper = this.container.querySelector(".grid-wrapper") as HTMLDivElement;

        if (!raw) {
            this.updatedData = null;
            header.innerHTML = "";
            wrapper.innerHTML = "";
            return;
        }

        try {
            this.updatedData = JSON.parse(raw);
        } catch {
            this.updatedData = null;
            header.innerHTML = "";
            wrapper.innerHTML = "";
            return;
        }

        const categories = this.getCategories(this.updatedData);
        this.categoryPremiums = Array.isArray(this.updatedData?.categoryPremiums)
            ? this.updatedData.categoryPremiums
            : [];

        this.renderHeader(header, this.updatedData);
        this.renderGrid(wrapper, categories);

        if (comparisonChanged) {
            if (showComparison) {
                void this.loadCalculatedPremium(policyId);
            } else {
                ++this.requestVersion;
                this.comparisonPremiums = [];
                this.comparisonLoading = false;
                this.comparisonError = "";
                this.policyPremiumCalculated = false;
            }
        }
    }

    private async loadCalculatedPremium(policyId: string | null): Promise<void> {
        const requestVersion = ++this.requestVersion;
        this.comparisonPremiums = [];
        this.comparisonError = "";
        this.policyPremiumCalculated = false;
        this.comparisonLoading = false;

        if (!policyId || !policyId.trim()) {
            this.useQuotePremiumFallback("Policy Id is required to calculate premiums.");
            this.rerenderPremiumSection();
            return;
        }

        this.comparisonLoading = true;
        this.rerenderPremiumSection();
        try {
            const [baseUrl, environmentName, policyManagement] = await Promise.all([
                this.getEnvironmentVariableValue("adnic_BaseServiceUrl"),
                this.getEnvironmentVariableValue("adnic_EnvironmentName"),
                this.getEnvironmentVariableValue("adnic_PolicyManagement")
            ]);
            if (!baseUrl || !policyManagement) {
                throw new Error("Policy premium service configuration is missing.");
            }

            const url = [
                `${baseUrl}${environmentName}`.replace(/\/+$/, ""),
                policyManagement.replace(/^\/+|\/+$/g, ""),
                encodeURIComponent(policyId.trim()),
                "calculate-premiums"
            ].filter(Boolean).join("/");
            const response = await fetch(url, {
                method: "POST"
            });
            if (!response.ok) {
                throw new Error(`Calculate premium service returned ${response.status}.`);
            }

            const payload = this.unwrapResponse(await response.json());
            if (requestVersion !== this.requestVersion) return;
            const calculatedPremiums = Array.isArray(payload?.categoryPremiumSummary)
                ? payload.categoryPremiumSummary
                : [];
            if (calculatedPremiums.length) {
                this.comparisonPremiums = calculatedPremiums;
                this.policyPremiumCalculated = true;
            } else {
                this.useQuotePremiumFallback();
            }
        } catch (error) {
            console.error("Calculate premium request failed.", error);
            if (requestVersion === this.requestVersion) {
                this.useQuotePremiumFallback(error instanceof Error
                    ? error.message
                    : "Unable to calculate policy premiums.");
            }
        } finally {
            if (requestVersion === this.requestVersion) {
                this.comparisonLoading = false;
                this.rerenderPremiumSection();
            }
        }
    }

    private useQuotePremiumFallback(error = ""): void {
        this.policyPremiumCalculated = false;
        this.comparisonError = error;
        this.comparisonPremiums = this.categoryPremiums.map((premium) => ({
            categoryName: premium?.categoryName || premium?.categoryCode || "-",
            quotePremium: premium?.currentPremium ?? premium?.quotePremium,
            quoteMemberCount: premium?.memberCount ?? premium?.quoteMemberCount
        }));
    }

    private async getEnvironmentVariableValue(schemaName: string): Promise<string> {
        const escapedName = schemaName.replace(/'/g, "''");
        const definitions = await this.context.webAPI.retrieveMultipleRecords(
            "environmentvariabledefinition",
            `?$select=defaultvalue&$filter=schemaname eq '${escapedName}'&$expand=environmentvariabledefinition_environmentvariablevalue($select=value)`
        );
        const definition: any = definitions.entities[0];
        const values = definition?.environmentvariabledefinition_environmentvariablevalue;
        return String(values?.[0]?.value ?? definition?.defaultvalue ?? "").trim();
    }

    private unwrapResponse(value: any): any {
        let result = value;
        for (let index = 0; index < 3 && result && typeof result === "object"; index++) {
            const key = ["response", "data", "body", "result", "value"].find(
                (name) => result[name] !== undefined && !Array.isArray(result[name])
            );
            if (!key) break;
            result = result[key];
            if (typeof result === "string") result = JSON.parse(result);
        }
        return result || {};
    }

    private rerenderPremiumSection(): void {
        if (!this.updatedData) return;
        const wrapper = this.container.querySelector(".grid-wrapper") as HTMLDivElement;
        this.renderGrid(wrapper, this.getCategories(this.updatedData));
    }

    private getCategories(data: any): any[] {
        if (Array.isArray(data?.productSelectionCategories?.categories)) {
            return data.productSelectionCategories.categories;
        }
        if (Array.isArray(data?.categories)) return data.categories;
        if (Array.isArray(data)) return data;
        return [];
    }

    private renderHeader(container: HTMLDivElement, data: any): void {
        container.innerHTML = "";
        const fields = [
            ["Policy Start", data?.policyStartDate],
            ["Source of Business", data?.sourceOfBusiness],
            ["Commission", data?.commission === undefined || data?.commission === null ? "-" : `${data.commission}%`]
        ];

        if (!fields.some((field) => field[1] && field[1] !== "-")) return;

        const grid = document.createElement("div");
        grid.className = "policy-header-grid";
        fields.forEach(([label]) => grid.appendChild(this.element("div", "policy-header-label", label)));
        fields.forEach(([, value]) => grid.appendChild(this.element("div", "policy-header-value", value || "-")));
        container.appendChild(grid);
    }

    private renderGrid(container: HTMLDivElement, categories: any[]): void {
        container.innerHTML = "";
        if (!categories.length) return;

        const grid = document.createElement("div");
        grid.className = "grid-container readonly-grid";
        grid.style.gridTemplateColumns =
            `40px 220px repeat(${categories.length}, ${this.categoryColumnWidth})`;

        ["", "", ...categories.map((category) => `Category ${this.categoryCode(category)}`)]
            .forEach((header) => grid.appendChild(this.element("div", "grid-header", header)));

        this.buildRows(categories).forEach((rowName, index) => {
            const stripe = index % 2 === 0 ? "row-even" : "row-odd";
            grid.appendChild(this.cell(index + 1, `${stripe} index`));
            grid.appendChild(this.cell(rowName, stripe));
            categories.forEach((category) => grid.appendChild(this.cell(this.valueFor(category, rowName), stripe)));
        });

        container.appendChild(grid);
        if (this.lastShowComparison) {
            this.renderPremiumComparison(container);
        } else {
            this.renderPremiumFooter(container, categories);
        }
    }

    private buildRows(categories: any[]): string[] {
        const rows = new Set<string>(["Network Provider", "Network Type"]);
        categories.forEach((category) => {
            (category?.benefits || []).forEach((benefit: any) => {
                const name = benefit?.benefitName || benefit?.name || benefit?.code;
                if (name) rows.add(name);
            });
        });
        return Array.from(rows);
    }

    private valueFor(category: any, rowName: string): string {
        const selection = category?.productSelection || category;
        if (rowName === "Network Provider") {
            return selection?.networkProviderName || selection?.networkProvider?.name || selection?.networkProvider || "-";
        }
        if (rowName === "Network Type") {
            return selection?.networkTypeName || selection?.network?.name || selection?.plan || selection?.networkType || "-";
        }

        const benefit = (category?.benefits || []).find((item: any) =>
            (item?.benefitName || item?.name || item?.code) === rowName);
        if (!benefit) return "-";

        const value = benefit.benefitValue ?? benefit.value;
        const currency = benefit?.metadata?.currency;
        if (currency && value !== undefined && value !== null && value !== "") {
            const numeric = Number(value);
            return `${currency} ${Number.isFinite(numeric) ? numeric.toLocaleString("en-US") : value}`;
        }
        return value === undefined || value === null || value === "" ? "-" : String(value);
    }

    private renderPremiumFooter(container: HTMLDivElement, categories: any[]): void {
        if (!this.categoryPremiums.length) return;

        const footer = document.createElement("div");
        footer.className = "premium-footer";
        footer.style.gridTemplateColumns =
            `40px 220px repeat(${categories.length}, ${this.categoryColumnWidth})`;
        footer.appendChild(document.createElement("div"));
        footer.appendChild(document.createElement("div"));

        categories.forEach((category) => {
            const code = this.categoryCode(category);
            const premium = this.categoryPremiums.find((item: any) => {
                const premiumCode = String(item?.categoryName || item?.categoryCode || "")
                    .replace(/^CAT-/i, "").replace(/^Category\s+/i, "");
                return premiumCode === code;
            });
            const cell = document.createElement("div");
            cell.className = "premium-cell";
            if (premium) {
                const amount = Number(premium.currentPremium || 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
                cell.appendChild(this.element(
                    "div",
                    "premium-title",
                    `Category ${code} Premiums`
                ));
                const premiumAmount = document.createElement("div");
                premiumAmount.className = "premium-amount";
                premiumAmount.appendChild(this.dirhamIcon());
                premiumAmount.append(` ${amount}`);
                cell.appendChild(premiumAmount);
                cell.appendChild(this.element(
                    "div",
                    "premium-members",
                    `Members ${Number(premium.memberCount || 0)}`
                ));
                this.renderTobLink(cell, category);
            }
            footer.appendChild(cell);
        });
        container.appendChild(footer);
    }

    private renderPremiumComparison(container: HTMLDivElement): void {
        const section = document.createElement("section");
        section.className = "premium-comparison-section";
        section.setAttribute("aria-label", "Policy and quote level premiums");

        if (this.comparisonLoading) {
            section.appendChild(this.element("div", "premium-status", "Calculating policy premiums..."));
            container.appendChild(section);
            return;
        }
        if (this.comparisonError && !this.comparisonPremiums.length) {
            section.appendChild(this.element("div", "premium-status premium-status-error", this.comparisonError));
            container.appendChild(section);
            return;
        }
        if (!this.comparisonPremiums.length) {
            section.appendChild(this.element("div", "premium-status", "Policy premium detail not calculated. No quote premium was available."));
            container.appendChild(section);
            return;
        }

        if (!this.policyPremiumCalculated) {
            section.appendChild(this.element(
                "div",
                "premium-status premium-status-warning",
                "Policy premium detail not calculated. Showing the existing quote premium."
            ));
        }

        const grid = document.createElement("div");
        grid.className = "premium-comparison-grid";
        grid.style.gridTemplateColumns =
            `minmax(210px, 1.15fr) repeat(${this.comparisonPremiums.length}, ${this.categoryColumnWidth})`;
        grid.appendChild(this.element("div", "comparison-header comparison-label", ""));
        this.comparisonPremiums.forEach((premium) => {
            grid.appendChild(this.element(
                "div",
                "comparison-header",
                `${String(premium?.categoryName || "-")} Premiums`
            ));
        });
        this.appendComparisonRow(grid, "Policy Level Premium", "policyPremium", "policyMemberCount");
        this.appendComparisonRow(grid, "Quote Level Premium", "quotePremium", "quoteMemberCount");
        section.appendChild(grid);
        container.appendChild(section);
    }

    private appendComparisonRow(
        grid: HTMLDivElement,
        label: string,
        amountKey: "policyPremium" | "quotePremium",
        countKey: "policyMemberCount" | "quoteMemberCount"
    ): void {
        grid.appendChild(this.element("div", "comparison-label", label));
        this.comparisonPremiums.forEach((premium) => {
            if (amountKey === "policyPremium" && !this.policyPremiumCalculated) {
                grid.appendChild(this.element("div", "comparison-value comparison-not-calculated", "Not calculated"));
                return;
            }
            const value = Number(premium?.[amountKey] || 0);
            const cell = document.createElement("div");
            cell.className = "comparison-value";
            cell.title = `Difference ${Number(premium?.difference || 0).toLocaleString("en-US")}`;
            const amount = document.createElement("div");
            amount.className = "comparison-amount";
            amount.appendChild(this.dirhamIcon());
            amount.append(` ${value.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`);
            cell.appendChild(amount);
            cell.appendChild(this.element(
                "div",
                "comparison-members",
                `Members ${Number(premium?.[countKey] || 0)}`
            ));
            grid.appendChild(cell);
        });
    }

    private dirhamIcon(): HTMLImageElement {
        const image = document.createElement("img");
        image.className = "dirham-icon";
        image.src = this.symbolUrl;
        image.alt = "UAE Dirham";
        return image;
    }

    private renderTobLink(cell: HTMLDivElement, category: any): void {
        if (String(this.updatedData?.planType || "").toUpperCase() !== "EBP") return;
        const selection = category?.productSelection || category;
        const provider = selection?.networkProviderName || selection?.networkProvider?.name || selection?.networkProvider || "";
        const plan = selection?.networkTypeName || selection?.network?.name || selection?.plan || selection?.networkType || "";
        const url = this.getTobUrl(provider, plan);
        if (!provider || !plan || !url) return;

        const wrapper = document.createElement("div");
        wrapper.className = "premium-tob";
        wrapper.appendChild(this.element("span", "tob-selected-plan", `${plan} : `));
        const link = this.element("a", "tob-link", "TOB") as HTMLAnchorElement;
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        wrapper.appendChild(link);
        cell.appendChild(wrapper);
    }

    private getTobUrl(provider: string, plan: string): string {
        const slug = (value: string) => String(value || "").trim().toLowerCase()
            .replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        const providerSlug = slug(provider);
        const planSlug = slug(plan);
        return providerSlug && planSlug
            ? `https://nexusdev.adnic.ae/sit/sales/tob/${providerSlug}/${providerSlug}-${planSlug}.pdf`
            : "";
    }

    private categoryCode(category: any): string {
        return String(category?.categoryCode || category?.name || category?.categoryName || "-")
            .replace(/^CAT-/i, "").replace(/^Category\s+/i, "");
    }

    private cell(text: any, classes = ""): HTMLDivElement {
        const cell = this.element("div", `grid-cell ${classes}`.trim(), "") as HTMLDivElement;
        this.appendTextWithDirham(cell, String(text ?? "-"));
        return cell;
    }

    private appendTextWithDirham(container: HTMLElement, value: string): void {
        const parts = value.split(/\bAED\b/gi);
        parts.forEach((part, index) => {
            if (index > 0) container.appendChild(this.dirhamIcon());
            container.append(part);
        });
    }

    private element(tag: string, className: string, text: any): HTMLElement {
        const element = document.createElement(tag);
        element.className = className;
        this.appendTextWithDirham(element, String(text ?? ""));
        return element;
    }

    public getOutputs(): IOutputs {
        return { productDetailsInput: this.updatedData ? JSON.stringify(this.updatedData) : undefined };
    }

    public destroy(): void { }
}
