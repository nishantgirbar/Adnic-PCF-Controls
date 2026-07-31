import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { PolicyGrid } from "./PolicyGrid";

interface IInputs {
  RoleType: ComponentFramework.PropertyTypes.StringProperty;
}

export class CustomGridB2E
  implements ComponentFramework.StandardControl<IInputs, Record<string, never>> {

  private container!: HTMLDivElement;

  private root!: ReactDOM.Root;

  private context!: ComponentFramework.Context<IInputs>;

  private data: any = null;

  private page: number = 0;

  private size: number = 10;

  private isLoading: boolean = false;

  private searchText: string = "";

  private quoteStatus: string = "";

  private apiBaseUrl: string = "";

  private roleType: string = "";

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {

    this.context = context;
    this.roleType = context.parameters.RoleType?.raw || "";

    this.container = container;
    this.container.style.width = "100%";
    this.container.style.minWidth = "0";
    this.container.style.overflow = "visible";

    context.mode.trackContainerResize(true);

    this.root = ReactDOM.createRoot(container);

    this.loadData();
  }

  // 🔥 ENVIRONMENT VARIABLE

  private async getEnvironmentVariableValue(
    schemaName: string
  ): Promise<string> {

    try {

      const definitionResult =
        await this.context.webAPI.retrieveMultipleRecords(
          "environmentvariabledefinition",
          `?$select=environmentvariabledefinitionid,schemaname&$filter=schemaname eq '${schemaName}'`
        );

      if (definitionResult.entities.length === 0) {

        console.error(
          "Environment Variable Definition not found"
        );

        return "";
      }

      const definitionId =
        definitionResult.entities[0]
          .environmentvariabledefinitionid;

      const valueResult =
        await this.context.webAPI.retrieveMultipleRecords(
          "environmentvariablevalue",
          `?$select=value&$filter=_environmentvariabledefinitionid_value eq '${definitionId}'`
        );

      if (valueResult.entities.length > 0) {

        return valueResult.entities[0].value || "";
      }

    } catch (error) {

      console.error(
        "Environment Variable Error:",
        error
      );
    }

    return "";
  }

  // 🔥 LOAD BASE URL

  private async loadApiBaseUrl() {

    if (this.apiBaseUrl) {

      return;
    }

    const baseUrl =
      await this.getEnvironmentVariableValue(
        "adnic_BaseServiceUrl"
      );

    const environmentName =
      await this.getEnvironmentVariableValue(
        "adnic_EnvironmentName"
      );

    this.apiBaseUrl =
      `${baseUrl}${environmentName}`;

    console.log(
      "API Base URL:",
      this.apiBaseUrl
    );
  }

  // 🔥 LOAD DATA

  private async loadData() {

    if (this.isLoading) return;

    this.isLoading = true;

    try {

      // 🔥 LOAD ENV URL

      await this.loadApiBaseUrl();

      let url =
        `${this.apiBaseUrl}/quote-management/api/v1/sme-quotes/search?page=${this.page}&size=${this.size}&sort=createdAt,desc`;

      // 🔥 SEARCH

      if (this.searchText?.trim()) {

        url +=
          `&searchText=${encodeURIComponent(this.searchText.trim())}`;
      }

      if (this.quoteStatus?.trim()) {

        url +=
          `&status=${encodeURIComponent(this.quoteStatus.trim())}`;
      }

      if (this.roleType.trim()) {
        const parameters = new URLSearchParams({
          bdUserId: "42",
          status: this.quoteStatus.trim(),
          search: this.searchText.trim(),
          page: String(this.page),
          size: String(this.size)
        });

        url = `${this.apiBaseUrl}/policy-command/api/v1/policies/bd-dashboard?${parameters.toString()}`;
      }

      console.log(
        "API URL:",
        url
      );

      const res = await fetch(url);

      if (!res.ok) {

        throw new Error(
          `API Failed: ${res.status}`
        );
      }

      const result = await res.json();

      this.data = result;

      this.page = result.number || 0;

      this.renderControl();

    } catch (e) {

      console.error(
        "Load Data Error:",
        e
      );

    } finally {

      this.isLoading = false;
    }
  }

  // 🔥 NEXT PAGE

  private nextPage = async () => {

    if (this.data && !this.data.last) {

      this.page++;

      await this.loadData();
    }
  };

  // 🔥 PREVIOUS PAGE

  private prevPage = async () => {

    if (this.page > 0) {

      this.page--;

      await this.loadData();
    }
  };

  // 🔥 PAGE SIZE

  private setPageSize = async (
    size: number
  ) => {

    this.size = size;

    this.page = 0;

    await this.loadData();
  };

  // 🔥 SEARCH

  private setSearchText = async (
    text: string,
    status?: string
  ) => {

    this.searchText = text || "";

    this.quoteStatus = status || "";

    this.page = 0;

    await this.loadData();
  };

  // 🔥 RENDER

  private renderControl() {

    this.root.render(
      React.createElement(PolicyGrid, {

        data: this.data,

        page: this.page,

        pageSize: this.size,

        onNext: this.nextPage,

        onPrev: this.prevPage,

        onPageSizeChange: this.setPageSize,

        onSearch: this.setSearchText,

        context: this.context,

        apiBaseUrl: this.apiBaseUrl,

        roleType: this.context.parameters.RoleType?.raw || ""
      })
    );
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {

    const nextRoleType = context.parameters.RoleType?.raw || "";
    const roleChanged = nextRoleType !== this.roleType;

    this.context = context;
    this.roleType = nextRoleType;

    if (roleChanged) {
      this.page = 0;
      this.data = null;
      void this.loadData();
      return;
    }

    if (this.data) {
      this.renderControl();
    }
  }

  public getOutputs(): Record<string, never> {

    return {};
  }

  public destroy(): void {

    this.root.unmount();
  }
}
