import { ICensusResponse } from "../models/ICensusResponse";
import { ICensusMember } from "../models/ICensusMember";

export class CensusApiService {

    private apiBaseUrl: string;

    constructor(apiBaseUrl: string) {
        this.apiBaseUrl = apiBaseUrl;
    }

    public async uploadCensus(
        file: File,
        policyId: string
    ): Promise<ICensusResponse> {

        const formData = new FormData();

        formData.append(
            "file",
            file
        );

        const response = await fetch(
            `${this.apiBaseUrl}/policy-command/api/v1/integrations/upload-census?policyId=${policyId}`,
            {
                method: "POST",
                body: formData
            }
        );

        if (!response.ok) {

            throw new Error(
                `Upload failed ${response.status}`
            );
        }

        return await response.json();
    }

    public async validateMembers(
        policyId: string,
        members: any[]
    ): Promise<any> {

        const response = await fetch(
            `${this.apiBaseUrl}/policy-command/api/v1/policies/${policyId}/member/validate-bulk`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(
                    members
                )
            }
        );

        if (!response.ok) {

            throw new Error(
                `Validation failed ${response.status}`
            );
        }

        return await response.json();
    }

    public async downloadTemplate(): Promise<void> {

        const response = await fetch(
            `${this.apiBaseUrl}/policy-command/api/v1/integrations/download-census-template`
        );

        if (!response.ok) {

            throw new Error(
                "Template download failed"
            );
        }

        const blob =
            await response.blob();

        const url =
            window.URL.createObjectURL(
                blob
            );

        const a =
            document.createElement(
                "a"
            );

        a.href = url;

        a.download =
            "CensusTemplate.xlsx";

        document.body.appendChild(
            a
        );

        a.click();

        document.body.removeChild(
            a
        );

        URL.revokeObjectURL(
            url
        );
    }
}