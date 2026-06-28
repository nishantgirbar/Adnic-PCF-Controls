/// <reference types="powerapps-component-framework" />
import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class ApiDropdownB2E implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private container!: HTMLDivElement;
    private notifyOutputChanged!: () => void;
    private context!: ComponentFramework.Context<IInputs>;
    private selectElement!: HTMLSelectElement;

    private value: string = "";
    private apiCache: any = null;
    private previousFilterValue: string | null = null;

    // ✅ Cache API URL
    private apiUrl: string = "";

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {

        this.context = context;
        this.container = container;
        this.notifyOutputChanged = notifyOutputChanged;

        this.value = context.parameters.selectedValue?.raw || "";

        // ✅ Wrapper for custom arrow
        const wrapper = document.createElement("div");
        wrapper.classList.add("dropdown-wrapper");

        // ✅ Dropdown
        this.selectElement = document.createElement("select");
        this.selectElement.classList.add("dropdown");
        this.applyDisabledState();

        this.selectElement.addEventListener("change", () => {

            this.value = this.selectElement.value;

            this.notifyOutputChanged();
        });

        wrapper.appendChild(this.selectElement);

        this.container.appendChild(wrapper);

        this.loadData();
    }

    // ✅ Remove duplicate values
    private getUnique(data: any[]) {

        const seen = new Set();

        return data.filter(item => {

            const val = String(item.value);

            if (seen.has(val)) {
                return false;
            }

            seen.add(val);

            return true;
        });
    }

    private applyDisabledState(): void {

    if (!this.selectElement) {
        return;
    }

    this.selectElement.disabled =
        this.context.mode.isControlDisabled;
}

    // ✅ Get Environment Variable Value
