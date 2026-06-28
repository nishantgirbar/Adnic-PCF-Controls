import * as React from "react";
import {
    IMismatchedMember
} from "../models/ICensusMember";

import "../css/Grid.css";

export interface IMismatchedMembersGridProps {

    members: IMismatchedMember[];

    onEdit: (
        member: IMismatchedMember
    ) => void;

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

export const MismatchedMembersGrid:
React.FC<IMismatchedMembersGridProps> = ({
    members,
    onEdit,
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
                No mismatched members found.
            </div>
        );
    }

    return (

        <div className="grid-container">

            <div className="grid-header">

                <div className="grid-title">
                    Mismatched Members
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

                        <th>
                            Match Reasons
                        </th>

                        <th>
                            Action
                        </th>
                    </tr>

                </thead>

                <tbody>

                    {
                        members.map(
                            (
                                row,
                                index
                            ) => (

                                <tr
                                    key={
                                        row.member.rowNumber ||
                                        index
                                    }
                                    className="mismatch-row"
                                >

                                    <td>

                                        <span className="status-badge mismatched">
                                            Mismatched
                                        </span>

                                    </td>

                                    <td>
                                        {
                                            row.member.pfNo
                                        }
                                    </td>

                                    <td>
                                        {
                                            row.member.memberName
                                        }
                                    </td>

                                    <td>
                                        {
                                            row.member.dateOfBirth
                                        }
                                    </td>

                                    <td>
                                        {
                                            row.member.gender
                                        }
                                    </td>

                                    <td>
                                        {
                                            row.member.nationality
                                        }
                                    </td>

                                    {/* Category */}

                                    <td>

                                       <select
                                           value={
                                                    row.member.memberCategory ||
                                                    (row.member as any).category ||
                                                    ""
                                                }
                                            onChange={(e) =>
                                                onCategoryChange(
                                                    row.member.rowNumber,
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
                                                row.member.medicalDeclaration ??
                                                (
                                                    (row.member as any)
                                                        .requiresMedicalUnderwriting
                                                        ? "Yes"
                                                        : "No"
                                                )
                                            }
                                            onChange={(e) =>
                                                onMedicalDeclarationChange(
                                                    row.member.rowNumber,
                                                    e.target.value
                                                )
                                            }
                                        >
                                            <option value="">Select</option>
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                        </select>

                                    </td>

                                    {/* Match Reasons */}

                                    <td>

                                        <div className="reason-container">

                                            {
                                                row.matchReasons?.map(
                                                    (
                                                        reason: string,
                                                        idx: number
                                                    ) => (

                                                        <div
                                                            key={idx}
                                                            className="reason-tag"
                                                        >
                                                            {reason}
                                                        </div>

                                                    )
                                                )
                                            }

                                        </div>

                                    </td>

                                    {/* Edit */}

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
                                            onClick={() =>
                                                onEdit(row)
                                            }
                                        >
                                            ✎
                                        </button>

                                       <button
                                            className="icon-btn delete"
                                            onClick={() =>
                                                onDelete(
                                                    row.member.rowNumber
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