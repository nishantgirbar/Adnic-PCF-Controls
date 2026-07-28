import { IInputs, IOutputs } from "./generated/ManifestTypes";

interface AuditEvent {
    id: number;
    eventId?: string;
    sourceService?: string;
    eventType?: string;
    quoteId?: number | null;
    versionId?: number | null;
    userId?: number | null;
    userRole?: string | null;
    fromState?: string | null;
    toState?: string | null;
    entityType?: string | null;
    entityId?: number | null;
    payload?: string | Record<string, unknown> | null;
    eventTime?: string;
    createdAt?: string;
}

interface ActivityRow {
    id: string;
    iteration: string;
    timestamp: Date;
    performer: string;
    role: string;
    workflow: string;
    details: string;
    comment: string;
    kind: "document" | "action" | "comment" | "general";
    policyLevel: boolean;
}

type SortField = "iteration" | "timestamp" | "performer" | "workflow" | "details" | "comment";

export class AuditTrailControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private static readonly quoteIdStoragePrefix = "adnic.auditTrail.quoteId";
    private container!: HTMLDivElement;
    private context!: ComponentFramework.Context<IInputs>;
    private requestKey = "";
    private requestVersion = 0;
    private rows: ActivityRow[] = [];
    private sortField: SortField = "timestamp";
    private sortAscending = false;
    private auditApiUrl = "";
    private quoteNumber = "";

    public init(
        context: ComponentFramework.Context<IInputs>,
        _notifyOutputChanged: () => void,
        _state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this.context = context;
        this.container = container;
        this.container.classList.add("adnic-audit-trail");
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this.context = context;
        const quoteId = this.getQuoteIdFromForm();
        const key = [
            quoteId,
            context.parameters.bearerToken.raw ?? "",
            context.parameters.refreshTrigger.raw ?? ""
        ].join("\u001f");

        //if (key !== this.requestKey) {
         //   this.requestKey = key;
            void this.load();
      //  }
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
        this.requestVersion += 1;
        this.container.replaceChildren();
    }

    private async load(): Promise<void> {
        const quoteId = this.getQuoteIdFromForm();
        const token = (this.context.parameters.bearerToken.raw ?? "").trim();
        const version = ++this.requestVersion;

        if (!quoteId) {
            this.renderState(
                "Quote ID was not supplied in the form parameters.",
                true
            );
            return;
        }

        this.renderLoading();
        try {
            const baseUrl = await this.getAuditApiUrl();
            const url = `${baseUrl}/quotes/${encodeURIComponent(quoteId)}/timeline`;
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": /^Bearer\s/i.test(token) ? token : `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorBody = await this.readError(response);
                throw new Error(errorBody || `Audit API request failed (${response.status} ${response.statusText}).`);
            }

            const body = await response.json() as unknown;
            if (version !== this.requestVersion) return;
            const events = this.unwrapEvents(body);
            this.quoteNumber = this.getQuoteNumber(events);
            this.rows = events.map((event, index) => this.mapEvent(event, index));
            this.render();
        } catch (error) {
            if (version !== this.requestVersion) return;
            const message = error instanceof Error ? error.message : "The audit trail could not be loaded.";
            this.renderState(message, true, true);
        }
    }

    private getQuoteNumber(events: AuditEvent[]): string {
        for (const event of events) {
            const payload = this.parsePayload(event.payload);
            const value = payload.quoteNumber ?? payload.quotationNumber ?? payload.quoteNo;
            if (value !== undefined && value !== null && String(value).trim()) {
                return String(value).trim();
            }
        }
        return "";
    }

    private getQuoteIdFromForm(): string {
        const boundQuoteId = this.context.parameters.quoteId.raw;
        if (boundQuoteId !== null && boundQuoteId !== undefined && String(boundQuoteId).trim()) {
            const quoteId = this.normalizeQuoteId(boundQuoteId);
            this.rememberQuoteId(quoteId);
            return quoteId;
        }

        const context = this.context as any;
        const localXrm = (window as any).Xrm;
        const parentXrm = (window.parent as any)?.Xrm || (window.top as any)?.Xrm;
        const xrm = localXrm || parentXrm;
        const pageContext =
            localXrm?.Utility?.getPageContext?.() ||
            parentXrm?.Utility?.getPageContext?.();
        const queryParameters =
            xrm?.Utility?.getGlobalContext?.().getQueryStringParameters?.() ||
            xrm?.Page?.context?.getQueryStringParameters?.() ||
            {};
        const pageData = pageContext?.input?.data;

        const candidates: unknown[] = [
            pageData?.quoteId,
            pageData?.quoteid,
            pageData?.quoteID,
            pageContext?.input?.quoteId,
            context.page?.quoteId,
            context.page?.input?.data?.quoteId,
            context.mode?.contextInfo?.quoteId,
            queryParameters.quoteId,
            queryParameters.quoteid,
            this.navigationParameterValue("quoteId"),
            this.navigationParameterValue("quoteid")
        ];

        for (const candidate of candidates) {
            if (candidate !== undefined && candidate !== null && String(candidate).trim()) {
                const quoteId = this.normalizeQuoteId(candidate);
                this.rememberQuoteId(quoteId);
                return quoteId;
            }
        }

        return this.recallQuoteId();
    }

    private normalizeQuoteId(value: unknown): string {
        return String(value).trim().replace(/[{}]/g, "");
    }

    private rememberQuoteId(quoteId: string): void {
        if (!quoteId) return;

        try {
            window.sessionStorage.setItem(this.getQuoteIdStorageKey(), quoteId);
        } catch {
            // Storage can be unavailable in restricted or private browser contexts.
        }
    }

    private recallQuoteId(): string {
        try {
            return this.normalizeQuoteId(
                window.sessionStorage.getItem(this.getQuoteIdStorageKey()) ?? ""
            );
        } catch {
            return "";
        }
    }

    private getQuoteIdStorageKey(): string {
        let pagePath = window.location.pathname;

        // Scope the cached value to the host page so separate custom pages in the
        // same tab do not accidentally reuse one another's quote IDs.
        for (const hostWindow of [window.parent, window.top]) {
            try {
                if (hostWindow?.location?.pathname) {
                    pagePath = hostWindow.location.pathname;
                    break;
                }
            } catch {
                // Cross-origin hosts are expected in some Dynamics clients.
            }
        }

        return `${AuditTrailControl.quoteIdStoragePrefix}:${pagePath}`;
    }

    private navigationParameterValue(name: string): string {
        const urls: string[] = [window.location.href, document.referrer];

        // A PCF control runs in its own iframe. The navigation parameters are on
        // the model-driven form URL, so inspect the host frames when same-origin
        // access is available.
        for (const hostWindow of [window.parent, window.top]) {
            try {
                if (hostWindow?.location?.href) {
                    urls.push(hostWindow.location.href);
                }
            } catch {
                // Cross-origin hosts are expected in some Dynamics clients.
            }
        }

        for (const url of urls) {
            if (!url) continue;

            try {
                const searchParameters = new URL(url, window.location.origin).searchParams;
                const directValue = searchParameters.get(name);
                if (directValue) return directValue;

                let extraQueryString = searchParameters.get("extraqs") ?? "";
                for (let decodeAttempt = 0; extraQueryString && decodeAttempt < 3; decodeAttempt += 1) {
                    const extraParameters = new URLSearchParams(extraQueryString);
                    const extraValue = extraParameters.get(name);
                    if (extraValue) return extraValue;

                    const decoded = decodeURIComponent(extraQueryString);
                    if (decoded === extraQueryString) break;
                    extraQueryString = decoded;
                }
            } catch {
                // Ignore malformed or inaccessible navigation URLs.
            }
        }

        return "";
    }

    private async getAuditApiUrl(): Promise<string> {
        if (this.auditApiUrl) {
            return this.auditApiUrl;
        }

        const baseUrl = await this.getEnvironmentVariableValue("adnic_BaseServiceUrl");
        const environmentName = await this.getEnvironmentVariableValue("adnic_EnvironmentName");

        if (!baseUrl) {
            throw new Error(
                'Environment variable "adnic_BaseServiceUrl" is empty or was not found.'
            );
        }

        this.auditApiUrl = [
            baseUrl.replace(/\/+$/, ""),
            environmentName.replace(/^\/+|\/+$/g, ""),
            "quote-management/api/v1/audit"
        ].filter(Boolean).join("/");

        return this.auditApiUrl;
    }

    private async getEnvironmentVariableValue(schemaName: string): Promise<string> {
        const escapedSchemaName = schemaName.replace(/'/g, "''");
        const definitions = await this.context.webAPI.retrieveMultipleRecords(
            "environmentvariabledefinition",
            `?$select=environmentvariabledefinitionid,defaultvalue` +
            `&$filter=schemaname eq '${escapedSchemaName}'&$top=1`
        );
        const definition = definitions.entities[0];

        if (!definition) {
            throw new Error(`Environment variable definition "${schemaName}" was not found.`);
        }

        const definitionId = definition.environmentvariabledefinitionid;
        if (typeof definitionId !== "string") {
            throw new Error(`Environment variable definition "${schemaName}" has no ID.`);
        }

        const values = await this.context.webAPI.retrieveMultipleRecords(
            "environmentvariablevalue",
            `?$select=value&$filter=_environmentvariabledefinitionid_value eq ` +
            `'${this.cleanGuid(definitionId)}'&$top=1`
        );
        const currentValue = values.entities[0]?.value;
        if (typeof currentValue === "string" && currentValue.trim()) {
            return currentValue.trim();
        }

        const defaultValue = definition.defaultvalue;
        return typeof defaultValue === "string" ? defaultValue.trim() : "";
    }

    private cleanGuid(value: string): string {
        return value.trim().replace(/[{}]/g, "");
    }

    private unwrapEvents(value: unknown): AuditEvent[] {
        if (Array.isArray(value)) return value as AuditEvent[];
        if (value && typeof value === "object") {
            const object = value as Record<string, unknown>;
            if (Array.isArray(object.content)) return object.content as AuditEvent[];
            if (Array.isArray(object.data)) return object.data as AuditEvent[];
            if (Array.isArray(object.events)) return object.events as AuditEvent[];
        }
        return [];
    }

    private mapEvent(event: AuditEvent, index: number): ActivityRow {
        const payload = this.parsePayload(event.payload);
        const type = String(event.eventType ?? "ACTIVITY");
        const role = this.titleCase(String(event.userRole ?? (event.userId ? "User" : "System")));
        const performer = this.firstText(payload, [
            "performedBy", "underwriterName", "userName", "brokerName", "reviewerName"
        ]) || (event.userId ? `User ${event.userId}` : role);
        const iterationValue = payload.iterationNumber ?? payload.iteration ?? payload.version;
        const iteration = iterationValue === undefined || iterationValue === null
            ? event.versionId === null || event.versionId === undefined ? "0" : String(event.versionId)
            : String(iterationValue);
        const timestamp = new Date(event.eventTime ?? event.createdAt ?? "");
        const detail = this.eventDetails(type, payload, event);
        const comment = this.firstText(payload, [
            "remarks", "comment", "comments", "reason", "message", "description"
        ]);
        const kind = this.eventKind(type);

        return {
            id: String(event.id ?? event.eventId ?? index),
            iteration,
            timestamp: isNaN(timestamp.getTime()) ? new Date(0) : timestamp,
            performer,
            role,
            workflow: this.workflowLabel(type, event),
            details: detail,
            comment,
            kind,
            policyLevel: this.isPolicyLevel(type, event)
        };
    }

    private parsePayload(value: AuditEvent["payload"]): Record<string, unknown> {
        if (value && typeof value === "object") return value;
        if (typeof value !== "string" || !value.trim()) return {};
        try {
            const parsed = JSON.parse(value) as unknown;
            return parsed && typeof parsed === "object" && !Array.isArray(parsed)
                ? parsed as Record<string, unknown>
                : {};
        } catch {
            return { message: value };
        }
    }

    private eventDetails(type: string, payload: Record<string, unknown>, event: AuditEvent): string {
        const ignored = new Set([
            "remarks", "comment", "comments", "reason", "message", "description",
            "performedBy", "underwriterName", "userName", "brokerName", "reviewerName",
            "iterationNumber", "iteration", "version", "quoteNumber"
        ]);
        const parts = Object.keys(payload)
            .filter(key => !ignored.has(key) && payload[key] !== null && payload[key] !== undefined && payload[key] !== "")
            .slice(0, 5)
            .map(key => `${this.titleCase(key)}: ${this.displayValue(payload[key])}`);

        if (parts.length) return parts.join(" · ");
        if (event.fromState || event.toState) {
            return `${this.stateLabel(event.fromState)} → ${this.stateLabel(event.toState)}`;
        }
        return this.titleCase(type);
    }

    private workflowLabel(type: string, event: AuditEvent): string {
        if (event.fromState || event.toState) {
            return [this.stateLabel(event.fromState), this.stateLabel(event.toState)]
                .filter(Boolean).join(" → ");
        }
        return this.titleCase(type);
    }

    private eventKind(type: string): ActivityRow["kind"] {
        if (type.startsWith("DOCUMENT_")) return "document";
        if (type.includes("COMMENT")) return "comment";
        if (/(APPROVED|DECISION|LOADING|COMMITTED|STATUS_CHANGED)/.test(type)) return "action";
        return "general";
    }

    private isPolicyLevel(type: string, event: AuditEvent): boolean {
        return event.entityType === "DOCUMENT" ||
            event.entityType === "PRICING" ||
            event.sourceService === "DOCUMENT" ||
            event.sourceService === "RATING" ||
            /DOCUMENT|PRICING|PREMIUM|UW_|LOADING|APPROVED/.test(type);
    }

    private render(): void {
        this.container.replaceChildren();
        const shell = this.el("section", "audit-shell");
        shell.setAttribute("aria-label", "Quote audit trail");

        const header = this.el("header", "audit-header");
        const headingGroup = this.el("div", "audit-heading-group");
        const quoteNumber = this.quoteNumber || this.getQuoteIdFromForm();
        headingGroup.appendChild(this.el("h1", "audit-title", `Audit Trail for quote No: ${quoteNumber}`));
        headingGroup.appendChild(this.el("p", "audit-subtitle", "Track all activities and workflow steps for policy applications"));
        header.appendChild(headingGroup);
        header.appendChild(this.refreshButton());
        shell.appendChild(header);

        if (!this.rows.length) {
            shell.appendChild(this.el("div", "audit-empty", "No audit activities were found for this quote."));
        } else {
            shell.appendChild(this.renderSection(
                "Policy Issuance Level",
                "Policy protection and approval workflow activities",
                this.rows.filter(row => row.policyLevel)
            ));
            shell.appendChild(this.renderSection(
                "Quote Level",
                "Quote generation, modification, and approval activities",
                this.rows.filter(row => !row.policyLevel)
            ));
            shell.appendChild(this.renderLegend());
        }
        this.container.appendChild(shell);
    }

    private renderSection(title: string, subtitle: string, rows: ActivityRow[]): HTMLElement {
        const section = this.el("section", "audit-section");
        const titleRow = this.el("div", "audit-section-title-row");
        titleRow.appendChild(this.el("h2", "audit-section-title", title));
        titleRow.appendChild(this.el("span", "audit-count", `${rows.length} ${rows.length === 1 ? "Activity" : "Activities"}`));
        section.appendChild(titleRow);
        section.appendChild(this.el("p", "audit-section-subtitle", subtitle));

        if (!rows.length) {
            section.appendChild(this.el("div", "audit-section-empty", "No activities in this section."));
            return section;
        }

        const tableWrap = this.el("div", "audit-table-wrap");
        const table = document.createElement("table");
        table.className = "audit-table";
        const head = document.createElement("thead");
        const headerRow = document.createElement("tr");
        const columns: Array<[SortField, string]> = [
            ["iteration", "Iteration"], ["timestamp", "Date & Time"],
            ["performer", "Performed By"], ["workflow", "Workflow Step"],
            ["details", "Activity Details"], ["comment", "Comments / Actions"]
        ];
        columns.forEach(([field, label]) => {
            const th = document.createElement("th");
            const button = document.createElement("button");
            button.type = "button";
            button.className = "audit-sort";
            button.textContent = `${label} ${this.sortField === field ? (this.sortAscending ? "↑" : "↓") : "↕"}`;
            button.addEventListener("click", () => this.changeSort(field));
            th.appendChild(button);
            headerRow.appendChild(th);
        });
        head.appendChild(headerRow);
        table.appendChild(head);

        const body = document.createElement("tbody");
        this.sorted(rows).forEach(row => body.appendChild(this.renderRow(row)));
        table.appendChild(body);
        tableWrap.appendChild(table);
        section.appendChild(tableWrap);
        return section;
    }

    private renderRow(row: ActivityRow): HTMLTableRowElement {
        const tr = document.createElement("tr");
        tr.dataset.rowId = row.id;
        tr.appendChild(this.td(row.iteration, "audit-iteration"));
        tr.appendChild(this.td(this.formatDate(row.timestamp), "audit-date"));

        const performed = document.createElement("td");
        performed.appendChild(this.el("div", "audit-performer", row.performer));
        performed.appendChild(this.el("div", "audit-role", row.role));
        tr.appendChild(performed);
        tr.appendChild(this.td(row.workflow, "audit-workflow"));
        tr.appendChild(this.td(row.details, "audit-details"));

        const comments = document.createElement("td");
        if (row.comment) {
            const content = this.el("div", `audit-comment audit-comment--${row.kind}`);
            content.appendChild(this.el("span", "audit-comment-icon", this.kindIcon(row.kind)));
            content.appendChild(this.el("span", "", row.comment));
            comments.appendChild(content);
        } else {
            comments.appendChild(this.el("span", "audit-no-comment", "—"));
        }
        tr.appendChild(comments);
        return tr;
    }

    private changeSort(field: SortField): void {
        if (this.sortField === field) this.sortAscending = !this.sortAscending;
        else {
            this.sortField = field;
            this.sortAscending = true;
        }
        this.render();
    }

    private sorted(rows: ActivityRow[]): ActivityRow[] {
        const direction = this.sortAscending ? 1 : -1;
        return [...rows].sort((left, right) => {
            const a = this.sortField === "timestamp" ? left.timestamp.getTime() : left[this.sortField].toLowerCase();
            const b = this.sortField === "timestamp" ? right.timestamp.getTime() : right[this.sortField].toLowerCase();
            return a < b ? -direction : a > b ? direction : 0;
        });
    }

    private renderLegend(): HTMLElement {
        const legend = this.el("div", "audit-legend");
        const items: Array<[ActivityRow["kind"], string]> = [
            ["document", "Document Upload Required"],
            ["action", "Action Taken"],
            ["comment", "Query/Clarification"]
        ];
        items.forEach(([kind, text]) => {
            const item = this.el("span", `audit-legend-item audit-legend-item--${kind}`);
            item.appendChild(this.el("span", "audit-comment-icon", this.kindIcon(kind)));
            item.appendChild(this.el("span", "", text));
            legend.appendChild(item);
        });
        return legend;
    }

    private refreshButton(): HTMLButtonElement {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "audit-refresh";
        button.textContent = "↻ Refresh";
        button.addEventListener("click", () => void this.load());
        return button;
    }

    private renderLoading(): void {
        this.container.replaceChildren();
        const state = this.el("div", "audit-state");
        state.setAttribute("role", "status");
        state.appendChild(this.el("span", "audit-spinner"));
        state.appendChild(this.el("span", "", "Loading audit trail…"));
        this.container.appendChild(state);
    }

    private renderState(message: string, error: boolean, retry = false): void {
        this.container.replaceChildren();
        const state = this.el("div", `audit-state${error ? " audit-state--error" : ""}`);
        state.setAttribute("role", error ? "alert" : "status");
        state.appendChild(this.el("span", "", message));
        if (retry) state.appendChild(this.refreshButton());
        this.container.appendChild(state);
    }

    private async readError(response: Response): Promise<string> {
        try {
            const body = await response.json() as Record<string, unknown>;
            return String(body.message ?? body.error ?? "");
        } catch {
            return "";
        }
    }

    private firstText(payload: Record<string, unknown>, keys: string[]): string {
        for (const key of keys) {
            const value = payload[key];
            if (value !== undefined && value !== null && String(value).trim()) return String(value);
        }
        return "";
    }

    private displayValue(value: unknown): string {
        if (Array.isArray(value)) return value.map(item => this.displayValue(item)).join(", ");
        if (value && typeof value === "object") return JSON.stringify(value);
        if (typeof value === "boolean") return value ? "Yes" : "No";
        return String(value);
    }

    private stateLabel(value?: string | null): string {
        return value ? this.titleCase(value) : "";
    }

    private titleCase(value: string): string {
        return value
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .replace(/[_-]+/g, " ")
            .toLowerCase()
            .replace(/\b\w/g, character => character.toUpperCase());
    }

    private formatDate(value: Date): string {
        if (value.getTime() === 0) return "—";
        return value.toLocaleString("en-AE", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "numeric", minute: "2-digit"
        });
    }

    private kindIcon(kind: ActivityRow["kind"]): string {
        return kind === "document" ? "▣" : kind === "action" ? "◉" : kind === "comment" ? "▢" : "•";
    }

    private td(text: string, className: string): HTMLTableCellElement {
        const cell = document.createElement("td");
        cell.className = className;
        cell.textContent = text;
        return cell;
    }

    private el(tag: string, className: string, text?: string): HTMLDivElement {
        const element = document.createElement(tag) as HTMLDivElement;
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }
}
