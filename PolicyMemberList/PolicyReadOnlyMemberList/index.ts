/// <reference types="powerapps-component-framework" />
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";

export class PolicyQuoteMemberViewerV2 implements ComponentFramework.StandardControl<IInputs, IOutputs> {

  private readonly maximumChildAge = 24;

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
  private lastAbove65Raw: string | null = null;
  private hasLoadedShowEbpPlan: boolean = false;
  private showEbpPlanSignature: string = "";
  private enableUpload: boolean = false;
  private productType: string = "";
  private isReadOnly: boolean = false;
  private addBtn!: HTMLButtonElement;
  private deleteBtn!: HTMLButtonElement;
  private fileInteractionActive: boolean = false;
  private refreshPending: boolean = false;
  private uploadErrors = new WeakMap<object, string>();
  private uploadsInProgress = new Set<string>();
  private loadedSpouseSingleValidationSignature: string = "";
  private readonly syncDebugEnabled = true;
  private syncDebugSequence = 0;
  private memberDataError = "";
  private lastEnableUpload: boolean | null = null;
  private documentApiUrl = "";
  private lastQuoteNumber = "";
  private memberDocuments: any[] = [];

  private summarizeMembersForDebug(members: any[]): any[] {
    return members.map((member, index) => {
      const attachments = this.normalizeAttachmentsFromMember(member);
      return {
        key: this.getMemberHydrationKey(member, index + 1),
        serialNo: member?.serialNo ?? index + 1,
        relation: member?.relation || "",
        dateOfBirth: member?.dateOfBirth || "",
        hasRemarks: String(member?.remarks || "").trim().length > 0,
        attachmentCount: attachments.length,
        attachments: attachments.map(attachment => ({
          name: attachment.name || "",
          hasAnnotationId: Boolean(attachment.annotationId),
          hasContent: Boolean(attachment.content)
        }))
      };
    });
  }

  private syncDebug(event: string, details: any): void {
    if (!this.syncDebugEnabled) return;

    this.syncDebugSequence += 1;
    console.info(
      `[CustomListOfMembersB2E][65+ sync][${this.enableUpload ? "65+ grid" : "main grid"}] #${this.syncDebugSequence} ${event}`,
      details
    );
  }

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

  private getMembersFromPayload(payload: unknown): any[] {

    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && typeof payload === "object" && Array.isArray((payload as any).members)) {
      return (payload as any).members;
    }

