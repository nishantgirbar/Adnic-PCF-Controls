import * as React from "react";
import { ICensusSummary } from "../models/ICensusResponse";
import "../css/CensusUploadControl.css";

export interface ISummaryCardsProps {
    summary: ICensusSummary | null;
}

export const SummaryCards: React.FC<ISummaryCardsProps> = ({
    summary
}) => {

    if (!summary) {
        return null;
    }

    return (

        <div className="summary-cards">

            <div className="summary-card total-card">

                <div className="summary-title">
                    Total Members
                </div>

                <div className="summary-value">
                    {summary.totalUploadedMembers}
                </div>

            </div>

            <div className="summary-card matched-card">

                <div className="summary-title">
                    Matched
                </div>

                <div className="summary-value">
                    {summary.matchedMembersCount}
                </div>

            </div>

            <div className="summary-card mismatched-card">

                <div className="summary-title">
                    Mismatched
                </div>

                <div className="summary-value">
                    {summary.mismatchedMembersCount}
                </div>

            </div>

            <div className="summary-card warning-card">

                <div className="summary-title">
                    Warnings
                </div>

                <div className="summary-value">
                    {summary.validationWarningCount}
                </div>

            </div>

        </div>
    );
};