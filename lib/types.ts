export type AssetCategory =
  | "現金・預金"
  | "株式"
  | "投資信託"
  | "債券"
  | "不動産"
  | "その他";

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
