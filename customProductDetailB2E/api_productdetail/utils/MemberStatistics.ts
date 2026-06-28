export class MemberStatistics {

    public static calculate(
        memberJson: string
    ) {

        const result = {
            salary4000: 0,
            salary16000: 0,
            salary20000: 0,
            dependent: 0
        };

        if (!memberJson) {
            return result;
        }

        try {

            const members =
                JSON.parse(memberJson);

            members.forEach((m: any) => {

                const isDependent =
                    m.relation &&
                    m.relation.toLowerCase() !== "employee";

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

        } catch { }

        return result;
    }
}
