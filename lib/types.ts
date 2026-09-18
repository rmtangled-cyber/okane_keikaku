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

export interface PaymentItem {
  id: string;
  label: string;        // e.g. "手付金", "中間金", "残金"
  amount: number;
  dueDate: string;      // "YYYY-MM-DD"
  paid: boolean;
  note?: string;
}

export interface HomePurchase {
  propertyName: string;
  totalPrice: number;     // 物件価格（税込）
  miscCosts: number;      // 諸費用合計
  loanAmount: number;     // 住宅ローン借入額
  loanStartDate: string;  // "YYYY-MM-DD"
  monthlyPayment: number; // 毎月返済額
  payments: PaymentItem[];
  note?: string;
}
