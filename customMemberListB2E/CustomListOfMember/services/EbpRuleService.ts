export interface MemberStats {
  salary4000: number;
  salary16000: number;
  salary20000: number;
  dependent: number;
}

export class EbpRuleService {

  public static getAnnualLimit(provider: string, plan: string): string {

    return this.getPlanValue(provider, plan, "annualLimit");
  }

  public static getNetworkType(provider: string, plan: string): string {

    return this.getPlanValue(provider, plan, "networkType");
  }

  public static getCoverage(provider: string, plan: string): string {

    return this.getPlanValue(provider, plan, "coverage");
  }

  public static validatePlan(
    provider: string,
    plan: string,
    stats: MemberStats
  ): string {

    if (!provider || !plan) {
      return "";
    }

    const normalizedPlan = plan.toLowerCase();

    if (
      normalizedPlan.indexOf("less than 4000") > -1 &&
      stats.salary4000 === 0
    ) {
      return "No members found for salary less than 4000.";
    }

    if (
      normalizedPlan.indexOf("less than 16000") > -1 &&
      stats.salary16000 === 0
    ) {
      return "No members found for salary less than 16000.";
    }

    if (
      normalizedPlan.indexOf("less than 20000") > -1 &&
      stats.salary20000 === 0
    ) {
      return "No members found for salary less than 20000.";
    }

    return "";
  }

  private static getPlanValue(
    provider: string,
    plan: string,
    valueName: "annualLimit" | "networkType" | "coverage"
  ): string {

    if (!provider || !plan) {
      return "";
    }

    const rules = this.getRules(provider, plan);
    return rules[valueName] || "";
  }

  private static getRules(
    provider: string,
    plan: string
  ): Record<string, string> {

    const normalizedPlan = plan.toLowerCase();

    if (normalizedPlan.indexOf("ruby") > -1) {
      return {
        annualLimit: "AED 150,000",
        networkType: "Ruby",
        coverage: "UAE"
      };
    }

    if (normalizedPlan.indexOf("enhanced") > -1) {
      return {
        annualLimit: "AED 250,000",
        networkType: "Enhanced",
        coverage: "UAE"
      };
    }

    return {
      annualLimit: "",
      networkType: plan,
      coverage: ""
    };
  }
}
