// MedicalMembers.tsx

import * as React from "react";

export const MedicalMembers = ({
    title,
    subTitle,
    data,
    onSelect
}: any) => {

    // =========================================
    // SELECTED ROW
    // =========================================

    const [selectedIndex, setSelectedIndex] =
        React.useState<number | null>(null);

    // =========================================
    // DISPLAY VALUE
    // =========================================

    const getDisplayValue = (value: any) => {

        if (
            value === null ||
            value === undefined
        ) {
            return "-";
        }

        // HANDLE OBJECT VALUES

        if (typeof value === "object") {

            return (
                value?.displayName ||
                value?.code ||
                value?.label ||
                "-"
            );
        }

        return String(value);
    };

    // =========================================
    // HANDLE SELECT
    // =========================================

    const handleSelect = (
        member: any,
        index: number
    ) => {

        setSelectedIndex(index);

        const updatedMember = {

            ...member,

            serialNumber: index + 1
        };

        // SEND TO PARENT

        onSelect(updatedMember);
    };

    return (

        <div className="section">

            {/* ================================= */}
            {/* HEADER */}
            {/* ================================= */}

            <h2 className="section-title">
                {title}
            </h2>

            <div className="sub-title">
                {subTitle}
            </div>

            {/* ================================= */}
            {/* TABLE */}
            {/* ================================= */}

            <table className="table">

                <thead>

                    <tr>

                        <th>#</th>
                        <th>Relation</th>
                        <th>Gender</th>
                        <th>D.O.B</th>
                        <th>Salary Type</th>
                        <th>Category</th>

                    </tr>

                </thead>

                <tbody>

                    {(data || []).map(
                        (
                            m: any,
                            i: number
                        ) => {

                            const isSelected =
                                selectedIndex === i;

                            return (

                                <tr
                                    key={i}
                                    className={`clickable-row ${
                                        isSelected
                                            ? "selected-row"
                                            : ""
                                    }`}
                                    onClick={() =>
                                        handleSelect(
                                            m,
                                            i
                                        )
                                    }
                                >

                                    <td>
                                        {i + 1}
                                    </td>

                                    <td>
                                        {
                                            getDisplayValue(
                                                m?.relation
                                            )
                                        }
                                    </td>

                                    <td>
                                        {
                                            getDisplayValue(
                                                m?.gender
                                            )
                                        }
                                    </td>

                                    <td>

                                        {
                                            m?.dateOfBirth
                                                ? new Date(
                                                    m?.dateOfBirth
                                                ).toLocaleDateString(
                                                    "en-GB"
                                                )
                                                : "-"
                                        }

                                    </td>

                                    <td>
                                        {
                                            getDisplayValue(
                                                m?.salaryType
                                            )
                                        }
                                    </td>

                                    <td>
                                        {
                                            getDisplayValue(
                                                m?.category
                                            )
                                        }
                                    </td>

                                </tr>

                            );
                        }
                    )}

                </tbody>

            </table>

        </div>
    );
};