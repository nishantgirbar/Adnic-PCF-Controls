// UWProductDetails.tsx

import * as React from "react";

export const UWProductDetails = ({ categories }: any) => {

    // =========================
    // DYNAMIC CATEGORY LIST
    // =========================

    const categoryCodes: string[] =
        categories.map((c: any) =>
            c?.categoryCode || "-"
        );

    // =========================
    // BENEFIT TRANSFORMATION
    // =========================

    const benefitMap: any = {};

    categories.forEach((cat: any) => {

        const categoryCode =
            cat?.categoryCode || "-";

        cat?.benefits?.benefits?.forEach((b: any) => {

            const benefitName =
                b?.benefitName || "-";

            if (!benefitMap[benefitName]) {

                benefitMap[benefitName] = {};

            }

            benefitMap[benefitName][categoryCode] =
                b?.benefitValue || "-";

        });

    });

    return (

        <div className="section">

            {/* ========================= */}
            {/* HEADER */}
            {/* ========================= */}

            <h3 className="section-title">
                Product Details
            </h3>

            <div className="sub-title">
                Benefits and coverage details by category
            </div>

            {/* ========================= */}
            {/* GRID */}
            {/* ========================= */}

            <div className="table-container">

                <table className="table">

                    <thead>

                        <tr>

                            <th className="sticky-column">

                                Benefit

                            </th>

                            {/* ========================= */}
                            {/* DYNAMIC CATEGORIES */}
                            {/* ========================= */}

                            {categoryCodes.map(
                                (category: string) => (

                                    <th key={category}>

                                        {category}

                                    </th>

                                )
                            )}

                        </tr>

                    </thead>

                    <tbody>

                        {/* ========================= */}
                        {/* BENEFITS */}
                        {/* ========================= */}

                        {Object.keys(benefitMap).map(
                            (benefitName) => (

                                <tr key={benefitName}>

                                    <td className="benefit-name">

                                        {benefitName}

                                    </td>

                                    {/* ========================= */}
                                    {/* DYNAMIC CATEGORY VALUES */}
                                    {/* ========================= */}

                                    {categoryCodes.map(
                                        (category: string) => (

                                            <td key={category}>

                                                {

                                                    benefitMap[
                                                        benefitName
                                                    ][category]

                                                    || "-"

                                                }

                                            </td>

                                        )
                                    )}

                                </tr>

                            )
                        )}

                    </tbody>

                </table>

            </div>

        </div>

    );
};