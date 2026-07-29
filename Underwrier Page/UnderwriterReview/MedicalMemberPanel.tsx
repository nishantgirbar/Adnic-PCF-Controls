import * as React from "react";
import { roundToTwoDecimals } from "./numberUtils";
import { getApiErrorMessage } from "./apiErrorUtils";

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

export const MedicalMemberPanel = ({
    member,
    documents,
    savedLoading,
    onApplyLoading,
    quoteId,
    apiUrl,
    type,
    onPricingUpdate,
    disableLoading
}: any) => {

    // =====================================
    // PREMIUMS
    // =====================================

    const basePremium =
        Number(
            member?.premium?.basePremium || 0
        );

    const finalPremium =
        Number(
            member?.premium?.finalPremium || 0
        );

    const existingLoading =
        Number(
            member?.premium?.loadingAmount || 0
        );

    const memberKey =
        member?.id ??
        member?.memberId;

    const currentLoading =
        roundToTwoDecimals(
            savedLoading ?? existingLoading
        );

    // =====================================
    // STATES
    // =====================================

    const [inputValue, setInputValue] =
        React.useState<string>(
            String(currentLoading)
        );

    const [loadingAmount, setLoadingAmount] =
        React.useState<number>(
            currentLoading
        );

    const [isSaving, setIsSaving] =
        React.useState<boolean>(false);

    const inputRef =
        React.useRef<HTMLInputElement>(null);

    // =====================================
    // REFRESH
    // =====================================

    React.useEffect(() => {

        setInputValue(
            String(currentLoading)
        );

        setLoadingAmount(
            currentLoading
        );

    }, [
        memberKey,
        currentLoading
    ]);

    // =====================================
    // TOTAL PREMIUM
    // =====================================
    const totalPremium =
      loadingAmount==0 ? 0 :  finalPremium + loadingAmount;

    // =====================================
    // APPLY LOADING
    // =====================================

    const applyLoading = async () => {

        if (disableLoading) return;

        try {

            setIsSaving(true);

            const amount =
                roundToTwoDecimals(
                    inputRef.current?.value ??
                    inputValue
                );

            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {

                await showDialog(
                    "Invalid Loading",
                    "Member loading amount must be a positive number."
                );

                return;
            }

            const payload = {

                underwriterName: "System",

                underwriterId: 1,

                userId: 1,

                underwriterComments:

                    type === "OVERAGE"

                        ? "Overage flat loading for member"

                        : "Medical declaration loading for member",

                initiatedStage:
                    "UW_REFERAL_LOADING",

                loading: {

                    loadingLevel: "MEMBER",

                    memberLoadings: [

                        {

                            memberId: Number(
                                member?.id ||
                                member?.memberId
                            ),

                            loadingAmount:
                                amount
                        }

                    ]
                }
            };

            console.log(
                "APPLY LOADING PAYLOAD",
                payload
            );

            // =====================================
            // API CALL
            // =====================================

            const payloadAmount =
                payload.loading.memberLoadings[0]
                    .loadingAmount;

            if (
                !Number.isFinite(payloadAmount) ||
                payloadAmount <= 0
            ) {

                await showDialog(
                    "Invalid Loading",
                    "Member loading amount must be a positive number."
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
                "LOADING RESPONSE",
                result
            );

            // =====================================
            // UPDATE PRICING
            // =====================================

            if (!response.ok) {

                throw new Error(
                    getApiErrorMessage(
                        result,
                        "Failed to apply loading"
                    )
                );
            }

            if (onPricingUpdate) {

                await onPricingUpdate(result);
            }

            // =====================================
            // UPDATE UI
            // =====================================

            setLoadingAmount(amount);

            if (onApplyLoading) {

                onApplyLoading(amount);
            }

            await showDialog(
                "Success",
                 "Loading applied successfully"
            );


        } catch (error) {

            console.error(error);

            await showDialog(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to apply loading"
            );


        } finally {

            setIsSaving(false);
        }
    };

    const viewDocument = async (doc: any) => {

        const sourceUrl = doc?.blobUrl || doc?.url;

        if (!sourceUrl) {
            await showDialog("Error", "Document URL is not available");
            return;
        }

        // Open synchronously so the browser does not treat the tab as a popup
        // after the asynchronous download finishes.
        const previewWindow = window.open("", "_blank");

        try {
            const response = await fetch(sourceUrl);

            if (!response.ok) {
                throw new Error(`Unable to load document (${response.status})`);
            }

            const downloadedBlob = await response.blob();
            const fileName = String(
                doc?.originalFilename || doc?.fileName || ""
            ).toLowerCase();
            const mimeType =
                downloadedBlob.type ||
                (fileName.endsWith(".pdf") ? "application/pdf" : "");
            const previewBlob = mimeType && mimeType !== downloadedBlob.type
                ? new Blob([downloadedBlob], { type: mimeType })
                : downloadedBlob;
            const previewUrl = URL.createObjectURL(previewBlob);

            if (previewWindow) {
                previewWindow.location.href = previewUrl;
            } else {
                window.open(previewUrl, "_blank");
            }

            window.setTimeout(() => URL.revokeObjectURL(previewUrl), 60000);
        } catch (error) {
            previewWindow?.close();
            console.error("Failed to preview document", error);
            await showDialog("Error", "Unable to preview this document");
        }
    };

    const memberRemarks = (documents || [])
        .map((doc: any) => String(doc?.comment || "").trim())
        .find((comment: string) => comment.length > 0);

    return (

        <div className="medical-panel">

            {/* ================================= */}
            {/* HEADER */}
            {/* ================================= */}

            <div className="medical-header">

                <div>

                    <div className="member-title">

                        Member #{

                            member?.id ||

                            member?.serialNumber ||

                            member?.memberId ||

                            1
                        }

                    </div>

                    <div className="member-subtitle">

                        {
                            type === "OVERAGE"

                                ? "Over Age"

                                : "Medical Declared"
                        }

                    </div>

                </div>

                {/* PREMIUM */}

                <div className="premium-section">

                    <div className="premium-label">
                        Member Premium
                    </div>

                    <div className="premium-value">

                        AED {

                            finalPremium
                                .toLocaleString(
                                    undefined,
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    }
                                )
                        }

                    </div>

                </div>

                {/* TOTAL */}

                <div className="premium-load-section">

                    <div className="premium-load-label">
                        Loading Applied
                    </div>

                    <div className="premium-load-value">

                        AED {

                            loadingAmount
                                .toLocaleString(
                                    undefined,
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    }
                                )
                        }

                    </div>

                </div>

            </div>

            {/* ================================= */}
            {/* LOADING SECTION */}
            {/* ================================= */}

            <div className="loading-section">

                <label>
                    Loading AED
                </label>

                <div className="loading-row">

                    <input
                        ref={inputRef}
                        type="number"
                        min="0"
                        step="0.01"
                        className="loading-input"
                        placeholder="100"
                        value={inputValue}
                        disabled={disableLoading}
                        onChange={(e) =>
                            setInputValue(
                                e.target.value
                            )
                        }
                    />

                    <button
                        className="apply-btn"
                        onClick={applyLoading}
                        disabled={isSaving || disableLoading}
                    >

                        {
                            isSaving
                                ? "Applying..."
                                : "Apply"
                        }

                    </button>

                </div>

            </div>

            {/* ================================= */}
            {/* DOCUMENTS */}
            {/* ================================= */}

            <div className="document-section">
              
                <div className="document-title">
                    Documents
                </div>

                {
                    (documents || []).length === 0 && (

                        <div className="no-document">
                            No documents available
                        </div>

                    )
                }

                {memberRemarks && (
                    <div className="document-remarks">
                        Remarks : {memberRemarks}
                    </div>
                )}

                {(documents || []).map(
                    (
                        doc: any,
                        i: number
                    ) => (

                        <div
                            className="document-card"
                            key={doc?.id || doc?.documentId || i}
                        >
                            <div className="document-left">

                                <div className="pdf-icon">
                                    PDF
                                </div>

                                <div>

                                    <div className="doc-name">

                                        {
                                            doc?.originalFilename ||

                                            doc?.fileName ||

                                            "Document"
                                        }

                                    </div>

                                    <div className="doc-date">

                                        Uploaded on {

                                            doc?.createdAt

                                                ? new Date(
                                                    doc.createdAt
                                                ).toLocaleDateString()

                                                : "-"
                                        }

                                    </div>

                                </div>

                            </div>

                            <button
                                className="view-btn"
                                onClick={() => viewDocument(doc)}
                            >
                                View
                            </button>

                        </div>

                    )
                )}

            </div>

        </div>
    );
};
