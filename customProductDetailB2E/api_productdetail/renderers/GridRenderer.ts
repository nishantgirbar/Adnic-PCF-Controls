import { DropdownFactory } from "../renderers/DropdownFactory";
import { EbpRuleService } from "../services/EbpRuleService";
import { MemberStatistics } from "../utils/MemberStatistics";


export class GridRenderer {

private symbolUrl = (window as any).Xrm.Utility.getGlobalContext().getClientUrl() + "/WebResources/adnic_dirham_symbol";
private validationMessages: Record<string, string> = {};

constructor(
    private context: any,
    private container: HTMLDivElement,
    private apiData: any,
    private categories: any[],
    private productRows: any[],
    private selectedValues: any,
    private isReadOnly: boolean,
    private productType: string,    
    private premiumValues: string | null,
    private notifyOutputChanged: () => void
) {}

    private appendTextWithDirham(container: HTMLElement, value: string): void {
        const parts = value.split(/\bAED\b/gi);

        parts.forEach((part, index) => {
            if (index > 0) {
                const image = document.createElement("img");
                image.className = "dirham-icon";
                image.src = this.symbolUrl;
                image.alt = "UAE Dirham";
                container.appendChild(image);
            }

            container.append(part);
        });
    }

    private clearSelectionNotifications(categoryName?: string): void {

        if (categoryName) {
            delete this.validationMessages[categoryName];
        }
        else {
            this.validationMessages = {};
        }

        try {

            const xrm =
                (window as any).Xrm;

            const logicalName =
                this.context.parameters.adnic_productdetails
                    ?.attributes?.LogicalName ||
                "adnic_productdetails";

            const attribute =
                xrm?.Page?.getAttribute?.(logicalName);

            attribute?.controls?.forEach((control: any) => {
                control.clearNotification?.();
            });
        }
        catch (error) {
            console.warn(
                "Unable to clear product detail CRM notifications",
                error
            );
        }
    }

    private refreshPlanValidationMessages(): void {

        if (this.productType !== "EBP") {
            this.validationMessages = {};
            return;
        }

        const provider =
            this.selectedValues["Network Provider"]?.["ALL"] || "";

        const selectedPlans =
            this.selectedValues["Plan"] || {};

        this.categories.forEach((cat: any) => {

            const plan =
                selectedPlans[cat.name] || "";

            const stats =
                MemberStatistics.calculate(
                    this.context.parameters.adnic_memberlistjson?.raw || "",
                    cat.name
                );

            this.validationMessages[cat.name] =
                EbpRuleService.validatePlan(
                    provider,
                    plan,
                    stats,
                    selectedPlans,
                    cat.name
                ) || "";
        });
    }

