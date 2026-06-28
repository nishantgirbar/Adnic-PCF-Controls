import { IPPCOCMember } from "../models/IPPCOCMember";

export class PPCOCApiService {

    constructor(
        private apiBaseUrl: string
    ) {}

    public async checkPRStatus(
        member: IPPCOCMember
    ): Promise<any> {

        console.log('service base url', this.apiBaseUrl);

        const payload = {

            unifiedNumber:
                Number(member.uidNo),

            identityCardNumber:
                (member.emiratesId || "")
                    .replace(/\D/g, ""),

            dateofbirth:
                member.dateOfBirth,

            passportNumber:
                member.passportNo
        };

        const response =
            await fetch(
                `${this.apiBaseUrl}/integrations/pr-status-check`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify(payload)
                }
            );

        if (!response.ok) {

            throw new Error(
                `API Error ${response.status}`
            );
        }

        return await response.json();
    }
}