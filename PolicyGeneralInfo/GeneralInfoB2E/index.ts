/// <reference types="powerapps-component-framework" />
import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class PolicyInsuanceControlB2E implements ComponentFramework.StandardControl<IInputs, IOutputs> {

  private container!: HTMLDivElement;
  private members: any[] = [];
  private notifyOutputChanged!: () => void;

  private currentPage = 1;
  private pageSize = 10;
  
  private productType: string = "";

  private gridRef!: HTMLDivElement;
  private paginationRef!: HTMLDivElement;

  private lastRaw: string | null = null;

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {

    this.container = container;
    this.notifyOutputChanged = notifyOutputChanged;

    const wrapper = document.createElement("div");
    wrapper.className = "b2e-members-root";

    this.gridRef = document.createElement("div");
    this.paginationRef = document.createElement("div");
    this.paginationRef.className = "pagination";

    wrapper.appendChild(this.gridRef);
    wrapper.appendChild(this.paginationRef);

    this.container.appendChild(wrapper);
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {

    const raw = context.parameters.memberData.raw;
    const prodTyperaw=context.parameters.adnic_name.raw;

    if (raw !== this.lastRaw) {
      this.lastRaw = raw;

      try {
        const parsed = raw ? JSON.parse(raw) : {};
        const members = parsed.members || parsed || [];
        this.productType =prodTyperaw || "";
        console.log('producttype', this.productType);

        const enableUpload =
            context.parameters.enableUpload.raw === true;

        let mappedMembers = members.map((m: any) => ({
            id: m.id,
            relation: m.relation?.code || "",
            gender: m.gender,
            dateOfBirth: m.dateOfBirth,
            salaryType: m.salaryType,
            visaLocation: m.visaLocation,
            category: m.category,
            maritalStatus: m.maritalStatus,
            premium: m.premium?.finalPremium || "0.00"
        }));

        if (enableUpload) {
            mappedMembers = mappedMembers.filter((member:any) =>
                this.calculateAge(member.dateOfBirth) >= 65
            );
        }

        this.members = mappedMembers;

      } catch {
        this.members = [];
      }

      this.currentPage = 1;
    }

    this.refresh();
  }

  private refresh(): void {
    this.renderGrid(this.gridRef);
    this.renderPagination(this.paginationRef);
  }

  private createDropdown = (options: string[], value: string, field: string, idx: number) => {
    const select = document.createElement("select");
    select.className = "dropdown";

    options.forEach(o => {
      const opt = document.createElement("option");
      opt.value = o;
      opt.innerText = o;
      if (o === value) opt.selected = true;
      select.appendChild(opt);
    });

    select.onchange = () => {
      this.members[idx][field] = select.value;
      this.notifyOutputChanged();
    };

    return select;
  };
    
  // 🔥 Dropdown helper
  private createDropdownHelper(
    options: { code: string; label: string }[],
    value: string,
    field: string,
    idx: number
  ): HTMLSelectElement {

    const select = document.createElement("select");
    select.className = "dropdown";

    options.forEach(o => {
      const opt = document.createElement("option");
      opt.value = o.code;
      opt.innerText = o.label;

      if (o.code === value) opt.selected = true;

      select.appendChild(opt);
    });

    select.onchange = () => {
      this.members[idx][field] = select.value;
      this.notifyOutputChanged();
    };

    return select;
  }

  private renderGrid(container: HTMLDivElement): void {

    container.innerHTML = "";

    if (this.members.length === 0) {
      container.innerHTML = `<div class="empty-state">No members available</div>`;
      return;
    }

    const grid = document.createElement("div");
    grid.className = "grid-container";
    grid.style.width = "100%";

    // 🔥 Headers (MUST match column order)
    const headers = [
      "#",
      "Relation",
      "Gender",
      "DOB",
      "Salary",
      "Visa",
      "Category",
      "Marital",
      "Premium"
    ];

    headers.forEach(h => {
      const d = document.createElement("div");
      d.className = "grid-header";
      d.innerText = h;
      grid.appendChild(d);
    });

    const start = (this.currentPage - 1) * this.pageSize;
    const rows = this.members.slice(start, start + this.pageSize);

    rows.forEach((row, i) => {

      const idx = start + i;

      const cell = (el: HTMLElement | string) => {
        const d = document.createElement("div");
        d.className = "grid-cell";
        typeof el === "string" ? d.innerText = el : d.appendChild(el);
        return d;
      };

      // 🔥 Strict column order (DO NOT CHANGE ORDER)

      // 1. #
      grid.appendChild(cell((idx + 1).toString()));

      // 2. Relation
      grid.appendChild(cell(this.createDropdownHelper([
        { code: "EMPLOYEE", label: "Employee" },
        { code: "SPOUSE", label: "Spouse" },
        { code: "CHILD", label: "Child" }
      ], row.relation, "relation", idx)));

      // 3. Gender
      grid.appendChild(cell(this.createDropdownHelper([
        { code: "M", label: "Male" },
        { code: "F", label: "Female" }
      ], row.gender, "gender", idx)));

      // 4. DOB
      const dob = document.createElement("input");
      dob.type = "date";
      dob.className = "date-input";
      dob.value = row.dateOfBirth || "";

      dob.onchange = () => {
        this.members[idx].dateOfBirth = dob.value;
        this.notifyOutputChanged();
      };

      grid.appendChild(cell(dob));

      // 5. Salary
       grid.appendChild(
        cell(
          this.createDropdown(
            this.getSalaryOptions(),
            row.salaryType,
            "salaryType",
            idx
          )
        )
      );

      // 6. Visa
     grid.appendChild(
        cell(
          this.createDropdown(
            this.getVisaOptions(),
            row.visaLocation,
            "visaLocation",
            idx
          )
        )
      );

      // 7. Category
      grid.appendChild(cell(this.createDropdownHelper([
        { code: "A", label: "A" },
        { code: "B", label: "B" },
        { code: "C", label: "C" }
      ], row.category, "category", idx)));

      // 8. Marital
      grid.appendChild(cell(this.createDropdownHelper([
        { code: "Single", label: "Single" },
        { code: "Married", label: "Married" }
      ], row.maritalStatus, "maritalStatus", idx)));

      // 9. Premium
      grid.appendChild(
        cell(
          Number(row.premium || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })
        )
      );
    });

    container.appendChild(grid);
  }

  private renderPagination(container: HTMLDivElement): void {

    const total = this.members.length;
    const totalPages = Math.ceil(total / this.pageSize);

    container.innerHTML = "";

    const info = document.createElement("div");
    info.innerText = `Showing ${total === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1}
     to ${Math.min(this.currentPage * this.pageSize, total)} of ${total}`;

    const controls = document.createElement("div");

    const prev = document.createElement("button");
    prev.innerText = "Previous";
    prev.disabled = this.currentPage <= 1;

    const next = document.createElement("button");
    next.innerText = "Next";
    next.disabled = this.currentPage >= totalPages;

    prev.onclick = () => { this.currentPage--; this.refresh(); };
    next.onclick = () => { this.currentPage++; this.refresh(); };

    controls.appendChild(prev);
    controls.appendChild(next);

    container.appendChild(info);
    container.appendChild(controls);
  }

    private getSalaryOptions(): string[] {

  switch (this.productType) {

    case "EBP":
      return [
        "Less than 4000",
        "Less than 16000",
        "Less than 20000"
      ];

    default:
       return [
        "LSB",
        "Enhanced"
      ];
  }
}

private getVisaOptions(): string[] {

  switch (this.productType) {

    case "EBP":
      return [
        "DXB",
        "NE"
      ];

    default:
      return [
        "DXB",
        "AUH",
        "SHJ"
      ];
  }
}

private calculateAge(dob: string): number {

    if (!dob) return 0;

    const birthDate = new Date(dob);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();

    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
        age--;
    }

    return age;
}

  public getOutputs(): IOutputs {

    const output = this.members.map(m => ({
      id: m.id,
      relation: m.relation?.code,
      gender: m.gender,
      dateOfBirth: m.dateOfBirth,
      salaryType: m.salaryType,
      visaLocation: m.visaLocation,
      category: m.category,
      maritalStatus: m.maritalStatus,
      premium: m.premium?.finalPremium
    }));

    return {
      memberData: JSON.stringify({ members: output })
    };
  }

  public destroy(): void {}
}