export class EbpRuleService {

    private static normalize(
        value: string
    ): string {

        return (value || "")
            .replace(/\s+/g, "")
            .toUpperCase();
    }

    private static logValidation(
        message: string,
        details?: any
    ): void {

        console.log("[EBP Validation]", message, details || {});
    }

public static validatePlan(
    provider: string,
    plan: string,
    stats: any,
    selectedPlans?: Record<string, string>,
    currentCategory?: string
): string {

    const providerName =
        this.normalize(provider);

    const planName =
        this.normalize(plan);

    this.logValidation("validatePlan start", {
        provider,
        providerName,
        plan,
        planName,
        currentCategory,
        selectedPlans,
        stats
    });

    if (planName && selectedPlans && currentCategory) {

        const duplicateCategory =
            Object.keys(selectedPlans)
                .map((category: string) => ({
                    category,
                    selectedPlan: selectedPlans[category]
                }))
                .find((entry: { category: string; selectedPlan: string }) =>
                    entry.category !== currentCategory &&
                    this.normalize(entry.selectedPlan) === planName
                );

        this.logValidation("Duplicate plan check", {
            planName,
            selectedPlans,
            currentCategory
        });

        if (duplicateCategory) {
            this.logValidation("Duplicate plan detected", {
                currentCategory,
                duplicateCategory: duplicateCategory.category,
                selectedPlan: duplicateCategory.selectedPlan
            });
            return `Plan "${plan}" is already selected for category "${duplicateCategory.category}". Choose a different plan for this category.`;
        }
    }

    const salary4000 =
        Number(stats.salary4000 || 0);

    const salary16000 =
        Number(stats.salary16000 || 0);

    const salary20000 =
        Number(stats.salary20000 || 0);

    const dependents =
        Number(stats.dependent || 0);

    const totalEmployees =
        salary4000 +
        salary16000 +
        salary20000;

    const totalMembers =
        totalEmployees +
        dependents;

    const above4000 =
        salary16000 +
        salary20000;

    const above4000Pct =
        totalEmployees === 0
            ? 0
            : (above4000 / totalEmployees) * 100;

    const below20000 =
        salary4000 +
        salary16000;

    const below20000Pct =
        totalEmployees === 0
            ? 0
            : (below20000 / totalEmployees) * 100;

    this.logValidation("Computed employee statistics", {
        salary4000,
        salary16000,
        salary20000,
        dependents,
        totalEmployees,
        totalMembers,
        above4000Pct,
        below20000Pct
    });


    // =====================================================
    // ECARE
    // =====================================================

    if (providerName === "ECARE") {

        this.logValidation("Checking ECARE rules", { planName });

        if (planName === "BASIC") {

            this.logValidation("Checking ECARE Basic comparisons", {
                dependents,
                totalEmployees,
                salary16000,
                salary20000
            });

            if (dependents > 0) {
                this.logValidation("ECARE Basic failed: dependents not allowed", { dependents });
                return "ECARE Basic allows only employees. Dependents are not permitted.";
            }

            if (
                totalEmployees < 5 ||
                totalEmployees > 150
            ) {
                this.logValidation("ECARE Basic failed: employee count range", {
                    totalEmployees,
                    min: 5,
                    max: 150
                });
                return `ECARE Basic requires 5-150 employees. Current employees: ${totalEmployees}`;
            }

            if (
                salary16000 > 0 ||
                salary20000 > 0
            ) {
                this.logValidation("ECARE Basic failed: salary band check", {
                    salary16000,
                    salary20000
                });
                return "ECARE Basic is applicable only when all employees earn less than AED 4,000.";
            }

            this.logValidation("ECARE Basic passed", { totalEmployees });
            return "";
        }

        if (
            planName === "BASIC PLUS" ||
            planName === "ENHANCED 1" ||
            planName === "ENHANCED 2" ||
            planName === "SUPERIOR 1" ||
            planName === "SUPERIOR 2"
        ) {

            this.logValidation("Checking ECARE standard plan comparisons", {
                totalMembers,
                above4000Pct,
                dependents,
                totalEmployees
            });

            if (
                totalMembers < 20 ||
                totalMembers > 150
            ) {
                this.logValidation("ECARE standard plan failed: member count range", {
                    totalMembers,
                    min: 20,
                    max: 150
                });
                return `ECARE ${plan} requires 20-150 members. Current members: ${totalMembers}`;
            }

            if (above4000Pct > 30) {
                this.logValidation("ECARE standard plan failed: above AED 4,000 percentage", {
                    above4000Pct
                });
                return "ECARE plans require employees earning more than AED 4,000 not to exceed 30% of the total Group Size.";
            }

            const dependentLimit =
                Math.floor(totalEmployees * 0.10);

            if (dependents > dependentLimit) {
                this.logValidation("ECARE standard plan failed: dependent limit", {
                    dependents,
                    dependentLimit,
                    totalEmployees
                });
                return `Dependents cannot exceed 10% of employee count. Employees: ${totalEmployees}, Dependents: ${dependents}`;
            }

            this.logValidation("ECARE standard plan passed", { totalMembers, above4000Pct });
            return "";
        }
    }

    // =====================================================
    // FMC
    // =====================================================

    if (providerName === "FMC") {

        this.logValidation("Checking FMC rules", { planName });

        if (planName === "BASIC LSB") {

            this.logValidation("Checking FMC Basic LSB comparisons", {
                dependents,
                totalEmployees,
                salary16000,
                salary20000
            });

            if (dependents > 0) {
                this.logValidation("FMC Basic LSB failed: dependents not allowed", { dependents });
                return "FMC Basic LSB allows only employees. Dependents are not permitted.";
            }

            if (
                totalEmployees < 5 ||
                totalEmployees > 150
            ) {
                this.logValidation("FMC Basic LSB failed: employee count range", {
                    totalEmployees,
                    min: 5,
                    max: 150
                });
                return `FMC Basic LSB requires 5-150 employees. Current employees: ${totalEmployees}`;
            }

            if (
                salary16000 > 0 ||
                salary20000 > 0
            ) {
                this.logValidation("FMC Basic LSB failed: salary band check", {
                    salary16000,
                    salary20000
                });
                return "FMC Basic LSB is applicable only when all employees earn less than AED 4,000.";
            }

            this.logValidation("FMC Basic LSB passed", { totalEmployees });
            return "";
        }

        if (
            planName === "BASIC HSB" ||
            planName === "BASIC PLUS" ||
            planName === "ENHANCED 1" ||
            planName === "ENHANCED 2" ||
            planName === "SUPERIOR 1" ||
            planName === "SUPERIOR 2"
        ) {

            this.logValidation("Checking FMC standard plan comparisons", {
                totalMembers,
                above4000Pct,
                dependents,
                totalEmployees
            });

            if (
                totalMembers < 5 ||
                totalMembers > 150
            ) {
                this.logValidation("FMC standard plan failed: member count range", {
                    totalMembers,
                    min: 5,
                    max: 150
                });
                return `FMC ${plan} requires 5-150 members. Current members: ${totalMembers}`;
            }

            if (above4000Pct > 30) {
                this.logValidation("FMC standard plan failed: above AED 4,000 percentage", {
                    above4000Pct
                });
                return `FMC ${plan} requires employees earning more than AED 4,000 not to exceed 30% of the total Group Size.`;
            }

            const dependentLimit =
                Math.floor(totalEmployees * 0.10);

            if (dependents > dependentLimit) {
                this.logValidation("FMC standard plan failed: dependent limit", {
                    dependents,
                    dependentLimit,
                    totalEmployees
                });
                return `Dependents cannot exceed 10% of employee count. Employees: ${totalEmployees}, Dependents: ${dependents}`;
            }

            this.logValidation("FMC standard plan passed", { totalMembers, above4000Pct });
            return "";
        }

        if (
            planName === "SUPERIOR 3" ||
            planName === "SUPERIOR 4"
        ) {

            this.logValidation("Checking FMC superior 3/4 comparisons", {
                totalMembers,
                salary20000,
                dependents,
                totalEmployees
            });

            if (
                totalMembers < 10 ||
                totalMembers > 150
            ) {
                this.logValidation("FMC superior 3/4 failed: member count range", {
                    totalMembers,
                    min: 10,
                    max: 150
                });
                return `FMC ${plan} requires 10-150 members. Current members: ${totalMembers}`;
            }

            if (salary20000 > 0) {
                this.logValidation("FMC superior 3/4 failed: salary 20k check", { salary20000 });
                return `FMC ${plan} requires all employees to earn less than AED 16,000.`;
            }

            const dependentLimit =
                Math.floor(totalEmployees * 0.20);

            if (dependents > dependentLimit) {
                this.logValidation("FMC superior 3/4 failed: dependent limit", {
                    dependents,
                    dependentLimit,
                    totalEmployees
                });
                return `Dependents cannot exceed 20% of employee count. Employees: ${totalEmployees}, Dependents: ${dependents}`;
            }

            this.logValidation("FMC superior 3/4 passed", { totalMembers });
            return "";
        }

        if (
            planName === "SUPERIOR 5" ||
            planName === "SUPERIOR 6"
        ) {

            this.logValidation("Checking FMC superior 5/6 comparisons", {
                totalMembers,
                dependents,
                totalEmployees
            });

            if (
                totalMembers < 50 ||
                totalMembers > 150
            ) {
                this.logValidation("FMC superior 5/6 failed: member count range", {
                    totalMembers,
                    min: 50,
                    max: 150
                });
                return `FMC ${plan} requires 50-150 members. Current members: ${totalMembers}`;
            }

            const dependentLimit =
                Math.floor(totalEmployees * 0.20);

            if (dependents > dependentLimit) {
                this.logValidation("FMC superior 5/6 failed: dependent limit", {
                    dependents,
                    dependentLimit,
                    totalEmployees
                });
                return `Dependents cannot exceed 20% of employee count. Employees: ${totalEmployees}, Dependents: ${dependents}`;
            }

            this.logValidation("FMC superior 5/6 passed", { totalMembers });
            return "";
        }
    }

    return "";
}

public static getAnnualLimit(
    provider: string,
    plan: string
): string {

    const providerName =
        (provider || "")
            .replace(/\s+/g, "")
            .toUpperCase();

    // ================= ECARE =================
    if (providerName === "ECARE") {

        const ecareLimits: any = {

            "Basic": "AED 150,000",
            "Basic Plus": "AED 150,000",

            "Enhanced 1": "AED 150,000",
            "Enhanced 2": "AED 150,000",

            "Superior 1": "AED 150,000",
            "Superior 2": "AED 150,000"
        };

        return ecareLimits[plan] || "AED 150,000";
    }

    // ================= FMC =================
    if (providerName === "FMC") {

        const fmcLimits: any = {

            "Basic LSB": "AED 150,000",
            "Basic HSB": "AED 150,000",

            "Basic Plus": "AED 150,000",

            "Enhanced 1": "AED 150,000",
            "Enhanced 2": "AED 150,000",

            "Superior 1": "AED 150,000",
            "Superior 2": "AED 150,000",
            "Superior 3": "AED 150,000",
            "Superior 4": "AED 175,000",
            "Superior 5": "AED 200,000",
            "Superior 6": "AED 225,000"
        };

        return fmcLimits[plan] || "AED 150,000";
    }

    return "AED 150,000";
}

public static getNetworkType(
    provider: string,
    plan: string
): string {

    const providerName =
        (provider || "")
            .replace(/\s+/g, "")
            .toUpperCase();

    if (providerName === "ECARE") {

        const ecareMap: any = {

            "Basic": "Blue",
            "Basic Plus": "Blue",
            "Enhanced 1": "Blue",
            "Enhanced 2": "Blue",

            "Superior 1": "Green",
            "Superior 2": "Green"
        };

        return ecareMap[plan] || "";
    }

    if (providerName === "FMC") {

        const fmcMap: any = {

            "Basic LSB": "Basic Network",
            "Basic HSB": "Basic Network",

            "Basic Plus": "Network 2",
            "Enhanced 1": "Network 2",
            "Enhanced 2": "Network 2",
            "Superior 1": "Network 2",
            "Superior 2": "Network 2",
            "Superior 3": "Standard Network",
            "Superior 4": "Standard Network",
            "Superior 5": "Standard Network",
            "Superior 6": "Standard Network"
        };

        return fmcMap[plan] || "";
    }

    return "";
}