    return [];
  }

  private toBoolean(value: unknown): boolean {

    return value === true ||
      (typeof value === "string" && value.trim().toLowerCase() === "true");
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

  private normalizeAttachmentsFromMember(member: any): any[] {

    if (Array.isArray(member.attachments)) {
      const attachments = member.attachments
        .map((attachment: any) => ({
          name: String(attachment?.name || attachment?.filename || ""),
          mimeType: String(attachment?.mimeType || attachment?.mimetype || "application/pdf"),
          size: Number(attachment?.size || attachment?.filesize || 0),
          annotationId: this.normalizeAnnotationId(
            attachment?.annotationId ||
            attachment?.id ||
            attachment?.annotationid
          ),
          content: attachment?.content || "",
          sourceUrl: String(attachment?.sourceUrl || attachment?.blobUrl || attachment?.url || ""),
          comment: String(attachment?.comment || "")
        }))
        .filter((attachment: any) =>
          attachment.name ||
          attachment.annotationId ||
          attachment.content ||
          attachment.sourceUrl
        );

      // In edit mode Dataverse can deserialize the newer attachments field as
      // an empty array while the existing file is still stored in the legacy
      // document/documentName fields. Do not let that empty array hide the
      // saved document.
      if (attachments.length > 0) {
        return attachments;
      }
    }

    if (member.document || member.documentName) {
      return [{
        name: String(member.documentName || ""),
        mimeType: "application/pdf",
        size: 0,
        annotationId: "",
        content: member.document || ""
      }];
    }

    return [];
  }

  private getMemberHydrationKey(member: any, fallbackSerialNo: number): string {

    const serialNo = Number(member?.serialNo ?? fallbackSerialNo);

    if (Number.isInteger(serialNo) && serialNo > 0) {
      return `serial:${serialNo}`;
    }

    return [
      "member",
      String(member?.relation || "").trim().toUpperCase(),
      String(member?.gender || "").trim().toUpperCase(),
      String(member?.dateOfBirth || "").trim(),
      String(member?.salaryType || "").trim().toUpperCase(),
      String(member?.visaLocation || "").trim().toUpperCase(),
      String(member?.category || "").trim().toUpperCase(),
      String(member?.maritalStatus || "").trim().toUpperCase()
    ].join("|");
  }

  private hydrateMembersFromAbove65(savedAbove65Raw: string | null | undefined, members: any[]): any[] {

    if (!savedAbove65Raw) {
      this.syncDebug("hydrate skipped: bound 65+ field is empty", {
        memberCount: members.length
      });
      return members;
    }

    let savedAbove65: any[] = [];

    try {
      const parsed = JSON.parse(savedAbove65Raw);
      savedAbove65 = Array.isArray(parsed) ? parsed : [];
    } catch {
      console.warn("Invalid listOfMemberAbove65 JSON ignored.", savedAbove65Raw);
      return members;
    }

    if (!savedAbove65.length) {
      this.syncDebug("hydrate skipped: bound 65+ JSON contains no rows", {
        memberCount: members.length
      });
      return members;
    }

    const savedByKey = new Map<string, any>();

    savedAbove65.forEach((member, index) => {
      savedByKey.set(this.getMemberHydrationKey(member, index + 1), member);
    });

    let matchedCount = 0;
    const hydratedMembers = members.map((member, index) => {
      const savedMember = savedByKey.get(this.getMemberHydrationKey(member, index + 1));

      if (!savedMember) {
        return member;
      }

      matchedCount += 1;

      const currentAttachments = this.normalizeAttachmentsFromMember(member);
      const savedAttachments = this.normalizeAttachmentsFromMember(savedMember);
      const shouldUseSavedAttachments =
        savedAttachments.length > 0 &&
        (
          currentAttachments.length === 0 ||
          currentAttachments.every((attachment: any) => !attachment.annotationId && !attachment.content)
        );

      const attachmentMap = new Map<string, any>();

      [...savedAttachments, ...currentAttachments].forEach((attachment: any) => {

        const key =
          attachment.annotationId ||
          attachment.name;

        if (key && !attachmentMap.has(key)) {
          attachmentMap.set(key, attachment);
        }

      });

      const attachments = Array.from(attachmentMap.values());
      return this.normalizeMemberCategoryForSalaryType({
        ...member,
        // listOfMemberAbove65 is the value edited by the upload grid. When it
        // contains remarks (including an intentional empty string), it must
        // win over the older memberData copy or the main-grid instance will
        // immediately echo the old remark back to the bound Dataverse field.
        remarks: Object.prototype.hasOwnProperty.call(savedMember, "remarks")
          ? String(savedMember.remarks ?? "")
          : String(member.remarks || ""),
        attachments,
        document: "",
        documentName: attachments[0]?.name || String(member.documentName || savedMember.documentName || "")
      });
    });

    this.syncDebug("main member hydration completed", {
      mainMemberCount: members.length,
      boundAbove65Count: savedAbove65.length,
      matchedCount,
      unmatchedBoundKeys: Array.from(savedByKey.keys()).filter(key =>
        !members.some((member, index) => this.getMemberHydrationKey(member, index + 1) === key)
      ),
      boundAbove65Members: this.summarizeMembersForDebug(savedAbove65),
      hydratedMembers: this.summarizeMembersForDebug(hydratedMembers)
    });

    return hydratedMembers;
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
    // This control is deliberately display-only. Keep the framework callback
    // disconnected so no legacy change path can publish values to Dataverse.
    this.notifyOutputChanged = () => undefined;
    void this.loadDocumentApiUrl();

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
    actionBar.style.display = "none";

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
    const quoteNumber = this.getQuoteNumber();
    if (quoteNumber !== this.lastQuoteNumber) {
      this.lastQuoteNumber = quoteNumber;
      void this.loadMemberDocuments();
    }
    // Read-only is a property of this policy control, independent of form mode.
    this.isReadOnly = true;

    if (!this.hasLoadedShowEbpPlan) {
      this.showEbpPlan = context.parameters.adnic_adnic_showebpplan.raw ?? undefined;
      this.hasLoadedShowEbpPlan = true;
    }

    if (this.addBtn) {
      this.addBtn.style.display = this.enableUpload ? "none" : "";
    }

    if (this.deleteBtn) {
      this.deleteBtn.style.display = this.enableUpload ? "none" : "";
    }

    const gridModeChanged = this.enableUpload !== this.lastEnableUpload;

    const raw = context.parameters.memberData.raw;
    const memberDataChanged = raw !== this.lastRaw;

    if (memberDataChanged || gridModeChanged) {
      this.lastRaw = raw;
      this.lastEnableUpload = this.enableUpload;

      try {
        const parsed = raw ? JSON.parse(raw) : [];
        const sourceMembers = this.getMembersFromPayload(parsed);
        const mappedMembers = sourceMembers.map((member: any, index: number) =>
          this.mapApiMember(member, index)
        );

        // Upload mode is the overage-only view. When it is disabled or not
        // supplied, preserve and display the complete member list.
        this.members = this.enableUpload
          ? mappedMembers.filter(member => member.overaged === true)
          : mappedMembers;
        this.currentPage = 1;
        this.memberDataError = "";
      } catch {
        console.warn("Invalid memberData JSON ignored.", raw);
        this.members = [];
        this.currentPage = 1;
        this.memberDataError = "Invalid member data.";
      }
    }

    this.refresh();
    return;

  }

  private mapApiMember(member: any, index: number): any {

    const relation = typeof member?.relation === "object"
      ? member.relation?.code || member.relation?.displayName
      : member?.relation;
    const sourceAttachments = Array.isArray(member?.attachments)
      ? member.attachments
      : Array.isArray(member?.documents)
        ? member.documents
        : [];
    const apiDocuments = this.memberDocuments
      .filter(document =>
        document?.documentType === "OVERAGE_DOCUMENT" &&
        Number(document?.entityNumber) === Number(member?.id ?? member?.memberId)
      )
      .map(document => ({
        name: String(document?.originalFilename || document?.fileName || "Document"),
        mimeType: String(document?.mimeType || "application/pdf"),
        size: Number(document?.fileSize || document?.size || 0),
        annotationId: "",
        content: "",
        sourceUrl: document?.blobUrl || document?.url || "",
        comment: document?.comment || ""
      }));
    const attachments = this.normalizeAttachmentsFromMember({
      ...member,
      attachments: [...sourceAttachments, ...apiDocuments]
    });

    return {
      ...member,
      id: member?.id ?? "",
      serialNo: Number(member?.serialNo) || index + 1,
      relation: String(relation || "").toUpperCase(),
      gender: String(member?.gender || ""),
      dateOfBirth: String(member?.dateOfBirth || ""),
      salaryType: String(member?.salaryType || ""),
      visaLocation: String(member?.visaLocation || ""),
      category: String(member?.category || ""),
      maritalStatus: String(member?.maritalStatus || ""),
      medicalDeclared: this.toBoolean(member?.medicalDeclared),
      overaged: this.toBoolean(member?.overaged),
      premium: member?.premium || {},
      remarks: String(member?.remarks || ""),
      attachments,
      document: "",
      documentName: attachments[0]?.name || String(member?.documentName || "")
    };
  }

  private async getEnvironmentVariableValue(schemaName: string): Promise<string> {
    const definitions = await this.context.webAPI.retrieveMultipleRecords(
      "environmentvariabledefinition",
      `?$select=environmentvariabledefinitionid&$filter=schemaname eq '${schemaName}'`
    );
    if (!definitions.entities.length) return "";
    const definitionId = definitions.entities[0].environmentvariabledefinitionid;
    const values = await this.context.webAPI.retrieveMultipleRecords(
      "environmentvariablevalue",
      `?$select=value&$filter=_environmentvariabledefinitionid_value eq '${definitionId}'`
    );
    return String(values.entities[0]?.value || "");
  }

  private getQuoteNumber(): string {
    const boundQuoteNumber = String(this.context.parameters.quoteNumber?.raw || "").trim();
    if (boundQuoteNumber) return boundQuoteNumber;

    try {
      const formContext = (window as any).Xrm?.Page;
      return String(
        formContext?.getAttribute("adnic_quotenumber")?.getValue() ||
        formContext?.getAttribute("adnic_name")?.getValue() ||
        ""
      ).trim();
    } catch (error) {
      console.warn("Unable to read quote number from the form.", error);
      return "";
    }
  }

  private async loadDocumentApiUrl(): Promise<void> {
    try {
      const [baseUrl, environmentName] = await Promise.all([
        this.getEnvironmentVariableValue("adnic_BaseServiceUrl"),
        this.getEnvironmentVariableValue("adnic_EnvironmentName")
      ]);
      if (!baseUrl || !environmentName) {
        console.error("Document service configuration is missing.", {
          hasBaseUrl: !!baseUrl,
          hasEnvironmentName: !!environmentName
        });
        return;
      }
      this.documentApiUrl =
        `${baseUrl.trim().replace(/\/$/, "")}/${environmentName.trim().replace(/^\/|\/$/g, "")}` +
        "/document-service/api/v1/documents";
      await this.loadMemberDocuments();
    } catch (error) {
      console.error("Failed to load document service configuration", error);
    }
  }

  private async loadMemberDocuments(): Promise<void> {
    if (!this.documentApiUrl) {
      console.debug("Overage document service call is waiting for API configuration.");
      return;
    }

    const quoteNumber = this.getQuoteNumber();
    if (!quoteNumber) {
      console.error(
        "Overage document service call skipped because quoteNumber is empty. " +
        "Bind the quoteNumber input or ensure adnic_quotenumber/adnic_name exists on the form."
      );
      this.memberDocuments = [];
      return;
    }

    this.lastQuoteNumber = quoteNumber;

    try {
      const requestUrl =
        `${this.documentApiUrl}?referenceType=QUOTE&referenceId=${encodeURIComponent(quoteNumber)}`;
      console.debug("Loading overage member documents.", { requestUrl, quoteNumber });
      const response = await fetch(requestUrl);
      if (!response.ok) throw new Error(`Failed to load documents (${response.status})`);
      const result = await response.json();
      this.memberDocuments = Array.isArray(result) ? result : [];
      this.lastRaw = null;
      this.updateView(this.context);
    } catch (error) {
      console.error("Failed to load overage member documents", error);
      this.memberDocuments = [];
    }
  }

  private updateDerivedOutputJsons(updateShowEbpPlan = true): boolean {

    const above65Changed = this.updateAbove65Members();
    const categoriesChanged = this.updateUniqueCategories();
    const showEbpPlanChanged = updateShowEbpPlan
      ? this.updateShowEbpPlan()
      : false;

    return above65Changed || categoriesChanged || showEbpPlanChanged;
  }

  private updateShowEbpPlan(suppressUnsetFalseOutput = false): boolean {

    const nextSignature = this.getShowEbpPlanSignature();

    if (nextSignature === this.showEbpPlanSignature) {
      return false;
    }

    const nextShowEbpPlan = this.members.some(member => {
      const relation = (member.relation || "").trim().toUpperCase();

      return relation === "EMPLOYEE" &&
        this.isLsbSalaryType(member.salaryType);
    });

    this.showEbpPlanSignature = nextSignature;

    const previousShowEbpPlan = this.showEbpPlan;

    if (nextShowEbpPlan === previousShowEbpPlan) {
      return false;
    }

    this.showEbpPlan = nextShowEbpPlan;
    if (suppressUnsetFalseOutput && previousShowEbpPlan === undefined && !nextShowEbpPlan) {
      return false;
    }

    return true;
  }

  private getShowEbpPlanSignature(): string {

    return JSON.stringify(
      this.members.map(member => ({
        relation: (member.relation || "").trim().toUpperCase(),
        salaryType: (member.salaryType || "").trim().toUpperCase()
      }))
    );
  }

  private compactAttachmentForOutput(attachment: any): any {

    const annotationId = this.normalizeAnnotationId(
      attachment?.annotationId ||
      attachment?.id ||
      attachment?.annotationid
    );

    return {
      name: String(attachment?.name || attachment?.filename || ""),
      mimeType: String(attachment?.mimeType || attachment?.mimetype || "application/pdf"),
      size: Number(attachment?.size || attachment?.filesize || 0),
      annotationId
    };
  }

  private compactMemberForOutput(member: any, serialNo: number): any {

    const attachments = this.normalizeAttachmentsFromMember(member)
      .map(attachment => this.compactAttachmentForOutput(attachment))
      .filter(attachment =>
        attachment.name ||
        attachment.annotationId
      );

    const compactMember: any = {
      serialNo,
      relation: member?.relation || "",
      gender: member?.gender || "",
      dateOfBirth: member?.dateOfBirth || null,
      overaged: member?.overaged === true,
      salaryType: member?.salaryType || "",
      visaLocation: member?.visaLocation || "",
      category: member?.category || "",
      maritalStatus: member?.maritalStatus || "",
      remarks: String(member?.remarks || ""),
      attachments,
      document: "",
      documentName: attachments[0]?.name || String(member?.documentName || "")
    };

    [
      "id",
      "memberId",
      "memberName",
      "firstName",
      "lastName",
      "relationship",
      "relationCode",
      "salary",
      "salaryAmount",
      "monthlySalary",
      "premium"
    ].forEach(fieldName => {
      if (
        member?.[fieldName] !== undefined &&
        member?.[fieldName] !== null &&
        member?.[fieldName] !== ""
      ) {
        compactMember[fieldName] = member[fieldName];
      }
    });

    return compactMember;
  }

  private serializeMembersForOutput(members: any[]): string {

    return JSON.stringify(
      members.map((member, index) =>
        this.compactMemberForOutput(
          member,
          Number(member?.serialNo || index + 1)
        )
      )
    );
  }

  private mergeAbove65ChangesIntoMemberData(): string {
    const rawMemberData = this.context.parameters.memberData.raw;
    let allMembers: any[] = [];

    try {
      const parsed = rawMemberData ? JSON.parse(rawMemberData) : [];
      allMembers = Array.isArray(parsed) ? parsed : [];
    } catch {
      console.warn("Invalid memberData JSON ignored while merging 65+ changes.", rawMemberData);
      return rawMemberData || "[]";
    }

    const above65ByKey = new Map<string, any>();
    this.members.forEach((member, index) => {
      above65ByKey.set(this.getMemberHydrationKey(member, index + 1), member);
    });

    const matchedKeys: string[] = [];
    const unmatchedMainKeys: string[] = [];
    const mergedMembers = allMembers.map((member, index) => {
      const memberKey = this.getMemberHydrationKey(member, index + 1);
      const changedMember = above65ByKey.get(
        memberKey
      );

      if (!changedMember) {
        if (member?.overaged === true) {
          unmatchedMainKeys.push(memberKey);
        }
        return member;
      }

      matchedKeys.push(memberKey);

      const attachments = this.normalizeAttachmentsFromMember(changedMember);

      return {
        ...member,
        remarks: String(changedMember.remarks || ""),
        attachments,
        document: "",
        documentName: attachments[0]?.name || ""
      };
    });

    this.syncDebug("65+ changes merged into memberData output", {
      mainMemberCount: allMembers.length,
      above65MemberCount: this.members.length,
      matchedKeys,
      unmatchedMainKeys,
      unmatchedAbove65Keys: Array.from(above65ByKey.keys()).filter(key =>
        matchedKeys.indexOf(key) === -1
      ),
      above65Members: this.summarizeMembersForDebug(this.members),
      mergedMembers: this.summarizeMembersForDebug(mergedMembers)
    });

    return this.serializeMembersForOutput(mergedMembers);
  }

  private updateAbove65Members(): boolean {

    const above65 = this.members
      .map((member, index) => ({ member, serialNo: member.serialNo ?? index + 1 }))
      .filter(({ member }) => member.overaged === true)
      .map(({ member, serialNo }) =>
        this.compactMemberForOutput(member, Number(serialNo))
      );

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

  private getCurrentRecordContext(): { entityId: string; entityTypeName: string } {
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

    return {
      entityId,
      entityTypeName
    };
  }

  private async getEntitySetName(entityTypeName: string): Promise<string> {

    if (!entityTypeName) {
      return "";
    }

    try {
      const metadata = await this.context.utils.getEntityMetadata(entityTypeName);
      const entitySetName = String(
        metadata?.EntitySetName ||
        metadata?.entitySetName ||
        ""
      );

      if (entitySetName) {
        return entitySetName;
      }
    } catch (error) {
      console.warn("Unable to resolve entity set name from metadata.", error);
    }

    return `${entityTypeName}s`;
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

  private async uploadFileToAnnotation(file: File, dataUrl?: string): Promise<string> {
    const fileDataUrl = dataUrl ?? await this.convertFileToBase64(file);
    const base64 = fileDataUrl.split(",").slice(1).join(",");

    const body: any = {
      subject: file.name,
      filename: file.name,
      mimetype: file.type || "application/pdf",
      documentbody: base64,
      notetext: "Uploaded from Member List control"
    };

    const annotationId = await this.context.webAPI.createRecord("annotation", body);

    return this.normalizeAnnotationId(annotationId);
  }

  private async createAttachmentFromFile(file: File): Promise<any> {
    const dataUrl = await this.convertFileToBase64(file);

    try {
      const annotationId = await this.uploadFileToAnnotation(file, dataUrl);
      return {
        name: file.name,
        mimeType: file.type || "application/pdf",
        size: file.size,
        annotationId,
        content: ""
      };
    } catch (error) {
      console.error("Annotation upload failed.", error);
      throw error;
    }
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

  private async deleteAttachmentAnnotation(attachment: any): Promise<void> {
    const annotationId = this.normalizeAnnotationId(
      attachment?.annotationId || attachment?.id || attachment?.annotationid
    );

    if (!annotationId) {
      return;
    }

    try {
      await this.context.webAPI.deleteRecord("annotation", annotationId);
    } catch (error) {
      console.error("Failed to delete attachment annotation", error);
    }
  }

  private async retrieveAnnotationContent(annotationId: string): Promise<{ fileName: string; mimeType: string; size: number; base64: string } | null> {
    const id = this.normalizeAnnotationId(annotationId);
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
    const sourceUrl = String(attachment.sourceUrl || attachment.blobUrl || attachment.url || "");
    if (sourceUrl) {
      try {
        const response = await fetch(sourceUrl);
        if (!response.ok) throw new Error(`Unable to load document (${response.status})`);
        return URL.createObjectURL(await response.blob());
      } catch (error) {
        console.error("Failed to retrieve document-service file", error);
        return "";
      }
    }
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

    const referenceDate = this.getAgeReferenceDate();
    const childDob = new Date(`${member.dateOfBirth}T00:00:00`);
    const oldestAllowedChildDob = new Date(
      referenceDate.getFullYear() - this.maximumChildAge,
      referenceDate.getMonth(),
      referenceDate.getDate()
    );

    // Exactly 24 years is allowed. A DOB even one day before the cutoff
    // represents 24 years and 1 day (or older) and must be rejected.
    if (
      relation === "CHILD" &&
      !isNaN(childDob.getTime()) &&
      childDob < oldestAllowedChildDob
    ) {
      return `Child maximum allowed age is ${this.maximumChildAge} years. Please enter a valid Date of Birth.`;
    }

    return null;
  }

  private validateMemberBusinessRules(member: any): string | null {
    const relation = String(member?.relation || "").trim().toUpperCase();
    const maritalStatus = String(member?.maritalStatus || "").trim().toUpperCase();
    const visaLocation = String(member?.visaLocation || "").trim().toUpperCase();

    const relationAgeError = this.validateRelationAge(member);
    if (relationAgeError) {
      return relationAgeError;
    }

    if (relation === "SPOUSE" && maritalStatus === "SINGLE") {
      return "Spouse cannot have marital status 'Single'. Please set relation or marital status appropriately.";
    }

    if ((relation === "SPOUSE" || relation === "CHILD") && this.isLsbSalaryType(member?.salaryType)) {
      return "Spouse and Child cannot have Salary Type 'LSB'. Please choose a different Salary Type.";
    }

    if (this.isLsbSalaryType(member?.salaryType) && visaLocation !== "DXB") {
      return "Salary Type 'LSB' requires Visa Location 'DXB'.";
    }

    return null;
  }

  private validateLoadedMemberData(): boolean {
    const corrections: string[] = [];
    const spouseSingleErrors: string[] = [];
    const originalPayload = JSON.stringify(this.members);

    this.members.forEach((member, index) => {
      const serialNo = Number(member?.serialNo) || index + 1;
      const relation = String(member?.relation || "").trim().toUpperCase();
      const maritalStatus = String(member?.maritalStatus || "").trim().toUpperCase();
      const visaLocation = String(member?.visaLocation || "").trim().toUpperCase();
      const ageError = this.validateRelationAge(member);

      if (ageError) {
        member.relation = "";
        corrections.push(`Member ${serialNo}: Relation was cleared. ${ageError}`);
      }

      if (relation === "SPOUSE" && maritalStatus === "SINGLE") {
        member.maritalStatus = "Married";
        corrections.push(`Member ${serialNo}: Marital Status was changed to Married.`);
        spouseSingleErrors.push(
          `Member ${serialNo}: Spouse cannot have marital status 'Single'.`
        );
      }

      if ((relation === "SPOUSE" || relation === "CHILD") && this.isLsbSalaryType(member?.salaryType)) {
        member.salaryType = "Enhanced";
        corrections.push(`Member ${serialNo}: Salary Type was changed from LSB to Enhanced.`);
      } else if (this.isLsbSalaryType(member?.salaryType) && visaLocation !== "DXB") {
        member.salaryType = "Enhanced";
        corrections.push(`Member ${serialNo}: Salary Type was changed from LSB to Enhanced because Visa Location is not DXB.`);
      } else if (String(member?.salaryType || "").trim().toUpperCase() === "EBP") {
        member.salaryType = "";
        corrections.push(`Member ${serialNo}: Invalid Salary Type EBP was cleared.`);
      }

      if (String(member?.category || "").trim().toUpperCase() === "EBP") {
        member.category = "";
        corrections.push(`Member ${serialNo}: Invalid Category EBP was cleared.`);
      }
    });

    if (this.members.length > 0 && this.members.every(member => this.isLsbSalaryType(member?.salaryType))) {
      this.members[0].salaryType = "Enhanced";
      const serialNo = Number(this.members[0]?.serialNo) || 1;
      corrections.push(`Member ${serialNo}: Salary Type was changed to Enhanced so at least one Enhanced member remains.`);
    }

    if (corrections.length === 0) {
      this.loadedSpouseSingleValidationSignature = "";
      return false;
    }

    // Initial-load corrections remain silent except for the Spouse + Single
    // business rule, which must be brought to the user's attention.
    if (
      spouseSingleErrors.length > 0 &&
      originalPayload !== this.loadedSpouseSingleValidationSignature
    ) {
      this.loadedSpouseSingleValidationSignature = originalPayload;
      void this.context.navigation.openAlertDialog(
        {
          text: spouseSingleErrors.join("\n"),
          confirmButtonLabel: "OK"
        },
        { width: 480, height: 200 }
      );
    }

    return true;
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
        key !== "EBP" &&
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

    if (this.fileInteractionActive) {
      this.refreshPending = true;
      return;
    }

    const addBtn = this.container.querySelector(".btn.primary") as HTMLButtonElement;
    if (addBtn) addBtn.disabled = this.isReadOnly;

    const deleteBtn = this.container.querySelector(".btn.subtle") as HTMLButtonElement;
    if (deleteBtn) deleteBtn.disabled = this.isReadOnly;

    this.renderGrid(this.gridRef);
    this.renderPagination(this.paginationRef);
  }

  private completeFileInteraction(): void {

    this.fileInteractionActive = false;

    if (this.refreshPending) {
      this.refreshPending = false;
      this.refresh();
    }
  }

  private renderGrid(container: HTMLDivElement): void {

    container.innerHTML = "";

    if (this.members.length === 0) {
      const emptyState = document.createElement("button");
      emptyState.type = "button";
      emptyState.className = "empty-state";
      emptyState.disabled = true;
      emptyState.innerText = this.memberDataError || "No members are available.";
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
    const headers = ["#", "Relation", "Gender", "DOB", "Salary", "Visa", "Category", "Marital", "Premium"];

    headers.forEach(h => {
      const d = document.createElement("div");
      d.className = "grid-header";
      d.innerText = h;
      grid.appendChild(d);
    });

      const createReadOnlyValue = (value: string): HTMLDivElement => {
      const display = document.createElement("div");
      display.className = "readonly-field";
      display.textContent = value || "";
      display.setAttribute("aria-readonly", "true");
        return display;
      };

      const getGenderDisplayValue = (value: string): string => {
        const normalizedValue = (value || "").trim().toUpperCase();

        if (normalizedValue === "M" || normalizedValue === "MALE") return "Male";
        if (normalizedValue === "F" || normalizedValue === "FEMALE") return "Female";

        return (value || "").trim();
      };

      const getPremiumDisplayValue = (premium: any): string => {
        if (premium === null || premium === undefined) return "";
        if (typeof premium !== "object") return String(premium);

        const amount = premium.finalPremium ??
          premium.currentPremium ??
          premium.basePremium;

        return amount === null || amount === undefined ? "" : String(amount);
      };

    const createDropdown = (
      options: string[],
      value: string,
      field: string,
      idx: number,
      forceDisabled = false
    ) => {
      if (this.isReadOnly || this.enableUpload || forceDisabled) {
        return createReadOnlyValue((value || "").trim());
      }

      const select = document.createElement("select");
      select.className = "dropdown";
      select.disabled = this.isReadOnly || this.enableUpload || forceDisabled;
      if (select.disabled) {
        select.tabIndex = -1;
        select.setAttribute("aria-disabled", "true");
      }

      const currentValue = (value || "").trim();
      const normalizedCurrentValue = currentValue.toUpperCase();
      const excludesEbp = field === "salaryType" || field === "category";
      const filteredOptions = excludesEbp
        ? options.filter(option => option.trim().toUpperCase() !== "EBP")
        : options;
      const canIncludeCurrentValue = currentValue &&
        !(excludesEbp && normalizedCurrentValue === "EBP");
      const dropdownOptions = canIncludeCurrentValue &&
        !filteredOptions.some(o => o.trim().toUpperCase() === normalizedCurrentValue)
        ? [currentValue, ...filteredOptions]
        : filteredOptions;

      const emptyOpt = document.createElement("option");
      emptyOpt.value = "";
      emptyOpt.innerText = "";
      emptyOpt.selected = !canIncludeCurrentValue;
      select.appendChild(emptyOpt);

      dropdownOptions.forEach(o => {
        const opt = document.createElement("option");
        opt.value = o;
        opt.innerText = o;
        if (o.trim().toUpperCase() === normalizedCurrentValue) opt.selected = true;
        select.appendChild(opt);
      });

      select.onchange = async () => {
        if (this.isReadOnly || this.enableUpload || forceDisabled) return;

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
      if (relationSelect.disabled) {
        relationSelect.tabIndex = -1;
        relationSelect.setAttribute("aria-disabled", "true");
      }

      relationOptions.forEach(o => {
        const opt = document.createElement("option");
        opt.value = o.code;
        opt.innerText = o.display;
        if (o.code === row.relation) opt.selected = true;
        relationSelect.appendChild(opt);
      });

      relationSelect.onchange = async () => {
        if (this.isReadOnly || this.enableUpload) return;

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

      const relationDisplay = relationOptions.find(option => option.code === row.relation)?.display
        || row.relation
        || "";
      grid.appendChild(cell(
        this.isReadOnly || this.enableUpload
          ? createReadOnlyValue(relationDisplay)
          : relationSelect
      ));

      // OTHER FIELDS (UNCHANGED)
      grid.appendChild(cell(createDropdown(
        ["Male", "Female"],
        getGenderDisplayValue(row.gender),
        "gender",
        idx
      )));


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
      grid.appendChild(cell(createReadOnlyValue(getPremiumDisplayValue(row.premium))));

      if (row.overaged === true && this.enableUpload) {

        const memberSerialNo = Number(row.serialNo || idx + 1);
        const getLiveMember = (): any =>
          this.members.find((member, memberIndex) =>
            Number(member?.serialNo || memberIndex + 1) === memberSerialNo
          ) || this.members[idx] || row;

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

        let fileSelectionHandled = false;
        let attachmentOutputChanged = false;

        const attachmentsContainer = document.createElement("div");
        attachmentsContainer.className = "uploaded-files";

        const uploadError = document.createElement("div");
        uploadError.className = "upload-error";
        uploadError.setAttribute("role", "alert");

        const setUploadError = (message: string): void => {
          if (message) {
            this.uploadErrors.set(row, message);
          } else {
            this.uploadErrors.delete(row);
          }

          uploadError.innerText = message;
          uploadError.style.display = message ? "" : "none";
        };

        setUploadError(this.uploadErrors.get(row) || "");

        const remarksField = document.createElement("textarea");
        remarksField.className = "remarks-input";
        remarksField.placeholder = "Enter remarks";
        remarksField.disabled = this.isReadOnly;
        remarksField.value = String(row.remarks || "");
        remarksField.onchange = () => {
          const liveMember = getLiveMember();
          liveMember.remarks = remarksField.value;
          row.remarks = remarksField.value;
          this.updateDerivedOutputJsons();
          this.syncDebug("65+ remarks changed; publishing bound outputs", {
            member: this.summarizeMembersForDebug([liveMember])[0]
          });

          // Opening the native picker blurs this field. Notifying PCF at that
          // moment rebuilds the grid and detaches the file input before its
          // change event can receive the selected file.
          if (!this.fileInteractionActive) {
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

            const fileDetails = document.createElement("div");

            const fileName = document.createElement("div");
            fileName.className = "uploaded-file-name";
            fileName.innerText = attachment.name || `File ${attachmentIndex + 1}`;

            fileLeft.appendChild(checkMark);
            fileDetails.appendChild(fileName);

            if (attachment.comment) {
              const documentComment = document.createElement("div");
              documentComment.className = "document-comment";
              documentComment.innerText = `Remarks: ${attachment.comment}`;
              fileDetails.appendChild(documentComment);
            }

            fileLeft.appendChild(fileDetails);

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
            viewBtn.onclick = async () => {
              const url = await this.getAttachmentDataUrl(attachment);
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
            downloadBtn.onclick = async () => {
              const url = await this.getAttachmentDataUrl(attachment);
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

            actionGroup.appendChild(viewBtn);
            actionGroup.appendChild(downloadBtn);
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

          // The Web API call below is asynchronous. PCF can invoke updateView
          // while it is running and replace this.members with freshly parsed
          // objects, making the row captured by renderGrid stale. Keep a
          // stable identity so upload completion updates the live member that
          // getOutputs will serialize.
          const uploadMemberSerialNo = memberSerialNo;

          setUploadError("");

          // Validate files: allowed extensions for 65+ are Pdf, Png, Jpeg, Jpg and size <= 5MB
          const MAX_BYTES = 5 * 1024 * 1024; // 5MB
          const invalids: string[] = [];
          const existingAttachments = Array.isArray(row.attachments) ? row.attachments.length : 0;
          const selectedCount = files.length;

          const normalizeFileName = (name: string): string =>
            String(name || "").trim().toLocaleLowerCase();

          const existingNames = new Set<string>();

          // A filename can be used only once across the complete member list,
          // not once per member.
          this.members.forEach(member => {
            (Array.isArray(member.attachments) ? member.attachments : [])
              .map((attachment: any) => normalizeFileName(attachment?.name))
              .filter((name: string) => !!name)
              .forEach((name: string) => existingNames.add(name));

            const documentName = normalizeFileName(member.documentName);
            if (documentName) {
              existingNames.add(documentName);
            }
          });

          const selectedNames = new Set<string>();
          const duplicateFile = files.find(file => {
            const normalizedName = normalizeFileName(file.name);
            const isDuplicate =
              existingNames.has(normalizedName) ||
              this.uploadsInProgress.has(normalizedName) ||
              selectedNames.has(normalizedName);

            selectedNames.add(normalizedName);
            return isDuplicate;
          });

          if (duplicateFile) {
            setUploadError("This file has already been uploaded for another member.");
            return;
          }

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
            if (f.size > MAX_BYTES) invalids.push(`${name} — file too large (max 5 MB)`);
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

          const processingIndicator = document.createElement("span");
          processingIndicator.className = "upload-processing-indicator";
          processingIndicator.innerText = "Processing...";
          btn.parentElement?.insertBefore(processingIndicator, btn.nextSibling);
          btn.disabled = true;
          selectedNames.forEach(name => this.uploadsInProgress.add(name));

          try {
            const uploadedAttachments = await Promise.all(
              files.map(file => this.createAttachmentFromFile(file))
            );

            const liveMember = getLiveMember();

            if (!liveMember.serialNo) {
              liveMember.serialNo = uploadMemberSerialNo;
            }

            liveMember.attachments = Array.isArray(liveMember.attachments)
              ? liveMember.attachments
              : [];
            liveMember.attachments.push(...uploadedAttachments);
            if (!liveMember.documentName && uploadedAttachments.length) {
              liveMember.documentName = uploadedAttachments[0].name;
            }

            // Keep the currently rendered card in sync when updateView
            // replaced the backing member during the upload.
            row.attachments = liveMember.attachments;
            row.documentName = liveMember.documentName;

            this.syncDebug("65+ attachments uploaded", {
              uploadedFiles: uploadedAttachments.map(uploaded => ({
                name: uploaded.name || "",
                hasAnnotationId: Boolean(uploaded.annotationId)
              })),
              member: this.summarizeMembersForDebug([liveMember])[0]
            });

            setUploadError("");
            renderAttachments();
            attachmentOutputChanged = true;
            // this.refresh();
          } catch (error) {
            console.error("Member attachment upload failed.", error);
            await this.context.navigation.openAlertDialog(
              {
                text: "The file could not be uploaded. Please try again.",
                confirmButtonLabel: "OK"
              },
              { width: 420, height: 180 }
            );
          } finally {
            selectedNames.forEach(name => this.uploadsInProgress.delete(name));
            processingIndicator.remove();
            btn.disabled = this.isReadOnly;
            fileInput.value = "";
          }
        };

        const openFilePicker = (): void => {
          if (this.isReadOnly) return;

          // Keep the latest remarks in the row before opening the native picker.
          // The upload flow will notify the framework after a file is selected.
          getLiveMember().remarks = remarksField.value;
          row.remarks = remarksField.value;
          this.fileInteractionActive = true;
          fileSelectionHandled = false;
          fileInput.value = "";

          // Some browsers do not emit the file-input cancel event. Window focus
          // is a fallback that commits remarks after a cancelled picker.
          window.addEventListener("focus", () => {
            window.setTimeout(() => {
              if (!this.fileInteractionActive || fileSelectionHandled) return;

              this.completeFileInteraction();
              this.updateDerivedOutputJsons();
              this.notifyOutputChanged();
            }, 300);
          }, { once: true });

          fileInput.click();
        };

        // Lock grid refreshes before the remarks field loses focus. The actual
        // file picker must open from the normal click event for reliable browser
        // and Power Apps iframe behavior.
        btn.onpointerdown = event => {
          if (!event.isPrimary || event.button !== 0) return;
          this.fileInteractionActive = true;
          getLiveMember().remarks = remarksField.value;
          row.remarks = remarksField.value;
        };

        btn.onclick = event => {
          event.preventDefault();
          openFilePicker();
        };

        fileInput.onchange = () => {
          fileSelectionHandled = true;
          void (async () => {
            try {
              await addAttachments();
            } finally {
              this.completeFileInteraction();

              // Publish bound outputs only after leaving file-interaction
              // mode, so a deferred updateView cannot restore stale JSON.
              if (attachmentOutputChanged) {
                attachmentOutputChanged = false;
                this.updateDerivedOutputJsons();
                this.notifyOutputChanged();
              }
            }
          })();
        };

        fileInput.addEventListener("cancel", () => {
          if (!this.fileInteractionActive) return;

          fileSelectionHandled = true;
          this.completeFileInteraction();
          this.updateDerivedOutputJsons();
          this.notifyOutputChanged();
        });

        // Policy view exposes saved remarks and documents, but never upload or
        // delete controls. View and Download are the only document actions.
        uploadRow.appendChild(remarksField);
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
    return {};
  }

  public destroy(): void { }
}