    public render(
        container:HTMLDivElement
    )
    {
        console.log(
            "GridRenderer render", this.categories, this.premiumValues);
        
        const isEBP = this.productType === "EBP";

        this.refreshPlanValidationMessages();

        container.innerHTML = "";

        const grid =
            document.createElement("div");

        grid.className = "grid-container";

        if (this.isReadOnly) {
            grid.classList.add("readonly-grid");
        }

        grid.style.gridTemplateColumns =
            "40px 220px repeat("
            + this.categories.length
            + ", 1fr)";

        // ================= PERSIST EXISTING JSON =================
        if (
            !Object.keys(this.selectedValues).length &&
            this.context.parameters.adnic_productdetails?.raw
        ) {

            try {

                const existing =
                    JSON.parse(
                        this.context.parameters.adnic_productdetails.raw
                    );

                if (Array.isArray(existing)) {

                    existing.forEach((item: any) => {

                        const categoryCode =
                            item.categoryCode;

                        // provider
                        if (item.networkProvider?.name) {

                            this.selectedValues["Network Provider"] = {
                                ALL: item.networkProvider.name
                            };
                        }

                        // network type
                        if (item.network?.name) {

                        const networkKey =
                                isEBP
                                    ? "Plan"
                                    : "Network Type";

                            if (!this.selectedValues[networkKey]) {
                                this.selectedValues[networkKey] = {};
                            }

                            this.selectedValues[networkKey][categoryCode] =
                                item.network.name;
                        }

                        // benefits
                        (item.benefits || []).forEach((b: any) => {

                            if (!this.selectedValues[b.name]) {
                                this.selectedValues[b.name] = {};
                            }

                            this.selectedValues[b.name][categoryCode] =
                                b.value;
                        });
                    });
                }

            } catch { }
        }

        // ================= HEADER =================
        ["#", "Details"]
            .concat(this.categories.map(c => c.name))
            .forEach(h => {

                const d =
                    document.createElement("div");

                d.className =
                    "grid-header";

                d.innerText = ((h=="#" || h=="Details")? "" : "Category ")+ h;

                grid.appendChild(d);
            });

        // ================= ROWS =================

        let rowsToRender = this.productRows.filter((row: any) =>
            row.name !== "Network" &&
            row.name !== "OP Consultation Copayment Loading"
        );

        if (isEBP) {

            const provider =
                this.selectedValues["Network Provider"]?.["ALL"] || "";

            rowsToRender = [
                {
                    name: "Network Provider",
                    required: true
                },
                {
                    name: "Plan",
                    required: true
                },
                {
                    name: "Employee Salary <4000"
                },

                {
                    name: "Employee Salary <16000"
                },

                {
                    name: "Employee Salary <20000"
                },
                {
                    name: "Dependent"
                },
                {
                    name: "Annual Limit"
                },
                {
                    name: "Network Type"
                },
                {
                    name: "Territorial Coverage"
                }
            ];
        }

        rowsToRender.forEach((row: any, index: number) => {

            const rowClass =
                index % 2 === 0
                    ? "row-even"
                    : "row-odd";

            grid.appendChild(
                this.cell(index + 1, rowClass, "index")
            );

            // ================= REQUIRED LABEL =================
            const detailCell =
                document.createElement("div");

            detailCell.className =
                "grid-cell "
                + rowClass;

           if (
                row.name === "Network Provider" ||
                row.name === "Network Type" ||
                row.name === "Plan"
            ) {

                detailCell.innerHTML =
                    row.name
                    + ' <span class="required-star">*</span>';
            }
            else {

                detailCell.innerText =
                    row.name;
            }

            grid.appendChild(detailCell);

            const isProvider =
                row.name.toLowerCase()
                    .indexOf("provider") !== -1;

            // ================= NETWORK PROVIDER =================
            if (isProvider) {

               const selected =
                    this.selectedValues[row.name]?.["ALL"] || "";

              const providerOptions =
                        this.getOptions(row);

                    if (
                        isEBP &&
                        !selected &&
                        providerOptions.length > 0
                    ) {

                        this.selectedValues["Network Provider"] = {
                            ALL: providerOptions[0].value
                        };
                    }

                const dropdown =
                   DropdownFactory.create(
                        providerOptions,
                        selected,
                        this.isReadOnly,
                        true,
                        (val:string)=>{

                            this.clearSelectionNotifications();

                            this.selectedValues[row.name] = {
                                ALL: val
                            };

                            // reset network type
                            delete this.selectedValues["Network Type"];
                            delete this.selectedValues["Plan"];

                            const wrapper =
                                this.container.querySelector(".grid-wrapper") as HTMLDivElement;

                            if (wrapper) {
                               this.render(wrapper);
                            }

                            this.notifyOutputChanged();
                        }
                    );

                    const cell =
                        document.createElement("div");

                    cell.className =
                        "grid-cell " + rowClass;

                    if (
                    row.name === "Network Provider")
                    {
                        cell.style.gridColumn = `span ${this.categories.length}`;
                    }

                    cell.appendChild(dropdown);

                    // EBP validation message
                    if (
                        this.productType === "EBP" &&
                        row.name === "Plan"
                    ) {

                        const validationMessage =
                            this.validationMessages[row.name];

                        if (validationMessage) {

                            cell.classList.add(
                                "validation-cell"
                            );

                            const errorDiv =
                                document.createElement("div");

                            errorDiv.className =
                                "validation-error";

                            this.appendTextWithDirham(
                                errorDiv,
                                validationMessage
                            );

                            cell.appendChild(errorDiv);
                        }
                    }

                    grid.appendChild(cell);

            }
            else {

                // ================= OTHER ROWS =================
                this.categories.forEach(cat => {

                    let value =
                        this.selectedValues[row.name]?.[cat.name] || "";

                    // 🔥 AUTO SELECT BENEFITS
                    if (
                            !isEBP &&
                            !value &&
                            row.name !== "Network Provider" &&
                            row.name !== "Network Type"
                        ){

                        const opts =
                            this.getOptions(row);

                        if (opts.length > 0) {

                            value =
                                opts[0].value;

                            if (!this.selectedValues[row.name]) {
                                this.selectedValues[row.name] = {};
                            }

                            this.selectedValues[row.name][cat.name] =
                                value;
                        }
                    }

                   const isEbpDisplayRow =
                        isEBP &&
                        (
                            row.name === "Employee Salary <4000" ||
                            row.name === "Employee Salary <16000" ||
                            row.name === "Employee Salary <20000" ||
                            row.name === "Dependent" ||
                            row.name === "Annual Limit" ||
                            row.name === "Network Type" ||
                            row.name === "Territorial Coverage"
                        );

                    if (isEbpDisplayRow) {

                        const cell =
                            document.createElement("div");

                        cell.className =
                            "grid-cell " + rowClass;

                        const provider =
                            this.selectedValues["Network Provider"]?.["ALL"] || "";

                        const plan =
                            this.selectedValues["Plan"]?.[cat.name] || "";

                        const validationMessage =
                            this.validationMessages?.[cat.name] || "";

                        const stats =
                                MemberStatistics.calculate(
                                    this.context.parameters.adnic_memberlistjson?.raw || "",
                                    cat.name
                                );

                        switch (row.name) {

                            case "Employee Salary <4000":
                                cell.innerText = String(stats.salary4000 > 0 ? stats.salary4000 : "");
                                break;
                            case "Employee Salary <16000":
                                cell.innerText = String(stats.salary16000 > 0 ? stats.salary16000 : "");
                                break;

                            case "Employee Salary <20000":
                                cell.innerText = String(stats.salary20000 > 0 ? stats.salary20000 : "");
                                break;

                            case "Dependent":
                                cell.innerText = String(stats.dependent);
                                break;

                            case "Annual Limit":
                                this.appendTextWithDirham(
                                    cell,
                                    EbpRuleService.getAnnualLimit(
                                        provider,
                                        plan
                                    )
                                );
                                break;

                            case "Network Type":
                                cell.innerText =
                                    EbpRuleService.getNetworkType(
                                        provider,
                                        plan
                                    );
                                break;

                            case "Territorial Coverage":
                                cell.innerText =
                                   EbpRuleService.getCoverage(
                                        provider,
                                        plan
                                    );
                                break;
                        }

                        grid.appendChild(cell);
                        return;
                    }

                    if (
                        isEBP &&
                        row.name === "Plan" &&
                        !value
                    ) {

                        const opts =
                            this.getOptions(row);

                        if (opts.length > 0) {

                            value = opts[0].value;

                            if (!this.selectedValues["Plan"]) {
                                this.selectedValues["Plan"] = {};
                            }

                            this.selectedValues["Plan"][cat.name] =
                                value;
                        }

                        this.refreshPlanValidationMessages();
                    }

                    if (
                        isEBP &&
                        row.name === "Plan"
                    ) {
                        const provider =
                            this.selectedValues["Network Provider"]?.["ALL"] || "";

                        const stats =
                            MemberStatistics.calculate(
                                this.context.parameters.adnic_memberlistjson?.raw || "",
                                cat.name
                            );

                        this.validationMessages[cat.name] =
                            EbpRuleService.validatePlan(
                                provider,
                                value,
                                stats,
                                this.selectedValues["Plan"] || {},
                                cat.name
                            ) || "";
                    }

                    const dropdown =
                     DropdownFactory.create(
                            this.getOptions(row),
                            value,
                            this.isReadOnly,
                            row.name === "Network Type" ||
                            row.name === "Plan",
                            (val:string)=>{

                                if (row.name === "Plan") {
                                    this.clearSelectionNotifications(cat.name);
                                }

                                if (!this.selectedValues[row.name]) {
                                    this.selectedValues[row.name] = {};
                                }

                                if (
                                    this.productType === "EBP" &&
                                    row.name === "Plan"
                                ) {

                                    const provider =
                                        this.selectedValues["Network Provider"]?.["ALL"] || "";

                                    const stats =
                                        MemberStatistics.calculate(
                                            this.context.parameters.adnic_memberlistjson?.raw || "",
                                            cat.name
                                        );

                                    const nextPlanSelections = {
                                        ...(this.selectedValues["Plan"] || {})
                                    };

                                    nextPlanSelections[cat.name] = val;
                                    this.selectedValues[row.name][cat.name] = val;

                                    const validation =
                                        EbpRuleService.validatePlan(
                                            provider,
                                            val,
                                            stats,
                                            nextPlanSelections,
                                            cat.name
                                        );

                                    if (!this.validationMessages) {
                                        this.validationMessages = {};
                                    }

                                    this.validationMessages[cat.name] =
                                        validation || "";

                                    const wrapper =
                                        this.container.querySelector(".grid-wrapper") as HTMLDivElement;

                                    if (wrapper) {
                                        this.render(wrapper);
                                    }

                                    this.notifyOutputChanged();
                                    return;
                                }
                                else {
                                    this.selectedValues[row.name][cat.name] = val;
                                }

                                // Ruby validation
                                if (String(val).toLowerCase() === "ruby") {

                                    this.productRows.forEach((benefitRow: any) => {

                                       if (
                                                benefitRow.name === "Network Provider" ||
                                                benefitRow.name === "Network Type" ||
                                                benefitRow.name === "Plan"
                                            ) {
                                                return;
                                            }

                                        const currentValue =
                                            this.selectedValues[benefitRow.name]?.[cat.name];

                                        if (
                                            currentValue &&
                                            String(currentValue)
                                                .toLowerCase()
                                                .indexOf("nil co-pay") > -1
                                        ) {

                                            delete this.selectedValues[benefitRow.name][cat.name];

                                            const validOptions =
                                                (benefitRow.values || [])
                                                    .filter((v: any) =>
                                                        String(v.value)
                                                            .toLowerCase()
                                                            .indexOf("nil co-pay") === -1
                                                    );

                                            if (validOptions.length > 0) {

                                                this.selectedValues[benefitRow.name][cat.name] =
                                                    validOptions[0].value;
                                            }
                                        }
                                    });
                                }

                                const wrapper =
                                    this.container.querySelector(".grid-wrapper") as HTMLDivElement;

                                if (wrapper) {
                                   this.render(wrapper)
                                }

                                this.notifyOutputChanged();
                            }

                           // row.name === "Network Type" || row.name === "Plan"
                        );

                    const cell =
                        document.createElement("div");

                    cell.className =
                        "grid-cell " + rowClass;

                    cell.appendChild(dropdown);

                    if (
                        isEBP &&
                        row.name === "Plan"
                    ) {

                        const validationMessage =
                            this.validationMessages?.[cat.name] || "";

                        if (validationMessage) {

                            cell.classList.add(
                                "validation-cell"
                            );

                            const errorDiv =
                                document.createElement("div");

                            errorDiv.className =
                                "validation-error";

                            this.appendTextWithDirham(
                                errorDiv,
                                validationMessage
                            );

                            cell.appendChild(errorDiv);
                        }
                    }

                    grid.appendChild(cell);
                });
            }

        });

        container.appendChild(grid);
        this.renderPremiumFooter(container, this.premiumValues);
    }

