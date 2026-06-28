import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { DynamicDropdown } from "./DynamicDropdown";

export class policyDropDownControl
    implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private container!: HTMLDivElement;
    private root!: ReactDOM.Root;
    private notifyOutputChanged!: () => void;
    private context!: ComponentFramework.Context<IInputs>;

    private selectedValue: string = "";
    private apiUrl: string = "";

    private initialized: boolean = false;
    private configLoaded: boolean = false;

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {

        this.context = context;
        this.container = container;
        this.notifyOutputChanged = notifyOutputChanged;

        this.root = ReactDOM.createRoot(container);
    }

    public updateView(
        context: ComponentFramework.Context<IInputs>
    ): void {

        this.context = context;

        if (!this.configLoaded) {

            this.configLoaded = true;

            this.loadConfiguration();

            return;
        }

        if (this.initialized) {
            this.renderControl();
        }
    }

    private async loadConfiguration(): Promise<void> {

        try {

            const serviceUrl =
                this.context.parameters.apiUrl?.raw || "";

            const baseUrl =
                await this.getEnvironmentVariableValue(
                    "adnic_BaseServiceUrl"
                );

            const environmentName =
                await this.getEnvironmentVariableValue(
                    "adnic_EnvironmentName"
                );

            const quoteApi =
                "quote-management/api/v1/sme-quotes";

            this.apiUrl = [
                baseUrl.replace(/\/$/, ""),
                environmentName,
                quoteApi,
                serviceUrl.replace(/^\//, "")
            ]
                .filter(Boolean)
                .join("/");

            console.log("Generated API URL:", this.apiUrl);

            this.initialized = true;

            this.renderControl();

        } catch (error) {

            console.error(
                "Configuration Load Error",
                error
            );
        }
    }

    private renderControl(): void {

        this.root.render(
            React.createElement(DynamicDropdown, {
                apiUrl: this.apiUrl,
                selectedValue: this.selectedValue,
                onChange: (value: string) => {

                    this.selectedValue = value;

                    this.notifyOutputChanged();
                }
            })
        );
    }

    private async getEnvironmentVariableValue(
        schemaName: string
    ): Promise<string> {

        try {

            const result =
                await this.context.webAPI.retrieveMultipleRecords(
                    "environmentvariabledefinition",
                    `?$select=schemaname
                    &$filter=schemaname eq '${schemaName}'
                    &$expand=environmentvariabledefinition_environmentvariablevalue($select=value)`
                );

            if (
                result.entities &&
                result.entities.length > 0
            ) {

                const values =
                    result.entities[0]
                        .environmentvariabledefinition_environmentvariablevalue;

                if (
                    values &&
                    values.length > 0
                ) {

                    return values[0].value || "";
                }
            }

            console.warn(
                `Environment Variable '${schemaName}' not found`
            );

        } catch (error) {

            console.error(
                `Error loading Environment Variable '${schemaName}'`,
                error
            );
        }

        return "";
    }

    public getOutputs(): IOutputs {

        return {
            selectedValue: this.selectedValue
        };
    }

    public destroy(): void {

        if (this.root) {
            this.root.unmount();
        }
    }
}