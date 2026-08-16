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