        private renderTobLinks(
            container: HTMLDivElement
        ): void {

            const existing =
                container.querySelector(".tob-footer");

            if (existing) {
                existing.remove();
            }

            if (this.productType !== "EBP") {
                return;
            }

            const provider =
                this.selectedValues["Network Provider"]?.["ALL"] || "";

            if (!provider) {
                return;
            }

            const footer =
                document.createElement("div");

            footer.className =
                "tob-footer";

            footer.style.gridTemplateColumns =
                "40px 220px repeat("
                + this.categories.length
                + ", 1fr)";

            const empty1 =
                document.createElement("div");

            const label =
                document.createElement("div");

            label.className =
                "tob-label";

            label.innerText =
                "";

            footer.appendChild(empty1);
            footer.appendChild(label);

            this.categories.forEach((cat: any) => {

                const plan =
                    this.selectedValues["Plan"]?.[cat.name] || "";

                const cell =
                    document.createElement("div");

                cell.className =
                    "tob-cell";

                if (plan) {

                    const selectedPlan =
                        document.createElement("div");

                    const link =
                        document.createElement("a");

                    link.className =
                        "tob-link";

                    link.href =
                        EbpRuleService.getTobUrl(provider, plan);

                    link.target =
                        "_blank";

                    link.rel =
                        "noopener noreferrer";

                    link.innerText =
                        "TOB";

                    selectedPlan.className =
                        "tob-selected-plan";

                    selectedPlan.innerText =
                        plan + " : ";

                    cell.appendChild(selectedPlan);
                    cell.appendChild(link);
                }

                footer.appendChild(cell);
            });

            container.appendChild(footer);
        }

