import * as React from "react";

const showDialog = async (
    title: string,
    message: string
) => {

    if ((window as any)?.Xrm?.Navigation) {

        await (window as any)
            .Xrm
            .Navigation
            .openAlertDialog({
                title,
                text: message
            });

        return;
    }

    alert(message);
};

export const MAFDeclaration = ({
    categories,
    quoteId,
    apiUrl,
    onPricingUpdate
}: any) => {

    // =====================================
    // ACTIVE TAB
    // =====================================

    const [activeTab, setActiveTab] =
        React.useState("overall");

    // =====================================
    // OVERALL STATES
    // =====================================

    const [
        overallLoadingType,
        setOverallLoadingType
    ] = React.useState("loading");

    const [
        overallValue,
        setOverallValue
    ] = React.useState("0");

    const [
        overallSaving,
        setOverallSaving
    ] = React.useState(false);

    const overallInputRef =
        React.useRef<HTMLInputElement>(null);

    // =====================================
    // APPLIED OVERALL VALUE
    // =====================================

    const [
        appliedPolicyLoading,
        setAppliedPolicyLoading
    ] = React.useState<number>(0);

    // =====================================
    // CATEGORY STATES
    // =====================================

    const [
        categoryValues,
        setCategoryValues
    ] = React.useState<any>({});

    const [
        categorySaving,
        setCategorySaving
    ] = React.useState<any>({});

    const categoryInputRefs =
        React.useRef<Record<
            string,
            HTMLInputElement | null
        >>({});

    // =====================================
    // APPLIED CATEGORY VALUES
    // =====================================

    const [
        appliedCategoryLoading,
        setAppliedCategoryLoading
    ] = React.useState<any>({});

    if (!categories?.length) {
        return null;
    }

    // =====================================
    // APPLY POLICY LOADING
    // =====================================

    const applyOverallLoading = async () => {

        try {

            setOverallSaving(true);

            const enteredPercentage =
                Number(
                    overallInputRef.current?.value ??
                    overallValue
                );

            if (
                !Number.isFinite(enteredPercentage) ||
                enteredPercentage <= 0 ||
                enteredPercentage >= 100
            ) {

                await showDialog(
                    "Invalid Percentage",
                    "Loading percentage must be above 0% and below 100%."
                );

                return;
            }

            var percentage =
                enteredPercentage;
            
            if(overallLoadingType === "discount") {
                percentage = -Math.abs(percentage);
            }

            const payload = {

                underwriterName: "System",

                underwriterId: 1,

                userId: 1,

                underwriterComments:

                    `${percentage}% policy loading — high risk industry`,

                initiatedStage:
                    "UW_REFERAL_LOADING",

                loading: {

                    loadingLevel: "POLICY",

                    policyLoadingPercentage:
                        percentage
                }
            };

            console.log(
                "POLICY LOADING PAYLOAD",
                payload
            );

            // =====================================
            // API CALL
            // =====================================

            const payloadPercentage =
                Math.abs(
                    payload.loading
                        .policyLoadingPercentage
                );

            if (
                !Number.isFinite(payloadPercentage) ||
                payloadPercentage <= 0 ||
                payloadPercentage >= 100
            ) {

                await showDialog(
                    "Invalid Percentage",
                    "Loading percentage must be above 0% and below 100%."
                );

                return;
            }

            const response = await fetch(

                `${apiUrl}/${quoteId}/apply-loading`,

                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify(
                        payload
                    )
                }
            );

            const result =
                await response.json();

            console.log(
                "POLICY LOADING RESPONSE",
                result
            );

            // =====================================
            // UPDATE COVERAGE PREMIUMS
            // =====================================

            if (!response.ok) {

                throw new Error(
                    "Failed to apply policy loading"
                );
            }

            if (onPricingUpdate) {

                await onPricingUpdate(result);
            }

            // =====================================
            // UPDATE CURRENT STATUS
            // =====================================

            setAppliedPolicyLoading(
                percentage
            );

            await showDialog(
                "Success",
                "Policy loading applied successfully"
            );

        } catch (error) {

            console.error(error);
            await showDialog(
                "Error",
                 "Failed to apply policy loading"
            );

        } finally {

            setOverallSaving(false);
        }
    };

    // =====================================
    // APPLY CATEGORY LOADING
    // =====================================

    const applyCategoryLoading = async (
        categoryCode: string
    ) => {

        try {

            setCategorySaving(
                (prev: any) => ({

                    ...prev,

                    [categoryCode]: true
                })
            );

            const percentage =
                Number(
                    categoryInputRefs.current[
                        categoryCode
                    ]?.value ??
                    categoryValues[
                        categoryCode
                    ] ??
                    0
                );

            if (
                !Number.isFinite(percentage) ||
                percentage <= 0 ||
                percentage >= 100
            ) {

                await showDialog(
                    "Invalid Percentage",
                    "Loading percentage must be above 0% and below 100%."
                );

                return;
            }

            const payload = {

                underwriterName: "System",

                underwriterId: 1,

                userId: 1,

                underwriterComments:

                    `${percentage}% loading on CAT-${categoryCode}`,

                initiatedStage:
                    "UW_REFERAL_LOADING",

                loading: {

                    loadingLevel: "CATEGORY",

                    categoryLoadings: [

                        {

                            categoryName:
                                `CAT-${categoryCode}`,

                            loadingPercentage:
                                percentage
                        }

                    ]
                }
            };

            console.log(
                "CATEGORY LOADING PAYLOAD",
                payload
            );

            // =====================================
            // API CALL
            // =====================================

            const payloadPercentage =
                payload.loading.categoryLoadings[0]
                    .loadingPercentage;

            if (
                !Number.isFinite(payloadPercentage) ||
                payloadPercentage <= 0 ||
                payloadPercentage >= 100
            ) {

                await showDialog(
                    "Invalid Percentage",
                    "Loading percentage must be above 0% and below 100%."
                );

                return;
            }

            const response = await fetch(

                `${apiUrl}/${quoteId}/apply-loading`,

                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify(
                        payload
                    )
                }
            );

            const result =
                await response.json();

            console.log(
                "CATEGORY LOADING RESPONSE",
                result
            );

            // =====================================
            // UPDATE COVERAGE PREMIUMS
            // =====================================

            if (!response.ok) {

                throw new Error(
                    "Failed to apply category loading"
                );
            }

            if (onPricingUpdate) {

                await onPricingUpdate(result);
            }

            // =====================================
            // UPDATE CURRENT STATUS
            // =====================================

            setAppliedCategoryLoading(
                (prev: any) => ({

                    ...prev,

                    [categoryCode]: percentage
                })
            );
            await showDialog(
                "Success",
                `CAT-${categoryCode} loading applied successfully`
            );

        } catch (error) {

            console.error(error);
            await showDialog(
                "Error",
                 "Failed to apply policy loading"
            );

        } finally {

            setCategorySaving(
                (prev: any) => ({

                    ...prev,

                    [categoryCode]: false
                })
            );
        }
    };

    return (

        <div className="section maf-section">

            {/* ========================= */}
            {/* HEADER */}
            {/* ========================= */}

            <div className="maf-header">

                <div>

                    <div className="maf-title">
                        MAF Declaration
                    </div>

                    <div className="maf-subtitle">

                        Medical condition declarations
                        requiring review

                    </div>

                </div>

                <div className="maf-tabs">

                    <button
                        className={
                            activeTab === "overall"
                                ? "maf-tab active"
                                : "maf-tab"
                        }
                        onClick={() =>
                            setActiveTab("overall")
                        }
                    >
                        Overall Loading
                    </button>

                    <button
                        className={
                            activeTab === "category"
                                ? "maf-tab active"
                                : "maf-tab"
                        }
                        onClick={() =>
                            setActiveTab("category")
                        }
                    >
                        Category Wise Loading
                    </button>

                </div>

            </div>

            {/* ========================= */}
            {/* OVERALL LOADING */}
            {/* ========================= */}

            {activeTab === "overall" && (

                <div className="overall-container">

                    <div className="loading-card">

                        <div className="loading-card-title">
                            Policy Loading
                        </div>

                        <div className="current-status">
                            Current Status
                        </div>

                        <div className="current-value">

                            {
                                appliedPolicyLoading
                                    ? `${appliedPolicyLoading}%`
                                    : "0%"
                            }

                        </div>

                        <div className="loading-label">
                            Loading Type
                        </div>

                        <div className="toggle-container">

                            <div
                                className={
                                    overallLoadingType === "discount"
                                        ? "toggle-item active-toggle"
                                        : "toggle-item"
                                }
                                onClick={() =>
                                    setOverallLoadingType(
                                        "discount"
                                    )
                                }
                            >
                                Discount
                            </div>

                            <div
                                className={
                                    overallLoadingType === "loading"
                                        ? "toggle-item active-toggle"
                                        : "toggle-item"
                                }
                                onClick={() =>
                                    setOverallLoadingType(
                                        "loading"
                                    )
                                }
                            >
                                Loading
                            </div>

                        </div>

                        <div className="loading-input-row">

                            <input
                                ref={overallInputRef}
                                type="number"
                                min="0"
                                max="100"
                                value={overallValue}
                                onChange={(e) =>
                                    setOverallValue(
                                        e.target.value
                                    )
                                }
                                className="loading-input"
                            />

                            <div className="currency-box">
                                %
                            </div>

                        </div>

                        <button
                            className="apply-load-btn"
                            onClick={
                                applyOverallLoading
                            }
                            disabled={overallSaving}
                        >

                            {
                                overallSaving
                                    ? "Applying..."
                                    : "Apply Load"
                            }

                        </button>

                        <div className="loading-note">

                            Policy loading percentage
                            reflects the premium
                            adjustment based on
                            underwriting assessment.

                        </div>

                    </div>

                </div>

            )}

            {/* ========================= */}
            {/* CATEGORY WISE LOADING */}
            {/* ========================= */}

            {activeTab === "category" && (

                <div className="category-grid">

                    {categories.map((cat: any) => {

                        const categoryCode =
                            cat?.categoryCode || "-";

                        return (

                            <div
                                key={categoryCode}
                                className="loading-card"
                            >

                                <div className="loading-card-title">

                                    Category CAT-{
                                        categoryCode
                                    } Loading

                                </div>

                                <div className="current-status">
                                    Current Status
                                </div>

                                <div className="current-value">

                                    {
                                        appliedCategoryLoading[
                                            categoryCode
                                        ]

                                            ? `${appliedCategoryLoading[
                                                categoryCode
                                            ]}%`

                                            : "0%"
                                    }

                                </div>

                                <div className="loading-label">
                                    Loading
                                </div>

                                <div className="loading-input-row">

                                    <input
                                        ref={(element) => {
                                            categoryInputRefs
                                                .current[
                                                    categoryCode
                                                ] = element;
                                        }}
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={
                                            categoryValues[
                                                categoryCode
                                            ] || ""
                                        }
                                        onChange={(e) =>

                                            setCategoryValues(
                                                (
                                                    prev: any
                                                ) => ({

                                                    ...prev,

                                                    [categoryCode]:
                                                        e.target.value

                                                })
                                            )
                                        }
                                        className="loading-input"
                                    />

                                    <div className="currency-box">
                                        %
                                    </div>

                                </div>

                                <button
                                    className="apply-load-btn"
                                    onClick={() =>
                                        applyCategoryLoading(
                                            categoryCode
                                        )
                                    }
                                    disabled={
                                        categorySaving[
                                            categoryCode
                                        ]
                                    }
                                >

                                    {
                                        categorySaving[
                                            categoryCode
                                        ]

                                            ? "Applying..."

                                            : "Apply Load"
                                    }

                                </button>

                                <div className="loading-note">

                                    Category loading percentage
                                    reflects premium adjustment
                                    for selected member category.

                                </div>

                            </div>

                        );

                    })}

                </div>

            )}

        </div>
    );
};
