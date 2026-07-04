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

    const providerName = this.normalize(provider);
    const planName = this.normalize(plan);

    if (planName && selectedPlans && currentCategory) {
        const categoryNames = Object.keys(selectedPlans);
        const currentCategoryIndex =
            categoryNames.indexOf(currentCategory);
        const earlierCategories =
            currentCategoryIndex > 0
                ? categoryNames.slice(0, currentCategoryIndex)
                : [];
        const duplicateCategory = earlierCategories
            .map((category: string) => ({
                category,
                selectedPlan: selectedPlans[category]
            }))
            .find((entry: { category: string; selectedPlan: string }) =>
                this.normalize(entry.selectedPlan) === planName
            );

        if (duplicateCategory) {
            return `Same plan selected. Category ${duplicateCategory.category} already selected '${plan}'. Please select a different EBP plan for Category ${currentCategory}.`;
        }
    }

    if (!planName) {
        return "";
    }

    const salary4000 = Number(stats?.salary4000 || 0);
    const salary16000 = Number(stats?.salary16000 || 0);
    const salary20000 = Number(stats?.salary20000 || 0);
    const salaryAbove20000 = Number(
        stats?.salaryAbove20000 ||
        stats?.above20000 ||
        0
    );
    const dependents = Number(stats?.dependent || 0);
    const totalEmployees =
        salary4000 +
        salary16000 +
        salary20000 +
        salaryAbove20000;
    const totalMembers = totalEmployees + dependents;
    const above4000 = salary16000 + salary20000 + salaryAbove20000;
    const above4000PctOfGroup =
        totalMembers === 0
            ? 0
            : (above4000 / totalMembers) * 100;
    const allEmployeesBelow4000 =
        totalEmployees > 0 &&
        above4000 === 0;

    const BASIC_MIN_EMPLOYEES = 5;
    const BASIC_MAX_EMPLOYEES = 150;
    const ENHANCED_DEPENDENT_PERCENT = 10;
    const ENHANCED_HIGH_SALARY_PERCENT = 30;
    const SUPERIOR_DEPENDENT_PERCENT = 20;
    const FMC_ENHANCED_MIN_EMPLOYEES = 5;
    const ECARE_ENHANCED_MIN_EMPLOYEES = 20;
    const SUPERIOR_3_4_MIN_EMPLOYEES = 10;
    const SUPERIOR_5_6_MIN_EMPLOYEES = 50;
    const SUPERIOR_5_6_MAX_MEMBERS = 150;

    const exceedsDependentRatio = (maximumPercent: number): boolean =>
        totalEmployees === 0
            ? dependents > 0
            : (dependents / totalEmployees) * 100 > maximumPercent;

    const enhancedPlans = [
        "BASICHSB",
        "BASICPLUS",
        "ENHANCED1",
        "ENHANCED2",
        "SUPERIOR1",
        "SUPERIOR2"
    ];
    const ecareEnhancedPlans = enhancedPlans.filter(
        (name: string) => name !== "BASICHSB"
    );
    const superior34Plans = ["SUPERIOR3", "SUPERIOR4"];
    const superior56Plans = ["SUPERIOR5", "SUPERIOR6"];

    const validateEnhancedPlan = (
        minimumEmployees: number,
        includeCurrentTotal: boolean
    ): string => {

        if (totalEmployees < minimumEmployees) {
            return includeCurrentTotal
                ? `Selected plan '${plan}' requires at least ${minimumEmployees} employees in total. Current total: ${totalEmployees}.`
                : `Selected plan '${plan}' requires at least ${minimumEmployees} employees.`;
        }

        if (salaryAbove20000 > 0) {
            return `Selected plan '${plan}' requires all employees to earn less than AED 20,000.`;
        }

        if (exceedsDependentRatio(ENHANCED_DEPENDENT_PERCENT)) {
            return `Selected plan '${plan}' requires dependents not to exceed ${ENHANCED_DEPENDENT_PERCENT}% of total employee count.`;
        }

        if (above4000PctOfGroup > ENHANCED_HIGH_SALARY_PERCENT) {
            return `Selected plan '${plan}' requires employees earning more than AED 4,000 to not exceed ${ENHANCED_HIGH_SALARY_PERCENT}% of total group size.`;
        }

        return "";
    };

    const validateSuperiorPlan = (
        minimumEmployees: number,
        maximumMembers?: number
    ): string => {

        if (totalEmployees < minimumEmployees) {
            return `Selected plan '${plan}' requires at least ${minimumEmployees} employees. Current total: ${totalEmployees}.`;
        }

        if (
            maximumMembers !== undefined &&
            totalMembers > maximumMembers
        ) {
            return `Selected plan '${plan}' allows a maximum of ${maximumMembers} members. Current total: ${totalMembers}.`;
        }

        if (salary20000 > 0 || salaryAbove20000 > 0) {
            return `Selected plan '${plan}' requires all employees to earn less than AED 16,000.`;
        }

        if (exceedsDependentRatio(SUPERIOR_DEPENDENT_PERCENT)) {
            return `Selected plan '${plan}' requires dependents not to exceed ${SUPERIOR_DEPENDENT_PERCENT}% of total employee count.`;
        }

        return "";
    };

    if (providerName === "ECARE") {
        if (allEmployeesBelow4000 && planName !== "BASIC") {
            return `All employees earn less than AED 4,000. Only Ecare Basic is allowed for this salary composition. Selected plan '${plan}' is not permitted.`;
        }

        if (planName === "BASIC") {
            if (dependents > 0) {
                return "Ecare Basic allows only employees. Dependents are not permitted.";
            }

            if (
                totalEmployees < BASIC_MIN_EMPLOYEES ||
                totalEmployees > BASIC_MAX_EMPLOYEES
            ) {
                return `Basic plan requires ${BASIC_MIN_EMPLOYEES}-${BASIC_MAX_EMPLOYEES} employees in total. Current total: ${totalEmployees}.`;
            }

            if (!allEmployeesBelow4000) {
                return "Basic plan requires all employees to earn less than AED 4,000.";
            }

            return "";
        }

        if (ecareEnhancedPlans.indexOf(planName) > -1) {
            return validateEnhancedPlan(
                ECARE_ENHANCED_MIN_EMPLOYEES,
                true
            );
        }

        const eligiblePlans: string[] = [];
        const basicEligible =
            allEmployeesBelow4000 &&
            dependents === 0 &&
            totalEmployees >= BASIC_MIN_EMPLOYEES &&
            totalEmployees <= BASIC_MAX_EMPLOYEES;
        const enhancedEligible =
            !allEmployeesBelow4000 &&
            totalEmployees >= ECARE_ENHANCED_MIN_EMPLOYEES &&
            salaryAbove20000 === 0 &&
            !exceedsDependentRatio(ENHANCED_DEPENDENT_PERCENT) &&
            above4000PctOfGroup <= ENHANCED_HIGH_SALARY_PERCENT;

        if (basicEligible) {
            eligiblePlans.push("Basic");
        }

        if (enhancedEligible) {
            eligiblePlans.push(
                "Basic Plus",
                "Enhanced 1",
                "Enhanced 2",
                "Superior 1",
                "Superior 2"
            );
        }

        return `Selected plan '${plan}' is not supported. Valid plans based on group composition: ${eligiblePlans.join(", ") || "None"}.`;
    }

    if (providerName === "FMC") {
        if (allEmployeesBelow4000 && planName !== "BASICLSB") {
            return `All employees earn less than AED 4,000. Only FMC Basic LSB is allowed for this salary composition. Selected plan '${plan}' is not permitted.`;
        }

        if (planName === "BASICLSB") {
            if (dependents > 0) {
                return "FMC Basic LSB allows only employees. Dependents are not permitted.";
            }

            if (
                totalEmployees < BASIC_MIN_EMPLOYEES ||
                totalEmployees > BASIC_MAX_EMPLOYEES
            ) {
                return `FMC Basic LSB requires ${BASIC_MIN_EMPLOYEES}-${BASIC_MAX_EMPLOYEES} employees in total. Current total: ${totalEmployees}.`;
            }

            if (!allEmployeesBelow4000) {
                return "FMC Basic LSB requires all employees to earn less than AED 4,000.";
            }

            return "";
        }

        if (enhancedPlans.indexOf(planName) > -1) {
            return validateEnhancedPlan(
                FMC_ENHANCED_MIN_EMPLOYEES,
                false
            );
        }

        if (superior34Plans.indexOf(planName) > -1) {
            return validateSuperiorPlan(SUPERIOR_3_4_MIN_EMPLOYEES);
        }

        if (superior56Plans.indexOf(planName) > -1) {
            return validateSuperiorPlan(
                SUPERIOR_5_6_MIN_EMPLOYEES,
                SUPERIOR_5_6_MAX_MEMBERS
            );
        }

        const eligiblePlans: string[] = [];
        const basicEligible =
            allEmployeesBelow4000 &&
            dependents === 0 &&
            totalEmployees >= BASIC_MIN_EMPLOYEES &&
            totalEmployees <= BASIC_MAX_EMPLOYEES;
        const enhancedEligible =
            !allEmployeesBelow4000 &&
            totalEmployees >= FMC_ENHANCED_MIN_EMPLOYEES &&
            salaryAbove20000 === 0 &&
            !exceedsDependentRatio(ENHANCED_DEPENDENT_PERCENT) &&
            above4000PctOfGroup <= ENHANCED_HIGH_SALARY_PERCENT;
        const superior34Eligible =
            !allEmployeesBelow4000 &&
            totalEmployees >= SUPERIOR_3_4_MIN_EMPLOYEES &&
            salary20000 === 0 &&
            salaryAbove20000 === 0 &&
            !exceedsDependentRatio(SUPERIOR_DEPENDENT_PERCENT);
        const superior56Eligible =
            !allEmployeesBelow4000 &&
            totalEmployees >= SUPERIOR_5_6_MIN_EMPLOYEES &&
            totalMembers <= SUPERIOR_5_6_MAX_MEMBERS &&
            salary20000 === 0 &&
            salaryAbove20000 === 0 &&
            !exceedsDependentRatio(SUPERIOR_DEPENDENT_PERCENT);

        if (basicEligible) {
            eligiblePlans.push("Basic LSB");
        }

        if (enhancedEligible) {
            eligiblePlans.push(
                "Basic HSB",
                "Basic Plus",
                "Enhanced 1",
                "Enhanced 2",
                "Superior 1",
                "Superior 2"
            );
        }

        if (superior34Eligible) {
            eligiblePlans.push("Superior 3", "Superior 4");
        }

        if (superior56Eligible) {
            eligiblePlans.push("Superior 5", "Superior 6");
        }

        if (!eligiblePlans.length) {
            return "No FMC plans are eligible for the current group composition. Please review employee count, salary distribution, and dependent ratio.";
        }

        return `Selected plan '${plan}' is not supported. Valid plans based on group composition: ${eligiblePlans.join(", ")}.`;
    }

    return "";
}

