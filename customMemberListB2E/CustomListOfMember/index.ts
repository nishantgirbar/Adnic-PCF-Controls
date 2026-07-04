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
      const selectedMemberIndexes = new Set(
        selectedRows
          .map(checkbox => Number(checkbox.dataset.memberIndex))
          .filter(index => Number.isInteger(index))
      );

      this.members = this.members.filter((_, index) => !selectedMemberIndexes.has(index));
      this.currentPage = Math.min(
        this.currentPage,
        Math.max(1, Math.ceil(this.members.length / this.pageSize))
      );

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
              annotationId: this.normalizeAnnotationId(a?.annotationId || a?.id || a?.annotationid)
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
      .map((member, index) => ({ member, serialNo: member.serialNo ?? index + 1 }))
      .filter(({ member }) =>
        this.getAge(
          member.dateOfBirth,
          referenceDate
        ) >= 65
      )
      .map(({ member, serialNo }) => {
        const attachments = Array.isArray(member.attachments)
          ? member.attachments.map((a: any) => ({
            name: String(a?.name || ""),
            mimeType: String(a?.mimeType || "application/pdf"),
            size: Number(a?.size || 0),
            annotationId: this.normalizeAnnotationId(a?.annotationId || a?.id || a?.annotationid)
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
          serialNo,
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
    const modeContext = (this.context as any).mode?.contextInfo;
    const localXrm = (window as any)?.Xrm;
    const parentXrm = (window.parent as any)?.Xrm || (window.top as any)?.Xrm;
    const xrmPageContext = localXrm?.Utility?.getPageContext?.() || parentXrm?.Utility?.getPageContext?.();
    const xrmPage = localXrm?.Page || parentXrm?.Page;

    const entityId = String(
      pageContext?.entityId ||
      xrmPageContext?.input?.entityId ||
      modeContext?.entityId ||
      xrmPage?.data?.entity?.getId?.() ||
      ""
    ).replace(/[{}]/g, "");

    const entityTypeName = String(
      pageContext?.entityTypeName ||
      xrmPageContext?.input?.entityTypeName ||
      modeContext?.entityTypeName ||
      xrmPage?.data?.entity?.getEntityName?.() ||
      ""
    ).toLowerCase();

    const entitySetName = entityTypeName ? `${entityTypeName}s` : "";

    const xrmPageEntityId = xrmPage?.data?.entity?.getId ? xrmPage.data.entity.getId() : undefined;
    const xrmPageEntityName = xrmPage?.data?.entity?.getEntityName ? xrmPage.data.entity.getEntityName() : undefined;

    console.debug("PCF record context debug", {
      entityId,
      entityTypeName,
      entitySetName,
      pageContext: pageContext ? { entityId: pageContext.entityId, entityTypeName: pageContext.entityTypeName } : undefined,
      modeContext: modeContext ? { entityId: modeContext.entityId, entityTypeName: modeContext.entityTypeName } : undefined,
      xrmPageInput: xrmPageContext?.input ? { entityId: xrmPageContext.input.entityId, entityTypeName: xrmPageContext.input.entityTypeName } : undefined,
      xrmPageEntity: xrmPage?.data?.entity ? { id: xrmPageEntityId, name: xrmPageEntityName } : undefined,
      xrmAvailable: !!localXrm,
      parentXrmAvailable: !!parentXrm
    });

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

    const dataUrl = await this.convertFileToBase64(file);
    const base64 = dataUrl.split(",").slice(1).join(",");

    const body: any = {
      subject: file.name,
      filename: file.name,
      mimetype: file.type || "application/pdf",
      documentbody: base64,
      notetext: "Uploaded from Member List control"
    };

    if (entityId && entityTypeName && entitySetName) {
      body[`objectid_${entityTypeName}@odata.bind`] = `/${entitySetName}(${entityId})`;
    } else {
      console.warn(
        "Upload annotation without objectid binding because current record context is unavailable.",
        { entityId, entityTypeName, entitySetName }
      );
    }

    const annotationId = await this.context.webAPI.createRecord("annotation", body);

    return this.normalizeAnnotationId(annotationId);
  }

  private normalizeAnnotationId(annotationId?: any): string {
    if (annotationId && typeof annotationId === "object") {
      if (typeof annotationId.id === "string" && annotationId.id) {
        return annotationId.id.trim().replace(/[{}]/g, "");
      }
      if (typeof annotationId.annotationId === "string" && annotationId.annotationId) {
        return annotationId.annotationId.trim().replace(/[{}]/g, "");
      }
      if (typeof annotationId.value === "string" && annotationId.value) {
        return annotationId.value.trim().replace(/[{}]/g, "");
      }
      return "";
    }

    return String(annotationId || "").trim().replace(/[{}]/g, "");
  }

  private async retrieveAnnotationContent(annotationId: string): Promise<{ fileName: string; mimeType: string; size: number; base64: string } | null> {
    const id = this.normalizeAnnotationId(annotationId);
    console.debug("retrieveAnnotationContent: raw annotationId", annotationId, "normalized", id);
    if (!id) {
      console.warn("retrieveAnnotationContent: no valid annotation id", annotationId);
      return null;
    }

    try {
      const annotation = await this.context.webAPI.retrieveRecord(
        "annotation",
        id,
        "?$select=documentbody,mimetype,filename,filesize"
      );

      console.debug("retrieveAnnotationContent: annotation retrieved", { id, filename: annotation.filename, mimetype: annotation.mimetype, filesize: annotation.filesize });

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

  private async getAttachmentDataUrl(attachment: any): Promise<string> {
    const content = String(attachment.content || "");
    if (content) {
      if (content.startsWith("data:")) {
        return content;
      }

      try {
        const sanitized = content.replace(/\s+/g, "");
        const byteChars = atob(sanitized);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: attachment.mimeType || "application/pdf" });
        return URL.createObjectURL(blob);
      } catch {
        return content;
      }
    }

    const annotationId = this.normalizeAnnotationId(attachment.annotationId || attachment.id || attachment.annotationid);
    console.debug("getAttachmentDataUrl: attachment", attachment, "resolved annotationId", annotationId);
    if (!annotationId) {
      console.warn("getAttachmentDataUrl: no annotation id available", attachment);
      return "";
    }

    const annotation = await this.retrieveAnnotationContent(annotationId);
    if (!annotation?.base64) {
      console.warn("getAttachmentDataUrl: annotation content missing or invalid", annotationId, annotation);
      return "";
    }

    return `data:${annotation.mimeType};base64,${annotation.base64}`;
  }

  private async retrieveAnnotationBlob(annotationId: string): Promise<Blob | null> {
    const annotation = await this.retrieveAnnotationContent(this.normalizeAnnotationId(annotationId));
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

    // Determine if current page contains only 65+ members (when upload mode is enabled)
    const start = (this.currentPage - 1) * this.pageSize;
    const rows = this.members.slice(start, start + this.pageSize);
    const allAbove65OnPage = this.enableUpload && rows.every(r => this.getAge(r.dateOfBirth, this.getAgeReferenceDate()) >= 65);

    const headers = ["", "#", "Relation", "Gender", "DOB", "Salary", "Visa", "Category", "Marital"];

    headers.forEach(h => {
      const d = document.createElement("div");
      d.className = "grid-header";
      d.innerText = h;
      grid.appendChild(d);
    });
    

    const createDropdown = (
      options: string[],
      value: string,
      field: string,
      idx: number,
      forceDisabled = false
    ) => {
      const select = document.createElement("select");
      select.className = "dropdown";
      select.disabled = this.isReadOnly || this.enableUpload || forceDisabled;

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

      select.onchange = async () => {
        const newValue = select.value;
        const previousValue = this.members[idx][field] || "";
        const currentRelation = String(this.members[idx].relation || "").toUpperCase();
        const currentSalary = String(this.members[idx].salaryType || "");
        const currentVisa = String(this.members[idx].visaLocation || "").toUpperCase();

        // Prevent spouse/child from being assigned LSB salary
        if (field === "salaryType" && this.isLsbSalaryType(newValue) && (currentRelation === "SPOUSE" || currentRelation === "CHILD")) {
          select.value = previousValue;
          await this.context.navigation.openAlertDialog(
            {
              text: "Spouse and Child cannot have Salary Type 'LSB'. Please choose a different Salary Type.",
              confirmButtonLabel: "OK"
            },
            { width: 460, height: 180 }
          );
          return;
        }

        // Existing rule: at least one Enhanced must remain when switching to LSB
        if (field === "salaryType" && this.isLsbSalaryType(newValue)) {
          const otherEnhanced = this.members.some((m, j) => j !== idx && !this.isLsbSalaryType(m.salaryType));
          if (!otherEnhanced) {
            select.value = previousValue;
            await this.context.navigation.openAlertDialog(
              {
                text: "At least one Enhanced Salary Type must remain. You cannot change all Salary Type values to LSB.",
                confirmButtonLabel: "OK"
              },
              { width: 460, height: 180 }
            );
            return;
          }
        }

        // If Salary Type is LSB, Visa must be DXB
        if (field === "salaryType" && this.isLsbSalaryType(newValue) && String(currentVisa || "").toUpperCase() !== "DXB") {
          select.value = previousValue;
          await this.context.navigation.openAlertDialog(
            {
              text: "Salary Type 'LSB' requires Visa Location 'DXB'. Please set Visa Location to DXB first.",
              confirmButtonLabel: "OK"
            },
            { width: 460, height: 180 }
          );
          return;
        }

        // If Visa is being set to a non-DXB value, ensure Salary Type is not LSB
        if (field === "visaLocation" && String(newValue || "").toUpperCase() !== "DXB" && this.isLsbSalaryType(currentSalary)) {
          select.value = previousValue;
          await this.context.navigation.openAlertDialog(
            {
              text: "Salary Type 'LSB' allows only Visa Location 'DXB'. Please change Salary Type before modifying Visa Location.",
              confirmButtonLabel: "OK"
            },
            { width: 460, height: 180 }
          );
          return;
        }

        // Marital status validation: Spouse cannot be Single
        if (field === "maritalStatus" && String(newValue || "").toUpperCase() === "SINGLE" && currentRelation === "SPOUSE") {
          select.value = previousValue;
          await this.context.navigation.openAlertDialog(
            {
              text: "Spouse cannot have marital status 'Single'. Please set relation or marital status appropriately.",
              confirmButtonLabel: "OK"
            },
            { width: 420, height: 180 }
          );
          return;
        }

        this.members[idx][field] = newValue;

        if (field === "salaryType" && this.isLsbSalaryType(newValue)) {
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
      // compute age for current row
      const rowAge = this.getAge(row.dateOfBirth, this.getAgeReferenceDate());

      // If the page is all 65+ and upload mode is enabled, we remove the checkbox column
      const showCheckbox = !(allAbove65OnPage && rowAge >= 65);

      if (showCheckbox) {
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "row-checkbox";
        cb.dataset.memberIndex = idx.toString();
        cb.disabled = this.isReadOnly;
        grid.appendChild(cell(cb));
      }else{
        const cb = document.createElement("input");
        cb.type = "hidden";
        grid.appendChild(cell(cb));
      }

      // The 65+ upload input is a filtered list, so preserve the member's
      // original number instead of restarting the filtered grid at 1.
      const preservedSerialNo = Number(row.serialNo);
      const serialNo = Number.isInteger(preservedSerialNo) && preservedSerialNo > 0
        ? preservedSerialNo
        : idx + 1;

      grid.appendChild(cell(serialNo.toString()));

      // 🔥 RELATION DROPDOWN (FIXED)
      const relationOptions = [
        { code: "", display: "" },
        { code: "EMPLOYEE", display: "Employee" },
        { code: "SPOUSE", display: "Spouse" },
        { code: "CHILD", display: "Child" }
      ];

      const relationSelect = document.createElement("select");
      relationSelect.className = "dropdown";

      relationSelect.disabled = this.isReadOnly || this.enableUpload;

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

        // Additional validation: Spouse cannot be Single; Spouse/Child cannot have LSB salary
        const newRelation = (this.members[idx].relation || "").toUpperCase();
        const currentMarital = String(this.members[idx].maritalStatus || "").toUpperCase();
        const currentSalary = String(this.members[idx].salaryType || "");

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

        if (newRelation === "SPOUSE" && currentMarital === "SINGLE") {
          this.members[idx].relation = previousRelation;
          relationSelect.value = previousRelation;
          await this.context.navigation.openAlertDialog(
            {
              text: "Spouse cannot have marital status 'Single'. Please set marital status to 'Married' first.",
              confirmButtonLabel: "OK"
            },
            { width: 420, height: 180 }
          );
          return;
        }

        if ((newRelation === "SPOUSE" || newRelation === "CHILD") && this.isLsbSalaryType(currentSalary)) {
          this.members[idx].relation = previousRelation;
          relationSelect.value = previousRelation;
          await this.context.navigation.openAlertDialog(
            {
              text: "Spouse or Child cannot have Salary Type 'LSB'. Please change the Salary Type first.",
              confirmButtonLabel: "OK"
            },
            { width: 460, height: 180 }
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
      dob.disabled = this.isReadOnly || this.enableUpload;

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

      if (!this.isReadOnly && !this.enableUpload) {
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

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.multiple = true;
        fileInput.accept = "application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg";
        fileInput.style.display = "none";

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "upload-btn add-more-btn";
        btn.innerText = "Upload File";
        btn.disabled = this.isReadOnly;

        let filePickerActive = false;

        const attachmentsContainer = document.createElement("div");
        attachmentsContainer.className = "uploaded-files";

        const remarksField = document.createElement("textarea");
        remarksField.className = "remarks-input";
        remarksField.placeholder = "Enter remarks";
        remarksField.disabled = this.isReadOnly;
        remarksField.value = String(row.remarks || "");
        remarksField.onchange = () => {
          row.remarks = remarksField.value;
          this.updateDerivedOutputJsons();

          // Opening the native picker blurs this field. Notifying PCF at that
          // moment rebuilds the grid and detaches the file input before its
          // change event can receive the selected file.
          if (!filePickerActive) {
            this.notifyOutputChanged();
          }
        };

        const renderAttachments = (): void => {
          attachmentsContainer.innerHTML = "";
          const attachments = Array.isArray(row.attachments)
            ? row.attachments
            : [];

          btn.innerText = attachments.length > 0 ? "Add More Files" : "Upload File";

          attachments.forEach((attachment: any, attachmentIndex: number) => {
            const fileCard = document.createElement("div");
            fileCard.className = "uploaded-file-card";

            const fileLeft = document.createElement("div");
            fileLeft.className = "uploaded-file-left";

            const checkMark = document.createElement("span");
            checkMark.className = "file-check";
            checkMark.innerText = "✓";

            const fileName = document.createElement("span");
            fileName.className = "uploaded-file-name";
            fileName.innerText = attachment.name || `File ${attachmentIndex + 1}`;

            fileLeft.appendChild(checkMark);
            fileLeft.appendChild(fileName);

            const actionGroup = document.createElement("div");
            actionGroup.className = "uploaded-file-actions";

            const viewBtn = document.createElement("button");
            viewBtn.type = "button";
            viewBtn.className = "file-view-btn";
            viewBtn.innerHTML = `
              <span class="file-action-icon" aria-hidden="true">
                <svg viewBox="0 0 16 16" focusable="false">
                  <path d="M8 3c3.3 0 5.8 2.8 6.7 4.1a1.5 1.5 0 0 1 0 1.8C13.8 10.2 11.3 13 8 13s-5.8-2.8-6.7-4.1a1.5 1.5 0 0 1 0-1.8C2.2 5.8 4.7 3 8 3Zm0 1C5.2 4 3 6.5 2.1 7.7a.5.5 0 0 0 0 .6C3 9.5 5.2 12 8 12s5-2.5 5.9-3.7a.5.5 0 0 0 0-.6C13 6.5 10.8 4 8 4Zm0 1.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"/>
                </svg>
              </span>
              <span>View</span>`;
            viewBtn.disabled = !attachment.annotationId && !attachment.content;
            viewBtn.onclick = async () => {
              console.debug("View button clicked", attachment);
              const url = await this.getAttachmentDataUrl(attachment);
              console.debug("View URL result", { attachment, url });
              if (!url) {
                return;
              }

              const win = window.open();
              if (!win) {
                console.warn("View button: window.open failed");
                return;
              }

              win.document.write(`
                <iframe
                  src="${url}"
                  frameborder="0"
                  style="width:100%;height:100%;border:none;">
                </iframe>
              `);

              setTimeout(() => {
                if (url.startsWith("blob:")) {
                  URL.revokeObjectURL(url);
                }
              }, 10000);
            };

            const downloadBtn = document.createElement("button");
            downloadBtn.type = "button";
            downloadBtn.className = "file-view-btn file-download-btn";
            downloadBtn.innerHTML = `
              <span class="file-action-icon" aria-hidden="true">
                <svg viewBox="0 0 16 16" focusable="false">
                  <path d="M7.5 1a.5.5 0 0 1 1 0v8.3l2.15-2.15a.5.5 0 0 1 .7.7l-3 3a.5.5 0 0 1-.7 0l-3-3a.5.5 0 1 1 .7-.7L7.5 9.3V1ZM2 12.5a.5.5 0 0 1 .5.5v1h11v-1a.5.5 0 0 1 1 0v1.5a.5.5 0 0 1-.5.5H2a.5.5 0 0 1-.5-.5V13a.5.5 0 0 1 .5-.5Z"/>
                </svg>
              </span>
              <span>Download</span>`;
            downloadBtn.disabled = !attachment.annotationId && !attachment.content;
            downloadBtn.onclick = async () => {
              console.debug("Download button clicked", attachment);
              const url = await this.getAttachmentDataUrl(attachment);
              console.debug("Download URL result", { attachment, url });
              if (!url) {
                return;
              }

              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = attachment.name || "download.pdf";
              anchor.style.display = "none";
              document.body.appendChild(anchor);
              anchor.click();
              document.body.removeChild(anchor);

              setTimeout(() => {
                if (url.startsWith("blob:")) {
                  URL.revokeObjectURL(url);
                }
              }, 10000);
            };

            const deleteBtn = document.createElement("button");
            deleteBtn.type = "button";
            deleteBtn.className = "file-delete-btn";
            deleteBtn.innerHTML = `
              <span class="file-action-icon" aria-hidden="true">
                <svg viewBox="0 0 16 16" focusable="false">
                  <path d="M6 2h4l.5 1H14a.5.5 0 0 1 0 1h-.54l-.75 10.08A1 1 0 0 1 11.71 15H4.29a1 1 0 0 1-1-.92L2.54 4H2a.5.5 0 0 1 0-1h3.5L6 2Zm-2.46 2 .75 10h7.42l.75-10H3.54ZM6 6a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5A.5.5 0 0 1 6 6Zm4 0a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5A.5.5 0 0 1 10 6Z"/>
                </svg>
              </span>
              <span>Delete</span>`;
            deleteBtn.disabled = this.isReadOnly;
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

            actionGroup.appendChild(viewBtn);
            actionGroup.appendChild(downloadBtn);
            actionGroup.appendChild(deleteBtn);
            fileCard.appendChild(fileLeft);
            fileCard.appendChild(actionGroup);
            attachmentsContainer.appendChild(fileCard);
          });

          // The upload button is already rendered before attachmentsContainer,
          // so we do not append it again inside the attachments list.
          if (!this.isReadOnly) {
            btn.innerText = attachments.length > 0 ? "Add More Files" : "Upload File";
          }
        };

        const addAttachments = async (): Promise<void> => {
          const files = Array.from(fileInput.files || []);
          if (!files.length) return;

          // Validate files: allowed extensions for 65+ are Pdf, Png, Jpeg, Jpg and size <= 2MB
          const MAX_BYTES = 2 * 1024 * 1024; // 2MB
          const invalids: string[] = [];
          const existingAttachments = Array.isArray(row.attachments) ? row.attachments.length : 0;
          const selectedCount = files.length;

          if (existingAttachments + selectedCount > 5) {
            await this.context.navigation.openAlertDialog(
              {
                text: `You can upload a maximum of 5 files per member. You already have ${existingAttachments} file(s) uploaded.`,
                confirmButtonLabel: "OK"
              },
              { width: 420, height: 180 }
            );
            return;
          }

          files.forEach(f => {
            const name = f.name || "(unnamed)";
            if (f.size > MAX_BYTES) invalids.push(`${name} — file too large (max 2 MB)`);
            const lowerName = name.toLowerCase();
            const extAllowed = lowerName.endsWith(".pdf") || lowerName.endsWith(".png") || lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg");
            if (!extAllowed) invalids.push(`${name} — only PDF, JPG/JPEG, and PNG files are allowed`);
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

          const processingIndicator = document.createElement("span");
          processingIndicator.className = "upload-processing-indicator";
          processingIndicator.innerText = "Processing...";
          btn.parentElement?.insertBefore(processingIndicator, btn.nextSibling);
          btn.disabled = true;

          const uploadedAttachments = await Promise.all(files.map(async file => {
            const annotationId = await this.uploadFileToAnnotation(file);
            return {
              name: file.name,
              mimeType: file.type || "application/pdf",
              size: file.size,
              annotationId
            };
          }));

          processingIndicator.remove();
          btn.disabled = false;

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

        const openFilePicker = (): void => {
          if (this.isReadOnly) return;

          // Keep the latest remarks in the row before opening the native picker.
          // The upload flow will notify the framework after a file is selected.
          row.remarks = remarksField.value;
          filePickerActive = true;
          fileInput.value = "";

          // Some browsers do not emit the file-input cancel event. Window focus
          // is a fallback that commits remarks after a cancelled picker.
          window.addEventListener("focus", () => {
            window.setTimeout(() => {
              if (!filePickerActive) return;

              filePickerActive = false;
              this.updateDerivedOutputJsons();
              this.notifyOutputChanged();
            }, 300);
          }, { once: true });

          fileInput.click();
        };

        // Open the picker before focus leaves the remarks field. Otherwise its
        // change handler can cause updateView() to rebuild the grid and swallow
        // the first button click.
        btn.onpointerdown = event => {
          if (!event.isPrimary || event.button !== 0) return;
          event.preventDefault();
          openFilePicker();
        };

        // Keyboard-generated clicks have detail 0; pointer clicks are already
        // handled above so the picker is not opened twice.
        btn.onclick = event => {
          if (event.detail === 0) {
            openFilePicker();
          }
        };

        fileInput.onchange = () => {
          filePickerActive = false;
          void addAttachments();
        };

        fileInput.addEventListener("cancel", () => {
          if (!filePickerActive) return;

          filePickerActive = false;
          this.updateDerivedOutputJsons();
          this.notifyOutputChanged();
        });

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
