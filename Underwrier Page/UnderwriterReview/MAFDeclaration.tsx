import * as React from "react";
import { roundToTwoDecimals } from "./numberUtils";

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

const getApiErrorMessage = (
    result: any,
    fallbackMessage: string
) => {
    const message = result?.message;

    if (typeof message !== "string" || !message.trim()) {
        return fallbackMessage;
    }

    // The rating API wraps its useful error in a JSON string inside `message`.
    const jsonStart = message.indexOf("{");
    const jsonEnd = message.lastIndexOf("}");

    if (jsonStart >= 0 && jsonEnd > jsonStart) {
        try {
            const nestedError = JSON.parse(
                message.slice(jsonStart, jsonEnd + 1)
            );

            if (
                typeof nestedError?.message === "string" &&
                nestedError.message.trim()
            ) {
                return nestedError.message;
            }
        } catch {
            // Fall back to the API's outer message when it is not valid JSON.
        }
    }

    return message;
};

export const MAFDeclaration = ({
    categories,
    quoteId,
    apiUrl,
    totalPremium,
    onPricingUpdate,
    disableLoading
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

        if (disableLoading) return;

        try {

            setOverallSaving(true);

            const enteredPercentage =
                roundToTwoDecimals(
                    overallInputRef.current?.value ??
                    overallValue
                );

            const maximumPercentage =
                overallLoadingType === "discount"
                    ? 50
                    : 999;

            if (
                !Number.isFinite(enteredPercentage) ||
                enteredPercentage <= 0 ||
                enteredPercentage > maximumPercentage
            ) {

                await showDialog(
                    "Invalid Percentage",
                    overallLoadingType === "discount"
                        ? "Discount percentage must be a positive number not greater than 50%."
                        : "Loading percentage must be above 0% and not greater than 999%."
                );

                return;
            }

            var percentage =
                enteredPercentage;
            
            if(overallLoadingType === "discount") {
                percentage = -Math.abs(percentage);
            }

            const resultingPolicyLoading =
                roundToTwoDecimals(
                    appliedPolicyLoading + percentage
                );

            if (overallLoadingType === "discount") {

                if (resultingPolicyLoading < -50) {

                    const remainingDiscount = roundToTwoDecimals(
                        Math.max(
                            0,
                            50 + appliedPolicyLoading
                        )
                    );

                    await showDialog(
                        "Invalid Discount",
                        `The total policy discount cannot exceed 50%. You can apply a maximum additional discount of ${remainingDiscount}%.`
                    );

                    return;
                }

                const currentPremium =
                    Number(totalPremium);

                const premiumAfterDiscount =
                    roundToTwoDecimals(
                        currentPremium *
                        (1 - enteredPercentage / 100)
                    );

                if (
                    !Number.isFinite(currentPremium) ||
                    currentPremium < 0 ||
                    !Number.isFinite(premiumAfterDiscount) ||
                    premiumAfterDiscount < 0
                ) {

                    await showDialog(
                        "Invalid Discount",
                        "This discount cannot be applied because it would make the total premium less than 0 or the current total premium is unavailable."
                    );

                    return;
                }
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
                payloadPercentage > maximumPercentage
            ) {

                await showDialog(
                    "Invalid Percentage",
                    overallLoadingType === "discount"
                        ? "Discount percentage must be a positive number not greater than 50%."
                        : "Loading percentage must be above 0% and not greater than 999%."
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
                    getApiErrorMessage(
                        result,
                        "Failed to apply policy loading"
                    )
                );
            }

            if (onPricingUpdate) {

                await onPricingUpdate(result);
            }

            // =====================================
            // UPDATE CURRENT STATUS
            // =====================================

            setAppliedPolicyLoading(
                resultingPolicyLoading
            );

            await showDialog(
                "Success",
                "Policy loading applied successfully"
            );

        } catch (error) {

            console.error(error);
            await showDialog(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to apply policy loading"
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

        if (disableLoading) return;

        try {

            setCategorySaving(
                (prev: any) => ({

                    ...prev,

                    [categoryCode]: true
                })
            );

            const percentage =
                roundToTwoDecimals(
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
                percentage > 999
            ) {

                await showDialog(
                    "Invalid Percentage",
                    "Loading percentage must be above 0% and not greater than 999%."
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
                payloadPercentage > 999
            ) {

                await showDialog(
                    "Invalid Percentage",
                    "Loading percentage must be above 0% and not greater than 999%."
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
                                step="0.01"
                                max={
                                    overallLoadingType === "discount"
                                        ? 50
                                        : 999
                                }
                                value={overallValue}
                                disabled={disableLoading}
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
                            disabled={overallSaving || disableLoading}
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
                                        step="0.01"
                                        max="999"
                                        value={
                                            categoryValues[
                                                categoryCode
                                            ] || ""
                                        }
                                        disabled={disableLoading}
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
                                        ] || disableLoading
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
