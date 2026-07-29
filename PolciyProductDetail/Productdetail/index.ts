/// <reference types="powerapps-component-framework" />
import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class PolicyProductDetail implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private readonly categoryColumnWidth = "minmax(160px, 1fr)";
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
        this.renderPremiumFooter(container, categories);
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
                cell.innerHTML = `<div class="premium-title">Category ${this.escape(code)} Premiums</div>`
                    + `<div class="premium-amount"><img class="dirham-icon" src="${this.symbolUrl}" alt="AED" /> ${amount}</div>`
                    + `<div class="premium-members">Members ${Number(premium.memberCount || 0)}</div>`;
                this.renderTobLink(cell, category);
            }
            footer.appendChild(cell);
        });
        container.appendChild(footer);
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