private async getEnvironmentVariableValue(
    schemaName: string
): Promise<string> {

    try {

        // ✅ Get Environment Variable Definition
        const definitionResult =
            await this.context.webAPI.retrieveMultipleRecords(
                "environmentvariabledefinition",
                `?$select=environmentvariabledefinitionid,schemaname&$filter=schemaname eq '${schemaName}'`
            );

        console.log(
            "Definition Result:",
            definitionResult
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

        console.log(
            "Definition Id:",
            definitionId
        );

        // ✅ Get Environment Variable Value
        const valueResult =
            await this.context.webAPI.retrieveMultipleRecords(
                "environmentvariablevalue",
                `?$select=value&$filter=_environmentvariabledefinitionid_value eq '${definitionId}'`
            );

        console.log(
            "Value Result:",
            valueResult
        );

        if (valueResult.entities.length > 0) {

            const value =
                valueResult.entities[0].value || "";

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

 private async loadData() {

    try {

        const dataKey =
            this.context.parameters.dataKey?.raw || "";

        const filterValue =
            this.context.parameters.filterValue?.raw;

        if (!dataKey) {
            return;
        }

        console.log("Loading dropdown...");

        // ✅ Prevent unnecessary reload
        if (
            this.previousFilterValue === filterValue &&
            this.apiCache
        ) {

            this.processAndRender();
            return;
        }

        this.previousFilterValue =
            filterValue || null;

        // ✅ Build API URL only once
        if (!this.apiUrl) {

            const baseUrl =
                await this.getEnvironmentVariableValue(
                    "adnic_BaseServiceUrl"
                );

            const environmentName =
                await this.getEnvironmentVariableValue(
                    "adnic_EnvironmentName"
                );

            const referenceData =
                await this.getEnvironmentVariableValue(
                    "adnic_ReferenceData"
                );

            // ✅ Final API URL
            this.apiUrl =
                `${baseUrl}${environmentName}/${referenceData}`;

            console.log(
                "Final API URL:",
                this.apiUrl
            );
        }

        if (!this.apiUrl) {

            console.error("API URL is empty");

            return;
        }

        // ✅ Load API only once
        if (!this.apiCache) {

            const productCode =
                this.getProductCode();

            console.log("Calling API...");

            const response = await fetch(
                this.apiUrl +
                "?product=" +
                encodeURIComponent(productCode)
            );

            this.apiCache =
                await response.json();

            console.log(
                "API Response:",
                this.apiCache
            );
        }

        this.processAndRender();

    } catch (error) {

        console.error(
            "API Error:",
            error
        );
    }
}

    // ✅ Get Product From CRM Form
    private getProductCode(): string {

        let productCode = "";

        try {

            const formContext =
                (window as any).Xrm?.Page;

            if (formContext) {

                const val =
                    formContext
                        .getAttribute("adnic_name")
                        ?.getValue();

                if (val) {

                    productCode =
                        val.toString().toUpperCase();
                }
            }

        } catch {}

        return productCode;
    }

    // ✅ Process API Response
    private processAndRender() {

        const dataKey =
            this.context.parameters.dataKey?.raw || "";

        const valueField =
            this.context.parameters.valueField?.raw || "id";

        const labelField =
            this.context.parameters.labelField?.raw || "name";

        const filterField =
            this.context.parameters.filterField?.raw;

        const filterValue =
            this.context.parameters.filterValue?.raw;

        let data: any[] = [];

        // ✅ lookupValues structure
        if (
            this.apiCache.lookupValues &&
            this.apiCache.lookupValues[dataKey]
        ) {

            data =
                this.apiCache.lookupValues[dataKey]
                    .map((x: any) => ({

                        value: String(x.code),

                        label: x.displayValue,

                        ...x
                    }));

        } else {

            data = this.apiCache[dataKey];

            if (!data) {

                console.error(
                    `Invalid dataKey: ${dataKey}`
                );

                return;
            }

            data = data.map((x: any) => ({

                value: String(x[valueField]),

                label: x[labelField],

                ...x
            }));
        }

        // ✅ Cascading filter
        if (filterField && filterValue) {

            data = data.filter((item: any) =>
                String(item[filterField]) ===
                String(filterValue)
            );
        }

        // ✅ Remove duplicates
        data = this.getUnique(data);

        this.renderOptions(data);
    }

    // ✅ Render Dropdown
    private renderOptions(data: any[]) {

        this.selectElement.innerHTML = "";

        // ✅ Dynamic field label
        let fieldLabel = "Option";

        try {

            fieldLabel =
                this.context.parameters.selectedValue
                    .attributes?.DisplayName ||

                this.context.parameters.selectedValue
                    .attributes?.LogicalName ||

                "Option";

        } catch {}

        // ✅ Default option
        const defaultOption =
            document.createElement("option");

        defaultOption.value = "";

        defaultOption.innerText =
            `Select ${fieldLabel}`;

        this.selectElement.appendChild(defaultOption);

        // ✅ Add options
        data.forEach((item: any) => {

            const option =
                document.createElement("option");

            option.value = item.value;

            option.text = item.label;

            this.selectElement.appendChild(option);
        });

        // ✅ Existing value
        const currentValue =
            this.context.parameters.selectedValue?.raw || "";

        this.value =
            currentValue
                ? String(currentValue)
                : this.value;

        // ✅ Preserve old filtered value
        if (
            this.value &&
            !data.some(
                d =>
                    String(d.value) ===
                    String(this.value)
            )
        ) {

            const option =
                document.createElement("option");

            option.value = this.value;

            option.text =
                "Previously Selected";

            this.selectElement.appendChild(option);
        }

        // ✅ Apply selected value
        this.selectElement.value =
            this.value || "";
    }

        public updateView(
            context: ComponentFramework.Context<IInputs>
        ): void {

            this.context = context;

            const newValue =
                context.parameters.selectedValue?.raw || "";

            this.value =
                newValue
                    ? String(newValue)
                    : "";

            // ✅ Respect Dynamics field disabled/read-only state
            this.applyDisabledState();

            this.loadData();
        }

    public getOutputs(): IOutputs {

        return {
            selectedValue: this.value
        };
    }

    public destroy(): void {}
}