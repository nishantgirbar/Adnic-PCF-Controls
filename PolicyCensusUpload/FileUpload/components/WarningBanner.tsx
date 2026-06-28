import * as React from "react";
import "../css/CensusUploadControl.css";

export interface IWarningBannerProps {
    warnings: string[];
}

export const WarningBanner: React.FC<IWarningBannerProps> = ({
    warnings
}) => {

    if (
        !warnings ||
        warnings.length === 0
    ) {
        return null;
    }

    return (

        <div className="warning-banner">

            <div className="warning-header">

                <span className="warning-icon">
                    ⚠
                </span>

                <span className="warning-title">
                    Validation Warnings
                </span>

            </div>

            <div className="warning-content">

                {
                    warnings.map(
                        (
                            warning,
                            index
                        ) => (

                            <div
                                key={index}
                                className="warning-item"
                            >
                                {warning}
                            </div>

                        )
                    )
                }

            </div>

        </div>
    );
};