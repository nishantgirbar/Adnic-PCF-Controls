const normalize = (value: any): string =>
    String(value || "")
        .trim()
        .toUpperCase()
        .replace(/^(CATEGORY|CAT)[\s-]*/i, "")
        .replace(/[^A-Z0-9]/g, "");

const getProvider = (category: any): string =>
    String(
        category?.productSelection?.networkProviderName ||
        category?.networkProvider?.name ||
        category?.networkProviderName ||
        category?.networkProvider ||
        ""
    );

const getPlan = (category: any): string =>
    String(
        category?.productSelection?.networkTypeName ||
        category?.productSelection?.planName ||
        category?.network?.name ||
        category?.planName ||
        category?.plan ||
        ""
    );

const getMemberCategory = (member: any): string =>
    normalize(
        member?.category ??
        member?.categoryCode ??
        member?.categoryName ??
        member?.category_code ??
        member?.category_name
    );

const getRelation = (member: any): string =>
    String(
        member?.relation?.code ??
        member?.relation?.name ??
        member?.relation?.display ??
        member?.relation ??
        member?.relationship?.code ??
        member?.relationship ??
        member?.relationCode ??
        ""
    ).trim().toUpperCase();

const getMemberStatistics = (
    members: any[],
    categoryCode: string
) => {
    const result = {
        salary4000: 0,
        salary16000: 0,
        salary20000: 0,
        dependent: 0
    };
    const targetCategory = normalize(categoryCode);

    (members || []).forEach((member: any) => {
        if (
            targetCategory &&
            getMemberCategory(member) !== targetCategory
        ) {
            return;
        }

        const relation = getRelation(member);

        if (relation && relation !== "EMPLOYEE") {
            result.dependent++;
            return;
        }

        const salaryType =
            String(member?.salaryType || "").toUpperCase();

        const isAbove20000 =
            salaryType.indexOf("20000") > -1 &&
            /(ABOVE|OVER|MORE\s*THAN|GREATER\s*THAN|>=|>)/.test(
                salaryType
            );

        if (isAbove20000) {
            return;
        }

        if (salaryType.indexOf("4000") > -1) {
            result.salary4000++;
            return;
        }

        if (salaryType.indexOf("16000") > -1) {
            result.salary16000++;
            return;
        }

        if (salaryType.indexOf("20000") > -1) {
            result.salary20000++;
            return;
        }

        const salary = Number(
            member?.salary ??
            member?.salaryAmount ??
            member?.monthlySalary
        );

        if (!Number.isFinite(salary)) {
            return;
        }

        if (salary < 4000) {
            result.salary4000++;
        } else if (salary < 16000) {
            result.salary16000++;
        } else if (salary < 20000) {
            result.salary20000++;
        }
    });

    return result;
};

const getAnnualLimit = (
    provider: string,
    plan: string
): string => {
    if (
        normalize(provider) === "FMC" &&
        normalize(plan) === "SUPERIOR4"
    ) {
        return "AED 175,000";
    }

    if (
        normalize(provider) === "FMC" &&
        normalize(plan) === "SUPERIOR5"
    ) {
        return "AED 200,000";
    }

    if (
        normalize(provider) === "FMC" &&
        normalize(plan) === "SUPERIOR6"
    ) {
        return "AED 225,000";
    }

    return "AED 150,000";
};

const getNetworkType = (
    provider: string,
    plan: string
): string => {
    const providerName = normalize(provider);
    const planName = normalize(plan);

    if (providerName === "ECARE") {
        if (
            planName === "SUPERIOR1" ||
            planName === "SUPERIOR2"
        ) {
            return "Green";
        }

        if ([
            "BASIC",
            "BASICPLUS",
            "ENHANCED1",
            "ENHANCED2"
        ].indexOf(planName) > -1) {
            return "Blue";
        }

        return "";
    }

    if (providerName === "FMC") {
        if (
            planName === "BASICLSB" ||
            planName === "BASICHSB"
        ) {
            return "Basic Network";
        }

        if (
            planName === "SUPERIOR3" ||
            planName === "SUPERIOR4" ||
            planName === "SUPERIOR5" ||
            planName === "SUPERIOR6"
        ) {
            return "Standard Network";
        }

        if ([
            "BASICPLUS",
            "ENHANCED1",
            "ENHANCED2",
            "SUPERIOR1",
            "SUPERIOR2"
        ].indexOf(planName) > -1) {
            return "Network 2";
        }

        return "";
    }

    return "";
};

