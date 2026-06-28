import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class EbpControlPcf implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private container!: HTMLDivElement;
    private context!: ComponentFramework.Context<IInputs>;

    private lsbMemberCount: number = 0;
    private lsbPremium: number = 0;

    private symbolUrl = (window as any).Xrm.Utility.getGlobalContext().getClientUrl() + "/WebResources/adnic_dirham_symbol";

    public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
    ): void {

        this.container = container;
        this.context = context;

        this.render();
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {

        this.context = context;

        this.calculateValues();

        this.render();
    }

    private calculateValues(): void {

        this.lsbMemberCount = 0;
        this.lsbPremium = 0;

        //
        // Member Count
        //
        const memberJson = this.context.parameters.memberlistjson?.raw;

        if (memberJson) {

            try {

                const members = JSON.parse(memberJson);

                if (Array.isArray(members)) {

                    this.lsbMemberCount = members.filter(
                        (m: any) =>
                          ( (String(m.salaryType).toUpperCase() === "LSB") || (String(m.visaLocation).toUpperCase() === "LSB") 
                         || ( String(m.relation).toUpperCase() !== "EMPLOYEE" && (String(m.salaryType) === "" || String(m.salaryType).toUpperCase() === "ENHANCED") ))
                    ).length;
                }

            } catch (e) {
                console.log("Unable to parse memberlistjson", e);
            }
        }

        //
        // Category Premium
        //
        const premiumJson = this.context.parameters.categoryPremiums?.raw;

        if (premiumJson) {

            try {

                const categories = JSON.parse(premiumJson);

                if (Array.isArray(categories)) {

                    const category = categories.find(
                        (x: any) =>
                            String(x.categoryName).toUpperCase() === "CAT-LSB" || String(x.categoryName).toUpperCase() === "CAT-EBP"
                        );

                    if (category) {

                        this.lsbPremium = Number(
                            category.currentPremium ??
                            0
                        );
                    }
                }

            } catch (e) {
                console.log("Unable to parse categoryPremiums", e);
            }
        }
    }

    private render(): void {

        const show = this.context.parameters.showSummary.raw ?? false;

        requestAnimationFrame(() => {

            this.container.innerHTML = "";

            if (!show) return;

            const wrapper = document.createElement("div");
            wrapper.className = "plan-wrapper";

            wrapper.innerHTML = `
                <div class="plan-section">

                    <div class="plan-section-header">
                        Plan Type: EBP
                    </div>

                    <div class="plan-card">

                        <div class="plan-table">

                            <div class="row header">
                                <div>#</div>
                                <div>Details</div>
                                <div>Benefits</div>
                            </div>

                            ${this.getDropdownRow(
                                "1",
                                "Plan Type",
                                ["Basic EBP Plan"],
                                "Basic EBP Plan"
                            )}

                            ${this.getDropdownRow(
                                "2",
                                "Network Provider",
                                ["ECare"],
                                "ECare"
                            )}

                            ${this.getRow(
                                "",
                                "Consultation",
                                "20% Coinsurance",
                                true
                            )}

                            ${this.getRow(
                                "",
                                "Copay on Lab/Diagnostic",
                                "20% Copay for All OP Services",
                                true
                            )}

                            ${this.getRow(
                                "",
                                "Pharmacy Co-pay",
                                "30% Copay for Medication",
                                true
                            )}

                            ${this.getRow(
                                "",
                                "Pharmacy Limit",
                                "Maximum AED 2,500",
                                true
                            )}

                            ${this.getRow(
                                "",
                                "Co-Pay on all IP Services",
                                "20% Copay for IP Services",
                                true
                            )}

                        </div>

                        <div class="plan-footer">

                            <div></div>

                            <div class="footer-left" id="backBtn">
                            </div>

                            <div class="footer-right">
                                <div>
                                    Total Members: 
                                    <b>${this.lsbMemberCount}</b>
                                </div>

                                <div>
                                    Total Premium:                                    
                                    ${this.lsbPremium==0 ? "Calculate on save" : 
                                        "<img class='dirham-icon' src='" + this.symbolUrl + "' /> " +
                                        this.lsbPremium.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })}
                                </div>

                            </div>

                        </div>

                    </div>

                </div>
            `;

            this.container.appendChild(wrapper);

            this.bindEvents();
        });
    }

    private getDropdownRow(
        index: string,
        label: string,
        options: string[],
        selected: string
    ): string {

        const optionsHtml = options
            .map(
                opt =>
                    `<option value="${opt}" ${opt === selected ? "selected" : ""
                    }>${opt}</option>`
            )
            .join("");

        return `
            <div class="row">
                <div>${index}</div>
                <div>${label}</div>

                <div class="dropdown-wrapper">
                    <select class="dropdown" data-label="${label}">
                        ${optionsHtml}
                    </select>

                    <span class="dropdown-arrow">▼</span>
                </div>
            </div>
        `;
    }

    private getRow(
        index: string,
        label: string,
        value: string,
        isReadonly: boolean = false
    ): string {

        const className = isReadonly
            ? "row readonly-row"
            : "row";

        return `
            <div class="${className}">
                <div>${index}</div>
                <div>${label}</div>
                <div class="value">${value}</div>
            </div>
        `;
    }

    private bindEvents(): void {

        const dropdowns = this.container.querySelectorAll(".dropdown");

        dropdowns.forEach((dd: any) => {

            dd.addEventListener("change", (e: any) => {

                const label = e.target.getAttribute("data-label");
                const value = e.target.value;

                console.log(`${label} changed to ${value}`);
            });

        });
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void { }
}