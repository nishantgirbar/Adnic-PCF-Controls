import * as React from "react";
import * as ReactDOM from "react-dom/client";

import { CensusUploadControl } from "./components/CensusUploadControl";

import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class PolicyCensusUpload
implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private container!: HTMLDivElement;
    private root!: ReactDOM.Root;
    private context!: ComponentFramework.Context<IInputs>;

    private notifyOutputChanged!: () => void;

    private _validatedMembersJson: string = "";

    private apiBaseUrl = "";

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {

        this.context = context;
        this.container = container;

        this.notifyOutputChanged =
            notifyOutputChanged;

        this.root =
            ReactDOM.createRoot(container);

        this.loadControl();
    }

    private onMembersValidated = (
        members: any[]
    ): void => {

        this._validatedMembersJson =
            JSON.stringify(
                members || []
            );

        this.notifyOutputChanged();
    };

    private async loadControl(): Promise<void> {

        await this.loadApiBaseUrl();

        this.root.render(
            React.createElement(
                CensusUploadControl,
                {
                    context: this.context,
                    apiBaseUrl: this.apiBaseUrl,
                    onMembersValidated:
                        this.onMembersValidated
                }
            )
        );
    }

    private async loadApiBaseUrl(): Promise<void> {

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

    private async getEnvironmentVariableValue(
        schemaName: string
    ): Promise<string> {

        try {

            const definitionResult =
                await this.context.webAPI.retrieveMultipleRecords(
                    "environmentvariabledefinition",
                    `?$select=environmentvariabledefinitionid,schemaname&$filter=schemaname eq '${schemaName}'`
                );

            if (
                definitionResult.entities.length === 0
            ) {
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

            if (
                valueResult.entities.length > 0
            ) {
                return (
                    valueResult.entities[0].value || ""
                );
            }

        } catch (error) {

            console.error(
                "Environment Variable Error:",
                error
            );
        }

        return "";
    }

    public updateView(
        context: ComponentFramework.Context<IInputs>
    ): void {

        this.context = context;

        this.root.render(
            React.createElement(
                CensusUploadControl,
                {
                    context: this.context,
                    apiBaseUrl: this.apiBaseUrl,
                    onMembersValidated:
                        this.onMembersValidated
                }
            )
        );
    }

    public getOutputs(): IOutputs {

        return {
            validatedMembersJson:
                this._validatedMembersJson
        };
    }

    public destroy(): void {

        if (this.root) {
            this.root.unmount();
        }
    }
}