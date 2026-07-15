import * as React from "react";

import { fetchQuoteData } from "./apiService";
import { fetchMemberDocuments } from "./documentApiService";

import { QuoteInfo } from "./QuoteInfo";
import { MembersGrid } from "./MembersGrid";
import { MedicalMembers } from "./MedicalMembers";
import { MedicalMemberPanel } from "./MedicalMemberPanel";
import { CoverageTable } from "./CoverageTable";
import { EbpPlan } from "./EbpPlan";
import { MAFDeclaration } from "./MAFDeclaration";

const getMemberKey = (member: any): string =>
    String(
        member?.id ??
        member?.memberId ??
        ""
    );

export const MainContainer = ({
    quoteId,
    apiUrl,
    documentApiUrl,
    quoteNumber,
    onPremiumUpdated
}: any) => {

    // =====================================
    // STATES
    // =====================================

    const [data, setData] =
        React.useState<any>(null);

    const [
        pricingResponse,
        setPricingResponse
    ] = React.useState<any>(null);

    const [documents, setDocuments] =
        React.useState<any[]>([]);

    const [loading, setLoading] =
        React.useState<boolean>(true);

    const [error, setError] =
        React.useState<string | null>(null);

    // =====================================
    // SELECTED MEMBERS
    // =====================================

    const [
        selectedMedicalMember,
        setSelectedMedicalMember
    ] = React.useState<any>(null);

    const [
        selectedOverAgeMember,
        setSelectedOverAgeMember
    ] = React.useState<any>(null);

    // =====================================
    // LOADING MAPS
    // =====================================

    const [
        medicalLoadingMap,
        setMedicalLoadingMap
    ] = React.useState<any>({});

    const [
        overAgeLoadingMap,
        setOverAgeLoadingMap
    ] = React.useState<any>({});

    const handlePricingUpdate = async (
        pricing: any
    ) => {

        setPricingResponse(pricing);

        if (onPremiumUpdated) {

            await onPremiumUpdated(pricing);
        }
    };

    // =====================================
    // LOAD DATA
    // =====================================

    React.useEffect(() => {

        if (!quoteId) return;

        setLoading(true);

        Promise.all([

            fetchQuoteData(
                apiUrl,
                quoteId,    
                quoteNumber
            ),

            fetchMemberDocuments(
                documentApiUrl,
                quoteId
            )

        ])
            .then(([quoteRes, documentRes]) => {

                // =====================================
                // SET DATA
                // =====================================

                setData(quoteRes);

                setDocuments(
                    documentRes || []
                );

                setLoading(false);

            })
            .catch((err) => {

                console.error(err);

                setError(
                    "Failed to load data"
                );

                setLoading(false);

            });

    }, [
        quoteId,
        apiUrl,
        documentApiUrl
    ]);

    // =====================================
    // LOADING
    // =====================================

    if (loading) {

        return (

            <div className="api-loader-container">

                <div className="api-loader-card">

                    <div className="loader-spinner"></div>

                    <div className="loader-title">
                        Loading Quote Details
                    </div>

                    <div className="loader-subtitle">

                        Please wait while
                        SME quote data is being processed...

                    </div>

                </div>

            </div>

        );
    }

    // =====================================
    // ERROR
    // =====================================

    if (error) {

        return (
            <div className="section">
                {error}
            </div>
        );
    }

    // =====================================
    // NO DATA
    // =====================================

    if (!data) {

        return (
            <div className="section">
                No Data
            </div>
        );
    }

    // =====================================
    // DATA
    // =====================================

    const members =
        data?.members || [];

   
    const rawCategories =
        data?.productSelectionResponse?.categories;

    const categoryList = Array.isArray(rawCategories)
        ? rawCategories
        : Array.isArray(rawCategories?.categories)
            ? rawCategories.categories
            : [];

    const categoryPremiums = Array.isArray(
        data?.categoryPremiums
    )
        ? data.categoryPremiums
        : [];

    const categories =
        categoryList.map((category: any) => {

        const premiumInfo =
            categoryPremiums.find(
                (p:any) => p.categoryName === `CAT-${category.categoryCode}`
            );

            return {
            ...category,
            premium: premiumInfo?.currentPremium || 0
            };
    });

    const currentTotalPremium = Number(
        pricingResponse?.totalFinalPremium ??
        pricingResponse?.currentTotalPremium ??
        data?.currentTotalPremium ??
        data?.premiumSummary?.grandTotal ??
        data?.totalPremium
    );

    // =====================================
    // FILTERED MEMBERS
    // =====================================

    const medicalDeclaredMembers = members.filter(
        (m: any) =>
            m?.medicalDeclared === true
    );

    const overAgeMembers = members.filter(
        (m: any) =>
            m?.overaged === true
    );

    // =====================================
    // DOCUMENT FILTERING
    // =====================================

    const medicalDocuments = documents.filter(
        (doc: any) =>
            Number(doc?.entityNumber) ===
            Number(
                getMemberKey(
                    selectedMedicalMember
                )
            )
    );

    const overAgeDocuments = documents.filter(
        (doc: any) =>
            Number(doc?.entityNumber) ===
            Number(
                getMemberKey(
                    selectedOverAgeMember
                )
            )
    );

    return (

        <div className="main-container">

            {/* ================================= */}
            {/* QUOTE INFO */}
            {/* ================================= */}

            <QuoteInfo
                data={data}
                pricingResponse={pricingResponse}
            />

            {/* ================================= */}
            {/* MEMBERS GRID */}
            {/* ================================= */}

            <MembersGrid
                members={members}
            />

            {/* ================================= */}
            {/* MEDICAL DECLARED MEMBERS */}
            {/* ================================= */}

            {
                medicalDeclaredMembers?.length > 0 && (

                    <div className="medical-layout">

                        {/* LEFT */}

                        <div className="medical-left">

                            <MedicalMembers

                                title="Medical Declared Members"

                                subTitle="Members requiring medical declaration review"

                                data={medicalDeclaredMembers}

                                onSelect={(
                                    member: any
                                ) => {

                                    setSelectedMedicalMember(
                                        member
                                    );
                                }}

                            />

                        </div>

                        {/* RIGHT */}

                        <div className="medical-right">

                            {
                                selectedMedicalMember && (

                                    <MedicalMemberPanel

                                        key={`medical-${getMemberKey(
                                            selectedMedicalMember
                                        )}`}

                                        member={
                                            selectedMedicalMember
                                        }

                                        documents={
                                            medicalDocuments
                                        }

                                        quoteId={
                                            quoteId
                                        }

                                        apiUrl={
                                            apiUrl
                                        }

                                        savedLoading={
                                            medicalLoadingMap[
                                                getMemberKey(
                                                    selectedMedicalMember
                                                )
                                            ]
                                        }

                                        onApplyLoading={(
                                            amount: number
                                        ) => {

                                            setMedicalLoadingMap(
                                                (
                                                    prev: any
                                                ) => ({

                                                    ...prev,

                                                    [
                                                        getMemberKey(
                                                            selectedMedicalMember
                                                        )
                                                    ]: amount

                                                })
                                            );
                                        }}

                                        type="MEDICAL"

                                        onPricingUpdate={(
                                            pricing: any
                                        ) => {

                                            return handlePricingUpdate(
                                                pricing
                                            );
                                        }}

                                    />

                                )
                            }

                        </div>

                    </div>

                )
            }

            {/* ================================= */}
            {/* PRODUCT DETAILS */}
            {/* ================================= */}

            <CoverageTable
                categories={categories}
                quoteInfo={data}
                pricingResponse={pricingResponse}
            />

            <EbpPlan
                categories={categories}
                members={members}
                categoryPremiums={categoryPremiums}
                pricingResponse={pricingResponse}
            />

            {/* ================================= */}
            {/* OVER AGE MEMBERS */}
            {/* ================================= */}

            {
                overAgeMembers?.length > 0 && (

                    <div className="medical-layout">

                        {/* LEFT */}

                        <div className="medical-left">

                            <MedicalMembers

                                title="Over Age Members"

                                subTitle="Members requiring over age review"

                                data={overAgeMembers}

                                onSelect={(
                                    member: any
                                ) => {

                                    setSelectedOverAgeMember(
                                        member
                                    );
                                }}

                            />

                        </div>

                        {/* RIGHT */}

                        <div className="medical-right">

                            {
                                selectedOverAgeMember && (

                                    <MedicalMemberPanel

                                        key={`overage-${getMemberKey(
                                            selectedOverAgeMember
                                        )}`}

                                        member={
                                            selectedOverAgeMember
                                        }

                                        documents={
                                            overAgeDocuments
                                        }

                                        quoteId={
                                            quoteId
                                        }

                                        apiUrl={
                                            apiUrl
                                        }

                                        savedLoading={
                                            overAgeLoadingMap[
                                                getMemberKey(
                                                    selectedOverAgeMember
                                                )
                                            ]
                                        }

                                        onApplyLoading={(
                                            amount: number
                                        ) => {

                                            setOverAgeLoadingMap(
                                                (
                                                    prev: any
                                                ) => ({

                                                    ...prev,

                                                    [
                                                        getMemberKey(
                                                            selectedOverAgeMember
                                                        )
                                                    ]: amount

                                                })
                                            );
                                        }}

                                        type="OVERAGE"

                                        onPricingUpdate={(
                                            pricing: any
                                        ) => {

                                            return handlePricingUpdate(
                                                pricing
                                            );
                                        }}

                                    />

                                )
                            }

                        </div>

                    </div>

                )
            }

            {/* ================================= */}
            {/* MAF DECLARATION */}
            {/* ================================= */}

            <MAFDeclaration
                categories={categories}
                quoteId={quoteId}
                apiUrl={apiUrl}
                totalPremium={currentTotalPremium}

                onPricingUpdate={(
                    pricing: any
                ) => {

                    return handlePricingUpdate(
                        pricing
                    );
                }}
            />

        </div>

    );
};