const getTerritorialCoverage = (
    provider: string,
    plan: string
): string => {
    const providerName = normalize(provider);
    const planName = normalize(plan);

    if (providerName === "ECARE") {
        if (planName === "BASIC") {
            return "Emirates of Dubai. Emergency extension to UAE";
        }

        return "UAE (Excluding the Emirate of Abu Dhabi & Al Ain Region). Emergency extension to UAE; Home country (Excluding USA & Canada). Covered for IP subject to UAE R&C selected Network rates and with prior-approval.";
    }

    if (providerName === "FMC") {
        if (
            planName === "BASICLSB" ||
            planName === "BASICHSB"
        ) {
            return "UAE (Excluding Abu Dhabi & Al Ain) for Elective Treatments & whole UAE for Emergency treatments";
        }

        if (planName === "BASICPLUS") {
            return "UAE (Excluding Abu Dhabi & Al Ain Region) for elective treatments & whole UAE for emergency treatments";
        }

        if (
            planName === "SUPERIOR3" ||
            planName === "SUPERIOR4"
        ) {
            return "UAE & Indian Sub-continent & South East Asia (Excluding Hong Kong & Singapore) for Elective & Emergency Treatments";
        }

        if (
            planName === "SUPERIOR5" ||
            planName === "SUPERIOR6"
        ) {
            return "UAE, Oman, Qatar & Indian Sub-continent & South East Asia (Excluding Hong Kong & Singapore) for Elective & Emergency Treatments";
        }

        return "UAE (Excluding the Emirate of Abu Dhabi & Al Ain Region). Emergency extension to UAE; Home country (Excluding USA & Canada). Covered for IP subject to UAE R&C selected Network rates and with prior-approval.";
    }

    return "";
};

export const isEbpProduct = (quoteInfo: any): boolean => {
    const candidates = [
        quoteInfo?.productType,
        quoteInfo?.productCode,
        quoteInfo?.productName,
        quoteInfo?.planType,
        quoteInfo?.productSelectionResponse?.productType,
        quoteInfo?.productSelectionResponse?.productCode
    ];

    return candidates.some((value: any) =>
        normalize(value) === "EBP"
    );
};

export const buildJsonProductDetailMap = (
    categories: any[]
): Record<string, Record<string, string | number>> => {
    const details: Record<
        string,
        Record<string, string | number>
    > = {};

    const setDetail = (
        rowName: string,
        categoryCode: string,
        value: any
    ) => {
        if (
            !rowName ||
            value === undefined ||
            value === null ||
            value === ""
        ) {
            return;
        }

        if (!details[rowName]) {
            details[rowName] = {};
        }

        details[rowName][categoryCode] = value;
    };

    (categories || []).forEach((category: any) => {
        const categoryCode = String(
            category?.categoryCode || "-"
        );

        const provider = getProvider(category);
        const plan = getPlan(category);

        setDetail(
            "Network Provider",
            categoryCode,
            provider || category?.networkProviderName
        );

        setDetail(
            "Network Type",
            categoryCode,
            plan || category?.networkType
        );

        setDetail(
            "Plan",
            categoryCode,
            category?.plan || plan
        );

        setDetail(
            "Annual Limit",
            categoryCode,
            category?.annualLimit
        );

        setDetail(
            "Territorial Coverage",
            categoryCode,
            category?.territorialCoverage
        );

        const benefits =
            Array.isArray(category?.benefits)
                ? category.benefits
                : Array.isArray(category?.benefits?.benefits)
                    ? category.benefits.benefits
                    : [];

        benefits.forEach((benefit: any) => {
            setDetail(
                benefit?.name ||
                benefit?.benefitName ||
                benefit?.code,
                categoryCode,
                benefit?.value ||
                benefit?.benefitValue
            );
        });
    });

    return details;
};

export const buildEbpDetailMap = (
    categories: any[],
    members: any[]
): Record<string, Record<string, string | number>> => {
    const details: Record<
        string,
        Record<string, string | number>
    > = {
        "Network Provider": {},
        "Plan": {},
        "Employee Salary <4000": {},
        "Employee Salary <16000": {},
        "Employee Salary <20000": {},
        "Dependent": {},
        "Annual Limit": {},
        "Network Type": {},
        "Territorial Coverage": {}
    };

    categories.forEach((category: any) => {
        const categoryCode = String(
            category?.categoryCode || "-"
        );
        const provider = getProvider(category);
        const plan = getPlan(category);
        const stats = getMemberStatistics(
            members,
            categoryCode
        );

        details["Network Provider"][categoryCode] =
            provider || "-";
        details["Plan"][categoryCode] = plan || "-";
        details["Employee Salary <4000"][categoryCode] =
            stats.salary4000;
        details["Employee Salary <16000"][categoryCode] =
            stats.salary16000;
        details["Employee Salary <20000"][categoryCode] =
            stats.salary20000;
        details["Dependent"][categoryCode] =
            stats.dependent;
        details["Annual Limit"][categoryCode] =
            getAnnualLimit(provider, plan);
        details["Network Type"][categoryCode] =
            getNetworkType(provider, plan) || "-";
        details["Territorial Coverage"][categoryCode] =
            getTerritorialCoverage(provider, plan) || "-";
    });

    return details;
};
