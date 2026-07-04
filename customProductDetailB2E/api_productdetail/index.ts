/// <reference types="powerapps-component-framework" />
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { ApiService } from "./services/ApiService";
import { GridRenderer } from "./renderers/GridRenderer";
import { ProductOutputService } from "./services/ProductOutputService";
import { MemberStatistics } from "./utils/MemberStatistics";
import { EbpRuleService } from "./services/EbpRuleService";


export class ProductDetailsB2E implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private container!: HTMLDivElement;
    private context!: ComponentFramework.Context<IInputs>;
    private notifyOutputChanged!: () => void;

    private apiData: any = null;
    private productRows: any[] = [];
    private categories: any[] = [];

    private selectedValues: any = {};
    private lastCategoryRaw: string | null = null;
    private lastCategoryPremiumRaw: string | null = null;
    private lastMemberListRaw: string | null = null;
    private dataLoaded = false;

    private productType: string = "";

    private isReadOnly: boolean = false;

    private symbolUrl = (window as any).Xrm.Utility.getGlobalContext().getClientUrl() + "/WebResources/adnic_dirham_symbol";

    
    private premiumRaw: string | null = null;

    // ================= INIT =================
    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {

        this.context = context;
        this.container = container;
        this.productType = (context.parameters.adnic_name?.raw || "").toUpperCase();

        this.notifyOutputChanged = notifyOutputChanged;

        const wrapper = document.createElement("div");
        wrapper.className = "card";

        const gridWrapper = document.createElement("div");
        gridWrapper.className = "grid-wrapper";

        wrapper.appendChild(gridWrapper);

        this.container.appendChild(wrapper);

    }

        // ================= UPDATE VIEW =================
    public updateView(
        context: ComponentFramework.Context<IInputs>
    ): void {

        this.context = context;

        this.isReadOnly = context.mode.isControlDisabled;

        this.productType = (context.parameters.adnic_name?.raw || "").toUpperCase();
        const apiUrl = context.parameters.apiUrl?.raw || "";

        const categoryRaw =
            context.parameters.categoryCodes?.raw;

        this.premiumRaw =
             this.context.parameters.categoryPremiums?.raw;

        const memberListRaw =
            this.productType === "EBP"
                ? context.parameters.adnic_memberlistjson?.raw || ""
                : null;

      
        if (!categoryRaw) return;

       if (
                this.lastCategoryRaw === categoryRaw &&
                this.lastCategoryPremiumRaw === this.premiumRaw &&
                this.lastMemberListRaw === memberListRaw
            ) {
                return;
            }


        this.lastCategoryRaw = categoryRaw;
        this.lastCategoryPremiumRaw = this.premiumRaw;
        this.lastMemberListRaw = memberListRaw;

        console.log(
            "ProductDetailsB2E updateView",
            this.productType,
            categoryRaw,
            this.premiumRaw
        );

        let codes: string[] = [];

        try {

            codes = categoryRaw.startsWith("[")
                ? JSON.parse(categoryRaw)
                : categoryRaw.split(",");

        } catch {
            return;
        }

        const isEBP = this.productType === "EBP";
        const memberCategories =
            isEBP && memberListRaw
                ? MemberStatistics.getUniqueCategories(memberListRaw)
                : [];

        ApiService.load(apiUrl, this.productType).then((data) => {

            this.apiData = data;

            this.productRows = [

                { name: "Network Provider" },

                { name: "Network Type" },

                ...(data.benefits || [])
                    .map((b: any) => ({
                        name: b.name,
                        code: b.code,
                        values: b.values || []
                    }))
            ];

            const allCategories =
                data.categories || [];

            const categorySelection =
                isEBP && memberCategories.length
                    ? memberCategories
                    : codes.map((code: string) =>
                        String(code || "").trim()
                    ).filter((code: string) => code);

            const normalizedMemberCategories =
                categorySelection === memberCategories
                    ? new Set(categorySelection.map((name: string) =>
                        MemberStatistics.normalizeCategory(name)
                    ))
                    : null;

            this.categories =
                allCategories.filter((c: any) => {
                    if (normalizedMemberCategories) {
                        return normalizedMemberCategories.has(
                            MemberStatistics.normalizeCategory(c.name)
                        );
                    }

                    return categorySelection.indexOf(c.name) !== -1;
                });

            this.pruneSelectedValuesToCurrentCategories(this.categories);

            const wrapper =
                this.container.querySelector(".grid-wrapper") as HTMLDivElement;

            if (wrapper) {

                    const renderer =
                        new GridRenderer(
                            this.context,
                            this.container,
                            this.apiData,
                            this.categories,
                            this.productRows,
                            this.selectedValues,
                            this.isReadOnly,
                            this.productType,
                            this.premiumRaw,
                            this.notifyOutputChanged
                        );

                    renderer.render(wrapper);

                this.notifyOutputChanged();
            }
        });
    }

        // ================= OUTPUT =================
    private pruneSelectedValuesToCurrentCategories(
        categories: any[]
    ): void {

        const validCategoryNames =
            new Set(categories.map((c: any) => c.name));

        Object.keys(this.selectedValues).forEach((fieldName) => {

            if (fieldName === "Network Provider") {
                return;
            }

            const fieldValues =
                this.selectedValues[fieldName];

            if (!fieldValues || typeof fieldValues !== "object") {
                return;
            }

            Object.keys({ ...fieldValues }).forEach((catName) => {
                if (!validCategoryNames.has(catName)) {
                    delete fieldValues[catName];
                }
            });

            if (!Object.keys(fieldValues).length) {
                delete this.selectedValues[fieldName];
            }
        });
    }

    public getOutputs(): IOutputs {

        if (
            !this.apiData ||
            !this.categories.length
        ) {

            return {
                adnic_productdetails: ""
            };
        }

        // ================= PROVIDER REQUIRED =================
        const providerVal =
            this.selectedValues["Network Provider"]?.["ALL"];

        if (!providerVal) {

            return {
                adnic_productdetails: ""
            };
        }

        // ================= NETWORK TYPE REQUIRED =================
        let hasMissingNetwork = false;

        this.categories.forEach((cat: any) => {

           const networkVal =
                    this.productType === "EBP"
                        ? this.selectedValues["Plan"]?.[cat.name]
                        : this.selectedValues["Network Type"]?.[cat.name];

            if (!networkVal) {
                hasMissingNetwork = true;
            }
        });

        if (hasMissingNetwork) {

            return {
                adnic_productdetails: ""
            };
        }

        if (this.productType === "EBP") {

const provider =
                    this.selectedValues["Network Provider"]?.["ALL"];

                for (const cat of this.categories) {

                    const stats =
                        MemberStatistics.calculate(
                            this.context.parameters.adnic_memberlistjson?.raw || "",
                            cat.name
                        );

                    const plan =
                        this.selectedValues["Plan"]?.[cat.name];

                    const validation =
                        EbpRuleService.validatePlan(
                            provider,
                            plan,
                            stats,
                            this.selectedValues["Plan"] || {},
                            cat.name
                        );

                    if (validation) {

                        return {
                            adnic_productdetails: ""
                        };
                    }
                }
            }

        const result: any[] = [];

        const productCode = this.productType;

        const networkTypeField =
            this.productType === "EBP" ||
            productCode === "DIFC"
                ? "PLAN"
                : "NETWORK_TYPE";

        this.categories.forEach((cat: any) => {

            const categoryName =
                cat.name;

            // ================= PROVIDER =================
            const providerObj =
                (this.apiData.networkProviders || [])

                    .find((p: any) =>
                        p.name === providerVal
                    );

            // ================= NETWORK =================
           const networkVal =
                this.productType === "EBP"
                    ? this.selectedValues["Plan"]?.[categoryName]
                    : this.selectedValues["Network Type"]?.[categoryName];

            const networkObj =
                (this.apiData.networkTypes || [])

                    .find((n: any) =>
                        n.name === networkVal
                    );

            // ================= BENEFITS =================
            const benefits: any[] = [];

            this.productRows.forEach((row: any) => {

                console.log("Processing row:", row.name);

                if (
                        row.name === "Network Provider" ||
                        row.name === "Network Type" ||
                        row.name === "Plan"  ||
                        row.name === "Network"||
                        row.name === "OP Consultation Copayment Loading"
                    ) {
                        return;
                    }

                if (
                        this.productType === "EBP" &&
                        (
                            row.name === "Employee Salary <4000" ||
                            row.name === "Employee Salary <16000" ||
                            row.name === "Employee Salary <20000" ||
                            row.name === "Dependent" ||
                            row.name === "Annual Limit" ||
                            row.name === "Territorial Coverage"
                        )
                    ) {
                        return;
                    }

                const val =
                    this.selectedValues[row.name]?.[categoryName];

                if (!val) return;

                const meta =
                    (row.values || [])

                        .find((v: any) =>
                            v.value === val
                        );

                benefits.push({

                    code:
                        row.code || row.name,

                    name:
                        row.name,

                    value:
                        val,

                    metadata:
                        meta?.metadata || {}
                });
            });

            result.push({

                categoryCode:
                    categoryName,

                networkProvider: {

                    code:
                        providerObj?.code || providerVal,

                    name:
                        providerVal
                },

                network: {

                    type:
                        networkTypeField,

                    code:
                        networkObj?.code || networkVal,

                    name:
                        networkVal
                },

                benefits:
                    benefits
            });
        });

        return {
            adnic_productdetails:
                JSON.stringify(result)
        };
    }

    public destroy(): void { }

}
