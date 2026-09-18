import type { FundHolding } from "./types";

function addMonthsToYM(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * 月次積立額が設定されているファンドに対し、未適用の月分を一括で加算する。
 * - purchaseAmount と currentValue を monthlyContribution × 未適用月数 だけ増やす
 * - lastAutoContribYearMonth を更新して二重適用を防ぐ
 * - 初回（lastAutoContribYearMonth 未設定）は当月のみマーク（過去分の遡及はしない）
 */
export function applyMonthlyContributions(funds: FundHolding[]): {
  funds: FundHolding[];
  changed: boolean;
  applied: { name: string; amount: number; months: number }[];
} {
  const now = new Date();
  const todayDay = now.getDate();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  let changed = false;
  const applied: { name: string; amount: number; months: number }[] = [];

  const updatedFunds = funds.map(fund => {
    if (fund.monthlyContribution <= 0) return fund;

    const savingDay = fund.monthlySavingDay ?? 1;
    const lastYM = fund.lastAutoContribYearMonth;

    if (!lastYM) {
      // 初回: 今月の積立日が来ていればマークだけして終了（過去遡及なし）
      if (todayDay >= savingDay) {
        changed = true;
        return { ...fund, lastAutoContribYearMonth: currentYM };
      }
      return fund;
    }

    // 適用すべき月を数える
    let monthsToApply = 0;
    let latestAppliedYM = lastYM;
    let checkYM = addMonthsToYM(lastYM, 1);

    while (true) {
      if (checkYM > currentYM) break;
      // 当月は積立日を過ぎているか確認
      if (checkYM === currentYM && todayDay < savingDay) break;
      monthsToApply++;
      latestAppliedYM = checkYM;
      if (checkYM === currentYM) break;
      checkYM = addMonthsToYM(checkYM, 1);
    }

    if (monthsToApply <= 0) return fund;

    const totalAdd = fund.monthlyContribution * monthsToApply;
    changed = true;
    applied.push({ name: fund.name, amount: totalAdd, months: monthsToApply });

    return {
      ...fund,
      purchaseAmount: fund.purchaseAmount + totalAdd,
      currentValue: fund.currentValue + totalAdd,
      lastAutoContribYearMonth: latestAppliedYM,
    };
  });

  return { funds: updatedFunds, changed, applied };
}
