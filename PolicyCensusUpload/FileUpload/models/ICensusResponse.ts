import { ICensusMember, IMismatchedMember } from "./ICensusMember";

export interface ICensusSummary {
    totalUploadedMembers: number;

    matchedMembersCount: number;

    mismatchedMembersCount: number;

    validationErrorCount: number;

    validationWarningCount: number;
}

export interface ICensusResponse {
    matchedMembers: ICensusMember[];

    mismatchedMembers: IMismatchedMember[];

    warnings: string[];

    summary: ICensusSummary;
}