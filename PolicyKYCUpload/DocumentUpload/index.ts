import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { KycDocumentControl } from "./KycDocumentControl";
import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class KycDocumentUpload
implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private container!: HTMLDivElement;
    private root!: ReactDOM.Root;
    private context!: ComponentFramework.Context<IInputs>;
    private apiBaseUrl = "";

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {

        this.context = context;
        this.container = container;
        this.root = ReactDOM.createRoot(container);

        this.loadControl();
    }

    private async loadControl() {

        await this.loadApiBaseUrl();

        this.root.render(
            React.createElement(
                KycDocumentControl,
                {
                    context: this.context,
                    apiBaseUrl: this.apiBaseUrl
                }
            )
        );
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

    public updateView(): void {}

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
        this.root.unmount();
    }
}