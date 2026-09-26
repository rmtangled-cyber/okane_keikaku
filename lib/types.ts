export type AssetCategory =
  | "現金・預金"
  | "債券"
  | "不動産"
  | "暗号資産"
  | "その他";

export type AccountType =
  | "特定口座"
  | "NISA（成長投資枠）"
  | "NISA（つみたて投資枠）"
  | "つみたてNISA"
  | "一般口座"
  | "iDeCo";

export const TAX_RATE = 0.20315;

export function calcTax(gain: number, accountType: AccountType): number {
  if (gain <= 0) return 0;
  if (accountType.startsWith("NISA") || accountType === "つみたてNISA" || accountType === "iDeCo") return 0;
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
  memberId?: "self" | "spouse"; // 名義人
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
  fundCode?: string;             // ファンドコード（8桁英数字、任意）
  accountType: AccountType;
  memberId?: "self" | "spouse"; // 名義人
  purchaseAmount: number;        // 取得金額合計（円）
  currentValue: number;          // 現在評価額（円）
  expectedAnnualReturn: number;  // 期待年利（%）
  monthlyContribution: number;   // 月次積立額（円、0なら積立なし）
  monthlySavingDay?: number;     // 毎月の積立日（1〜28、デフォルト1日）
  lastAutoContribYearMonth?: string; // 最後に自動積立を適用した年月 "YYYY-MM"
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

// 貯金口座
export type SavingsAccountType = "普通" | "定期";

export interface SavingsAccount {
  id: string;
  bankName: string;       // 金融機関名
  accountName: string;    // 口座名（例: 給与口座）
  balance: number;        // 残高（円）
  interestRate: number;   // 金利（%）
  accountType: SavingsAccountType;
  memberId?: "self" | "spouse";
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

// ユーザープロフィール（共通設定）
export interface FamilyMember {
  type: "spouse" | "child";
  name?: string;
  birthYear: number;
  isDependent?: boolean;      // spouse only: 扶養家族かどうか
  dependentOf?: "self" | "spouse"; // child only: どちらの親の扶養か
}

export interface UserProfile {
  id: "default";
  displayName?: string;
  birthYear: number;
  prefecture: string;
  familyMembers: FamilyMember[];
  updatedAt: string;
}

// 収入プロファイル（給与・年金）
export interface IncomeProfile {
  id: string;
  name: string;            // ラベル（例: "現職"）
  memberId?: "self" | "spouse"; // 誰の収入か（省略=自分）
  incomeType?: "salary" | "pension"; // 収入の種類（省略=給与）
  grossMonthly: number;    // 額面月収（円）= grossAnnual/12 で自動計算
  grossAnnual?: number;    // 年収・基本給（ボーナス除く、円）
  bonusAnnual?: number;    // 年間ボーナス額面（円）
  prefecture: string;      // 都道府県（協会けんぽ保険料率用）
  age: number;
  dependents: number;      // 扶養家族数
  activeFromYear?: number; // 適用開始年（省略=現在から適用）
  activeUntilAge?: number; // 適用終了年齢（省略=無期限）
  // 年金専用フィールド
  pensionKoseiMonths?: number;  // 厚生年金加入月数
  pensionAvgMonthly?: number;   // 厚生年金期間の平均標準報酬月額（円）
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

// 住宅ローンシミュレーション設定
export interface DrawdownEntry {
  id: string;
  date: string;       // "YYYY-MM-DD"
  amountMan: number;  // 万円
  label?: string;     // 例: "契約金30%"
}

// 物件費用項目
export interface PropertyCostItem {
  id: string;
  name: string;           // 費用名（例: 手付金、残金決済）
  date: string;           // 支払日 "YYYY-MM-DD"
  amountMan: number;      // 金額（万円）
  paymentType?: "loan" | "self"; // ローン or 自己資金（省略=ローン）
}

export interface PropertyRateChange {
  id: string;
  fromYear: string;
  rate: string;
  extra: string; // 繰り上げ返済額（万円）
}

export interface PrepaymentEntry {
  id: string;
  fromYear: string;
  extra: string; // 万円
}

export interface RateScenarioEntry {
  id: string;
  fromYear: string;
  baseRate: string; // % e.g. "2.475"
}

// 物件・契約情報
export interface MortgageProperty {
  id: string;
  propertyName: string;
  borrowerId?: "self" | "spouse"; // 借入名義人
  bankName?: string;    // 金融機関名
  bankRate?: string;    // 固定金利（%）or レガシー変動金利
  discountRate?: string; // 優遇幅（%）変動金利物件
  isFixed?: boolean;     // true=固定金利, false/undefined=変動金利
  termYears?: string;   // 返済期間（年）
  rateChanges?: PropertyRateChange[]; // レガシー金利変更プラン
  prepayments?: PrepaymentEntry[];    // 繰り上げ返済プラン
  costItems: PropertyCostItem[];
  bonusRepaymentMan?: number; // ボーナス返済額（万円/回）
  bonusTimesPerYear?: number; // ボーナス返済回数（年N回、デフォルト2）
  bridgeLoanRate?: string;   // つなぎ融資金利（%）複数日付ローンで自動検出
  repaymentType?: "元利均等" | "元金均等";
  note?: string;
  updatedAt: string;
}

export interface MortgageSimPlan {
  bankName: string;
  bankRate: string;
  principalMan: string;
  termYears: string;
  monthlyIncomeMan?: string;
  borrowerIncomes?: Record<string, string>;
  periodSettings: { fromYear?: number; rate: string; extra: string }[];
  drawdownSchedule?: DrawdownEntry[];
  sharedBaseRate?: string;
  rateScenario?: RateScenarioEntry[];
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

// 固定資産税
export interface PropertyTaxEntry {
  id: string;
  name: string;             // 物件名
  landValue: number;        // 土地の固定資産税評価額（円）
  landArea: number;         // 土地面積（m²）
  isResidential: boolean;   // 住宅用地かどうか
  buildingValue: number;    // 建物の固定資産税評価額（円）
  hasUrbanTax: boolean;     // 都市計画税あり
  urbanTaxRate: number;     // 都市計画税率（%）例: 0.3
  // 不動産取得税用（任意）
  floorArea?: number;           // 延床面積（m²）
  isNewBuilding?: boolean;      // 新築かどうか（未設定=新築）
  isCertifiedHousing?: boolean; // 長期優良住宅認定
  buildYear?: number;           // 築年（中古住宅）
  // ライフプランシミュレーション用（任意）
  buildingCompleteYear?: number;      // 建物完成予定年（これ以降に住宅用地軽減・新築軽減を適用）
  expectedBuildingValue?: number;     // 完成後の建物評価額の見込み（シミュレーション用）
  note?: string;
  updatedAt: string;
}

export function calcPropertyTax(e: PropertyTaxEntry): {
  landFixedTax: number; buildingFixedTax: number;
  landUrbanTax: number; buildingUrbanTax: number;
  fixedTax: number; urbanTax: number; total: number;
  // 新築軽減（任意）
  newBuildingQualifies: boolean;
  newBuildingReductionYears: number;
  buildingFixedTaxReduced: number;
  totalReduced: number;
} {
  let landFixedBase: number;
  let landUrbanBase: number;
  if (e.isResidential && e.landArea > 0) {
    if (e.landArea <= 200) {
      landFixedBase = Math.floor(e.landValue / 6);
      landUrbanBase = Math.floor(e.landValue / 3);
    } else {
      const s = 200 / e.landArea;
      landFixedBase = Math.floor(e.landValue * (s / 6 + (1 - s) / 3));
      landUrbanBase = Math.floor(e.landValue * (s / 3 + (1 - s) * 2 / 3));
    }
  } else {
    landFixedBase = e.landValue;
    landUrbanBase = e.landValue;
  }
  const landFixedTax = Math.floor(landFixedBase * 0.014);
  const buildingFixedTax = Math.floor(e.buildingValue * 0.014);
  const landUrbanTax = e.hasUrbanTax ? Math.floor(landUrbanBase * (e.urbanTaxRate / 100)) : 0;
  const buildingUrbanTax = e.hasUrbanTax ? Math.floor(e.buildingValue * (e.urbanTaxRate / 100)) : 0;
  const fixedTax = landFixedTax + buildingFixedTax;
  const urbanTax = landUrbanTax + buildingUrbanTax;

  // 新築住宅の固定資産税軽減：延床50〜280m²、建物固定資産税のうち120m²相当分を1/2
  const floorArea = e.floorArea ?? 0;
  const isNew = e.isNewBuilding !== false;
  const newBuildingQualifies = isNew && floorArea >= 50 && floorArea <= 280;
  const newBuildingReductionYears = newBuildingQualifies
    ? (e.isCertifiedHousing ? 5 : 3) : 0;
  let buildingFixedTaxReduced = buildingFixedTax;
  if (newBuildingQualifies && floorArea > 0) {
    const qualifyingRatio = Math.min(120, floorArea) / floorArea;
    buildingFixedTaxReduced = Math.floor(buildingFixedTax * (1 - qualifyingRatio * 0.5));
  }
  const totalReduced = landFixedTax + buildingFixedTaxReduced + urbanTax;

  return {
    landFixedTax, buildingFixedTax, landUrbanTax, buildingUrbanTax,
    fixedTax, urbanTax, total: fixedTax + urbanTax,
    newBuildingQualifies, newBuildingReductionYears, buildingFixedTaxReduced, totalReduced,
  };
}

function usedHousingDeduction(buildYear: number): number {
  if (buildYear >= 1997) return 12000000;
  if (buildYear >= 1989) return 10000000;
  if (buildYear >= 1985) return 4500000;
  if (buildYear >= 1981) return 4200000;
  if (buildYear >= 1976) return 3500000;
  if (buildYear >= 1973) return 2300000;
  if (buildYear >= 1964) return 1500000;
  return 1000000;
}

export function calcAcquisitionTax(e: PropertyTaxEntry): {
  buildingDeduction: number;
  buildingTaxBase: number;
  buildingTax: number;
  landBaseTax: number;
  landReduction: number;
  landTax: number;
  total: number;
  qualifiesForReduction: boolean;
} | null {
  const floorArea = e.floorArea;
  if (!floorArea) return null;

  const isNew = e.isNewBuilding !== false;
  const qualifiesForReduction = floorArea >= 50 && floorArea <= 240;

  // Building
  let buildingDeduction = 0;
  if (qualifiesForReduction) {
    if (isNew) {
      buildingDeduction = e.isCertifiedHousing ? 13000000 : 12000000;
    } else {
      buildingDeduction = e.buildYear ? usedHousingDeduction(e.buildYear) : 12000000;
    }
  }
  const buildingTaxBase = Math.max(0, e.buildingValue - buildingDeduction);
  const buildingTax = Math.floor(buildingTaxBase * 0.03);

  // Land（住宅用の場合に軽減）
  const landBaseTax = Math.floor(e.landValue * 0.5 * 0.03);
  let landReduction = 0;
  if (qualifiesForReduction && e.landArea > 0) {
    const landPerM2 = e.landValue / e.landArea;
    const creditArea = Math.min(floorArea * 2, 200);
    landReduction = Math.max(45000, Math.floor(landPerM2 * 0.5 * creditArea * 0.03));
  }
  const landTax = Math.max(0, landBaseTax - landReduction);

  return { buildingDeduction, buildingTaxBase, buildingTax, landBaseTax, landReduction, landTax, total: buildingTax + landTax, qualifiesForReduction };
}

// 年ごとの固定資産税年額を返す（ライフプランシミュレーション用）
// buildingCompleteYear が設定されている場合：
//   完成前 → isResidential=false（更地扱い）、buildingValue=0 で計算
//   完成年以降 → 通常計算
//   新築軽減期間（完成年〜完成年+reductionYears-1）→ 軽減後税額
export function calcPropertyTaxForYear(e: PropertyTaxEntry, year: number): number {
  const completeYear = e.buildingCompleteYear;
  if (!completeYear || year >= completeYear) {
    // 建物あり（または buildingCompleteYear 未設定）
    // 完成後は expectedBuildingValue があればそちらを使う
    const postBuild: PropertyTaxEntry = completeYear && e.expectedBuildingValue != null
      ? { ...e, isResidential: true, buildingValue: e.expectedBuildingValue }
      : e;
    const r = calcPropertyTax(postBuild);
    if (!completeYear) return r.total;
    // 新築軽減期間かどうか
    const reductionYears = r.newBuildingReductionYears;
    if (reductionYears > 0 && year < completeYear + reductionYears) {
      return r.totalReduced;
    }
    return r.total;
  }
  // 建物未完成 → 更地として計算（住宅用地軽減なし、建物税額なし）
  const preBuild: PropertyTaxEntry = { ...e, isResidential: false, buildingValue: 0 };
  return calcPropertyTax(preBuild).total;
}

// 投資物件
export type InvestmentPropertyType = "区分マンション" | "一棟マンション" | "戸建て" | "その他";

export interface InvestmentProperty {
  id: string;
  name: string;
  location?: string;
  propertyType: InvestmentPropertyType;
  memberId?: "self" | "spouse";
  purchasePriceMan: number;    // 購入価格（万円）
  purchaseDate?: string;       // "YYYY-MM-DD"
  loanBalanceMan?: number;     // 借入残高（万円）
  loanMonthlyPayment?: number; // 月返済額（円）
  monthlyRent: number;         // 月額家賃収入（円）
  monthlyManagementFee?: number;   // 管理費（円/月）
  monthlyRepairReserve?: number;   // 修繕積立金（円/月）
  annualPropertyTax?: number;      // 固定資産税（円/年）
  monthlyOtherCosts?: number;      // その他コスト（円/月）
  note?: string;
  updatedAt: string;
}

// 注文住宅
export interface CustomHomeBasicInfo {
  builder: string;
  builderContact: string;
  manager: string;
  structure: string;
  totalAreaSqm: number;
  startDate: string;
  completionDate: string;
  note: string;
}

export interface CustomHomeRoom {
  id: string;
  name: string;
  order: number;
}

export const ANNOTATION_TYPES = ["照明", "コンセント・スイッチ", "クロス", "床材", "エアコン", "TV・LAN", "その他"] as const;
export type AnnotationType = typeof ANNOTATION_TYPES[number];

export interface FloorPlanAnnotation {
  id: string;
  x: number;
  y: number;
  type: string;
  label: string;
  note: string;
  roomId: string;
}

export interface FloorPlan {
  id: string;
  title: string;
  imageBase64: string;
  order: number;
  annotations: FloorPlanAnnotation[];
}

export const ROOM_SPEC_CATEGORIES = ["クロス", "床材", "照明", "建具", "タイル", "その他"] as const;
export type RoomSpecCategory = typeof ROOM_SPEC_CATEGORIES[number];

export interface RoomSpec {
  id: string;
  roomId: string;
  category: string;
  item: string;
  maker: string;
  quantity: number;
  unit: string;
  additionalCost: number;
  note: string;
}

export interface CustomHomeData {
  basicInfo: CustomHomeBasicInfo;
  rooms: CustomHomeRoom[];
  roomSpecs: RoomSpec[];
}

// ライフイベント
export type LifeEventType =
  | "収入変化" | "支出増加" | "支出減少" | "一時支出" | "一時収入" | "その他";

export interface LifeEvent {
  id: string;
  title: string;
  year: number;
  endYear?: number;            // 月次影響の終了年（省略=永続）
  type: LifeEventType;
  monthlyAmountChange: number; // 月次収支への継続的影響（+/-）
  oneTimeAmount: number;       // 一時金（0なら無し）
  note?: string;
  isDraft?: boolean;
  updatedAt: string;
}
