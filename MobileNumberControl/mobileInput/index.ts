/// <reference types="powerapps-component-framework" />
import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class MobileNumberControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private container!: HTMLDivElement;
    private notifyOutputChanged!: () => void;

    private prefixDropdown!: HTMLSelectElement;
    private mobileInput!: HTMLInputElement;

    private value: string = "";

    private prefixes: string[] = [
        "50",
        "52",
        "54",
        "55",
        "56",
        "57",
        "58"
    ];

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {

        this.container = container;
        this.notifyOutputChanged = notifyOutputChanged;

        const wrapper = document.createElement("div");
        wrapper.className = "mobile-wrapper";

        this.prefixDropdown = document.createElement("select");
        this.prefixDropdown.className = "mobile-prefix";

        this.prefixes.forEach(prefix => {
            const option = document.createElement("option");
            option.value = prefix;
            option.text = prefix;
            this.prefixDropdown.appendChild(option);
        });

        this.mobileInput = document.createElement("input");
        this.mobileInput.type = "text";
        this.mobileInput.className = "mobile-input";
        this.mobileInput.maxLength = 7;
        this.mobileInput.placeholder = "1234567";

        this.prefixDropdown.addEventListener("change", () => {
            this.updateValue();
        });

        this.mobileInput.addEventListener("input", () => {

            this.mobileInput.value =
                this.mobileInput.value.replace(/\D/g, "");

            this.updateValue();
        });

        wrapper.appendChild(this.prefixDropdown);
        wrapper.appendChild(this.mobileInput);

        this.container.appendChild(wrapper);
    }

    private updateValue(): void {

        const prefix = this.prefixDropdown.value || "";
        const mobile = this.mobileInput.value || "";

        this.value = prefix + mobile;

        this.notifyOutputChanged();
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {

        const crmValue = context.parameters.value.raw || "";

        // Disable/Enable control based on CRM field state
        const isDisabled = context.mode.isControlDisabled;

        this.prefixDropdown.disabled = isDisabled;
        this.mobileInput.disabled = isDisabled;

        if (
            document.activeElement !== this.mobileInput &&
            document.activeElement !== this.prefixDropdown
        ) {

            if (crmValue.length >= 2) {

                const prefix = crmValue.substring(0, 2);
                const mobile = crmValue.substring(2);

                if (this.prefixes.indexOf(prefix) > -1) {
                    this.prefixDropdown.value = prefix;
                }

                this.mobileInput.value = mobile;
            }
            else {
                this.prefixDropdown.value = "50";
                this.mobileInput.value = "";
            }

            this.value = crmValue;
        }
    }

    public getOutputs(): IOutputs {

        return {
            value: this.value
        };
    }

    public destroy(): void { }
}