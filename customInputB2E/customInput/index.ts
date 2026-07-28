/// <reference types="powerapps-component-framework" />
import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class InputPCF implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private container!: HTMLDivElement;
    private notifyOutputChanged!: () => void;
    private inputElement!: HTMLInputElement;
    private isDisabled: boolean = false;
    private maxLength?: number;
    private alphabetsOnly = false;

    private value: string | Date | undefined = "";
    private isDateField = false;
    private isDateTimeField = false;

    private twoDigits(value: number): string {
        return value < 10 ? `0${value}` : String(value);
    }

    private formatDateForInput(value: string | Date | null | undefined): string {
        if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
            return typeof value === "string" ? value : "";
        }

        const year = value.getFullYear();
        const month = this.twoDigits(value.getMonth() + 1);
        const day = this.twoDigits(value.getDate());
        const date = `${year}-${month}-${day}`;

        if (!this.isDateTimeField) {
            return date;
        }

        const hours = this.twoDigits(value.getHours());
        const minutes = this.twoDigits(value.getMinutes());
        return `${date}T${hours}:${minutes}`;
    }

    private parseDateInput(value: string): Date | undefined {
        if (!value) {
            return undefined;
        }

        if (this.isDateTimeField) {
            return new Date(value);
        }

        const parts = value.split("-").map(Number);
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    private onInputChange = (e: Event): void => {
        const target = e.target as HTMLInputElement;

        if (this.alphabetsOnly && !this.isDateField) {
            target.value = target.value.replace(/[^a-zA-Z ]/g, "");
        }

        if (
            this.maxLength !== undefined &&
            target.value.length > this.maxLength
        ) {
            target.value = target.value.slice(0, this.maxLength);
        }

        this.value = this.isDateField
            ? this.parseDateInput(target.value)
            : target.value;

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
        this.inputElement.value = this.formatDateForInput(context.parameters.value.raw);
    }

    public updateView(
        context: ComponentFramework.Context<IInputs>
    ): void {

        const configuredType =
            (context.parameters.inputType.raw || "text").toLowerCase();

        const mappedFieldType = context.parameters.value.type.toLowerCase();
        this.isDateTimeField = mappedFieldType === "datetime.dateandtime";
        this.isDateField =
            mappedFieldType === "datetime.dateonly" || this.isDateTimeField;
        this.alphabetsOnly = context.parameters.alphabetsOnly.raw === true;

        const supportedTypes = [
            "text",
            "number",
            "email",
            "tel",
            "password"
        ];

        this.inputElement.type = this.isDateField
            ? (this.isDateTimeField ? "datetime-local" : "date")
            : this.alphabetsOnly
                ? "text"
                : supportedTypes.indexOf(configuredType) > -1
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

        const rawCrmValue = context.parameters.value.raw ?? "";
        const crmValue = this.formatDateForInput(rawCrmValue);

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
            this.value = rawCrmValue;
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
