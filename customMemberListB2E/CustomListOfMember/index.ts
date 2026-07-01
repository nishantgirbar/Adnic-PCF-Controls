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
  private addBtn!: HTMLButtonElement;
  private deleteBtn!: HTMLButtonElement;

  private createEmptyMember(): any {

    return {
      relation: "",
      gender: "",
      dateOfBirth: null,
      salaryType: "",
      visaLocation: "",
      category: "",
      maritalStatus: "",
      remarks: "",
      attachments: [],
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

    const style = document.createElement("style");
    style.innerText = `
      .attachments-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
      }
      .attachment-item {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        padding: 6px 8px;
        border: 1px solid #ddd;
        border-radius: 6px;
        background: #fbfbfb;
      }
      .attachment-name {
        font-size: 12px;
        font-weight: 600;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 180px;
      }
      .attachment-view-btn,
      .attachment-download-btn,
      .attachment-delete-btn {
        padding: 4px 10px;
        border: 1px solid #bbb;
        border-radius: 4px;
        background: #fff;
        cursor: pointer;
        font-size: 12px;
      }
      .attachment-view-btn { color: #1558d6; }
      .attachment-download-btn { color: #117a31; }
      .attachment-delete-btn { color: #c93a3a; }
      .attachment-view-btn:disabled,
      .attachment-download-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `;
    wrapper.appendChild(style);

    const actionBar = document.createElement("div");
    actionBar.className = "action-bar";

    const addBtn = document.createElement("button");
    addBtn.innerText = "Add Row";
    addBtn.className = "btn primary";
    addBtn.disabled = this.isReadOnly;
    this.addBtn = addBtn;

    addBtn.onclick = () => this.addNewMember();

    const deleteBtn = document.createElement("button");
    deleteBtn.innerText = "Delete Selected";
    deleteBtn.className = "btn subtle";
    this.deleteBtn = deleteBtn;
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

    if (this.addBtn) {
      this.addBtn.style.display = this.enableUpload ? "none" : "";
    }

    if (this.deleteBtn) {
      this.deleteBtn.style.display = this.enableUpload ? "none" : "";
    }

    const raw = context.parameters.memberData.raw;

    if (raw !== this.lastRaw) {
      this.lastRaw = raw;

      try {
        // 🔥 NORMALIZE RELATION TO UPPERCASE
        this.members = (raw ? JSON.parse(raw) : []).map((m: any) => {
          const attachments = Array.isArray(m.attachments)
            ? m.attachments.map((a: any) => ({
              name: String(a?.name || ""),
              mimeType: String(a?.mimeType || "application/pdf"),
              size: Number(a?.size || 0),
              annotationId: String(a?.annotationId || a?.id || "")
            }))
            : (m.document || m.documentName)
              ? [{
                name: String(m.documentName || ""),
                mimeType: "application/pdf",
                size: 0,
                annotationId: ""
              }]
              : [];

          return this.normalizeMemberCategoryForSalaryType({
            ...m,
            relation: m.relation ? m.relation.toUpperCase() : "",
            remarks: String(m.remarks || ""),
            attachments,
            document: "",
            documentName: attachments[0]?.name || String(m.documentName || "")
          });
        });
      } catch {
        console.warn("Invalid memberData JSON ignored.", raw);
      }

      //this.currentPage = 1;

      if (this.members === null || this.members.length == 0) {
        if (this.addBtn) {
          this.addBtn.style.display = this.enableUpload ? "none" : "";
        }

        if (this.deleteBtn) {
          this.deleteBtn.style.display = this.enableUpload ? "none" : "";
        }
      }

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
      .map(member => {
        const attachments = Array.isArray(member.attachments)
          ? member.attachments.map((a: any) => ({
            name: String(a?.name || ""),
            mimeType: String(a?.mimeType || "application/pdf"),
            size: Number(a?.size || 0),
            annotationId: String(a?.annotationId || a?.id || "")
          }))
          : (member.document || member.documentName)
            ? [{
              name: String(member.documentName || ""),
              mimeType: "application/pdf",
              size: 0,
              annotationId: ""
            }]
            : [];

        return {
          ...member,
          remarks: String(member.remarks || ""),
          attachments,
          document: "",
          documentName: typeof member.documentName === "string"
            ? member.documentName
            : attachments[0]?.name || ""
        };
      });

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

  private getCurrentRecordContext(): { entityId: string; entityTypeName: string; entitySetName: string } {
    const pageContext = (this.context as any).page;
    const xrmPageContext = (window as any)?.Xrm?.Utility?.getPageContext?.();

    const entityId = String(
      pageContext?.entityId ||
      xrmPageContext?.input?.entityId ||
      ""
    ).replace(/[{}]/g, "");

    const entityTypeName = String(
      pageContext?.entityTypeName ||
      xrmPageContext?.input?.entityTypeName ||
      ""
    ).toLowerCase();

    const entitySetName = entityTypeName ? `${entityTypeName}s` : "";

    return {
      entityId,
      entityTypeName,
      entitySetName
    };
  }

  private async convertFileToBase64(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Unable to convert file to base64"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private async uploadFileToAnnotation(file: File): Promise<string> {
    const { entityId, entityTypeName, entitySetName } = this.getCurrentRecordContext();

    if (!entityId || !entityTypeName || !entitySetName) {
      throw new Error("Cannot upload attachment: current CRM record context is missing.");
    }

    const dataUrl = await this.convertFileToBase64(file);
    const base64 = dataUrl.split(",").slice(1).join(",");

    const body: any = {
      subject: file.name,
      filename: file.name,
      mimetype: file.type || "application/pdf",
      documentbody: base64,
      notetext: "Uploaded from Member List control"
    };

    body[`objectid_${entityTypeName}@odata.bind`] = `/${entitySetName}(${entityId})`;

    const annotationId = await this.context.webAPI.createRecord("annotation", body);

    return String(annotationId || "");
  }

  private async retrieveAnnotationContent(annotationId: string): Promise<{ fileName: string; mimeType: string; size: number; base64: string } | null> {
    try {
      const annotation = await this.context.webAPI.retrieveRecord(
        "annotation",
        annotationId,
        "?$select=documentbody,mimetype,filename,filesize"
      );

      return {
        fileName: annotation.filename || "",
        mimeType: annotation.mimetype || "application/pdf",
        size: Number(annotation.filesize || 0),
        base64: annotation.documentbody || ""
      };
    } catch (error) {
      console.error("Failed to retrieve annotation content", error);
      return null;
    }
  }

  private async retrieveAnnotationBlob(annotationId: string): Promise<Blob | null> {
    const annotation = await this.retrieveAnnotationContent(annotationId);
    if (!annotation?.base64) {
      return null;
    }

    const byteChars = atob(annotation.base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: annotation.mimeType });
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

  private validateRelationAge(member: any): string | null {
    const relation = (member.relation || "").trim().toUpperCase();

    if (!member.dateOfBirth) {
      return null;
    }

    const age = this.getAge(
      member.dateOfBirth,
      this.getAgeReferenceDate()
    );

    if (relation === "EMPLOYEE" && age < 18) {
      return "Employee must be at least 18 years old.";
    }

    if (relation === "CHILD" && age > 24) {
      return "Child cannot be older than 24 years.";
    }

    return null;
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

    this.category = [];
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

      relationSelect.onchange = async () => {
        const previousRelation = row.relation;

        // 🔥 FORCE UPPERCASE
        this.members[idx].relation = relationSelect.value.toUpperCase();

        const validationError = this.validateRelationAge(this.members[idx]);

        if (validationError) {
          this.members[idx].relation = previousRelation;
          relationSelect.value = previousRelation;

          await this.context.navigation.openAlertDialog(
            {
              text: validationError,
              confirmButtonLabel: "OK"
            },
            {
              width: 420,
              height: 180
            }
          );
          return;
        }

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
        const previousDob = row.dateOfBirth;

        if (!dob.value) {
          this.members[idx].dateOfBirth = null;
          this.updateDerivedOutputJsons();
          this.notifyOutputChanged();
          this.refresh();
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

        const validationError = this.validateRelationAge(this.members[idx]);

        if (validationError) {
          this.members[idx].dateOfBirth = previousDob;
          dob.value = displayDate;

          await this.context.navigation.openAlertDialog(
            {
              text: validationError,
              confirmButtonLabel: "OK"
            },
            {
              width: 420,
              height: 180
            }
          );
          return;
        }

        this.updateDerivedOutputJsons();
        this.notifyOutputChanged();
        this.refresh();
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
        fileInput.multiple = true;
        fileInput.style.position = "absolute";
        fileInput.style.left = "-9999px";
        fileInput.style.width = "0";
        fileInput.style.height = "0";
        fileInput.style.opacity = "0";
        fileInput.style.pointerEvents = "none";

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "upload-btn";
        btn.innerText = "Upload files";

        const attachmentsContainer = document.createElement("div");
        attachmentsContainer.className = "attachments-list";

        const remarksField = document.createElement("textarea");
        remarksField.className = "remarks-input";
        remarksField.placeholder = "Enter remarks";
        remarksField.disabled = this.isReadOnly;
        remarksField.value = String(row.remarks || "");
        remarksField.onchange = () => {
          row.remarks = remarksField.value;
          this.updateDerivedOutputJsons();
          this.notifyOutputChanged();
        };

        const renderAttachments = (): void => {
          attachmentsContainer.innerHTML = "";
          const attachments = Array.isArray(row.attachments)
            ? row.attachments
            : [];

          attachments.forEach((attachment: any, attachmentIndex: number) => {
            const item = document.createElement("div");
            item.className = "attachment-item";

            const fileName = document.createElement("span");
            fileName.className = "attachment-name";
            fileName.innerText = attachment.name || `File ${attachmentIndex + 1}`;

            const viewBtn = document.createElement("button");
            viewBtn.type = "button";
            viewBtn.className = "attachment-view-btn";
            viewBtn.innerText = "View";
            viewBtn.disabled = !attachment.annotationId && !attachment.content;
            viewBtn.onclick = async () => {
              const openUrl = (url: string) => {
                try {
                  window.open(url, "_blank");
                } catch (e) {
                  const w = window.open();
                  if (w) {
                    w.document.write(`<html><body><iframe src="${url}" style="width:100%;height:100%;border:none"></iframe></body></html>`);
                    w.document.close();
                  }
                }
              };

              const viewAnnotation = async () => {
                if (!attachment.annotationId) {
                  return;
                }

                const blob = await this.retrieveAnnotationBlob(attachment.annotationId);
                if (!blob) {
                  return;
                }

                const url = URL.createObjectURL(blob);
                openUrl(url);
                setTimeout(() => URL.revokeObjectURL(url), 10000);
              };

              const viewLocalContent = async () => {
                const content = String(attachment.content || "");
                if (!content) {
                  await viewAnnotation();
                  return;
                }

                if (content.startsWith("data:")) {
                  try {
                    const parts = content.split(",");
                    const meta = parts[0];
                    const b64 = parts.slice(1).join(",");
                    const isBase64 = meta.endsWith(";base64") || meta.includes(";base64;");
                    const mimeType = (meta.split(":")[1] || "application/octet-stream").split(";")[0] || "application/octet-stream";
                    if (isBase64) {
                      const byteChars = atob(b64);
                      const byteNumbers = new Array(byteChars.length);
                      for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
                      const byteArray = new Uint8Array(byteNumbers);
                      const blob = new Blob([byteArray], { type: mimeType });
                      const url = URL.createObjectURL(blob);
                      openUrl(url);
                      setTimeout(() => URL.revokeObjectURL(url), 10000);
                      return;
                    }
                  } catch (e) {
                    // fallthrough to try opening raw
                  }
                  openUrl(content);
                  return;
                }

                try {
                  const sanitized = content.replace(/\s+/g, "");
                  const byteChars = atob(sanitized);
                  const byteNumbers = new Array(byteChars.length);
                  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
                  const byteArray = new Uint8Array(byteNumbers);
                  const blob = new Blob([byteArray], { type: attachment.mimeType || "application/pdf" });
                  const url = URL.createObjectURL(blob);
                  openUrl(url);
                  setTimeout(() => URL.revokeObjectURL(url), 10000);
                  return;
                } catch (e) {
                  await viewAnnotation();
                  return;
                }
              };

              await viewLocalContent();
            };

            const downloadBtn = document.createElement("button");
            downloadBtn.type = "button";
            downloadBtn.className = "attachment-download-btn";
            downloadBtn.innerText = "Download";
            downloadBtn.disabled = !attachment.annotationId && !attachment.content;
            downloadBtn.onclick = async () => {
              const downloadBlob = async (): Promise<Blob | null> => {
                if (attachment.annotationId) {
                  return await this.retrieveAnnotationBlob(attachment.annotationId);
                }

                const content = String(attachment.content || "");
                if (!content) {
                  return null;
                }

                if (content.startsWith("data:")) {
                  const parts = content.split(",");
                  const b64 = parts.slice(1).join(",");
                  const mimeType = (parts[0].split(":")[1] || "application/octet-stream").split(";")[0] || "application/octet-stream";
                  const byteChars = atob(b64);
                  const byteNumbers = new Array(byteChars.length);
                  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
                  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
                }

                const sanitized = content.replace(/\s+/g, "");
                const byteChars = atob(sanitized);
                const byteNumbers = new Array(byteChars.length);
                for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
                return new Blob([new Uint8Array(byteNumbers)], { type: attachment.mimeType || "application/pdf" });
              };

              const blob = await downloadBlob();
              if (!blob) {
                return;
              }

              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = attachment.name || "download.pdf";
              document.body.appendChild(anchor);
              anchor.click();
              document.body.removeChild(anchor);
              setTimeout(() => URL.revokeObjectURL(url), 10000);
            };

            const deleteBtn = document.createElement("button");
            deleteBtn.type = "button";
            deleteBtn.className = "attachment-delete-btn";
            deleteBtn.innerText = "Delete";
            deleteBtn.onclick = () => {
              row.attachments = row.attachments || [];
              row.attachments.splice(attachmentIndex, 1);
              if (row.attachments.length > 0) {
                row.document = "";
                row.documentName = row.attachments[0].name;
              } else {
                row.document = "";
                row.documentName = "";
              }
              this.updateDerivedOutputJsons();
              this.notifyOutputChanged();
              renderAttachments();
            };

            item.appendChild(fileName);
            item.appendChild(viewBtn);
            item.appendChild(downloadBtn);
            item.appendChild(deleteBtn);
            attachmentsContainer.appendChild(item);
          });
        };

        const addAttachments = async (): Promise<void> => {
          const files = Array.from(fileInput.files || []);
          if (!files.length) return;

          // Validate files: must be PDF and <= 2MB
          const MAX_BYTES = 2 * 1024 * 1024; // 2MB
          const invalids: string[] = [];
          files.forEach(f => {
            const name = f.name || "(unnamed)";
            if (f.size > MAX_BYTES) invalids.push(`${name} — file too large`);
            const isPdfMime = (f.type || "").toLowerCase() === "application/pdf";
            const isPdfExt = name.toLowerCase().endsWith(".pdf");
            if (!(isPdfMime || isPdfExt)) invalids.push(`${name} — not a PDF`);
          });

          if (invalids.length) {
            await this.context.navigation.openAlertDialog(
              {
                text: `The following files are invalid:\n${invalids.join("\n")}`,
                confirmButtonLabel: "OK"
              },
              { width: 480, height: 240 }
            );
            return;
          }

          // Check duplicate names across all members
          const existingNames = new Set<string>();
          this.members.forEach(member => {
            if (Array.isArray(member.attachments)) {
              member.attachments.forEach((attachment: any) => {
                const name = String(attachment?.name || "").trim();
                if (name) existingNames.add(name.toLowerCase());
              });
            }
            const documentName = String(member.documentName || "").trim();
            if (documentName) existingNames.add(documentName.toLowerCase());
          });

          const duplicateFile = files.find(file => existingNames.has(file.name.trim().toLowerCase()));
          if (duplicateFile) {
            await this.context.navigation.openAlertDialog(
              {
                text: `The file name '${duplicateFile.name}' has already been uploaded. Please choose a different file.`,
                confirmButtonLabel: "OK"
              },
              { width: 420, height: 180 }
            );
            return;
          }

          const uploadedAttachments = await Promise.all(files.map(async file => {
            const annotationId = await this.uploadFileToAnnotation(file);
            return {
              name: file.name,
              mimeType: file.type || "application/pdf",
              size: file.size,
              annotationId
            };
          }));

          row.attachments = row.attachments || [];
          row.attachments.push(...uploadedAttachments);
          if (!row.documentName && uploadedAttachments.length) {
            row.documentName = uploadedAttachments[0].name;
          }

          renderAttachments();
          this.updateDerivedOutputJsons();
          this.notifyOutputChanged();
          this.refresh();

          fileInput.value = "";
        };

        btn.onclick = () => {
          if (this.isReadOnly) return;
          fileInput.value = "";
          fileInput.click();
        };

        fileInput.onchange = () => { void addAttachments(); };

        uploadRow.appendChild(remarksField);
        uploadRow.appendChild(btn);
        uploadRow.appendChild(fileInput);
        uploadRow.appendChild(attachmentsContainer);

        renderAttachments();
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
