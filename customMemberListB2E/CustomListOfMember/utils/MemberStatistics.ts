export interface MemberStatisticsResult {
  salary4000: number;
  salary16000: number;
  salary20000: number;
  dependent: number;
}

export class MemberStatistics {

  public static calculate(rawMemberJson: string): MemberStatisticsResult {

    let members: any[] = [];

    try {
      const parsed = rawMemberJson ? JSON.parse(rawMemberJson) : [];
      members = Array.isArray(parsed) ? parsed : [];
    } catch {
      members = [];
    }

    return members.reduce<MemberStatisticsResult>(
      (stats, member) => {
        const relation = String(member.relation || "").toUpperCase();
        const salaryType = String(member.salaryType || "").toLowerCase();

        if (relation && relation !== "EMPLOYEE") {
          stats.dependent++;
        }

        if (salaryType.indexOf("4000") > -1) {
          stats.salary4000++;
        }

        if (salaryType.indexOf("16000") > -1) {
          stats.salary16000++;
        }

        if (salaryType.indexOf("20000") > -1) {
          stats.salary20000++;
        }

        return stats;
      },
      {
        salary4000: 0,
        salary16000: 0,
        salary20000: 0,
        dependent: 0
      }
    );
  }
}
