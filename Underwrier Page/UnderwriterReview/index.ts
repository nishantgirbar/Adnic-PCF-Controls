import { IInputs, IOutputs } from "./generated/ManifestTypes";

import * as React from "react";

import {
    createRoot,
    Root
} from "react-dom/client";

import { MainContainer } from "./MainContainer";
import { roundToTwoDecimals } from "./numberUtils";

import "./styles.css";

export class QuoteDetailsPCF
implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    // =====================================
    // VARIABLES
    // =====================================

    private container!: HTMLDivElement;

    private root!: Root;

    private context!: ComponentFramework.Context<IInputs>;

    private apiUrl: string = "";

    private documentApiUrl: string = "";

    private getQuoteStatus = (): string => {

        try {

            const xrm = (window as any)?.Xrm;
            const formContext =
                xrm?.Page ??
                (window.parent as any)?.Xrm?.Page;

            const statusAttribute =
                formContext?.getAttribute?.("statuscode") ??
                formContext?.getAttribute?.("adnic_status");

            return String(
                statusAttribute?.getText?.() ??
                statusAttribute?.getValue?.() ??
                ""
            );

        } catch (error) {

            console.warn("Unable to read quote status from the form", error);
            return "";
        }
    };

    // =====================================
    // UPDATE CRM QUOTE PREMIUM
    // =====================================

    private updateQuotePremium = async (
        pricingResponse: any
    ): Promise<void> => {

        const totalPremium = roundToTwoDecimals(
            pricingResponse?.totalFinalPremium ??
            pricingResponse?.currentTotalPremium
        );

        if (!Number.isFinite(totalPremium)) {

            throw new Error(
                "Updated total premium was not returned by the pricing API"
            );
        }

        const pageContext =
            (this.context as any)?.page;

        const xrmPageContext =
            (window as any)?.Xrm?.Utility
                ?.getPageContext?.();

        const entityId = String(
            pageContext?.entityId ||
            xrmPageContext?.input?.entityId ||
            ""
        ).replace(/[{}]/g, "");

        if (!entityId) {

            throw new Error(
                "Current CRM quote record ID was not found"
            );
        }

        await this.context.webAPI.updateRecord(
            "adnic_quote",
            entityId,
            {
                adnic_totalpremium:
                    totalPremium
            }
        );

        console.log(
            "CRM quote premium updated",
            {
                entityId,
                totalPremium
            }
        );
    };

    // =====================================
    // INIT
    // =====================================

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {

        this.context = context;

        this.container = container;

        this.root = createRoot(container);

        this.loadEnvironmentUrls();
    }

    // =====================================
    // GET ENVIRONMENT VARIABLE
    // =====================================

    private async getEnvironmentVariableValue(
        schemaName: string
    ): Promise<string> {

        try {

            // =====================================
            // GET ENV VARIABLE DEFINITION
            // =====================================

            const definitionResult =

                await this.context.webAPI
                    .retrieveMultipleRecords(

                        "environmentvariabledefinition",

                        `?$select=environmentvariabledefinitionid,schemaname&$filter=schemaname eq '${schemaName}'`
                    );

            console.log(
                "Definition Result:",
                definitionResult
            );

            if (
                definitionResult.entities.length === 0
            ) {

                console.error(
                    "Environment Variable Definition not found:",
                    schemaName
                );

                return "";
            }

            const definitionId =

                definitionResult.entities[0]
                    .environmentvariabledefinitionid;

            console.log(
                "Definition Id:",
                definitionId
            );

            // =====================================
            // GET ENV VARIABLE VALUE
            // =====================================

            const valueResult =

                await this.context.webAPI
                    .retrieveMultipleRecords(

                        "environmentvariablevalue",

                        `?$select=value&$filter=_environmentvariabledefinitionid_value eq '${definitionId}'`
                    );

            console.log(
                "Value Result:",
                valueResult
            );

            if (
                valueResult.entities.length > 0
            ) {

                const value =

                    valueResult.entities[0]
                        .value || "";

                console.log(
                    "Environment Variable Value:",
                    value
                );

                return value;
            }

            console.error(
                "Environment Variable Value not found"
            );

        } catch (error) {

            console.error(
                "Environment Variable Error:",
                error
            );
        }

        return "";
    }

    // =====================================
    // LOAD API URLS
    // =====================================

    private async loadEnvironmentUrls() {

        try {

            // =====================================
            // ENV VALUES
            // =====================================

            const baseUrl =

                await this.getEnvironmentVariableValue(
                    "adnic_BaseServiceUrl"
                );

            const environmentName =

                await this.getEnvironmentVariableValue(
                    "adnic_EnvironmentName"
                );

            // =====================================
            // VALIDATION
            // =====================================

            if (!baseUrl) {

                console.error(
                    "Base URL environment variable is empty"
                );

                return;
            }

            if (!environmentName) {

                console.error(
                    "Environment Name variable is empty"
                );

                return;
            }

            // =====================================
            // CLEAN URLS
            // =====================================

            const cleanBaseUrl =
                baseUrl.endsWith("/")
                    ? baseUrl
                    : `${baseUrl}/`;

            const cleanEnvironment =
                environmentName.replace(
                    /^\//,
                    ""
                );

            // =====================================
            // SME QUOTE API
            // =====================================

            this.apiUrl =

                `${cleanBaseUrl}${cleanEnvironment}/quote-management/api/v1/sme-quotes`;

            // =====================================
            // DOCUMENT API
            // =====================================

            this.documentApiUrl =

                `${cleanBaseUrl}${cleanEnvironment}/document-service/api/v1/documents`;

            console.log(
                "SME Quote API:",
                this.apiUrl
            );

            console.log(
                "Document API:",
                this.documentApiUrl
            );

            // =====================================
            // RE-RENDER
            // =====================================

            this.updateView(this.context);

        } catch (e) {

            console.error(
                "Failed to load environment URLs",
                e
            );
        }
    }

    // =====================================
    // UPDATE VIEW
    // =====================================

    public updateView(
        context: ComponentFramework.Context<IInputs>
    ): void {

        this.context = context;

        // =====================================
        // QUOTE ID
        // =====================================

        const quoteId =

            context.parameters
                .quoteId
                .raw !== null

                ? String(
                    context.parameters
                        .quoteId
                        .raw
                )

                : "";

        console.log(
            "Quote Id:",
            quoteId
        );

        // =====================================
        // WAIT FOR CONFIG
        // =====================================

        if (
            !this.apiUrl ||
            !this.documentApiUrl
        ) {

            this.root.render(

                React.createElement(
                    "div",
                    {
                        className:
                            "section"
                    },
                    "Loading configuration..."
                )
            );

            return;
        }

        // =====================================
        // VALIDATION
        // =====================================

        if (!quoteId) {

            this.root.render(

                React.createElement(
                    "div",
                    {
                        className:
                            "section"
                    },
                    "Quote Id not found"
                )
            );

            return;
        }

        // =====================================
        // RENDER REACT APP
        // =====================================

        this.root.render(

            React.createElement(
                MainContainer,
                {
                    quoteId,

                    apiUrl:
                        this.apiUrl,

                    documentApiUrl:
                        this.documentApiUrl,
                    quoteNumber:
                        context.parameters
                            .quoteNumber
                            .raw || "",
                    quoteStatus:
                        this.getQuoteStatus(),
                    onPremiumUpdated:
                        this.updateQuotePremium
                }
            )
        );
    }

    // =====================================
    // OUTPUTS
    // =====================================

    public getOutputs(): IOutputs {

        return {};
    }

    // =====================================
    // DESTROY
    // =====================================

    public destroy(): void {

        this.root.unmount();
    }
}
