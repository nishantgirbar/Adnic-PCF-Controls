export class EbpRuleService {

    private static normalize(
        value: string
    ): string {

        return (value || "")
            .replace(/\s+/g, "")
            .toUpperCase();
    }

public static validatePlan(
    provider: string,
    plan: string,
    stats: any
): string {

    const providerName =
        (provider || "")
            .replace(/\s+/g, "")
            .toUpperCase();

    const totalEmployees =
        (stats.salary4000 || 0) +
        (stats.salary16000 || 0) +
        (stats.salary20000 || 0);

    const totalMembers =
        totalEmployees +
        (stats.dependent || 0);

    const dependents =
        stats.dependent || 0;

    const above4000 =
        (stats.salary16000 || 0) +
        (stats.salary20000 || 0);

    const less20000 =
        (stats.salary16000 || 0) +
        (stats.salary4000 || 0);

    const above4000Pct =
        totalEmployees === 0
            ? 0
            : (above4000 / totalEmployees) * 100;

    const less20000Pct =
        totalEmployees === 0
            ? 0
            : (less20000 / totalEmployees) * 100;

    // =====================================================
    // ECARE
    // =====================================================

    if (providerName === "ECARE") {

        // Basic
        if (plan === "Basic") {

            if(dependents > 0) 
            {
                return `Ecare Basic allows only employees. Dependents are not permitted`;
            }

            if (
                totalEmployees < 5 ||
                totalEmployees > 150
            ) 
            {

                return `Basic plan requires 5-150 employees in total. Current total: ${totalEmployees}`;
            }

            if (
                stats.salary16000 > 0 ||
                stats.salary20000 > 0
            ) {

                return "Basic plan is applicable only when all employees earn less than AED 4,000.";
            }

            

            return "";
        }

        // Basic+, Enhanced1, Enhanced2, Superior1, Superior2
        if (
                plan === "Basic Plus" ||
                plan === "Enhanced 1" ||
                plan === "Enhanced 2" ||
                plan === "Superior 1" ||
                plan === "Superior 2"
            )
        {

            if (
                totalMembers < 20 ||
                totalMembers > 150
            ) {

                return `Selected plan '${plan}' requires at least 20 members in total. Current total: ${totalMembers}`;
            }

            const dependentLimit =
                Math.floor(totalEmployees * 0.10);

            if (
                dependents > dependentLimit
            ) {

                return `Dependents cannot exceed 10% of employee count. Employees: ${totalEmployees}, Dependents: ${dependents}`;
            }

            if (
                above4000Pct > 30
            ) {

                return `Employees earning above AED 4,000 cannot exceed 30% of total employees. Current: ${above4000Pct.toFixed(0)}%`;
            }

            return "";
        }
    }

    // =====================================================
    // FMC
    // =====================================================

    if (providerName === "FMC") {

        // BasicLSB
        if (plan === "Basic LSB") 
        {
            
            if(dependents > 0) 
            {
                return `FMC BasicLSB only employees. Dependents are not permitted`;
            }

            if (
                totalEmployees < 5 ||
                totalEmployees > 150
            ) {

                return `FMC BasicLSB requires 5-150 employees. Current total: ${totalEmployees}`;
            }

            return "";
        }

        // BasicHSB
        if (plan === "Basic HSB" || plan === "Basic Plus") {

            if (
                totalMembers < 5 ||
                totalMembers > 150
            ) {

                return `BasicHSB requires 5-150 members. Current total: ${totalMembers}`;
            }

            const dependentLimit =
                Math.floor(totalEmployees * 0.10);

            if (
                dependents > dependentLimit
            ) {

                return `Dependents cannot exceed 10% of employee count.`;
            }

            if (
                less20000Pct > 10
            ) {

                return `Employees earning less than AED 20,000 cannot exceed 10% of employees.`;
            }

            return "";
        }

       ``
        if (plan === "Enhanced 1" || plan === "Enhanced 2" || plan === "Superior 1"|| plan === "Superior 2") {

            if (
                totalMembers < 5 ||
                totalMembers > 150
            ) {

                return `BasicHSB requires 5-150 members. Current total: ${totalMembers}`;
            }

            const dependentLimit =
                Math.floor(totalEmployees * 0.10);

            if (
                dependents > dependentLimit
            ) {

                return `Dependents cannot exceed 10% of employee count.`;
            }

            if (
                above4000Pct > 30
            ) {

                return `Employees earning above AED 4,000 cannot exceed 30% of employees.`;
            }

            return "";
        }

        // Superior3
        if (plan === "Superior 3" || plan === "Superior 4") {

            if (
                totalMembers < 10 ||
                totalMembers > 150
            ) {

                return `Superior3 requires 10-150 members. Current total: ${totalMembers}`;
            }

            const dependentLimit =
                Math.floor(totalEmployees * 0.20);

            if (
                dependents > dependentLimit
            ) {

                return `Dependents cannot exceed 20% of employee count.`;
            }

            return "";
        }

        // Superior5
        if (plan === "Superior 5" || plan === "Superior 6") {

            if (
                totalMembers < 50 ||
                totalMembers > 150
            ) {

                return `Superior5 requires 50-150 members. Current total: ${totalMembers}`;
            }

            const dependentLimit =
                Math.floor(totalEmployees * 0.20);

            if (
                dependents > dependentLimit
            ) {

                return `Dependents cannot exceed 20% of employee count.`;
            }

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

            "Basic Plus": "Network2",
            "Enhanced 1": "Network2",
            "Enhanced 2": "Network2",
            "Superior 1": "Network2",
            "Superior 2": "Network2",
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