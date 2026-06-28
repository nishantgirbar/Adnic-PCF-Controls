/// <reference types="powerapps-component-framework" />
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";

export class CustomListOfMembersB2E implements ComponentFramework.StandardControl<IInputs, IOutputs> {

  private container!: HTMLDivElement;
  private members: any[] = [];
  private salaryOptions: string[] = [
    "Less than 4000",
    "Less than 16000",
    "Less than 20000"
  ];

  private category: string[] = [
    "A"
  ];

  private notifyOutputChanged!: () => void;

  private above65MembersJson: string = "";
  private uniqueCategoriesJson: string = "";
  private showEbpPlan: boolean | undefined;

  private currentPage = 1;
  private pageSize = 10;

  private gridRef!: HTMLDivElement;
  private paginationRef!: HTMLDivElement;
  private context!: ComponentFramework.Context<IInputs>;

  private lastRaw: string | null = null;
  private enableUpload: boolean = false;
  private productType: string = "";
  private isReadOnly: boolean = false;

  private createEmptyMember(): any {

    return {
      relation: "",
      gender: "",
      dateOfBirth: null,
      salaryType: "",
      visaLocation: "",
      category: "",
      maritalStatus: "",
      document: "",
      documentName: ""
    };
  }

  private isLsbSalaryType(value: string | null | undefined): boolean {

    return (value || "").trim().toUpperCase() === "LSB";
  }

  private normalizeMemberCategoryForSalaryType(member: any): any {

    if (this.isLsbSalaryType(member.salaryType)) {
      return {
        ...member,
        category: ""
      };
    }

    return member;
  }

  private addNewMember(): void {

    if (this.isReadOnly) return;

    const newMember = this.createEmptyMember();

    this.members.push(newMember);
    this.currentPage = Math.ceil(this.members.length / this.pageSize) || 1;

    this.updateDerivedOutputJsons();
    this.notifyOutputChanged();
    this.refresh();
  }

