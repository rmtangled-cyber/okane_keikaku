export interface AmortizationRow {
  month: number;
  payment: number;
  principalPart: number;
  interestPart: number;
  balance: number;
}

// 元利均等の毎月返済額
export function calcEqualPayment(
  principal: number,
  annualRatePct: number,
  termMonths: number,
): number {
  if (annualRatePct === 0) return Math.ceil(principal / termMonths);
  const r = annualRatePct / 100 / 12;
  return Math.ceil(principal * r * Math.pow(1 + r, termMonths) / (Math.pow(1 + r, termMonths) - 1));
}

// 完全な返済スケジュール
export function calcAmortization(
  principal: number,
  annualRatePct: number,
  termMonths: number,
  loanType: "元利均等" | "元金均等",
): AmortizationRow[] {
  const r = annualRatePct / 100 / 12;
  let balance = principal;
  const rows: AmortizationRow[] = [];

  if (loanType === "元利均等") {
    const payment = calcEqualPayment(principal, annualRatePct, termMonths);
    for (let m = 1; m <= termMonths; m++) {
      const interestPart = Math.floor(balance * r);
      const principalPart = Math.min(balance, payment - interestPart);
      balance = Math.max(0, balance - principalPart);
      rows.push({ month: m, payment: principalPart + interestPart, principalPart, interestPart, balance });
    }
  } else {
    const monthlyPrincipal = Math.ceil(principal / termMonths);
    for (let m = 1; m <= termMonths; m++) {
      const interestPart = Math.floor(balance * r);
      const principalPart = m === termMonths ? balance : Math.min(balance, monthlyPrincipal);
      const payment = principalPart + interestPart;
      balance = Math.max(0, balance - principalPart);
      rows.push({ month: m, payment, principalPart, interestPart, balance });
    }
  }
  return rows;
}

// 返済完了月 "YYYY-MM"
export function loanEndYM(startYM: string, termMonths: number): string {
  const [y, m] = startYM.split("-").map(Number);
  const d = new Date(y, m - 1 + termMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// 現時点での経過月数
export function elapsedFromNow(startYM: string): number {
  const [sy, sm] = startYM.split("-").map(Number);
  const now = new Date();
  return Math.max(0, (now.getFullYear() - sy) * 12 + (now.getMonth() - (sm - 1)));
}

// 現在の残債・残月・今月の返済額
export function loanCurrentStatus(
  principal: number,
  annualRatePct: number,
  termMonths: number,
  loanType: "元利均等" | "元金均等",
  startYM: string,
): { balance: number; elapsedMonths: number; remainingMonths: number; currentPayment: number; isCompleted: boolean } {
  const elapsed = Math.min(elapsedFromNow(startYM), termMonths);
  const rows = calcAmortization(principal, annualRatePct, termMonths, loanType);
  const isCompleted = elapsed >= termMonths;
  const balance = isCompleted ? 0 : (rows[elapsed]?.balance ?? 0);
  const currentPayment = isCompleted ? 0 : (rows[elapsed]?.payment ?? rows[0]?.payment ?? 0);
  return { balance, elapsedMonths: elapsed, remainingMonths: termMonths - elapsed, currentPayment, isCompleted };
}

// 住宅ローン: 変動金利を反映した年別月次返済額の配列（ライフプランシミュレーション用）
export function mortgageMonthlyPaymentByYear(
  principal: number,
  termYears: number,
  periodSettings: { fromYear?: number; rate: string; extra: string }[],
): number[] {
  const termMonths = termYears * 12;
  const sorted = [...periodSettings].sort((a, b) => (a.fromYear ?? 1) - (b.fromYear ?? 1));
  const result: number[] = [];
  let balance = principal;

  for (let year = 0; year < termYears; year++) {
    if (balance <= 0) { result.push(0); continue; }
    const loanYear = year + 1;
    // 繰上返済（年初に適用）
    if (loanYear > 1) {
      const extraPs = sorted.find(s => (s.fromYear ?? 1) === loanYear);
      if (extraPs) {
        const extra = (parseFloat(extraPs.extra) || 0) * 10000;
        balance = Math.max(0, balance - extra);
      }
    }
    // 適用金利（その年以降の最後のレート変更）
    const ps = [...sorted].reverse().find(s => (s.fromYear ?? 1) <= loanYear) ?? sorted[0];
    const annualRatePct = parseFloat(ps?.rate ?? "0") || 0;
    const remainingMonths = termMonths - year * 12;
    const monthlyPayment = calcEqualPayment(balance, annualRatePct, remainingMonths);
    // 12ヶ月分シミュレートして残高を更新
    const r = annualRatePct / 100 / 12;
    for (let m = 0; m < 12 && balance > 0; m++) {
      const interest = Math.floor(balance * r);
      const principalPart = Math.min(balance, monthlyPayment - interest);
      balance = Math.max(0, balance - principalPart);
    }
    result.push(monthlyPayment);
  }
  return result;
}

// ある年の月次返済額（シミュレーショ��用）
export function loanPaymentForYear(
  principal: number,
  annualRatePct: number,
  termMonths: number,
  loanType: "元利均等" | "元金均等",
  startYM: string,
  targetYear: number,
): number {
  const [sy, sm] = startYM.split("-").map(Number);
  const startYear = sy + (sm > 1 ? 0 : 0);
  const endYM = loanEndYM(startYM, termMonths);
  const endYear = parseInt(endYM.split("-")[0]);
  if (targetYear < sy || targetYear > endYear) return 0;
  if (loanType === "元利均等") return calcEqualPayment(principal, annualRatePct, termMonths);
  // 元金均等: use mid-year approximate
  const monthMid = (targetYear - startYear) * 12 + 6;
  const r = annualRatePct / 100 / 12;
  const monthlyPrincipal = Math.ceil(principal / termMonths);
  const approxBalance = Math.max(0, principal - monthlyPrincipal * monthMid);
  return monthlyPrincipal + Math.floor(approxBalance * r);
}
