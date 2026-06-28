import * as React from "react";

import { UploadSection } from "./UploadSection";
import { SummaryCards } from "./SummaryCards";
import { WarningBanner } from "./WarningBanner";
import { MatchedMembersGrid } from "./MatchedMembersGrid";
import { MismatchedMembersGrid } from "./MismatchedMembersGrid";
import { MemberEditDialog } from "./MemberEditDialog";

import { CensusApiService } from "../services/CensusApiService";

import {
    ICensusSummary
} from "../models/ICensusResponse";

import {
    ICensusMember,
    IMismatchedMember
} from "../models/ICensusMember";

import "../css/CensusUploadControl.css";

interface ICensusUploadControlProps {

    context: ComponentFramework.Context<any>;

    apiBaseUrl: string;

    onMembersValidated: (
        members: ICensusMember[]
    ) => void;
}

export const CensusUploadControl:
React.FC<ICensusUploadControlProps> = ({
    context,
    apiBaseUrl,
    onMembersValidated
}) => {

    const policyId =
        context.parameters.policyId?.raw || "";

    const censusApi =
        React.useMemo(
            () =>
                new CensusApiService(
                    apiBaseUrl
                ),
            [apiBaseUrl]
        );

    const [loading, setLoading] =
        React.useState(false);

    const [activeTab, setActiveTab] =
        React.useState<
            "matched" | "mismatched"
        >("mismatched");

    const [matchedMembers,
        setMatchedMembers] =
        React.useState<
            ICensusMember[]
        >([]);

    const [mismatchedMembers,
        setMismatchedMembers] =
        React.useState<
            IMismatchedMember[]
        >([]);

    const [warnings,
        setWarnings] =
        React.useState<string[]>([]);

    const [summary,
        setSummary] =
        React.useState<
            ICensusSummary | null
        >(null);

    const [selectedMember,
        setSelectedMember] =
        React.useState<
            IMismatchedMember | null
        >(null);

    const [showEditDialog,
        setShowEditDialog] =
        React.useState(false);

    const [uploadedFileName,
        setUploadedFileName] =
        React.useState("");

    const handleUpload =
        async (
            file: File
        ) => {

            try {

                setUploadedFileName(
                    file.name
                );

                setLoading(true);

                const result =
                    await censusApi.uploadCensus(
                        file,
                        policyId
                    );

               const normalizedMatched =
                    (result.matchedMembers || [])
                        .map((m: any) => ({

                            ...m,

                            memberCategory:
                                m.memberCategory ||
                                m.category ||
                                "",

                            medicalDeclaration:
                                m.medicalDeclaration ??
                                (
                                    m.requiresMedicalUnderwriting
                                        ? "Yes"
                                        : "No"
                                )
                        }));

                setMatchedMembers(
                    normalizedMatched
                );

               const normalizedMismatched =
                    (result.mismatchedMembers || [])
                        .map((row: any) => ({

                            ...row,

                            member: {

                                ...row.member,

                                memberCategory:
                                    row.member.memberCategory ||
                                    row.member.category ||
                                    "",

                                medicalDeclaration:
                                    row.member.medicalDeclaration ??
                                    (
                                        row.member
                                            .requiresMedicalUnderwriting
                                            ? "Yes"
                                            : "No"
                                    )
                            }
                        }));

                setMismatchedMembers(
                    normalizedMismatched
                );

                setWarnings(
                    result.warnings || []
                );

                setSummary(
                    result.summary
                );

            } catch (error) {

                alert(
                    "Unable to upload census file."
                );

            } finally {

                setLoading(false);
            }
        };

    const handleCategoryChange =
        (
            rowNumber: number,
            value: string
        ) => {

            setMismatchedMembers(
                previous =>
                    previous.map(
                        row =>
                            row.member.rowNumber === rowNumber
                                ? {
                                      ...row,
                                      member: {
                                          ...row.member,
                                          memberCategory: value
                                      }
                                  }
                                : row
                    )
            );
        };

        const handleDeleteMember =
        (
            rowNumber: number
        ) => {

            setMatchedMembers(
                prev =>
                    prev.filter(
                        member =>
                            member.rowNumber !==
                            rowNumber
                    )
            );

            setMismatchedMembers(
                prev =>
                    prev.filter(
                        member =>
                            member.member.rowNumber !==
                            rowNumber
                    )
            );
        };

    const handleMedicalDeclarationChange =
        (
            rowNumber: number,
            value: string
        ) => {

            setMismatchedMembers(
                previous =>
                    previous.map(
                        row =>
                            row.member.rowNumber === rowNumber
                                ? {
                                      ...row,
                                      member: {
                                          ...row.member,
                                          medicalDeclaration: value
                                      }
                                  }
                                : row
                    )
            );
        };

    const handleValidate =
        async () => {

            try {

                setLoading(true);

                const payload =
                    mismatchedMembers.map(
                        x => ({

                            ...x.member,

                            category:
                                x.member.memberCategory,

                            medicalDeclared:
                                x.member.medicalDeclaration === "Yes"
                        })
                    );

                const response =
                    await censusApi.validateMembers(
                        policyId,
                        payload
                    );

                setMatchedMembers(
                    response.members || []
                );

                setMismatchedMembers([]);

                setActiveTab(
                    "matched"
                );

               const validatedMembers =
                    response.members || [];

                await saveValidatedMembersToDataverse(
                    validatedMembers
                );

                onMembersValidated(
                    validatedMembers
                );

            } catch {

                alert(
                    "Validation failed."
                );

            } finally {

                setLoading(false);
            }
        };

    const handleEditMember =
        (
            member:
                IMismatchedMember
        ) => {

            setSelectedMember(
                member
            );

            setShowEditDialog(
                true
            );
        };

    const handleMatchedCategoryChange = (
    rowNumber: number,
    value: string
) => {

    setMatchedMembers(
        previous =>
            previous.map(
                member =>
                    member.rowNumber === rowNumber
                        ? {
                              ...member,
                              memberCategory: value
                          }
                        : member
            )
    );
};

const handleMatchedMedicalDeclarationChange = (
    rowNumber: number,
    value: string
) => {

    setMatchedMembers(
        previous =>
            previous.map(
                member =>
                    member.rowNumber === rowNumber
                        ? {
                              ...member,
                              medicalDeclaration: value
                          }
                        : member
            )
    );
};

const saveValidatedMembersToDataverse =
async (
    members: ICensusMember[]
) => {

    try {

        const formContext =
            (context as any).mode?.contextInfo;

        const recordId =
            (context as any).page.entityId;

        const entityName =
            (context as any).page.entityTypeName;

          console.log(
            "census data save 1", entityName);

             console.log(
            "census data save 2", recordId );
            
             console.log(
            "census data save 3", JSON.stringify(members)     );

        await (context as any).webAPI.updateRecord(
            entityName,
            recordId,
            {
                adnic_censusuploadedmembers:
                    JSON.stringify(
                        members
                    )
            }
        );

    } catch (error) {

        console.error(
            "Unable to save census members",
            error
        );
    }
};

    return (

        <div className="census-container">

            <UploadSection
                loading={loading}
                onUpload={
                    handleUpload
                }
                onDownloadTemplate={
                    async () =>
                        censusApi.downloadTemplate()
                }
            />

            {
                uploadedFileName &&
                <div
                    style={{
                        marginTop: "10px",
                        marginBottom: "10px",
                        fontWeight: 600
                    }}
                >
                    Uploaded File:
                    {" "}
                    {uploadedFileName}
                </div>
            }

            <WarningBanner
                warnings={warnings}
            />

            <div className="tab-container">

                <button
                    className={
                        activeTab === "matched"
                            ? "tab-button active"
                            : "tab-button"
                    }
                    onClick={() =>
                        setActiveTab(
                            "matched"
                        )
                    }
                >
                    Matched (
                    {
                        matchedMembers.length
                    }
                    )
                </button>

                <button
                    className={
                        activeTab === "mismatched"
                            ? "tab-button active"
                            : "tab-button"
                    }
                    onClick={() =>
                        setActiveTab(
                            "mismatched"
                        )
                    }
                >
                    Mismatched (
                    {
                        mismatchedMembers.length
                    }
                    )
                </button>

            </div>

            {
                activeTab === "matched" &&

               <MatchedMembersGrid
                    members={matchedMembers}
                    onCategoryChange={
                        handleMatchedCategoryChange
                    }
                    onMedicalDeclarationChange={
                        handleMatchedMedicalDeclarationChange
                    }
                     onDelete={
                        handleDeleteMember
                    }
                />
                
            }

            {
                activeTab === "mismatched" &&

                <div>

                    <MismatchedMembersGrid
                        members={mismatchedMembers}
                        onEdit={handleEditMember}
                        onCategoryChange={handleCategoryChange}
                        onMedicalDeclarationChange={handleMedicalDeclarationChange}
                        onDelete={handleDeleteMember}
                    />

                </div>
            }

            <MemberEditDialog
                isOpen={showEditDialog}
                member={selectedMember}

                onSave={(updatedMember) => {

                    const matchedMember =
                        updatedMember.member;

                    setMatchedMembers(
                        prev => [
                            ...prev,
                            matchedMember
                        ]
                    );

                    setMismatchedMembers(
                        prev =>
                            prev.filter(
                                x =>
                                    x.member.rowNumber !==
                                    matchedMember.rowNumber
                            )
                    );

                    setShowEditDialog(false);

                    setSelectedMember(null);

                }}

                onCancel={() => {

                    setShowEditDialog(false);

                    setSelectedMember(null);

                }}
            />

            <div className="validate-action-bar">

                    <button
                        className="validate-btn"
                        onClick={handleValidate}
                        disabled={loading}
                    >
                        {
                            loading
                                ? "Validating..."
                                : "Validate Members"
                        }
                    </button>

                </div>
        </div>
    );
};