  public init(context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement): void {

    this.context = context;
    this.container = container;
    this.notifyOutputChanged = notifyOutputChanged;

    const wrapper = document.createElement("div");
    wrapper.className = "b2e-members-root";

    const actionBar = document.createElement("div");
    actionBar.className = "action-bar";

    const addBtn = document.createElement("button");
    addBtn.innerText = "Add Row";
    addBtn.className = "btn primary";
    addBtn.disabled = this.isReadOnly;

    addBtn.onclick = () => this.addNewMember();

    const deleteBtn = document.createElement("button");
    deleteBtn.innerText = "Delete Selected";
    deleteBtn.className = "btn subtle";

    deleteBtn.onclick = async () => {

      if (this.isReadOnly) return;

      const checkboxes = this.container.querySelectorAll<HTMLInputElement>(".row-checkbox");

      const selectedRows = Array.from(checkboxes).filter(c => c.checked);

      // 🔥 No selection
      if (selectedRows.length === 0) {
        await this.context.navigation.openAlertDialog(
          {
            text: "Please select at least one row to delete.",
            confirmButtonLabel: "OK"
          },
          {
            width: 420,
            height: 180
          }
        );
        return;
      }

      // 🔥 Confirmation popup
      const result = await this.context.navigation.openConfirmDialog(
        {
          title: "Delete selected rows",
          text: `Are you sure you want to delete ${selectedRows.length} selected row(s)?`,
          confirmButtonLabel: "Delete",
          cancelButtonLabel: "Cancel"
        },
        {
          width: 460,
          height: 220
        }
      );

      if (!result.confirmed) {
        return;
      }

      // 🔥 Delete rows
      this.members = this.members.filter((_, i) => !checkboxes[i]?.checked);

      this.updateDerivedOutputJsons();

      this.notifyOutputChanged();
      this.refresh();
    };

    actionBar.appendChild(addBtn);
    actionBar.appendChild(deleteBtn);

    const grid = document.createElement("div");
    const pagination = document.createElement("div");
    pagination.className = "pagination";

    this.gridRef = grid;
    this.paginationRef = pagination;

    wrapper.appendChild(actionBar);
    wrapper.appendChild(grid);
    wrapper.appendChild(pagination);

    this.container.appendChild(wrapper);
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {

    this.context = context;
    this.enableUpload = context.parameters.enableUpload.raw ?? false;
    this.productType = (context.parameters.adnic_name?.raw || "").toUpperCase();
    this.isReadOnly = context.mode.isControlDisabled;
    console.log(
      "isReadOnly:",
      this.isReadOnly,
      "isControlDisabled:",
      context.mode.isControlDisabled
    );

    const raw = context.parameters.memberData.raw;

    if (raw !== this.lastRaw) {
      this.lastRaw = raw;

      try {
        // 🔥 NORMALIZE RELATION TO UPPERCASE
        this.members = (raw ? JSON.parse(raw) : []).map((m: any) =>
          this.normalizeMemberCategoryForSalaryType({
            ...m,
            relation: m.relation ? m.relation.toUpperCase() : ""
          })
        );
      } catch {
        console.warn("Invalid memberData JSON ignored.", raw);
      }

      //this.currentPage = 1;

    }

    if (this.updateDerivedOutputJsons()) {
      this.notifyOutputChanged();
    }

    this.refresh();
  }

  private updateDerivedOutputJsons(): boolean {

    const above65Changed = this.updateAbove65Members();
    const categoriesChanged = this.updateUniqueCategories();
    const showEbpPlanChanged = this.updateShowEbpPlan();

    return above65Changed || categoriesChanged || showEbpPlanChanged;
  }

  private updateShowEbpPlan(): boolean {

    const nextShowEbpPlan = this.members.some(member => {
      const relation = (member.relation || "").trim().toUpperCase();

      if (!relation) {
        return false;
      }

      return relation !== "EMPLOYEE" ||
        this.isLsbSalaryType(member.salaryType);
    });

    if (nextShowEbpPlan === this.showEbpPlan) {
      return false;
    }

    this.showEbpPlan = nextShowEbpPlan;
    return true;
  }

  private updateAbove65Members(): boolean {

    const referenceDate = this.getAgeReferenceDate();

    const above65 = this.members
      .filter(m =>
        this.getAge(
          m.dateOfBirth,
          referenceDate
        ) >= 65
      )
      .map(member => ({
        ...member,
        document: typeof member.document === "string"
          ? member.document
          : "",
        documentName: typeof member.documentName === "string"
          ? member.documentName
          : ""
      }));

    const nextAbove65MembersJson = JSON.stringify(above65);

    if (nextAbove65MembersJson === this.above65MembersJson) {
      return false;
    }

    this.above65MembersJson = nextAbove65MembersJson;
    return true;
  }

  private updateUniqueCategories(): boolean {

    const seen = new Set<string>();
    const uniqueCategories: string[] = [];

    this.members.forEach(member => {
      const value = (member.category || "").trim();
      const key = value.toUpperCase();

      if (value && !seen.has(key)) {
        seen.add(key);
        uniqueCategories.push(value);
      }
    });

    const nextUniqueCategoriesJson = JSON.stringify(uniqueCategories);

    if (nextUniqueCategoriesJson === this.uniqueCategoriesJson) {
      return false;
    }

    this.uniqueCategoriesJson = nextUniqueCategoriesJson;
    return true;
  }

  private getAgeReferenceDate(): Date {

    return this.context.parameters.policy_start_date?.raw ?? new Date();
  }

  private getAge(
    dob: string,
    policyStartDate?: Date | null
  ): number {

    if (!dob) {
      return 0;
    }

    const birthDate = new Date(dob);

    if (isNaN(birthDate.getTime())) {
      return 0;
    }

    const referenceDate =
      policyStartDate ?? new Date();

    let age =
      referenceDate.getFullYear() -
      birthDate.getFullYear();

    const monthDiff =
      referenceDate.getMonth() -
      birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (
        monthDiff === 0 &&
        referenceDate.getDate() < birthDate.getDate()
      )
    ) {
      age--;
    }

    return age;
  }

