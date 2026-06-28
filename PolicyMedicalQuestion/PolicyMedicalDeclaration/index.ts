import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import * as ReactDOMClient from "react-dom/client";
import MedicalControlUI from "./MedicalControlUI";

export class PolicyMedicalControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private container!: HTMLDivElement;
    private root!: ReactDOMClient.Root;
    private notifyOutputChanged!: () => void;
    private outputData: string = "";

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {

        this.container = container;
        this.notifyOutputChanged = notifyOutputChanged;
        this.root = ReactDOMClient.createRoot(this.container);

        this.render(context);
    }

    private render(context: ComponentFramework.Context<IInputs>) {

        let existingData: any = {};

        try {
            const raw = context.parameters.medicalJson.raw;
            existingData = raw ? JSON.parse(raw) : {};
        } catch {
            existingData = {};
        }

        // ✅ Prevent overwrite issue
        this.outputData = JSON.stringify(existingData);

        this.root.render(
            React.createElement(MedicalControlUI, {
                existingData: existingData,
                onChange: (data: any) => {
                    this.outputData = JSON.stringify(data);
                    this.notifyOutputChanged();
                }
            })
        );
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this.render(context);
    }

    public getOutputs(): IOutputs {
        return {
            medicalJson: this.outputData || "{}"
        };
    }

    public destroy(): void {
        this.root.unmount();
    }
}