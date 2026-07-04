import * as React from "react";

export const CoverageTable = ({
    categories,
    quoteInfo,
    pricingResponse
}: any) => {

    // =====================================
    // VALIDATION
    // =====================================

    if (!categories?.length) {
        return null;
    }

    // =====================================
    // BENEFIT MAP
    // =====================================

    const benefitMap: any = {};

    // =====================================
    // CATEGORY PREMIUM MAP
    // =====================================

    const premiumMap: any = {};

    // =====================================
    // PRICING RESPONSE PREMIUMS
    // =====================================

    (
        pricingResponse?.categoryPremiums || []
    ).forEach((p: any) => {

        const categoryName =
            p?.categoryName
                ?.replace("CAT-", "");

        premiumMap[categoryName] =
            Number(
                p?.currentPremium || 0
            );
    });

    // =====================================
    // INITIAL CATEGORY PREMIUMS
    // =====================================

    categories.forEach((cat: any) => {

        const categoryCode =
            cat?.categoryCode;

        // Only use initial value
        // if loading response not available

        if (
            premiumMap[categoryCode] === undefined
        ) {

            premiumMap[categoryCode] =
                Number(

                    cat?.premium ||

                    cat?.categoryPremium ||

                    cat?.currentTotalPremium ||

                    cat?.totalPremium ||

                    cat?.currentPremium ||

                    0
                );
        }
    });

    // =====================================
    // BENEFITS PROCESSING
    // =====================================

    categories.forEach((cat: any) => {

        const categoryCode =
            cat?.categoryCode;

        const benefits =
            cat?.benefits?.benefits ||
            cat?.benefits ||
            [];

        benefits.forEach((b: any) => {

            const benefitName =
                b?.benefitName ||
                b?.name ||
                "-";

            const value =
                b?.benefitValue ||
                b?.value ||
                "-";

            if (!benefitMap[benefitName]) {

                benefitMap[benefitName] = {};
            }

            benefitMap[
                benefitName
            ][categoryCode] = value;
        });
    });

    // =====================================
    // CATEGORY CODES
    // =====================================

    const categoryCodes =
        categories.map(
            (c: any) => c?.categoryCode
        );

    // =====================================
    // FORMAT AED
    // =====================================

    const formatAED = (
        amount: number
    ) => {

        return Number(
            amount || 0
        ).toLocaleString(
            "en-US",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );
    };

    return (

        <div className="section">

            {/* ========================= */}
            {/* TITLE */}
            {/* ========================= */}

            <h3 className="section-title">
                Product Details
            </h3>

            {/* ========================= */}
            {/* TOP INFO */}
            {/* ========================= */}

            <div className="product-top-info">

                {/* POLICY START */}

                <div className="product-info-card">

                    <div className="product-info-label">
                        Policy Start
                    </div>

                    <div className="product-info-value">

                        {
                            quoteInfo?.policyStartDate
                                ? new Date(
                                    quoteInfo.policyStartDate
                                ).toLocaleDateString(
                                    "en-GB",
                                    {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric"
                                    }
                                )
                                : "-"
                        }

                    </div>

                </div>

                {/* SOURCE OF BUSINESS */}

                <div className="product-info-card">

                    <div className="product-info-label">
                        Source of Business
                    </div>

                    <div className="product-info-value">

                        {

                            quoteInfo?.sourceOfBusiness

                            ||

                            "Broker"
                        }

                    </div>

                </div>

                {/* COMMISSION */}

                <div className="product-info-card">

                    <div className="product-info-label">
                        Commission
                    </div>

                    <div className="product-info-value">

                        {
                            quoteInfo?.commission + "%" ||
                            "10%"
                        }

                    </div>

                </div>

            </div>

            {/* ========================= */}
            {/* PLAN TYPE */}
            {/* ========================= */}

            <div className="plan-type-section">

                Plan Type: {

                    quoteInfo?.planType ||
                    "Enhanced Plan"

                }

            </div>

            {/* ========================= */}
            {/* TABLE */}
            {/* ========================= */}

            <div className="table-container">

                <table className="table coverage-table">

                    {/* ========================= */}
                    {/* HEADER */}
                    {/* ========================= */}

                    <thead>

                        <tr>

                            <th>#</th>

                            <th className="sticky-column">
                                Details
                            </th>

                            {categoryCodes.map(
                                (c: string) => (

                                    <th key={c}>
                                        Category {c}
                                    </th>

                                )
                            )}

                        </tr>

                    </thead>

                    {/* ========================= */}
                    {/* BODY */}
                    {/* ========================= */}

                    <tbody>

                        {Object.keys(
                            benefitMap
                        ).map(
                            (
                                name,
                                index
                            ) => (

                                <tr key={name}>

                                    <td>
                                        {index + 1}
                                    </td>

                                    <td className="benefit-name">
                                        {name}
                                    </td>

                                    {categoryCodes.map(
                                        (c: string) => (

                                            <td key={c}>

                                                {
                                                    benefitMap[
                                                        name
                                                    ][c] || "-"
                                                }

                                            </td>

                                        )
                                    )}

                                </tr>

                            )
                        )}

                    </tbody>

                    {/* ========================= */}
                    {/* FOOTER */}
                    {/* ========================= */}

                    <tfoot>

                        <tr className="premium-footer-row">

                            <td colSpan={2}></td>

                            {categoryCodes.map(
                                (c: string) => (
                                    <td
                                        key={c}
                                        className="premium-cell"
                                    >

                                        <div className="premium-title">

                                            Category {c} Premiums

                                        </div>

                                        <div className="premium-amount">

                                            AED {

                                                formatAED(
                                                    premiumMap[c] || 0
                                                )
                                            }

                                        </div>

                                    </td>

                                )
                            )}

                        </tr>

                    </tfoot>

                </table>

            </div>

        </div>
    );
};