        private renderPremiumFooter(
            container: HTMLDivElement,
            premiumValues: string | null
        ): boolean {

            console.log(
                "GridRenderer renderPremiumFooter",
                premiumValues
            );

            const premiumRaw =premiumValues;

            if (!premiumRaw) {
                return false;
            }

            let premiums: any[] = [];

            try {

                premiums = JSON.parse(premiumRaw);

            } catch {

                return false;
            }

            if (!premiums.length) {
                return false;
            }

            console.log(
                "GridRenderer premiums",
                premiums
            );

            // ================= EXISTING FOOTER =================
            let footer =
                container.querySelector(
                    ".premium-footer"
                ) as HTMLDivElement;

            // ================= UPDATE EXISTING =================
            if (footer) {

                this.categories.forEach((cat: any) => {

                    const premium =
                        premiums.find((p: any) =>
                            p.categoryName === "CAT-" + cat.name ||
                            p.categoryName === cat.name ||
                            p.categoryName === ("Category " + cat.name)
                        );

                    if (!premium) {
                        return;
                    }

                    const cell =
                        footer.querySelector(
                            `[data-category="${cat.name}"]`
                        ) as HTMLDivElement;

                    if (!cell) {
                        return;
                    }

                    const amount =
                        cell.querySelector(
                            ".premium-amount"
                        ) as HTMLDivElement;

                    const members =
                        cell.querySelector(
                            ".premium-members"
                        ) as HTMLDivElement;

                    if (amount) {

                        amount.innerHTML =
                            "<img class='dirham-icon' src='"
                            + this.symbolUrl
                            + "' /> "
                            + Number(
                                premium.currentPremium || 0
                            ).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            });
                    }

                    if (members) {

                        members.innerText =
                            "Members "
                            + (premium.memberCount || 0);
                    }

                    this.renderPremiumTobLink(cell, cat.name);
                });