 public static getCoverage(
    provider: string,
    plan: string
): string {

    const providerName =
        (provider || "")
            .replace(/\s+/g, "")
            .toUpperCase();

    if (providerName === "ECARE") {

        const ecareCoverage: any = {

            "Basic":
                "Emirates of Dubai. Emergency extension to UAE",

            "Basic Plus":
                "UAE (Excluding the Emirate of Abu Dhabi & Al Ain Region). Emergency extension to UAE; Home country (Excluding USA & Canada). Covered for IP subject to UAE R&C selected Network rates and with prior-approval.",

            "Enhanced 1":
                "UAE (Excluding the Emirate of Abu Dhabi & Al Ain Region). Emergency extension to UAE; Home country (Excluding USA & Canada). Covered for IP subject to UAE R&C selected Network rates and with prior-approval.",

            "Enhanced 2":
                "UAE (Excluding the Emirate of Abu Dhabi & Al Ain Region). Emergency extension to UAE; Home country (Excluding USA & Canada). Covered for IP subject to UAE R&C selected Network rates and with prior-approval.",

            "Superior 1":
                "UAE (Excluding the Emirate of Abu Dhabi & Al Ain Region). Emergency extension to UAE; Home country (Excluding USA & Canada). Covered for IP subject to UAE R&C selected Network rates and with prior-approval.",

            "Superior 2":
                "UAE (Excluding the Emirate of Abu Dhabi & Al Ain Region). Emergency extension to UAE; Home country (Excluding USA & Canada). Covered for IP subject to UAE R&C selected Network rates and with prior-approval."
        };

        return ecareCoverage[plan] || "";
    }

    if (providerName === "FMC") {

        const fmcCoverage: any = {

            "Basic LSB":
                "UAE (Excluding Abu Dhabi & Al Ain) for Elective Treatments & whole UAE for Emergency treatments",

            "Basic HSB":
                "UAE (Excluding Abu Dhabi & Al Ain) for Elective Treatments & whole UAE for Emergency treatments",

            "Basic Plus":
                "UAE (Excluding Abu Dhabi & Al Ain Region) for elective treatments & whole UAE for emergency treatments",

           "Enhanced 1":
                "UAE (Excluding the Emirate of Abu Dhabi & Al Ain Region). Emergency extension to UAE; Home country (Excluding USA & Canada). Covered for IP subject to UAE R&C selected Network rates and with prior-approval.",

            "Enhanced 2":
                "UAE (Excluding the Emirate of Abu Dhabi & Al Ain Region). Emergency extension to UAE; Home country (Excluding USA & Canada). Covered for IP subject to UAE R&C selected Network rates and with prior-approval.",

           "Superior 1":
                "UAE (Excluding the Emirate of Abu Dhabi & Al Ain Region). Emergency extension to UAE; Home country (Excluding USA & Canada). Covered for IP subject to UAE R&C selected Network rates and with prior-approval.",

            "Superior 2":
                "UAE (Excluding the Emirate of Abu Dhabi & Al Ain Region). Emergency extension to UAE; Home country (Excluding USA & Canada). Covered for IP subject to UAE R&C selected Network rates and with prior-approval.",

            "Superior 3":
                "UAE & Indian Sub-continent & South East Asia (Excluding Hong Kong & Singapore) for Elective & Emergency Treatments",

            "Superior 4":
                "UAE & Indian Sub-continent & South East Asia (Excluding Hong Kong & Singapore) for Elective & Emergency Treatments",

            "Superior 5":
                "UAE, Oman, Qatar & Indian Sub-continent & South East Asia (Excluding Hong Kong & Singapore) for Elective & Emergency Treatments",

            "Superior 6":
                "UAE, Oman, Qatar & Indian Sub-continent & South East Asia (Excluding Hong Kong & Singapore) for Elective & Emergency Treatments"
        };

        return fmcCoverage[plan] || "";
    }

    return "";
}
}