  private parseDisplayDate(value: string): string | null {

    const parts = value.split("/");

    if (parts.length !== 3) {
      return null;
    }

    const month = Number(parts[0]);
    const day = Number(parts[1]);
    const year = Number(parts[2]);

    if (
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      !Number.isInteger(year) ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31 ||
      year < 1900
    ) {
      return null;
    }

    const parsedDate = new Date(year, month - 1, day);

    if (
      parsedDate.getFullYear() !== year ||
      parsedDate.getMonth() !== month - 1 ||
      parsedDate.getDate() !== day
    ) {
      return null;
    }

    return year + "-" +
      ("0" + month).slice(-2) + "-" +
      ("0" + day).slice(-2);
  }


  private getSalaryOptions(): string[] {

    switch (this.productType) {

      case "EBP":
        return this.getDistinctValuesFromMemberData("salaryType");

      case "DIFC":
      case "SME":
        return [
          "LSB",
          "Enhanced"
        ];

      default:
        return [];
    }
  }

  //getCategoryOptions
  private getCategoryOptions(): string[] {

    return this.getDistinctCategoryOptionsFromMemberData("category");
  }

  private getDistinctCategoryOptionsFromMemberData(fieldName: string): string[] {

    this.category=[];
    const seen = new Set<string>();

    this.members.forEach(member => {
      const value = (member[fieldName] || "").trim();
      const key = value.toUpperCase();
      if (
        value &&
        !seen.has(key) &&
        !this.category.some(
          x => x.toUpperCase() === value.toUpperCase()
        )
      ) {
        seen.add(key);
        this.category.push(value);
      }
    });

    return this.category;
  }

  private getDistinctValuesFromMemberData(fieldName: string): string[] {

    const seen = new Set<string>();

    this.members.forEach(member => {
      const value = (member[fieldName] || "").trim();
      const key = value.toUpperCase();
      if (
        value &&
        !seen.has(key) &&
        !this.salaryOptions.some(
          x => x.toUpperCase() === value.toUpperCase()
        )
      ) {
        seen.add(key);
        this.salaryOptions.push(value);
      }
    });

    return this.salaryOptions;
  }

  private getVisaOptions(): string[] {

    switch (this.productType) {

      case "EBP":
        return [
          "DXB",
          "NE"
        ];

      case "DIFC":
      case "SME":
        return [
          "DXB",
          "AUH",
          "NE"
        ];

      default:
        return [];
    }
  }

  private refresh(): void {

    const addBtn = this.container.querySelector(".btn.primary") as HTMLButtonElement;
    if (addBtn) addBtn.disabled = this.isReadOnly;

    const deleteBtn = this.container.querySelector(".btn.subtle") as HTMLButtonElement;
    if (deleteBtn) deleteBtn.disabled = this.isReadOnly;

    this.renderGrid(this.gridRef);
    this.renderPagination(this.paginationRef);
  }