                return true;
            }

            // ================= CREATE FOOTER =================

            footer =
                document.createElement("div");

            footer.className =
                "premium-footer";

            footer.style.gridTemplateColumns =
                "40px 220px repeat("
                + this.categories.length
                + ", 1fr)";

            const empty1 =
                document.createElement("div");

            const empty2 =
                document.createElement("div");

            footer.appendChild(empty1);
            footer.appendChild(empty2);

            this.categories.forEach((cat: any) => {

                const premium =
                    premiums.find((p: any) =>
                        p.categoryName === "CAT-" + cat.name ||
                        p.categoryName === cat.name ||
                        p.categoryName === ("Category " + cat.name)
                    );

                const cell =
                    document.createElement("div");

                cell.className =
                    "premium-cell";

                cell.setAttribute(
                    "data-category",
                    cat.name
                );

                if (premium) {

                    cell.innerHTML =
                        "<div class='premium-title'>Category "
                        + cat.name
                        + " Premiums</div>"
                        + "<div class='premium-amount'>"
                        + "<img class='dirham-icon' src='"
                        + this.symbolUrl
                        + "' /> "
                        + Number(
                            premium.currentPremium || 0
                        ).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })
                        + "</div>"
                        + "<div class='premium-members'>Members "
                        + (premium.memberCount || 0)
                        + "</div>";

                    this.renderPremiumTobLink(cell, cat.name);
                }

                footer.appendChild(cell);
            });

            container.appendChild(footer);

            return true;
        }

        private renderPremiumTobLink(
            cell: HTMLDivElement,
            categoryName: string
        ): void {

            const existing =
                cell.querySelector(".premium-tob");

            if (existing) {
                existing.remove();
            }

            if (this.productType !== "EBP") {
                return;
            }

            const provider =
                this.selectedValues["Network Provider"]?.["ALL"] || "";

            const plan =
                this.selectedValues["Plan"]?.[categoryName] || "";

            const url =
                EbpRuleService.getTobUrl(provider, plan);

            if (!provider || !plan || !url) {
                return;
            }

            const wrapper =
                document.createElement("div");

            wrapper.className =
                "premium-tob";

            const selectedPlan =
                document.createElement("span");

            selectedPlan.className =
                "tob-selected-plan";

            selectedPlan.innerText =
                plan + " : ";

            const link =
                document.createElement("a");

            link.className =
                "tob-link";

            link.href =
                url;

            link.target =
                "_blank";

            link.rel =
                "noopener noreferrer";

            link.innerText =
                "TOB";

            wrapper.appendChild(selectedPlan);
            wrapper.appendChild(link);
            cell.appendChild(wrapper);
        }

    private getOptions(row: any) {

            const name =
                row.name.toLowerCase();

            const productCode =
                this.productType;

            const selectedProduct =
                (this.apiData.products || [])
                    .find((p: any) =>
                        p.productCode === productCode
                    );

            const productId =
                selectedProduct?.id;

            // ================= NETWORK PROVIDER =================
            if (name.indexOf("provider") !== -1) {

                return (this.apiData.networkProviders || [])

                    .filter((p: any) =>
                        p.productId === productId
                    )

                    .map((p: any) => ({
                        value: p.name,
                        label: p.name
                    }));
            }

            // ================= NETWORK TYPE / PLAN =================
            const isEBP =
                this.productType === "EBP";

            if (
                name.indexOf("type") !== -1 ||
                (isEBP && row.name === "Plan")
            ) {

                const selectedProvider =
                    this.selectedValues["Network Provider"]?.["ALL"];

                if (!selectedProvider) {
                    return [];
                }

                const providerObj =
                    (this.apiData.networkProviders || [])

                        .find((p: any) =>
                            p.name === selectedProvider
                        );

                if (!providerObj) {
                    return [];
                }

                return (this.apiData.networkTypes || [])

                    .filter((t: any) =>
                        t.networkProviderId === providerObj.id
                    )

                    .map((t: any) => ({
                        value: t.name,
                        label: t.name
                    }));
            }

            // ================= BENEFITS =================
            if (row.values) {

                let options =
                    row.values;

                const selectionField =
                    this.productType === "EBP"
                        ? "Plan"
                        : "Network Type";

                const networkSelections =
                    this.selectedValues[selectionField] || {};

                let hasRubySelected =
                    false;

                for (const key in networkSelections) {

                    if (
                        networkSelections[key] &&
                        String(networkSelections[key])
                            .toLowerCase() === "ruby"
                    ) {

                        hasRubySelected = true;
                        break;
                    }
                }

                if (hasRubySelected) {

                    options =
                        options.filter((v: any) =>
                            String(v.value)
                                .toLowerCase()
                                .indexOf("nil co-pay") === -1
                        );
                }

                return options.map((v: any) => ({
                    value: v.value,
                    label: v.value
                }));
            }

            return [];
        }

    private cell(
    text: any,
    rowClass?: string,
    extraClass?: string
    ) {

        const d =
            document.createElement("div");

        d.className =
            "grid-cell "
            + (rowClass || "")
            + " "
            + (extraClass || "");

        d.innerText = String(text);

        return d;
    }
}