private static validatePlanLegacy(
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

            this.logValidation("Checking FMC Basic LSB comparisons", {
                dependents,
                totalEmployees,
                salary16000,
                salary20000
            });

            
             if (dependents > 0) {
                this.logValidation(`${providerName} ${planName} failed: dependents not allowed`, { dependents });
                return `${providerName} ${planName} allows only employees. Dependents are not permitted.`;
            }


             if (
                totalEmployees < 5 ||
                totalEmployees > 150
            ) {
                this.logValidation(`${providerName} ${planName} failed: employee count range`, {
                    totalEmployees,
                    min: 5,
                    max: 150
                });
                return `${providerName} ${planName} requires 5-150 employees. Current employees: ${totalEmployees}`;
            }


           if (
                salary16000 > 0 ||
                salary20000 > 0
            ) {
                this.logValidation("FMC Basic LSB failed: salary band check", {
                    salary16000,
                    salary20000
                });
                return `${providerName} ${planName} is applicable only when all employees earn less than AED 4,000`;
            }     

            this.logValidation("FMC Basic LSB passed", { totalEmployees });
            return "";
        }

        if (
            planName === "BASICPLUS" ||
            planName === "ENHANCED1" ||
            planName === "ENHANCED2" ||
            planName === "SUPERIOR1" ||
            planName === "SUPERIOR2"
        ) {

             this.logValidation("Checking FMC standard plan comparisons", {
                totalMembers,
                above4000Pct,
                dependents,
                totalEmployees
            });

            if (
                totalMembers < 20 ||
                totalMembers > 150
            ) {
                this.logValidation(`${providerName} ${planName} failed: member count range`, {
                    totalMembers,
                    min: 20,
                    max: 150
                });
                return `${providerName} ${planName} requires 5-150 members. Current members: ${totalMembers}`;
            }

            if ( salary20000 > 0 ) {
                this.logValidation(`${providerName} ${planName} failed: salary band check`, {
                    salary16000,
                    salary20000
                });
                return `${providerName} ${planName} is applicable only when all employees earn less than AED 4,000.`;
            }

             const dependentLimit =
                Math.floor(totalEmployees * 0.10);

            if (dependents > dependentLimit) {
                this.logValidation(`${providerName} ${planName} failed: dependent limit`, {
                    dependents,
                    dependentLimit,
                    totalEmployees
                });
                return `Dependents cannot exceed 10% of employee count. Employees: ${totalEmployees}, Dependents: ${dependents}`;
            }

            if (above4000Pct > 30) {
                this.logValidation(`${providerName} ${planName} failed: above AED 4,000 percentage`, {
                    above4000Pct
                });
                return `${providerName} ${planName} requires employees earning more than AED 4,000 not to exceed 30% of the total Group Size.`;
            }
           

            this.logValidation(`${providerName} ${planName} passed`, { totalMembers, above4000Pct });
            return "";
        }
    }

    // =====================================================
    // FMC
    // =====================================================

    if (providerName === "FMC") {

        this.logValidation("Checking FMC rules", { planName });

        if (planName === "BASICLSB") {

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
            planName === "BASICHSB" ||
            planName === "BASICPLUS" ||
            planName === "ENHANCED1" ||
            planName === "ENHANCED2" ||
            planName === "SUPERIOR1" ||
            planName === "SUPERIOR2"
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
                return `${providerName} ${planName} requires 5-150 members. Current members: ${totalMembers}`;
            }

            if ( salary20000 > 0 ) {
                this.logValidation(`${providerName} ${planName} failed: salary band check`, {
                    salary16000,
                    salary20000
                });
                return `${providerName} ${planName} is applicable only when all employees earn less than AED 4,000.`;
            }

             const dependentLimit =
                Math.floor(totalEmployees * 0.10);

            if (dependents > dependentLimit) {
                this.logValidation(`${providerName} ${planName} failed: dependent limit`, {
                    dependents,
                    dependentLimit,
                    totalEmployees
                });
                return `Dependents cannot exceed 10% of employee count. Employees: ${totalEmployees}, Dependents: ${dependents}`;
            }

            if (above4000Pct > 30) {
                this.logValidation("FMC standard plan failed: above AED 4,000 percentage", {
                    above4000Pct
                });
                return `FMC ${plan} requires employees earning more than AED 4,000 not to exceed 30% of the total Group Size.`;
            }
           

            this.logValidation("FMC standard plan passed", { totalMembers, above4000Pct });
            return "";
        }

        if (
            planName === "SUPERIOR3" ||
            planName === "SUPERIOR4"
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

            if ((salary20000) > 0) {
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
            planName === "SUPERIOR5" ||
            planName === "SUPERIOR6"
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

            if ((salary20000) > 0) {
                this.logValidation("FMC superior 3/4 failed: salary 20k check", { salary20000 });
                return `FMC ${plan} requires all employees to earn less than AED 16,000.`;
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
