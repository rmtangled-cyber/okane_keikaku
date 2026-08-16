export type AssetCategory =
  | "現金・預金"
  | "株式"
  | "投資信託"
  | "債券"
  | "不動産"
  | "その他";

export type AccountType =
  | "特定口座"
  | "NISA（成長投資枠）"
  | "NISA（つみたて投資枠）"
  | "一般口座"
  | "iDeCo";

export const TAX_RATE = 0.20315;

export function calcTax(gain: number, accountType: AccountType): number {
  if (gain <= 0) return 0;
  if (accountType.startsWith("NISA") || accountType === "iDeCo") return 0;
  return Math.floor(gain * TAX_RATE);
}

export function calcFutureValue(
  currentValue: number,
  annualReturnPct: number,
  monthlyContribution: number,
  years: number
): number {
  if (years <= 0) return currentValue;
  const r = annualReturnPct / 100 / 12;
  const n = years * 12;
  if (r === 0) return currentValue + monthlyContribution * n;
  const fv = currentValue * Math.pow(1 + r, n) +
    monthlyContribution * (Math.pow(1 + r, n) - 1) / r;
  return Math.round(fv);
}

// 株式保有
export interface StockHolding {
  id: string;
  ticker: string;        // 銘柄コード（例: 7203）
  name: string;          // 銘柄名（例: トヨタ自動車）
  accountType: AccountType;
  purchasePrice: number; // 取得単価（円）
  shares: number;        // 保有株数
  currentPrice: number;  // 現在値（手動入力、円）
  purchaseDate?: string;
  note?: string;
  updatedAt: string;
}

// 投資信託保有
export interface FundHolding {
  id: string;
  name: string;                  // ファンド名
  accountType: AccountType;
  purchaseAmount: number;        // 取得金額合計（円）
  currentValue: number;          // 現在評価額（円）
  expectedAnnualReturn: number;  // 期待年利（%）
  monthlyContribution: number;   // 月次積立額（円、0なら積立なし）
  startDate?: string;
  note?: string;
  updatedAt: string;
}

// その他の資産（現金・預金、債券、不動産など）
export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  amount: number;
  note?: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  note?: string;
}

export interface MonthlySnapshot {
  month: string; // "YYYY-MM"
  total: number;
  breakdown: Partial<Record<AssetCategory, number>>;
}

// 月次支出
export type ExpenseCategory =
  | "食費" | "住居費" | "交通費" | "水道光熱費" | "通信費"
  | "医療費" | "娯楽費" | "教育費" | "保険料" | "その他";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "食費", "住居費", "交通費", "水道光熱費", "通信費",
  "医療費", "娯楽費", "教育費", "保険料", "その他",
];

export interface MonthlyExpense {
  id: string;
  name: string;
  category: ExpenseCategory;
  amount: number;    // 月額（円）
  isFixed: boolean;  // 固定費 / 変動費
  note?: string;
  updatedAt: string;
}

// 収入プロファイル（給与）
export interface IncomeProfile {
  id: string;
  name: string;           // ラベル（例: "現職"）
  grossMonthly: number;   // 額面月収（円）
  prefecture: string;     // 都道府県（協会けんぽ保険料率用）
  age: number;
  dependents: number;     // 扶養家族数
  activeFromYear?: number; // 適用開始年（省略=現在から適用）
  note?: string;
  updatedAt: string;
}

// 支出記録（家計簿）
export interface SpendingRecord {
  id: string;
  date: string;    // "YYYY-MM-DD"
  category: ExpenseCategory;
  name: string;    // 店名・内容
  amount: number;
  note?: string;
  createdAt: string;
}

// ローン
export type LoanType = "元利均等" | "元金均等";
export const LOAN_TYPES: LoanType[] = ["元利均等", "元金均等"];

export interface LoanPlan {
  id: string;
  name: string;        // 住宅ローン、カーローン など
  principal: number;   // 借入元本（円）
  annualRate: number;  // 年利（%）
  termMonths: number;  // 返済期間（月）
  startDate: string;   // "YYYY-MM"
  loanType: LoanType;
  note?: string;
  updatedAt: string;
}

// 保険プラン
export type InsuranceType =
  | "生命保険" | "医療保険" | "がん保険" | "火災保険"
  | "地震保険" | "車両保険" | "学資保険" | "その他";

export const INSURANCE_TYPES: InsuranceType[] = [
  "生命保険", "医療保険", "がん保険", "火災保険",
  "地震保険", "車両保険", "学資保険", "その他",
];

export interface InsurancePlan {
  id: string;
  name: string;
  type: InsuranceType;
  premiumMonthly: number;  // 月額保険料（円）
  startDate: string;       // "YYYY-MM"
  endDate?: string;        // "YYYY-MM"（未設定 = 終身）
  coverageAmount?: number; // 保険金額（円）
  note?: string;
  updatedAt: string;
}

// ライフイベント
export type LifeEventType =
  | "収入変化" | "支出増加" | "支出減少" | "一時支出" | "一時収入" | "その他";

export interface LifeEvent {
  id: string;
  title: string;
  year: number;
  type: LifeEventType;
  monthlyAmountChange: number; // 月次収支への継続的影響（+/-）
  oneTimeAmount: number;       // 一時金（0なら無し）
  note?: string;
  updatedAt: string;
}