  private renderGrid(container: HTMLDivElement): void {

    container.innerHTML = "";

    if (this.members.length === 0) {
      const emptyState = document.createElement("button");
      emptyState.type = "button";
      emptyState.className = "empty-state";
      emptyState.disabled = true;
      emptyState.innerText = "No members available, Upload members using excel";
      emptyState.onclick = () => this.addNewMember();
      container.appendChild(emptyState);
      return;
    }

    const scroll = document.createElement("div");
    scroll.className = "grid-scroll";

    const grid = document.createElement("div");
    grid.className = "grid-container";

    const headers = ["", "#", "Relation", "Gender", "DOB", "Salary", "Visa", "Category", "Marital"];

    headers.forEach(h => {
      const d = document.createElement("div");
      d.className = "grid-header";
      d.innerText = h;
      grid.appendChild(d);
    });

    const start = (this.currentPage - 1) * this.pageSize;
    const rows = this.members.slice(start, start + this.pageSize);

    const createDropdown = (
      options: string[],
      value: string,
      field: string,
      idx: number,
      forceDisabled = false
    ) => {
      const select = document.createElement("select");
      select.className = "dropdown";
      select.disabled = this.isReadOnly || forceDisabled;

      const currentValue = (value || "").trim();
      const normalizedCurrentValue = currentValue.toUpperCase();
      const dropdownOptions = currentValue && !options.some(o => o.trim().toUpperCase() === normalizedCurrentValue)
        ? [currentValue, ...options]
        : options;

      const emptyOpt = document.createElement("option");
      emptyOpt.value = "";
      emptyOpt.innerText = "";
      emptyOpt.selected = !currentValue;
      select.appendChild(emptyOpt);

      dropdownOptions.forEach(o => {
        const opt = document.createElement("option");
        opt.value = o;
        opt.innerText = o;
        if (o.trim().toUpperCase() === normalizedCurrentValue) opt.selected = true;
        select.appendChild(opt);
      });

      select.onchange = () => {
        this.members[idx][field] = select.value;

        if (field === "salaryType" && this.isLsbSalaryType(select.value)) {
          this.members[idx].category = "";
        }

        this.updateDerivedOutputJsons();
        this.notifyOutputChanged();

        if (field === "salaryType") {
          this.refresh();
        }
      };

      return select;
    };

    rows.forEach((row, i) => {

      const idx = start + i;

      const cell = (el: HTMLElement | string) => {
        const d = document.createElement("div");
        d.className = "grid-cell";
        typeof el === "string" ? d.innerText = el : d.appendChild(el);
        return d;
      };

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "row-checkbox";
      cb.disabled = this.isReadOnly;

      grid.appendChild(cell(cb));
      grid.appendChild(cell((idx + 1).toString()));

      // 🔥 RELATION DROPDOWN (FIXED)
      const relationOptions = [
        { code: "", display: "" },
        { code: "EMPLOYEE", display: "Employee" },
        { code: "SPOUSE", display: "Spouse" },
        { code: "CHILD", display: "Child" }
      ];

      const relationSelect = document.createElement("select");
      relationSelect.className = "dropdown";

      relationSelect.disabled = this.isReadOnly;

      relationOptions.forEach(o => {
        const opt = document.createElement("option");
        opt.value = o.code;
        opt.innerText = o.display;
        if (o.code === row.relation) opt.selected = true;
        relationSelect.appendChild(opt);
      });

      relationSelect.onchange = () => {
        // 🔥 FORCE UPPERCASE
        this.members[idx].relation = relationSelect.value.toUpperCase();

        this.updateDerivedOutputJsons();
        this.notifyOutputChanged();
      };

      grid.appendChild(cell(relationSelect));

      // OTHER FIELDS (UNCHANGED)
      grid.appendChild(cell(createDropdown(["Male", "Female"], row.gender, "gender", idx)));


      const dob = document.createElement("input");
      dob.type = "text";
      dob.className = "date-input";
      dob.disabled = this.isReadOnly;

      const displayDate = row.dateOfBirth
        ? row.dateOfBirth.split("-")[1] + "/" +
        row.dateOfBirth.split("-")[2] + "/" +
        row.dateOfBirth.split("-")[0]
        : "";

      dob.value = displayDate;

      const commitDob = async () => {

        if (!dob.value) {
          this.members[idx].dateOfBirth = null;
          this.updateDerivedOutputJsons();
          this.notifyOutputChanged();
          return;
        }

        const parsedDate = this.parseDisplayDate(dob.value);

        if (!parsedDate) {
          dob.value = displayDate;
          await this.context.navigation.openAlertDialog(
            {
              text: "Please enter a valid date.",
              confirmButtonLabel: "OK"
            },
            {
              width: 420,
              height: 180
            }
          );
          return;
        }

        this.members[idx].dateOfBirth = parsedDate;

        this.updateDerivedOutputJsons();
        this.notifyOutputChanged();
      };

      if (!this.isReadOnly) {
        flatpickr(dob, {
          dateFormat: "m/d/Y",
          allowInput: true,
          defaultDate: displayDate,
          onChange: () => { void commitDob(); },
          onClose: () => { void commitDob(); }
        });
      }

      dob.onchange = () => { void commitDob(); };
      grid.appendChild(cell(dob));


      grid.appendChild(
        cell(
          createDropdown(
            this.getSalaryOptions(),
            row.salaryType,
            "salaryType",
            idx
          )
        )
      );

      grid.appendChild(
        cell(
          createDropdown(
            this.getVisaOptions(),
            row.visaLocation,
            "visaLocation",
            idx
          )
        )
      );

      const isLsbSalaryType = this.isLsbSalaryType(row.salaryType);
      grid.appendChild(
        cell(
          createDropdown(
            isLsbSalaryType ? [] : this.getCategoryOptions(),
            isLsbSalaryType ? "" : row.category,
            "category",
            idx,
            isLsbSalaryType
          )
        )
      );
      grid.appendChild(cell(createDropdown(["Single", "Married"], row.maritalStatus, "maritalStatus", idx)));

      const age = this.getAge(row.dateOfBirth, this.getAgeReferenceDate());

      if (age >= 65 && this.enableUpload) {

        const uploadRow = document.createElement("div");
        uploadRow.className = "upload-row";
        uploadRow.style.gridColumn = "1 / -1";

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.style.display = "none";

        const btn = document.createElement("button");
        btn.className = "upload-btn";
        btn.innerText = "Upload";


        const attachmentLink = document.createElement("a");
        attachmentLink.className = "file-name";

        const updateAttachmentLink = (
          documentContent: unknown,
          documentName: unknown
        ): void => {
          const content = typeof documentContent === "string"
            ? documentContent
            : "";
          const fileName = typeof documentName === "string"
            ? documentName
            : "";

          attachmentLink.innerText = fileName || (content ? "Attached file" : "");

          if (content) {
            attachmentLink.href = content;
            attachmentLink.download = fileName || "attachment";
            attachmentLink.target = "_blank";
          } else {
            attachmentLink.removeAttribute("href");
            attachmentLink.removeAttribute("download");
            attachmentLink.removeAttribute("target");
          }
        };

        updateAttachmentLink(row.document, row.documentName);

        btn.onclick = () => {

          if (this.isReadOnly) return;

          fileInput.click();
        };

        fileInput.onchange = () => {
          const file = fileInput.files?.[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = () => {
            this.members[idx].document = reader.result;
            this.members[idx].documentName = file.name;
            updateAttachmentLink(reader.result, file.name);
            this.updateDerivedOutputJsons();

            this.notifyOutputChanged();
          };
          reader.readAsDataURL(file);
        };

        uploadRow.appendChild(btn);
        uploadRow.appendChild(fileInput);
        uploadRow.appendChild(attachmentLink);

        grid.appendChild(uploadRow);
      }
    });

    scroll.appendChild(grid);
    container.appendChild(scroll);
  }

  private renderPagination(container: HTMLDivElement): void {

    const total = this.members.length;
    const totalPages = Math.ceil(total / this.pageSize);

    container.innerHTML = "";

    const info = document.createElement("div");
    info.innerText = `Showing ${total === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1} to ${Math.min(this.currentPage * this.pageSize, total)} of ${total}`;

    const controls = document.createElement("div");

    const prev = document.createElement("button");
    prev.innerText = "Previous";
    prev.disabled = total === 0 || this.currentPage <= 1;

    const next = document.createElement("button");
    next.innerText = "Next";
    next.disabled = total === 0 || this.currentPage >= totalPages;

    prev.onclick = () => { this.currentPage--; this.refresh(); };
    next.onclick = () => { this.currentPage++; this.refresh(); };

    controls.appendChild(prev);
    controls.appendChild(next);

    container.appendChild(info);
    container.appendChild(controls);
  }

  public getOutputs(): IOutputs {
    return {
      memberData: JSON.stringify(this.members),
      listOfMemberAbove65: this.above65MembersJson,
      uniqueCategoriesJson: this.uniqueCategoriesJson,
      adnic_adnic_showebpplan: this.showEbpPlan
    };
  }

  public destroy(): void { }
}
