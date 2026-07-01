import { EbpRuleService } from "./EbpRuleService";

export class ProductOutputService {

    public static build(
        apiData: any,
        categories: any[],
        selectedValues: any,
        productType: string,
        productRows: any[],
        stats?: any
    ): string {

        if (!apiData || !categories.length) {
            return "";
        }

        const providerVal =
            selectedValues["Network Provider"]?.["ALL"];

        if (!providerVal) {
            return "";
        }

        let hasMissingNetwork = false;

        categories.forEach((cat: any) => {

            const networkVal =
                productType === "EBP"
                    ? selectedValues["Plan"]?.[cat.name]
                    : selectedValues["Network Type"]?.[cat.name];

            if (!networkVal) {
                hasMissingNetwork = true;
            }
        });

        if (hasMissingNetwork) {
            return "";
        }

        if (
            productType === "EBP" &&
            stats
        ) {

            for (const cat of categories) {

                const plan =
                    selectedValues["Plan"]?.[cat.name];

                const categoryStats =
                    stats && stats[cat.name]
                        ? stats[cat.name]
                        : stats;

                const validation =
                    EbpRuleService.validatePlan(
                        providerVal,
                        plan,
                        categoryStats,
                        selectedValues["Plan"] || {},
                        cat.name
                    );

                if (validation) {
                    return "";
                }
            }
        }

        const result: any[] = [];

        const networkTypeField =
            productType === "EBP"
                ? "PLAN"
                : "NETWORK_TYPE";

        categories.forEach((cat: any) => {

            const categoryName =
                cat.name;

            const providerObj =
                (apiData.networkProviders || [])
                    .find((p: any) =>
                        p.name === providerVal
                    );

            const networkVal =
                productType === "EBP"
                    ? selectedValues["Plan"]?.[categoryName]
                    : selectedValues["Network Type"]?.[categoryName];

            const networkObj =
                (apiData.networkTypes || [])
                    .find((n: any) =>
                        n.name === networkVal
                    );

            const benefits: any[] = [];

            productRows.forEach((row: any) => {

                if (
                    row.name === "Network Provider" ||
                    row.name === "Network Type" ||
                    row.name === "Plan"
                ) {
                    return;
                }

                const val =
                    selectedValues[row.name]?.[categoryName];

                if (!val) {
                    return;
                }

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

        return JSON.stringify(result);
    }
}