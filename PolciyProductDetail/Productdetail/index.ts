/// <reference types="powerapps-component-framework" />
import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class PolicyProductDetail implements ComponentFramework.StandardControl<IInputs, IOutputs> {

  private container!: HTMLDivElement;
  private context!: ComponentFramework.Context<IInputs>;
  private notifyOutputChanged!: () => void;

  private lastRaw: string | null = null;
  private updatedData: any = null;
  private categoryPremiums:any=[];

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {

    this.context = context;
    this.container = container;
    this.notifyOutputChanged = notifyOutputChanged;

    const wrapper = document.createElement("div");
    wrapper.className = "card";

    const header = document.createElement("div");
    header.className = "top-section";

    const gridWrapper = document.createElement("div");
    gridWrapper.className = "grid-wrapper";

    wrapper.appendChild(header);
    wrapper.appendChild(gridWrapper);

    this.container.appendChild(wrapper);
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {


    this.context = context;

    const raw = context.parameters.productDetailsInput?.raw;


    if (!raw) return;

    // prevent unnecessary rerender
    if (this.lastRaw === raw) return;
    this.lastRaw = raw;

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    console.log("parsed updated value", parsed);
   
    if (!parsed || !parsed.productSelectionCategories) return;

    this.updatedData = parsed;

    const header = this.container.querySelector(".top-section") as HTMLDivElement;
    const wrapper = this.container.querySelector(".grid-wrapper") as HTMLDivElement;

    const categories = parsed.productSelectionCategories.categories || [];
    this.categoryPremiums=parsed.categoryPremiums;

    this.renderHeader(header, parsed);
    this.renderGrid(wrapper, categories);

    this.notifyOutputChanged();
  }

  // ================= HEADER =================

private renderHeader(container: HTMLDivElement, data: any): void {

    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "policy-header-grid";

    const headers = [
        "Policy Start",
        "Source of Business",
        "Commission",
        "Plan Type"
    ];

    headers.forEach(text => {
        const cell = document.createElement("div");
        cell.className = "policy-header-label";
        cell.innerText = text;
        grid.appendChild(cell);
    });

    const values = [
        data.policyStartDate || "-",
        data.sourceOfBusiness || "-",
        String(data.commission ?? "-")+"%",
        data.planType || "-"
    ];

    values.forEach(text => {
        const cell = document.createElement("div");
        cell.className = "policy-header-value";
        cell.innerText = text;
        grid.appendChild(cell);
    });

    container.appendChild(grid);
}

  private createField(label: string, value: any): HTMLDivElement {

    const div = document.createElement("div");
    div.className = "field";

    const l = document.createElement("div");
    l.className = "label";
    l.innerText = label;

    const v = document.createElement("div");
    v.className = "value";
    v.innerText = value ?? "-";

    div.appendChild(l);
    div.appendChild(v);

    return div;
  }

  // ================= GRID =================

  private renderGrid(container: HTMLDivElement, categories: any[]): void {

    
    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "grid-container";

    grid.style.gridTemplateColumns =
      `40px minmax(220px,2fr) repeat(${categories.length}, minmax(160px,1fr))`;

    // headers
    const headers = [
      "#",
      "Details",
      ...categories.map(c => `Category ${c.categoryCode}`)
    ];

    headers.forEach(h => {
      const d = document.createElement("div");
      d.className = "grid-header";
      d.innerText = h;
      grid.appendChild(d);
    });

    const rows = this.buildRows(categories);

    rows.forEach((rowName: string, index: number) => {

      grid.appendChild(this.cell(index + 1, "index"));
      grid.appendChild(this.cell(rowName));

      categories.forEach(cat => {

        let value = "";

        if (rowName === "Network Provider") {
          value = cat.productSelection?.networkProviderName || "";
        }
        else if (rowName === "Network Type") {
          value = cat.productSelection?.networkTypeName || "";
        }
        else {
          const benefit = (cat.benefits || []).find((b: any) => b.benefitName === rowName);

          if (benefit) {
            value = benefit.metadata?.currency
              ? `${benefit.metadata.currency} ${Number(benefit.value).toLocaleString()}`
              : benefit.benefitValue;
          }
        }

        const cell = document.createElement("div");
        cell.className = "grid-cell";
        cell.innerText = value || "-";

        grid.appendChild(cell);
      });

    });

    container.appendChild(grid);

    this.renderPremiumFooter(grid, categories);
  }

  private buildRows(categories: any[]): string[] {

    const set = new Set<string>();

    categories.forEach(cat => {

      set.add("Network Provider");
      set.add("Network Type");

      (cat.benefits || []).forEach((b: any) => {
        set.add(b.benefitName);
      });

    });

    return Array.from(set);
  }

  private cell(text: any, extraClass?: string): HTMLDivElement {

    const d = document.createElement("div");
    d.className = `grid-cell ${extraClass || ""}`;
    d.innerText = text ?? "";
    return d;
  }

  private createInput(value: string, onChange: (val: string) => void): HTMLInputElement {

    const input = document.createElement("input");
    input.className = "input";
    input.value = value || "";

    input.onchange = () => onChange(input.value);

    return input;
  }

  private renderPremiumFooter(
    grid: HTMLDivElement,
    categories: any[]
): void {

    // Row 1 Label
    grid.appendChild(this.cell(""));
    grid.appendChild(this.cell("Policy Level Premium", "footer-title"));

    categories.forEach(() => {
        grid.appendChild(this.cell("AED 0.00", "footer-value"));
    });

    // Row 2 Label
    grid.appendChild(this.cell(""));
    grid.appendChild(this.cell("Quote Level Premium", "footer-title"));

    categories.forEach(cat => {

        const premium =
            this.categoryPremiums.find(
                (p: any) =>
                    p.categoryName?.replace("CAT-", "") ===
                    cat.categoryCode
            );

        const value = premium?.currentPremium
            ? `AED ${Number(premium.currentPremium).toLocaleString(
                undefined,
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            )}`
            : "AED 0.00";

        grid.appendChild(
            this.cell(value, "footer-value")
        );
    });
}

  // ================= OUTPUT =================

  public getOutputs(): IOutputs {

    if (!this.updatedData) {
      return {
        productDetailsInput: undefined
      };
    }

    return {
      productDetailsInput: JSON.stringify(this.updatedData)
    };
  }

  public destroy(): void {}
}