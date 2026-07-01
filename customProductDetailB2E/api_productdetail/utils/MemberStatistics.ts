export class MemberStatistics {

    private static normalizeCategory(
        value: string | null | undefined
    ): string {

        return String(value || "")
            .trim()
            .toUpperCase()
            .replace(/^(CATEGORY|CAT)[\s-]*/i, "")
            .replace(/[^A-Z0-9]/g, "");
    }

    private static getMemberCategory(
        member: any
    ): string {

        const candidateFields = [
            member?.category,
            member?.categoryCode,
            member?.categoryName,
            member?.category_code,
            member?.category_name,
            member?.Category,
            member?.CategoryCode,
            member?.CategoryName
        ];

        for (const candidate of candidateFields) {
            if (typeof candidate === "string" && candidate.trim()) {
                return this.normalizeCategory(candidate);
            }
        }

        return "";
    }

    private static getMembers(
        memberJson: string
    ): any[] {

        if (!memberJson) {
            return [];
        }

        try {
            const parsed = JSON.parse(memberJson);

            if (Array.isArray(parsed)) {
                return parsed;
            }

            if (parsed && typeof parsed === "object") {
                const candidateCollections = [
                    parsed.members,
                    parsed.items,
                    parsed.value,
                    parsed.data,
                    parsed.memberList
                ];

                for (const collection of candidateCollections) {
                    if (Array.isArray(collection)) {
                        return collection;
                    }
                }
            }
        } catch { }

        return [];
    }

    public static calculate(
        memberJson: string,
        categoryCode?: string
    ) {

        const result = {
            salary4000: 0,
            salary16000: 0,
            salary20000: 0,
            dependent: 0
        };

        const targetCategory =
            this.normalizeCategory(categoryCode);

        const members =
            this.getMembers(memberJson);

        members.forEach((m: any) => {

            const memberCategory =
                this.getMemberCategory(m);

            const matchesCategory =
                !targetCategory ||
                memberCategory === targetCategory;

            if (!matchesCategory) {
                return;
            }

            const relation =
                String(m.relation || "")
                    .toUpperCase();

            const isDependent =
                relation !== "" &&
                relation !== "EMPLOYEE";

            if (isDependent) {
                result.dependent++;
                return;
            }

            const salaryType =
                (m.salaryType || "")
                    .toUpperCase();

            if (salaryType.indexOf("4000") > -1)
                result.salary4000++;

            if (salaryType.indexOf("16000") > -1)
                result.salary16000++;

            if (salaryType.indexOf("20000") > -1)
                result.salary20000++;
        });

        return result;
    }
}
