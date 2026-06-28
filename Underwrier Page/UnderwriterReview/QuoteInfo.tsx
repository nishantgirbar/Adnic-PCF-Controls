import * as React from "react";

export const QuoteInfo = ({
    data,
    pricingResponse
}: any) => {

    // =====================================
    // SUBMITTED DATE
    // =====================================

    const submittedDate =
        data?.submittedDate
            ? new Date(
                data.submittedDate
            )
                .toISOString()
                .split("T")[0]
            : "";

    // =====================================
    // TOTAL PREMIUM
    // =====================================

    const totalPremium =

        pricingResponse?.totalFinalPremium ??

        data?.currentTotalPremium ??

        data?.premiumSummary
            ?.grandTotal ??

        data?.totalPremium ??

        0;

    // =====================================
    // TOTAL LOADING
    // =====================================
        const totalLoading =

              Number(

                pricingResponse?.previousTotalPremium ??

                data?.previousTotalPremium ??

                0

            )==0?0:

           (Number(

                pricingResponse?.currentTotalPremium ??

                data?.currentTotalPremium ??

                0

            ) -  
             Number(

                pricingResponse?.previousTotalPremium ??

                data?.previousTotalPremium ??

                0

            ))
          ;

    // =====================================
    // PRIORITY
    // =====================================

    const priority =
        totalLoading > 0
            ? "High"
            : "Low";

    return (

        <div className="section">

            <div className="info-grid">

                {/* ================================= */}
                {/* TOTAL PREMIUM */}
                {/* ================================= */}

                <div className="info-card">

                    <div className="info-label">
                        Total Premium
                    </div>

                    <div className="premium-value">

                        AED {

                            Number(
                                totalPremium || 0
                            ).toLocaleString(
                                undefined,
                                {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                }
                            )
                        }

                    </div>

                </div>

                {/* ================================= */}
                {/* TOTAL LOADING */}
                {/* ================================= */}

                <div className="info-card">

                    <div className="info-label">
                        Total Loading
                    </div>

                    <div className="info-value">

                        AED {

                            Number(
                                totalLoading || 0
                            ).toLocaleString(
                                undefined,
                                {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                }
                            )
                        }

                    </div>

                </div>

                {/* ================================= */}
                {/* PRIORITY */}
                {/* ================================= */}

                <div className="info-card">

                    <div className="info-label">
                        Priority
                    </div>

                    <div
                        className={
                            priority === "High"
                                ? "priority-high"
                                : "priority-low"
                        }
                    >
                        {priority}
                    </div>

                </div>

                {/* ================================= */}
                {/* TOTAL MEMBERS */}
                {/* ================================= */}

                <div className="info-card">

                    <div className="info-label">
                        Total Members
                    </div>

                    <div className="info-value">

                        {
                            data?.totalMembers ||
                            0
                        }

                    </div>

                </div>

            </div>

        </div>
    );
};