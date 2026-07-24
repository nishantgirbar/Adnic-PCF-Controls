/// <reference types="powerapps-component-framework" />
import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class PolicyProductDetail implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private container!: HTMLDivElement;
    private context!: ComponentFramework.Context<IInputs>;
    private lastRaw: string | null = null;
    private updatedData: any = null;
    private categoryPremiums: any[] = [];
    private readonly symbolUrl = (window as any).Xrm.Utility.getGlobalContext().getClientUrl()
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
        card.className = "card";

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

        if (this.lastRaw === raw) return;
        this.lastRaw = raw;

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
            ["Commission", data?.commission === undefined || data?.commission === null ? "-" : `${data.commission}%`],
            ["Plan Type", data?.planType]
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
        grid.style.gridTemplateColumns = `40px 220px repeat(${categories.length}, minmax(160px, 1fr))`;

        ["", "", ...categories.map((category) => `Category ${this.categoryCode(category)}`)]
            .forEach((header) => grid.appendChild(this.element("div", "grid-header", header)));

        this.buildRows(categories).forEach((rowName, index) => {
            const stripe = index % 2 === 0 ? "row-even" : "row-odd";
            grid.appendChild(this.cell(index + 1, `${stripe} index`));
            grid.appendChild(this.cell(rowName, stripe));
            categories.forEach((category) => grid.appendChild(this.cell(this.valueFor(category, rowName), stripe)));
        });

        container.appendChild(grid);
        this.renderPremiumSummary(container, categories);
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

    private renderPremiumSummary(container: HTMLDivElement, categories: any[]): void {
        if (!this.categoryPremiums.length) return;

        const items = categories.map((category) => {
            const code = this.categoryCode(category);
            const premium = this.categoryPremiums.find((item: any) => {
                const premiumCode = String(item?.categoryName || item?.categoryCode || "")
                    .replace(/^CAT-/i, "").replace(/^Category\s+/i, "");
                return premiumCode.toUpperCase() === code.toUpperCase();
            });
            const selection = category?.productSelection || category;
            return {
                code,
                memberCount: Number(premium?.memberCount || 0),
                network: selection?.networkTypeName || selection?.network?.name ||
                    selection?.plan || selection?.networkType || "-",
                premium: Number(premium?.currentPremium || 0)
            };
        });

        const section = document.createElement("div");
        section.className = "premium-summary-section";

        const title = document.createElement("div");
        title.className = "premium-summary-title";
        title.appendChild(document.createTextNode("Premium Calculations (in "));
        title.appendChild(this.currencySymbol("premium-title-symbol"));
        title.appendChild(document.createTextNode(")"));
        section.appendChild(title);

        const table = document.createElement("div");
        table.className = "premium-summary-table";
        table.style.setProperty("--category-count", String(Math.max(items.length, 1)));

        const header = document.createElement("div");
        header.className = "premium-summary-header";
        header.appendChild(this.element("div", "", "#"));
        items.forEach((item) =>
            header.appendChild(this.element("div", "", `Category ${item.code}`)));
        table.appendChild(header);

        const appendRow = (label: string, values: Array<string | HTMLElement>, className = ""): void => {
            const row = document.createElement("div");
            row.className = "premium-summary-row";
            row.appendChild(this.element("div", "premium-summary-label", label));
            values.forEach((value) => {
                const cell = document.createElement("div");
                cell.className = className;
                if (value instanceof HTMLElement) cell.appendChild(value);
                else cell.innerText = value;
                row.appendChild(cell);
            });
            table.appendChild(row);
        };

        appendRow("No. Of Members", items.map((item) => String(item.memberCount)));
        appendRow("Network", items.map((item) => item.network));
        appendRow(
            "Total Premium",
            items.map((item) => this.currencyValue(item.premium)),
            "premium-summary-total"
        );

        const rawGrandTotal = this.updatedData?.currentTotalPremium;
        const suppliedGrandTotal = Number(rawGrandTotal);
        const grandTotal = rawGrandTotal !== undefined && rawGrandTotal !== null &&
            rawGrandTotal !== "" && Number.isFinite(suppliedGrandTotal)
            ? suppliedGrandTotal
            : items.reduce((sum, item) => sum + item.premium, 0);
        const footer = document.createElement("div");
        footer.className = "premium-summary-footer";
        footer.appendChild(this.element("div", "premium-summary-label", "Grand Total"));
        footer.appendChild(this.currencyValue(grandTotal, "premium-summary-grand-total"));
        table.appendChild(footer);

        section.appendChild(table);
        container.appendChild(section);
    }

    private currencySymbol(className: string): HTMLImageElement {
        const symbol = document.createElement("img");
        symbol.className = className;
        symbol.src = this.symbolUrl;
        symbol.alt = "AED";
        return symbol;
    }

    private currencyValue(amount: number, className = ""): HTMLSpanElement {
        const value = document.createElement("span");
        value.className = className;
        value.appendChild(this.currencySymbol("dirham-icon"));
        value.appendChild(document.createTextNode(` ${amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`));
        return value;
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
        return this.element("div", `grid-cell ${classes}`.trim(), text ?? "-") as HTMLDivElement;
    }

    private element(tag: string, className: string, text: any): HTMLElement {
        const element = document.createElement(tag);
        element.className = className;
        element.innerText = String(text ?? "");
        return element;
    }

    private escape(value: string): string {
        const element = document.createElement("div");
        element.innerText = value;
        return element.innerHTML;
    }

    public getOutputs(): IOutputs {
        return { productDetailsInput: this.updatedData ? JSON.stringify(this.updatedData) : undefined };
    }

    public destroy(): void { }
}
