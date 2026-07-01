import * as React from "react";
import * as ReactDOMClient from "react-dom/client";

import { IInputs, IOutputs } from "./generated/ManifestTypes";

import MedicalControlUI from "./MedicalControlUI";

export class MedicalControl
    implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    // =====================================
    // Variables
    // =====================================

    private container!: HTMLDivElement;

    private root!: ReactDOMClient.Root;

    private notifyOutputChanged!: () => void;

    private outputData: string = "{}";

    // =====================================
    // INIT
    // =====================================

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {

        this.container = container;

        this.notifyOutputChanged =
            notifyOutputChanged;

        this.root =
            ReactDOMClient.createRoot(
                this.container
            );

        this.render(context);
    }

    // =====================================
    // RENDER
    // =====================================

    private render(
        context: ComponentFramework.Context<IInputs>
    ): void {

        let existingData: any = {};

        try {

            const raw =
                context.parameters.medicalJson.raw;

            existingData =
                raw
                    ? JSON.parse(raw)
                    : {};

        } catch (e) {

            existingData = {};
        }

        this.root.render(

            React.createElement(
                MedicalControlUI,
                {

                    // =====================================
                    // Props
                    // =====================================

                    apiUrl:
                        context.parameters.apiUrl.raw || "",

                    existingData:
                        existingData,
                    pcfContext: context,
                      isDisabled:
                                context.mode.isControlDisabled ||
                                context.parameters.medicalJson.security?.editable === false,
                    // =====================================
                    // On Change
                    // =====================================

                    onChange: (data: any) => {

                        try {

                            // Convert to JSON
                            const json =
                                JSON.stringify(data);

                            // Update output
                            this.outputData =
                                json;

                            // Notify PCF framework
                            this.notifyOutputChanged();

                            // =====================================
                            // IMPORTANT
                            // Force field update
                            // and ribbon refresh
                            // =====================================

                            setTimeout(() => {

                                try {

                                    const xrm =
                                        (window as any).Xrm;

                                    if (
                                        xrm &&
                                        xrm.Page
                                    ) {

                                        // Get attribute
                                        const attr =
                                            xrm.Page.getAttribute(
                                                "adnic_medicaldeclarationjson"
                                            );

                                        if (attr) {

                                            // Force latest value
                                            attr.setValue(json);

                                            // Fire onchange
                                            attr.fireOnChange();
                                        }

                                        // Refresh ribbon
                                        xrm.Page.ui.refreshRibbon();
                                    }

                                } catch (e) {

                                    console.log(
                                        "Ribbon refresh failed",
                                        e
                                    );
                                }

                            }, 800);

                        } catch (e) {

                            console.log(
                                "PCF onchange error",
                                e
                            );
                        }
                    }
                }
            )
        );
    }

    // =====================================
    // UPDATE VIEW
    // =====================================

    public updateView(
        context: ComponentFramework.Context<IInputs>
    ): void {

        this.render(context);
    }

    // =====================================
    // OUTPUTS
    // =====================================

    public getOutputs(): IOutputs {

        return {

            medicalJson:
                this.outputData
        };
    }

    // =====================================
    // DESTROY
    // =====================================

    public destroy(): void {

        if (this.root) {

            this.root.unmount();
        }
    }
}