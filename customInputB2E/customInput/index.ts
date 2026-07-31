/// <reference types="powerapps-component-framework" />
import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class InputPCF implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private container!: HTMLDivElement;
    private notifyOutputChanged!: () => void;
    private inputElement!: HTMLInputElement;
    private dateDisplayElement!: HTMLInputElement;
    private calendarButton!: HTMLButtonElement;
    private inputWrapper!: HTMLDivElement;
    private calendarPanel!: HTMLDivElement;
    private calendarTitle!: HTMLDivElement;
    private calendarGrid!: HTMLDivElement;
    private previousMonthButton!: HTMLButtonElement;
    private nextMonthButton!: HTMLButtonElement;
    private timeInput!: HTMLInputElement;
    private visibleMonth = new Date();
    private isDisabled: boolean = false;
    private maxLength?: number;
    private alphabetsOnly = false;

    private value: string | Date | undefined = "";
    private isDateField = false;
    private isDateTimeField = false;

    private twoDigits(value: number): string {
        return value < 10 ? `0${value}` : String(value);
    }

    private getDateForInput(dayOffset = 0): string {
        const date = new Date();
        date.setDate(date.getDate() + dayOffset);
        const year = date.getFullYear();
        const month = this.twoDigits(date.getMonth() + 1);
        const day = this.twoDigits(date.getDate());

        return `${year}-${month}-${day}`;
    }

    private formatDateForInput(value: string | Date | null | undefined): string {
        if (value === null || value === undefined || value === "") {
            return "";
        }

        let dateValue: Date;

        if (value instanceof Date) {
            dateValue = value;
        } else {
            // Preserve already valid native input values without applying a
            // timezone conversion. Dataverse ISO strings are normalized below.
            const nativeDatePattern = this.isDateTimeField
                ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
                : /^\d{4}-\d{2}-\d{2}$/;

            if (nativeDatePattern.test(value)) {
                return value;
            }

            dateValue = new Date(value);
        }

        if (Number.isNaN(dateValue.getTime())) {
            return "";
        }

        const year = dateValue.getFullYear();
        const month = this.twoDigits(dateValue.getMonth() + 1);
        const day = this.twoDigits(dateValue.getDate());
        const date = `${year}-${month}-${day}`;

        if (!this.isDateTimeField) {
            return date;
        }

        const hours = this.twoDigits(dateValue.getHours());
        const minutes = this.twoDigits(dateValue.getMinutes());
        return `${date}T${hours}:${minutes}`;
    }

    private formatDateForDisplay(value: string | Date | null | undefined): string {
        const nativeValue = this.formatDateForInput(value);
        if (!nativeValue) {
            return "";
        }

        const [datePart, timePart] = nativeValue.split("T");
        const [year, month, day] = datePart.split("-");
        const formattedDate = `${day}/${month}/${year}`;

        return this.isDateTimeField && timePart
            ? `${formattedDate} ${timePart.slice(0, 5)}`
            : formattedDate;
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

    private parseDateDisplay(value: string): Date | undefined {
        const pattern = this.isDateTimeField
            ? /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/
            : /^(\d{2})\/(\d{2})\/(\d{4})$/;
        const match = value.match(pattern);

        if (!match) {
            return undefined;
        }

        const day = Number(match[1]);
        const month = Number(match[2]);
        const year = Number(match[3]);
        const hours = this.isDateTimeField ? Number(match[4]) : 0;
        const minutes = this.isDateTimeField ? Number(match[5]) : 0;
        const parsed = new Date(year, month - 1, day, hours, minutes);

        if (
            parsed.getFullYear() !== year ||
            parsed.getMonth() !== month - 1 ||
            parsed.getDate() !== day ||
            parsed.getHours() !== hours ||
            parsed.getMinutes() !== minutes
        ) {
            return undefined;
        }

        return parsed;
    }

    private onInputChange = (e: Event): void => {
        const target = e.target as HTMLInputElement;

        if (
            this.isDateField &&
            target.value &&
            (
                target.value.slice(0, 10) < this.getDateForInput() ||
                target.value.slice(0, 10) > this.getDateForInput(45)
            )
        ) {
            target.value = "";
            this.value = undefined;
            this.dateDisplayElement.value = "";
            this.notifyOutputChanged();
            return;
        }

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

        if (this.isDateField) {
            this.dateDisplayElement.setCustomValidity("");
            this.dateDisplayElement.value =
                this.formatDateForDisplay(target.value);
        }

        this.notifyOutputChanged();
    };

    private openDatePicker = (): void => {
        if (this.inputElement.disabled) {
            return;
        }

        const selected = this.parseDateInput(this.inputElement.value);
        this.visibleMonth = selected || new Date();
        this.visibleMonth.setDate(1);
        this.renderCalendar();
        this.calendarPanel.hidden = false;

        const fieldRect = this.dateDisplayElement.getBoundingClientRect();
        const panelRect = this.calendarPanel.getBoundingClientRect();
        const viewportPadding = 8;
        const left = Math.min(
            Math.max(viewportPadding, fieldRect.left),
            window.innerWidth - panelRect.width - viewportPadding
        );
        const spaceBelow = window.innerHeight - fieldRect.bottom;
        const top = spaceBelow >= panelRect.height + 4
            ? fieldRect.bottom + 4
            : Math.max(viewportPadding, fieldRect.top - panelRect.height - 4);

        this.calendarPanel.style.left = `${left}px`;
        this.calendarPanel.style.top = `${top}px`;
    };

    private closeCalendar = (): void => {
        this.calendarPanel.hidden = true;
    };

    private onDocumentClick = (event: MouseEvent): void => {
        const target = event.target as Node;
        if (
            !this.inputWrapper.contains(target) &&
            !this.calendarPanel.contains(target)
        ) {
            this.closeCalendar();
        }
    };

    private changeVisibleMonth = (offset: number): void => {
        this.visibleMonth = new Date(
            this.visibleMonth.getFullYear(),
            this.visibleMonth.getMonth() + offset,
            1
        );
        this.renderCalendar();
    };

    private selectCalendarDate = (date: Date): void => {
        const current = this.parseDateInput(this.inputElement.value);
        if (this.isDateTimeField && current) {
            date.setHours(current.getHours(), current.getMinutes());
        }

        const nativeValue = this.formatDateForInput(date);
        this.inputElement.value = nativeValue;
        this.dateDisplayElement.value = this.formatDateForDisplay(nativeValue);
        this.dateDisplayElement.setCustomValidity("");
        this.value = date;
        this.notifyOutputChanged();

        if (this.isDateTimeField) {
            this.timeInput.value = nativeValue.slice(11, 16) || "00:00";
            this.renderCalendar();
        } else {
            this.closeCalendar();
        }
    };

    private onTimeChange = (): void => {
        const selected = this.parseDateInput(this.inputElement.value);
        if (!selected || !this.timeInput.value) {
            return;
        }

        const [hours, minutes] = this.timeInput.value.split(":").map(Number);
        selected.setHours(hours, minutes, 0, 0);
        const nativeValue = this.formatDateForInput(selected);
        this.inputElement.value = nativeValue;
        this.dateDisplayElement.value = this.formatDateForDisplay(nativeValue);
        this.value = selected;
        this.notifyOutputChanged();
    };

    private renderCalendar(): void {
        if (!this.calendarGrid) {
            return;
        }

        const year = this.visibleMonth.getFullYear();
        const month = this.visibleMonth.getMonth();
        const monthName = new Intl.DateTimeFormat("en-GB", {
            month: "long",
            year: "numeric"
        }).format(this.visibleMonth);
        this.calendarTitle.textContent = monthName;
        this.calendarGrid.replaceChildren();

        ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].forEach(day => {
            const heading = document.createElement("div");
            heading.className = "calendar-weekday";
            heading.textContent = day;
            this.calendarGrid.appendChild(heading);
        });

        const firstCell = new Date(year, month, 1 - new Date(year, month, 1).getDay());
        const minimum = this.getDateForInput();
        const maximum = this.getDateForInput(45);
        const selectedValue = this.inputElement.value.slice(0, 10);
        const today = this.getDateForInput();

        for (let index = 0; index < 42; index += 1) {
            const cellDate = new Date(
                firstCell.getFullYear(),
                firstCell.getMonth(),
                firstCell.getDate() + index
            );
            const cellValue = [
                cellDate.getFullYear(),
                this.twoDigits(cellDate.getMonth() + 1),
                this.twoDigits(cellDate.getDate())
            ].join("-");
            const button = document.createElement("button");
            button.type = "button";
            button.className = "calendar-day";
            button.textContent = String(cellDate.getDate());
            button.disabled = cellValue < minimum || cellValue > maximum;
            button.classList.toggle("outside-month", cellDate.getMonth() !== month);
            button.classList.toggle("today", cellValue === today);
            button.classList.toggle("selected", cellValue === selectedValue);
            button.addEventListener("click", () => this.selectCalendarDate(cellDate));
            this.calendarGrid.appendChild(button);
        }

        const minimumMonth = new Date();
        minimumMonth.setDate(1);
        minimumMonth.setHours(0, 0, 0, 0);
        const maximumMonth = new Date();
        maximumMonth.setDate(maximumMonth.getDate() + 45);
        maximumMonth.setDate(1);
        maximumMonth.setHours(0, 0, 0, 0);
        this.previousMonthButton.disabled = this.visibleMonth <= minimumMonth;
        this.nextMonthButton.disabled = this.visibleMonth >= maximumMonth;
        this.timeInput.hidden = !this.isDateTimeField;
        this.timeInput.value = this.inputElement.value.slice(11, 16) || "00:00";
    }

    private onDateDisplayInput = (): void => {
        const displayValue = this.dateDisplayElement.value.trim();
        this.dateDisplayElement.setCustomValidity("");

        if (!displayValue) {
            this.inputElement.value = "";
            this.value = undefined;
            this.notifyOutputChanged();
            return;
        }

        const parsed = this.parseDateDisplay(displayValue);
        if (!parsed) {
            this.dateDisplayElement.setCustomValidity(
                this.isDateTimeField
                    ? "Enter a valid date and time as dd/mm/yyyy HH:mm"
                    : "Enter a valid date as dd/mm/yyyy"
            );
            return;
        }

        const nativeValue = this.formatDateForInput(parsed);
        const datePart = nativeValue.slice(0, 10);
        if (
            datePart < this.getDateForInput() ||
            datePart > this.getDateForInput(45)
        ) {
            this.dateDisplayElement.setCustomValidity(
                "Date must be between today and 45 days from today"
            );
            return;
        }

        this.inputElement.value = nativeValue;
        this.value = parsed;
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

        this.inputWrapper = document.createElement("div");
        this.inputWrapper.className = "custom-input-wrapper";

        this.inputElement = document.createElement("input");
        this.inputElement.className = "custom-input";
        this.inputElement.setAttribute("lang", "en-GB");

        this.dateDisplayElement = document.createElement("input");
        this.dateDisplayElement.className = "custom-input date-display";
        this.dateDisplayElement.hidden = true;
        this.dateDisplayElement.addEventListener(
            "input",
            this.onDateDisplayInput
        );
        this.dateDisplayElement.addEventListener(
            "click",
            this.openDatePicker
        );

        this.calendarButton = document.createElement("button");
        this.calendarButton.type = "button";
        this.calendarButton.className = "calendar-button";
        this.calendarButton.setAttribute("aria-label", "Open calendar");
        this.calendarButton.textContent = "▦";
        this.calendarButton.hidden = true;
        this.calendarButton.addEventListener(
            "click",
            this.openDatePicker
        );

        this.inputElement.addEventListener(
            "input",
            this.onInputChange
        );

        this.inputWrapper.appendChild(this.inputElement);
        this.inputWrapper.appendChild(this.dateDisplayElement);
        this.inputWrapper.appendChild(this.calendarButton);

        this.calendarPanel = document.createElement("div");
        this.calendarPanel.className = "crm-calendar";
        this.calendarPanel.hidden = true;

        const calendarHeader = document.createElement("div");
        calendarHeader.className = "calendar-header";
        this.previousMonthButton = document.createElement("button");
        this.previousMonthButton.type = "button";
        this.previousMonthButton.className = "month-button";
        this.previousMonthButton.setAttribute("aria-label", "Previous month");
        this.previousMonthButton.textContent = "‹";
        this.previousMonthButton.addEventListener(
            "click",
            () => this.changeVisibleMonth(-1)
        );
        this.calendarTitle = document.createElement("div");
        this.calendarTitle.className = "calendar-title";
        this.nextMonthButton = document.createElement("button");
        this.nextMonthButton.type = "button";
        this.nextMonthButton.className = "month-button";
        this.nextMonthButton.setAttribute("aria-label", "Next month");
        this.nextMonthButton.textContent = "›";
        this.nextMonthButton.addEventListener(
            "click",
            () => this.changeVisibleMonth(1)
        );
        calendarHeader.appendChild(this.previousMonthButton);
        calendarHeader.appendChild(this.calendarTitle);
        calendarHeader.appendChild(this.nextMonthButton);

        this.calendarGrid = document.createElement("div");
        this.calendarGrid.className = "calendar-grid";
        this.timeInput = document.createElement("input");
        this.timeInput.type = "time";
        this.timeInput.className = "calendar-time";
        this.timeInput.step = "60";
        this.timeInput.addEventListener("change", this.onTimeChange);

        this.calendarPanel.appendChild(calendarHeader);
        this.calendarPanel.appendChild(this.calendarGrid);
        this.calendarPanel.appendChild(this.timeInput);
        this.container.appendChild(this.inputWrapper);
        document.body.appendChild(this.calendarPanel);
        document.addEventListener("click", this.onDocumentClick);

        this.value = context.parameters.value.raw || "";
        this.inputElement.value = this.formatDateForInput(context.parameters.value.raw);
    }

    public updateView(
        context: ComponentFramework.Context<IInputs>
    ): void {

        const configuredType =
            (context.parameters.inputType.raw || "text").toLowerCase();

        const mappedFieldType = context.parameters.value.type.toLowerCase();
        this.isDateTimeField =
            mappedFieldType === "datetime.dateandtime" ||
            configuredType === "datetime-local" ||
            configuredType === "datetime" ||
            configuredType === "dateandtime" ||
            configuredType === "date and time";
        this.isDateField =
            mappedFieldType === "datetime.dateonly" ||
            configuredType === "date" ||
            this.isDateTimeField;
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

        this.inputElement.classList.toggle(
            "native-date-picker",
            this.isDateField
        );
        this.dateDisplayElement.hidden = !this.isDateField;
        this.calendarButton.hidden = !this.isDateField;
        if (!this.isDateField) {
            this.closeCalendar();
        }

        if (this.isDateField) {
            // Native date inputs keep an ISO value internally, while en-GB
            // presents the control as dd/mm/yyyy. The minimum disables all
            // calendar dates before today.
            this.inputElement.min = this.isDateTimeField
                ? `${this.getDateForInput()}T00:00`
                : this.getDateForInput();
            this.inputElement.max = this.isDateTimeField
                ? `${this.getDateForInput(45)}T23:59`
                : this.getDateForInput(45);

            if (this.isDateTimeField) {
                this.inputElement.step = "60";
            } else {
                this.inputElement.removeAttribute("step");
            }
        } else {
            this.inputElement.removeAttribute("min");
            this.inputElement.removeAttribute("max");
            this.inputElement.removeAttribute("step");
        }

        this.inputElement.placeholder =
            context.parameters.placeholder?.raw || "Enter value";
        this.dateDisplayElement.placeholder = this.isDateTimeField
            ? "dd/mm/yyyy HH:mm"
            : "dd/mm/yyyy";

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
        this.dateDisplayElement.disabled = isDisabled;
        this.calendarButton.disabled = isDisabled;

        // IMPORTANT:
        // Never overwrite textbox while user is typing.
        if (
            document.activeElement !== this.inputElement &&
            this.inputElement.value !== crmValue
        ) {
            this.inputElement.value = crmValue;
            this.value = rawCrmValue;
        }

        if (
            this.isDateField &&
            document.activeElement !== this.dateDisplayElement
        ) {
            this.dateDisplayElement.value =
                this.formatDateForDisplay(rawCrmValue);
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
        this.calendarButton?.removeEventListener(
            "click",
            this.openDatePicker
        );
        this.dateDisplayElement?.removeEventListener(
            "input",
            this.onDateDisplayInput
        );
        this.dateDisplayElement?.removeEventListener(
            "click",
            this.openDatePicker
        );
        this.timeInput?.removeEventListener("change", this.onTimeChange);
        document.removeEventListener("click", this.onDocumentClick);
        this.calendarPanel?.remove();
    }
}
