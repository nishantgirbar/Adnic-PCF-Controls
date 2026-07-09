import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { PolicyGrid } from "./PolicyGrid";

interface IInputs {}

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

  // 🔥 ENV BASE URL

  private apiBaseUrl: string = "";

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {

    this.context = context;

    this.container = container;

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

        apiBaseUrl: this.apiBaseUrl
      })
    );
  }

  public updateView(): void {}

  public getOutputs(): Record<string, never> {

    return {};
  }

  public destroy(): void {

    this.root.unmount();
  }
}
