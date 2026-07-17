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
    private lastProductDetailsRaw: string | null = null;
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

        const productDetailsRaw =
            context.parameters.adnic_productdetails?.raw || "";

        const memberListRaw =
            this.productType === "EBP"
                ? context.parameters.adnic_memberlistjson?.raw || ""
                : null;

        if (this.shouldDisplayProductDetailsFromJson()) {

            if (
                this.lastProductDetailsRaw === productDetailsRaw &&
                this.lastCategoryPremiumRaw === this.premiumRaw
            ) {
                return;
            }

            this.lastProductDetailsRaw = productDetailsRaw;
            this.lastCategoryPremiumRaw = this.premiumRaw;

            const wrapper =
                this.container.querySelector(".grid-wrapper") as HTMLDivElement;

            if (wrapper) {
                this.renderJsonProductDetails(wrapper, productDetailsRaw);
            }

            return;
        }

      
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
            }
        });
    }

        // ================= OUTPUT =================
    private shouldDisplayProductDetailsFromJson(): boolean {

        return this.productType === "EBP" && this.isReadOnly;
    }

    private renderJsonProductDetails(
        wrapper: HTMLDivElement,
        productDetailsRaw: string
    ): void {

        wrapper.innerHTML = "";

        const details =
            this.parseProductDetails(productDetailsRaw);

        if (!details.length) {
            return;
        }

        const categoryCodes =
            details.map((item: any) =>
                String(item?.categoryCode || "-")
            );

        const detailMap: Record<string, Record<string, any>> = {};

        const setDetail = (
            rowName: string,
            categoryCode: string,
            value: any
        ) => {

            if (value === undefined || value === null || value === "") {
                return;
            }

            if (!detailMap[rowName]) {
                detailMap[rowName] = {};
            }

            detailMap[rowName][categoryCode] = value;
        };

        details.forEach((item: any) => {

            const categoryCode =
                String(item?.categoryCode || "-");

            setDetail(
                "Network Provider",
                categoryCode,
                item?.networkProvider?.name ||
                item?.networkProviderName ||
                item?.networkProvider
            );

            setDetail(
                this.productType === "EBP" ? "Plan" : "Network Type",
                categoryCode,
                item?.plan ||
                item?.network?.name ||
                item?.networkType ||
                item?.networkTypeName
            );

            if (this.productType === "EBP") {
                setDetail(
                    "Annual Limit",
                    categoryCode,
                    item?.annualLimit
                );
                setDetail(
                    "Network Type",
                    categoryCode,
                    item?.networkType
                );
                setDetail(
                    "Territorial Coverage",
                    categoryCode,
                    item?.territorialCoverage
                );
            }

            const benefits =
                Array.isArray(item?.benefits)
                    ? item.benefits
                    : Array.isArray(item?.benefits?.benefits)
                        ? item.benefits.benefits
                        : [];

            benefits.forEach((benefit: any) => {

                const name =
                    benefit?.name ||
                    benefit?.benefitName ||
                    benefit?.code;

                const value =
                    benefit?.value ||
                    benefit?.benefitValue;

                setDetail(name, categoryCode, value);
            });
        });

        const rows =
            Object.keys(detailMap);

        const grid =
            document.createElement("div");

        grid.className =
            "grid-container readonly-grid";

        grid.style.gridTemplateColumns =
            "40px 220px repeat("
            + categoryCodes.length
            + ", 1fr)";

        ["#", "Details"]
            .concat(categoryCodes)
            .forEach((header) => {

                const cell =
                    document.createElement("div");

                cell.className =
                    "grid-header";

                cell.innerText =
                    header === "#" || header === "Details"
                        ? ""
                        : "Category " + header;

                grid.appendChild(cell);
            });

        rows.forEach((rowName, index) => {

            const rowClass =
                index % 2 === 0
                    ? "row-even"
                    : "row-odd";

            grid.appendChild(
                this.createJsonCell(index + 1, rowClass, "index")
            );

            grid.appendChild(
                this.createJsonCell(rowName, rowClass)
            );

            categoryCodes.forEach((categoryCode) => {

                grid.appendChild(
                    this.createJsonCell(
                        detailMap[rowName][categoryCode] ?? "-",
                        rowClass
                    )
                );
            });
        });

        wrapper.appendChild(grid);
        this.renderJsonPremiumFooter(wrapper, categoryCodes, details);
    }

    private parseProductDetails(productDetailsRaw: string): any[] {

        if (!productDetailsRaw) {
            return [];
        }

        try {

            const parsed =
                JSON.parse(productDetailsRaw);

            if (Array.isArray(parsed)) {
                return parsed;
            }

            if (Array.isArray(parsed?.categories)) {
                return parsed.categories;
            }
        }
        catch (error) {
            console.warn(
                "Unable to parse product details JSON",
                error
            );
        }

        return [];
    }

    private createJsonCell(
        text: any,
        rowClass?: string,
        extraClass?: string
    ): HTMLDivElement {

        const cell =
            document.createElement("div");

        cell.className =
            "grid-cell "
            + (rowClass || "")
            + " "
            + (extraClass || "");

        cell.innerText =
            String(text);

        return cell;
    }

    private renderJsonPremiumFooter(
        wrapper: HTMLDivElement,
        categoryCodes: string[],
        details: any[]
    ): void {

        if (!this.premiumRaw) {
            return;
        }

        let premiums: any[] = [];

        try {
            premiums = JSON.parse(this.premiumRaw);
        }
        catch {
            return;
        }

        if (!premiums.length) {
            return;
        }

        const footer =
            document.createElement("div");

        footer.className =
            "premium-footer";

        footer.style.gridTemplateColumns =
            "40px 220px repeat("
            + categoryCodes.length
            + ", 1fr)";

        footer.appendChild(document.createElement("div"));
        footer.appendChild(document.createElement("div"));

        categoryCodes.forEach((categoryCode) => {

            const premium =
                premiums.find((p: any) =>
                    p.categoryName === "CAT-" + categoryCode ||
                    p.categoryName === categoryCode ||
                    p.categoryName === ("Category " + categoryCode)
                );

            const cell =
                document.createElement("div");

            cell.className =
                "premium-cell";

            if (premium) {

                cell.innerHTML =
                    "<div class='premium-title'>Category "
                    + categoryCode
                    + " Premiums</div>"
                    + "<div class='premium-amount'>"
                    + "<img class='dirham-icon' src='"
                    + this.symbolUrl
                    + "' /> "
                    + Number(
                        premium.currentPremium || 0
                    ).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })
                    + "</div>"
                    + "<div class='premium-members'>Members "
                    + (premium.memberCount || 0)
                    + "</div>";

                this.renderJsonPremiumTobLink(
                    cell,
                    categoryCode,
                    details
                );
            }

            footer.appendChild(cell);
        });

        wrapper.appendChild(footer);
    }

    private renderJsonPremiumTobLink(
        cell: HTMLDivElement,
        categoryCode: string,
        details: any[]
    ): void {

        if (this.productType !== "EBP") {
            return;
        }

        const detail =
            (details || []).find((item: any) =>
                String(item?.categoryCode || "-") === categoryCode
            );

        const provider =
            detail?.networkProvider?.name ||
            detail?.networkProviderName ||
            detail?.networkProvider ||
            "";

        const plan =
            detail?.network?.name ||
            detail?.plan ||
            detail?.networkType ||
            detail?.networkTypeName ||
            "";

        const url =
            EbpRuleService.getTobUrl(provider, plan);

        if (!provider || !plan || !url) {
            return;
        }

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "premium-tob";

        const selectedPlan =
            document.createElement("span");

        selectedPlan.className =
            "tob-selected-plan";

        selectedPlan.innerText =
            plan + " : ";

        const link =
            document.createElement("a");

        link.className =
            "tob-link";

        link.href =
            url;

        link.target =
            "_blank";

        link.rel =
            "noopener noreferrer";

        link.innerText =
            "TOB";

        wrapper.appendChild(selectedPlan);
        wrapper.appendChild(link);
        cell.appendChild(wrapper);
    }

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

        if (this.shouldDisplayProductDetailsFromJson()) {

            return {
                adnic_productdetails:
                    this.context.parameters.adnic_productdetails?.raw || ""
            };
        }

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

            if (this.productType === "EBP") {

                benefits.push(
                    {
                        code: "ANNUAL_LIMIT",
                        name: "Annual Limit",
                        value: EbpRuleService.getAnnualLimit(
                            providerVal,
                            networkVal
                        )
                    },
                    {
                        code: "NETWORK",
                        name: "Network Type",
                        value: EbpRuleService.getNetworkType(
                            providerVal,
                            networkVal
                        )
                    },
                    {
                        code: "TERRITORIAL_COMPREHENSIVE",
                        name: "Territorial Coverage",
                        value: EbpRuleService.getCoverage(
                            providerVal,
                            networkVal
                        )
                    }
                );
            }

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
