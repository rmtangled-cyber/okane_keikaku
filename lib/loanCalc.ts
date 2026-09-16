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

// 分割実行ローン: 段階的に実行される場合の年別月次返済額（ライフプランシミュレーション用）
// 最終実行前は利息のみ支払い、最終実行後に元利均等返済スタート
export function mortgageMonthlyPaymentWithDrawdown(
  termYears: number,
  drawdowns: { yearMonth: string; amountMan: number }[],
  periodSettings: { fromYear?: number; rate: string; extra: string }[],
  simStartYear: number,
): number[] {
  if (!drawdowns.length) return [];
  const sorted = [...drawdowns].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  const lastDisbYM = sorted[sorted.length - 1].yearMonth;
  const lastDisbYear = parseInt(lastDisbYM.split("-")[0]);
  const lastDisbMonth = parseInt(lastDisbYM.split("-")[1]);

  const termMonths = termYears * 12;
  const sortedPs = [...periodSettings].sort((a, b) => (a.fromYear ?? 1) - (b.fromYear ?? 1));

  const getRateForLoanYear = (loanYear: number): number => {
    const ps = [...sortedPs].reverse().find(s => (s.fromYear ?? 1) <= loanYear) ?? sortedPs[0];
    return parseFloat(ps?.rate ?? "0") || 0;
  };

  const maxCalYear = lastDisbYear + termYears + 2;
  const resultLen = maxCalYear - simStartYear + 1;
  const result: number[] = new Array(Math.max(0, resultLen)).fill(0);

  let disbursedBalance = 0;
  let repayBalance = 0;
  let repaymentStarted = false;
  // repayment starts at the month AFTER last disbursement
  const repayStartYear = lastDisbMonth === 12 ? lastDisbYear + 1 : lastDisbYear;
  const repayStartOffset = lastDisbMonth === 12 ? 0 : lastDisbMonth; // months into repayStartYear when repay begins

  for (let calYear = simStartYear; calYear <= maxCalYear; calYear++) {
    const idx = calYear - simStartYear;
    if (idx < 0 || idx >= result.length) continue;

    // Accumulate disbursements this year
    for (const d of sorted) {
      if (parseInt(d.yearMonth.split("-")[0]) === calYear) {
        disbursedBalance += d.amountMan * 10000;
      }
    }

    if (disbursedBalance <= 0) continue;

    if (!repaymentStarted && calYear >= repayStartYear) {
      repaymentStarted = true;
      repayBalance = disbursedBalance;
    }

    if (!repaymentStarted) {
      // Interest-only on disbursed balance (pre-repayment phase)
      const rate = getRateForLoanYear(1);
      result[idx] = Math.floor(disbursedBalance * rate / 100 / 12);
    } else {
      const loanYear = calYear - repayStartYear + 1;

      // Partial-year adjustment for first repayment year
      if (loanYear === 1 && repayStartOffset > 0) {
        // Only (12 - repayStartOffset) months of repayment this year; show the payment amount
        // but the balance update is partial
        if (repayBalance <= 0) { result[idx] = 0; continue; }
        const rate = getRateForLoanYear(1);
        const monthly = calcEqualPayment(repayBalance, rate, termMonths);
        result[idx] = monthly;
        const r = rate / 100 / 12;
        const months = 12 - repayStartOffset;
        for (let m = 0; m < months && repayBalance > 0; m++) {
          const interest = Math.floor(repayBalance * r);
          const principalPart = Math.min(repayBalance, monthly - interest);
          repayBalance = Math.max(0, repayBalance - principalPart);
        }
        continue;
      }

      // Prepayments from periodSettings (extra payments at year start)
      if (loanYear > 1) {
        const extraPs = sortedPs.find(s => (s.fromYear ?? 1) === loanYear);
        if (extraPs) {
          repayBalance = Math.max(0, repayBalance - (parseFloat(extraPs.extra) || 0) * 10000);
        }
      }

      if (repayBalance <= 0) { result[idx] = 0; continue; }
      const elapsed = (loanYear - 1) * 12 + (loanYear === 1 ? 0 : repayStartOffset > 0 ? 12 - repayStartOffset : 0);
      const remainingMonths = Math.max(1, termMonths - Math.max(0, (loanYear - 1) * 12));
      if (remainingMonths <= 0) { result[idx] = 0; continue; }

      const rate = getRateForLoanYear(loanYear);
      const monthly = calcEqualPayment(repayBalance, rate, remainingMonths);
      result[idx] = monthly;

      const r = rate / 100 / 12;
      for (let m = 0; m < 12 && repayBalance > 0; m++) {
        const interest = Math.floor(repayBalance * r);
        const principalPart = Math.min(repayBalance, monthly - interest);
        repayBalance = Math.max(0, repayBalance - principalPart);
      }
    }
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
