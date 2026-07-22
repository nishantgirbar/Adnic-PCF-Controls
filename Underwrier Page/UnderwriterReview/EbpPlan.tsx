import * as React from "react";

const normalizeCategory = (value: any): string =>
    String(
        value?.code ??
        value?.name ??
        value?.displayName ??
        value ??
        ""
    )
        .trim()
        .toUpperCase()
        .replace(/^CAT-/, "");

const isEbpCategory = (value: any): boolean =>
    ["EBP", "EPB", "LSB"].indexOf(
        normalizeCategory(value)
    ) > -1;

const EBP_BENEFITS = [
    ["Consultation", "20% Coinsurance"],
    ["Copay on Lab/Diagnostic", "20% Copay for All OP Services"],
    ["Pharmacy Co-pay", "30% Copay for Medication"],
    ["Pharmacy Limit", "Maximum AED 2,500"],
    ["Co-Pay on all IP Services", "20% Copay for IP Services"]
];

export const EbpPlan = ({
    categories,
    members,
    categoryPremiums,
    pricingResponse
}: any) => {
    const premiums = Array.isArray(
        pricingResponse?.categoryPremiums
    )
        ? pricingResponse.categoryPremiums
        : Array.isArray(categoryPremiums)
            ? categoryPremiums
            : [];

    const ebpMembers = (members || []).filter(
        (member: any) =>
            isEbpCategory(member?.category) ||
            normalizeCategory(member?.salaryType) === "LSB" ||
            normalizeCategory(member?.visaLocation) === "LSB"
    );

    const ebpPremium = premiums.find(
        (premium: any) =>
            isEbpCategory(premium?.categoryName)
    );

    const hasEbpPlan =
        (categories || []).some((category: any) =>
            isEbpCategory(
                category?.categoryCode ??
                category?.categoryName ??
                category?.category
            )
        ) ||
        Boolean(ebpPremium) ||
        ebpMembers.length > 0;

    if (!hasEbpPlan) {
        return null;
    }

    const totalPremium = Number(
        ebpPremium?.currentPremium || 0
    );

    return (
        <div className="section ebp-plan-section">
            <h3 className="section-title">
                EBP Plan
            </h3>

            <div className="plan-type-section">
                Plan Type: EBP
            </div>

            <div className="table-container">
                <table className="table ebp-plan-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Details</th>
                            <th>Benefits</th>
                        </tr>
                    </thead>

                    <tbody>
                        <tr>
                            <td>1</td>
                            <td>Plan Type</td>
                            <td>Basic EBP Plan</td>
                        </tr>

                        <tr>
                            <td>2</td>
                            <td>Network Provider</td>
                            <td>ECare</td>
                        </tr>

                        {EBP_BENEFITS.map((benefit) => (
                            <tr key={benefit[0]}>
                                <td></td>
                                <td>{benefit[0]}</td>
                                <td>{benefit[1]}</td>
                            </tr>
                        ))}
                    </tbody>

                    <tfoot>
                        <tr>
                            <td colSpan={2}></td>
                            <td className="ebp-plan-totals">
                                <div>
                                    Total Members: {ebpMembers.length}
                                </div>
                                <div>
                                    Total Premium: AED {
                                        totalPremium.toLocaleString(
                                            undefined,
                                            {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            }
                                        )
                                    }
                                </div>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};
