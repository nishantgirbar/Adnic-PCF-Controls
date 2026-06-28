/// <reference types="powerapps-component-framework" />
import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class InputPCF implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private container!: HTMLDivElement;
    private notifyOutputChanged!: () => void;
    private inputElement!: HTMLInputElement;
    private isDisabled: boolean = false;
    private maxLength?: number;

    private value: string = "";

    private onInputChange = (e: Event): void => {
        const target = e.target as HTMLInputElement;

        if (
            this.maxLength !== undefined &&
            target.value.length > this.maxLength
        ) {
            target.value = target.value.slice(0, this.maxLength);
        }

        this.value = target.value;

        this.notifyOutputChanged();
    };

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {

        this.container = container;
        this.notifyOutputChanged = notifyOutputChanged;

        this.inputElement = document.createElement("input");
        this.inputElement.className = "custom-input";

        this.inputElement.addEventListener(
            "input",
            this.onInputChange
        );

        this.container.appendChild(this.inputElement);

        this.value = context.parameters.value.raw || "";
        this.inputElement.value = this.value;
    }

    public updateView(
        context: ComponentFramework.Context<IInputs>
    ): void {

        const configuredType =
            (context.parameters.inputType.raw || "text").toLowerCase();

        const supportedTypes = [
            "text",
            "number",
            "date",
            "email",
            "tel",
            "password"
        ];

        this.inputElement.type =
            supportedTypes.indexOf(configuredType) > -1
                ? configuredType
                : "text";

        this.inputElement.placeholder =
            context.parameters.placeholder?.raw || "Enter value";

        const configuredMaxLength = context.parameters.maxLength.raw;
        this.maxLength =
            configuredMaxLength !== null && configuredMaxLength >= 0
                ? configuredMaxLength
                : undefined;

        if (this.maxLength === undefined) {
            this.inputElement.removeAttribute("maxlength");
        } else {
            this.inputElement.maxLength = this.maxLength;
        }

        const crmValue = context.parameters.value.raw ?? "";

    // Disable when CRM field/form is disabled
        const isDisabled =
            context.mode.isControlDisabled ||
            context.parameters.value.security?.editable === false;

        this.inputElement.disabled = isDisabled;

        // IMPORTANT:
        // Never overwrite textbox while user is typing.
        if (
            document.activeElement !== this.inputElement &&
            this.inputElement.value !== crmValue
        ) {
            this.inputElement.value = crmValue;
            this.value = crmValue;
        }
    }

    public getOutputs(): IOutputs {
        return {
            value: this.value
        };
    }

    public destroy(): void {

        this.inputElement?.removeEventListener(
            "input",
            this.onInputChange
        );
    }
}
