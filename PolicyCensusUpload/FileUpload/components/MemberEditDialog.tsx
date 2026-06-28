import * as React from "react";
import {
    ICensusMember,
    IMismatchedMember
} from "../models/ICensusMember";

import "../css/Dialog.css";

export interface IMemberEditDialogProps {
    isOpen: boolean;
    member: IMismatchedMember | null;
    onSave: (member: IMismatchedMember) => void;
    onCancel: () => void;
}

export const MemberEditDialog: React.FC<IMemberEditDialogProps> = ({
    isOpen,
    member,
    onSave,
    onCancel
}) => {

    const [editedMember, setEditedMember] =
        React.useState<IMismatchedMember | null>(null);

    React.useEffect(() => {

        if (member) {

            setEditedMember(
                JSON.parse(
                    JSON.stringify(member)
                )
            );
        }

    }, [member]);

    if (!isOpen || !editedMember) {
        return null;
    }

    const updateField = (
        field: keyof ICensusMember,
        value: string
    ) => {

        setEditedMember({
            ...editedMember,
            member: {
                ...editedMember.member,
                [field]: value
            }
        });
    };

    const renderTextField = (
        label: string,
        field: keyof ICensusMember
    ) => (

        <div className="form-field">

            <label>
                {label}
            </label>

            <input
                type="text"
                value={
                    editedMember.member[field] || ""
                }
                onChange={(e) =>
                    updateField(
                        field,
                        e.target.value
                    )
                }
            />

        </div>
    );

    return (

        <div className="dialog-overlay">

            <div className="member-dialog">

                <div className="dialog-header">

                    <h2>
                        Member Details
                    </h2>

                    <button
                        className="close-btn"
                        onClick={onCancel}
                    >
                        ✕
                    </button>

                </div>

                <div className="dialog-body">

                    {/* Validation Issues */}

                    <div className="validation-section">

                        <h3>
                            Validation Issues
                        </h3>

                        {
                            editedMember.matchReasons.map(
                                (
                                    reason,
                                    index
                                ) => (

                                    <div
                                        key={index}
                                        className="validation-warning"
                                    >
                                        ⚠ {reason}
                                    </div>

                                )
                            )
                        }

                    </div>

                    {/* Basic Information */}

                    <div className="section">

                        <h3>
                            Basic Information
                        </h3>

                        <div className="form-grid">

                            {
                                renderTextField(
                                    "Serial Number",
                                    "serialNumber"
                                )
                            }

                            {
                                renderTextField(
                                    "PF No",
                                    "pfNo"
                                )
                            }

                            {
                                renderTextField(
                                    "Member No",
                                    "memberNo"
                                )
                            }

                            {
                                renderTextField(
                                    "Member Name",
                                    "memberName"
                                )
                            }

                        </div>

                    </div>

                    {/* Personal Information */}

                    <div className="section">

                        <h3>
                            Personal Information
                        </h3>

                        <div className="form-grid">

                            {
                                renderTextField(
                                    "Date Of Birth",
                                    "dateOfBirth"
                                )
                            }

                            {
                                renderTextField(
                                    "Gender",
                                    "gender"
                                )
                            }

                            {
                                renderTextField(
                                    "Relationship",
                                    "relationship"
                                )
                            }

                            {
                                renderTextField(
                                    "Dependency",
                                    "dependency"
                                )
                            }

                            {
                                renderTextField(
                                    "Marital Status",
                                    "maritalStatus"
                                )
                            }

                            {
                                renderTextField(
                                    "Nationality",
                                    "nationality"
                                )
                            }

                        </div>

                    </div>

                    {/* Identity Information */}

                    <div className="section">

                        <h3>
                            Identity Information
                        </h3>

                        <div className="form-grid">

                            {
                                renderTextField(
                                    "Passport No",
                                    "passportNo"
                                )
                            }

                            {
                                renderTextField(
                                    "Passport Expiry",
                                    "passportExpiryDate"
                                )
                            }

                            {
                                renderTextField(
                                    "Emirates ID",
                                    "emiratesId"
                                )
                            }

                            {
                                renderTextField(
                                    "Emirates ID Expiry",
                                    "emiratesIdExpiryDate"
                                )
                            }

                        </div>

                    </div>

                    {/* Coverage Information */}

                    <div className="section">

                        <h3>
                            Coverage Information
                        </h3>

                        <div className="form-grid">

                            {
                                renderTextField(
                                    "Effective Date",
                                    "effectiveDate"
                                )
                            }

                            {
                                renderTextField(
                                    "Premium Coverage Entry Date",
                                    "premiumCoverageEntryDate"
                                )
                            }

                            {
                                renderTextField(
                                    "Change Of Status Date",
                                    "changeOfStatusDate"
                                )
                            }

                            {
                                renderTextField(
                                    "Member Category",
                                    "memberCategory"
                                )
                            }

                            {
                                renderTextField(
                                    "Class No",
                                    "classNo"
                                )
                            }

                        </div>

                    </div>

                    {/* Visa Information */}

                    <div className="section">

                        <h3>
                            Visa Information
                        </h3>

                        <div className="form-grid">

                            {
                                renderTextField(
                                    "Visa Type",
                                    "visaType"
                                )
                            }

                            {
                                renderTextField(
                                    "Visa Application No",
                                    "visaApplicationNo"
                                )
                            }

                            {
                                renderTextField(
                                    "Entry Permit No",
                                    "entryPermitNo"
                                )
                            }

                            {
                                renderTextField(
                                    "Visa Emirate",
                                    "visaEmirate"
                                )
                            }

                            {
                                renderTextField(
                                    "Visa Location",
                                    "visaLocation"
                                )
                            }

                        </div>

                    </div>

                    {/* Contact Information */}

                    <div className="section">

                        <h3>
                            Contact Information
                        </h3>

                        <div className="form-grid">

                            {
                                renderTextField(
                                    "Mobile No",
                                    "mobileNo"
                                )
                            }

                            {
                                renderTextField(
                                    "Email",
                                    "emailId"
                                )
                            }

                            {
                                renderTextField(
                                    "Thiqa Card No",
                                    "thiqaCardNo"
                                )
                            }

                        </div>

                    </div>

                    {/* Employment Information */}

                    <div className="section">

                        <h3>
                            Employment Information
                        </h3>

                        <div className="form-grid">

                            {
                                renderTextField(
                                    "Position",
                                    "position"
                                )
                            }

                            {
                                renderTextField(
                                    "Work Location",
                                    "workLocation"
                                )
                            }

                            {
                                renderTextField(
                                    "Residence Location",
                                    "residenceLocation"
                                )
                            }

                            {
                                renderTextField(
                                    "Salary Band",
                                    "salaryBand"
                                )
                            }

                            {
                                renderTextField(
                                    "Commission",
                                    "commission"
                                )
                            }

                        </div>

                    </div>

                    {/* Sponsor Information */}

                    <div className="section">

                        <h3>
                            Sponsor Information
                        </h3>

                        <div className="form-grid">

                            {
                                renderTextField(
                                    "Sponsor Type",
                                    "sponsorType"
                                )
                            }

                            {
                                renderTextField(
                                    "Sponsor Id",
                                    "sponsorId"
                                )
                            }

                            {
                                renderTextField(
                                    "Sponsor Country",
                                    "sponsorCountry"
                                )
                            }

                            {
                                renderTextField(
                                    "Birth Certificate Id",
                                    "birthCertificateId"
                                )
                            }

                        </div>

                    </div>

                </div>

                <div className="dialog-footer">

                    <button
                        className="cancel-btn"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>

                    <button
                        className="save-btn"
                        onClick={() =>
                            onSave(
                                editedMember
                            )
                        }
                    >
                        Save & Move To Matched
                    </button>

                </div>

            </div>

        </div>
    );
};