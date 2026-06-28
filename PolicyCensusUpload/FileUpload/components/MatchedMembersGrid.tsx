import * as React from "react";
import { ICensusMember } from "../models/ICensusMember";
import "../css/Grid.css";

export interface IMatchedMembersGridProps {

    members: ICensusMember[];

    onCategoryChange: (
        rowNumber: number,
        value: string
    ) => void;

    onMedicalDeclarationChange: (
        rowNumber: number,
        value: string
    ) => void;

    onDelete: (
        rowNumber: number
    ) => void;
}

export const MatchedMembersGrid:
React.FC<IMatchedMembersGridProps> = ({
    members,
    onCategoryChange,
    onMedicalDeclarationChange,
    onDelete
}) => {

    if (
        !members ||
        members.length === 0
    ) {

        return (
            <div className="empty-grid">
                No matched members found.
            </div>
        );
    }

    return (

        <div className="grid-container">

            <div className="grid-header">

                <div className="grid-title">
                    Matched Members
                </div>

                <div className="grid-count">
                    {members.length} Record(s)
                </div>

            </div>

            <table className="member-grid">

                <thead>

                    <tr>

                        <th>Status</th>

                        <th>PF No</th>

                        <th>Member Name</th>

                        <th>DOB</th>

                        <th>Gender</th>

                        <th>Nationality</th>

                        <th>Category</th>

                        <th>
                            Medical Declaration
                        </th>

                        <th>Action</th>

                    </tr>

                </thead>

                <tbody>

                    {
                        members.map(
                            (
                                member,
                                index
                            ) => (

                                <tr
                                    key={
                                        member.rowNumber ||
                                        index
                                    }
                                >

                                    <td>

                                        <span className="status-badge matched">
                                            Matched
                                        </span>

                                    </td>

                                    <td>
                                        {member.pfNo}
                                    </td>

                                    <td>
                                        {member.memberName}
                                    </td>

                                    <td>
                                        {member.dateOfBirth}
                                    </td>

                                    <td>
                                        {member.gender}
                                    </td>

                                    <td>
                                        {member.nationality}
                                    </td>

                                    {/* Category */}

                                    <td>

                                       <select
                                        value={
                                            member.memberCategory ||
                                            (member as any).category ||
                                            ""
                                        }
                                        onChange={(e) =>
                                            onCategoryChange(
                                                member.rowNumber,
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="">Select</option>
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                        <option value="C">C</option>
                                        <option value="D">D</option>
                                    </select>

                                    </td>

                                    {/* Medical Declaration */}

                                    <td>

                                            <select
                                                value={
                                                    member.medicalDeclaration ??
                                                    (
                                                        (member as any)
                                                            .requiresMedicalUnderwriting
                                                            ? "Yes"
                                                            : "No"
                                                    )
                                                }
                                                onChange={(e) =>
                                                    onMedicalDeclarationChange(
                                                        member.rowNumber,
                                                        e.target.value
                                                    )
                                                }
                                            >

                                            <option value="">
                                                Select
                                            </option>

                                            <option value="Yes">
                                                Yes
                                            </option>

                                            <option value="No">
                                                No
                                            </option>

                                        </select>

                                    </td>

                                    <td className="action-column">

                                        <button
                                            className="icon-btn"
                                            title="Download"
                                        >
                                            ⬇
                                        </button>

                                        <button
                                            className="icon-btn edit"
                                            title="Edit"
                                        >
                                            ✎
                                        </button>

                                        <button
                                            className="icon-btn delete"
                                            onClick={() =>
                                                onDelete(
                                                    member.rowNumber
                                                )
                                            }
                                        >
                                            🗑
                                        </button>

                                    </td>

                                </tr>

                            )
                        )
                    }

                </tbody>

            </table>

        </div>

    );
};