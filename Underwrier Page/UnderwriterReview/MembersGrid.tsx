// MembersGrid.tsx

import * as React from "react";

export const MembersGrid = ({ members }: any) => {

    const [currentPage, setCurrentPage] = React.useState(1);

    const isLsbMember = (member: any): boolean =>
        [
            member?.salaryType,
            member?.visaLocation
        ].some((value: any) =>
            String(
                value?.displayName ??
                value?.code ??
                value ??
                ""
            ).trim().toUpperCase() === "LSB"
        );

    const pageSize = 10;

    const totalPages = Math.ceil((members?.length || 0) / pageSize);

    const paginatedData = members.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    return (

        <div className="section">

            <h3 className="section-title">
                List of Members
            </h3>

            <div className="member-count">
                Total Members: {members?.length || 0}
            </div>

            <table className="table">

                <thead>

                    <tr>
                        <th>#</th>
                        <th>Relation</th>
                        <th>Gender</th>
                        <th>D.O.B</th>
                        <th>Salary Type</th>
                        <th>Visa Location</th>
                        <th>Category</th>
                        <th>Marital Status</th>
                    </tr>

                </thead>

                <tbody>

                    {paginatedData.map((m: any, i: number) => (

                        <tr key={i}>

                            <td>
                                {(currentPage - 1) * pageSize + i + 1}
                            </td>

                            <td>
                                {m?.relation?.displayName ||
                                    m?.relation ||
                                    "-"}
                            </td>

                            <td>
                                {m?.gender?.displayName ||
                                    m?.gender ||
                                    "-"}
                            </td>

                            <td>
                                {m?.dateOfBirth || "-"}
                            </td>

                            <td>
                                {m?.salaryType?.displayName ||
                                    m?.salaryType ||
                                    "-"}
                            </td>

                            <td>
                                {m?.visaLocation?.displayName ||
                                    m?.visaLocation ||
                                    "-"}
                            </td>

                            <td>
                                {
                                    isLsbMember(m)
                                        ? ""
                                        : m?.category?.displayName ||
                                            m?.category ||
                                            "-"
                                }
                            </td>

                            <td>
                                {m?.maritalStatus?.displayName ||
                                    m?.maritalStatus ||
                                    "-"}
                            </td>

                        </tr>

                    ))}

                </tbody>

            </table>

            <div className="pagination">

                <div className="pagination-left">

                    <button
                        className="page-btn"
                        disabled={currentPage === 1}
                        onClick={() =>
                            setCurrentPage(prev => prev - 1)
                        }
                    >
                        Previous
                    </button>

                </div>

                <div className="pagination-center">
                    Page {currentPage} of {totalPages}
                </div>

                <div className="pagination-right">

                    <button
                        className="page-btn"
                        disabled={currentPage === totalPages}
                        onClick={() =>
                            setCurrentPage(prev => prev + 1)
                        }
                    >
                        Next
                    </button>

                </div>

            </div>

        </div>
    );
};
