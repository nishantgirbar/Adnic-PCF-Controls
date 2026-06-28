import * as React from "react";

import {
    DetailsList,
    IColumn,
    Spinner,
    SpinnerSize,
    Stack,
    Dropdown,
    IDropdownOption,
    PrimaryButton,
    Text
} from "@fluentui/react";

import { IPPCOCMember } from "../models/IPPCOCMember";
import { IPPCOCRow } from "../models/IPPCOCRow";
import { PPCOCApiService } from "../services/PPCOCApiService";

interface IPPCOCCheckProps {

    context:
        ComponentFramework.Context<any>;

    validatedMembersJson: string;

    apiBaseUrl: string;

    onResultChanged: (
        rows: IPPCOCRow[]
    ) => void;
}

export const PPCOCCheckControl:
React.FC<IPPCOCCheckProps> = ({
    validatedMembersJson,
    apiBaseUrl,
    onResultChanged
}) => {

     console.log('component base url', apiBaseUrl);

    const [loading, setLoading] =
        React.useState(false);

    const [rows, setRows] =
        React.useState<IPPCOCRow[]>([]);

    const [allRows, setAllRows] =
        React.useState<IPPCOCRow[]>([]);

    const [selectedMember,
        setSelectedMember] =
        React.useState<string>("");

    const [selectedStatus,
        setSelectedStatus] =
        React.useState<string>("ALL");

    const api =
        React.useMemo(
            () =>
                new PPCOCApiService(
                    apiBaseUrl
                ),
            [apiBaseUrl]
        );

    React.useEffect(() => {

        const load = async () => {
            await loadData();
        };

        load();

    }, [validatedMembersJson]);

    const loadData =
        async (): Promise<void> => {

            try {

                setLoading(true);

                let members: IPPCOCMember[] = [];

                try {

                    members = JSON.parse(
                        validatedMembersJson || "[]"
                    );

                } catch {

                    members = [];
                }

                const results =
                    await Promise.all(

                        members.map(
                            async member => {

                                try {

                                    const response =
                                        await api
                                            .checkPRStatus(
                                                member
                                            );

                                    return {

                                        rowNumber:
                                            member.rowNumber,

                                        pfNo:
                                            member.pfNo,

                                        memberName:
                                            member.memberName,

                                        dateOfBirth:
                                            member.dateOfBirth,

                                        visaEmirate:
                                            member.visaEmirate,

                                        visaType:
                                            member.visaType,

                                        ppCheckStatus:
                                            response.target_errorcode === 0
                                                ? "VALID"
                                                : "INVALID",

                                        cocCheckStatus:
                                            member.cocEligible
                                                ? "ELIGIBLE"
                                                : "NOT ELIGIBLE",

                                        prRemarks:
                                            response.target_errordesc || "",

                                        apiResponse:
                                            response

                                    } as IPPCOCRow;

                                } catch {

                                    return {

                                        rowNumber:
                                            member.rowNumber,

                                        pfNo:
                                            member.pfNo,

                                        memberName:
                                            member.memberName,

                                        dateOfBirth:
                                            member.dateOfBirth,

                                        visaEmirate:
                                            member.visaEmirate,

                                        visaType:
                                            member.visaType,

                                        ppCheckStatus:
                                            "ERROR",

                                        cocCheckStatus:
                                            "UNKNOWN",

                                        prRemarks:
                                            "API Error"

                                    } as IPPCOCRow;
                                }
                            }
                        )
                    );

                setRows(results);

                setAllRows(results);

                onResultChanged(results);

            } finally {

                setLoading(false);
            }
        };

    const applyFilter =
        (): void => {

            let filtered =
                [...allRows];

            if (
                selectedMember
            ) {

                filtered =
                    filtered.filter(
                        x =>
                            x.memberName ===
                            selectedMember
                    );
            }

            if (
                selectedStatus !==
                "ALL"
            ) {

                filtered =
                    filtered.filter(
                        x =>
                            x.ppCheckStatus ===
                            selectedStatus
                    );
            }

            setRows(filtered);
        };

    const columns:
        IColumn[] = [

        {
            key: "sl",
            name: "Sl No",
            fieldName: "rowNumber",
            minWidth: 60
        },

        {
            key: "pf",
            name: "PF No",
            fieldName: "pfNo",
            minWidth: 120
        },

        {
            key: "member",
            name: "Member Name",
            fieldName: "memberName",
            minWidth: 180
        },

        {
            key: "dob",
            name: "DOB",
            fieldName: "dateOfBirth",
            minWidth: 120
        },

        {
            key: "emirate",
            name: "Visa Emirate",
            fieldName: "visaEmirate",
            minWidth: 120
        },

        {
            key: "visa",
            name: "Visa Type",
            fieldName: "visaType",
            minWidth: 150
        },

        {
            key: "pp",
            name: "PP Status",
            fieldName: "ppCheckStatus",
            minWidth: 120
        },

        {
            key: "coc",
            name: "COC Status",
            fieldName: "cocCheckStatus",
            minWidth: 120
        },

        {
            key: "remarks",
            name: "PR Remarks",
            fieldName: "prRemarks",
            minWidth: 350
        }
    ];

        const memberOptions: IDropdownOption[] = [];

        memberOptions.push({
            key: "",
            text: "All"
        });

        allRows.forEach(row => {

            if (
                !memberOptions.some(
                    x => x.key === row.memberName
                )
            ) {

                memberOptions.push({
                    key: row.memberName,
                    text: row.memberName
                });
            }
        });

    return (

        <Stack
            tokens={{ childrenGap: 15 }}
        >

            <Text
                variant="xLarge">

                PP / COC Validation
            </Text>

            <Stack
                horizontal
                tokens={{
                    childrenGap: 10
                }}
            >

                <Dropdown
                    label="Member"
                    selectedKey={
                        selectedMember
                    }
                    options={
                        memberOptions
                    }
                    onChange={(
                        _,
                        option
                    ) =>
                        setSelectedMember(
                            String(
                                option?.key ||
                                ""
                            )
                        )
                    }
                    styles={{
                        dropdown: {
                            width: 250
                        }
                    }}
                />

                <Dropdown
                    label="PP Status"
                    selectedKey={
                        selectedStatus
                    }
                    options={[
                        {
                            key: "ALL",
                            text: "All"
                        },
                        {
                            key: "VALID",
                            text: "Valid"
                        },
                        {
                            key: "INVALID",
                            text: "Invalid"
                        },
                        {
                            key: "ERROR",
                            text: "Error"
                        }
                    ]}
                    onChange={(
                        _,
                        option
                    ) =>
                        setSelectedStatus(
                            String(
                                option?.key
                            )
                        )
                    }
                    styles={{
                        dropdown: {
                            width: 200
                        }
                    }}
                />

                <PrimaryButton
                    text="Search"
                    onClick={
                        applyFilter
                    }
                    style={{
                        marginTop: 28
                    }}
                />

            </Stack>

            {loading && (

                <Spinner
                    size={
                        SpinnerSize.large
                    }
                    label="Checking PR Status..."
                />
            )}

            {!loading && (

                <DetailsList
                    items={rows}
                    columns={columns}
                />
            )}

        </Stack>
    );
};