// 標準報酬月額テーブル（令和6年度）
const REMUNERATION_TABLE = [
  { standard: 58000, min: 0, max: 63000 },
  { standard: 68000, min: 63000, max: 73000 },
  { standard: 78000, min: 73000, max: 83000 },
  { standard: 88000, min: 83000, max: 93000 },
  { standard: 98000, min: 93000, max: 101000 },
  { standard: 104000, min: 101000, max: 107000 },
  { standard: 110000, min: 107000, max: 114000 },
  { standard: 118000, min: 114000, max: 122000 },
  { standard: 126000, min: 122000, max: 130000 },
  { standard: 134000, min: 130000, max: 138000 },
  { standard: 142000, min: 138000, max: 146000 },
  { standard: 150000, min: 146000, max: 155000 },
  { standard: 160000, min: 155000, max: 165000 },
  { standard: 170000, min: 165000, max: 175000 },
  { standard: 180000, min: 175000, max: 185000 },
  { standard: 190000, min: 185000, max: 195000 },
  { standard: 200000, min: 195000, max: 210000 },
  { standard: 220000, min: 210000, max: 230000 },
  { standard: 240000, min: 230000, max: 250000 },
  { standard: 260000, min: 250000, max: 270000 },
  { standard: 280000, min: 270000, max: 290000 },
  { standard: 300000, min: 290000, max: 310000 },
  { standard: 320000, min: 310000, max: 330000 },
  { standard: 340000, min: 330000, max: 350000 },
  { standard: 360000, min: 350000, max: 370000 },
  { standard: 380000, min: 370000, max: 395000 },
  { standard: 410000, min: 395000, max: 425000 },
  { standard: 440000, min: 425000, max: 455000 },
  { standard: 470000, min: 455000, max: 485000 },
  { standard: 500000, min: 485000, max: 515000 },
  { standard: 530000, min: 515000, max: 545000 },
  { standard: 560000, min: 545000, max: 575000 },
  { standard: 590000, min: 575000, max: 605000 },
  { standard: 620000, min: 605000, max: 635000 },
  { standard: 650000, min: 635000, max: Infinity },
];

// 協会けんぽ保険料率（令和6年3月〜、従業員負担は1/2）
export const KENPO_RATES: Record<string, number> = {
  "北海道": 10.21, "青森": 9.70, "岩手": 9.63, "宮城": 10.04,
  "秋田": 10.03, "山形": 9.84, "福島": 9.53, "茨城": 9.74,
  "栃木": 9.91, "群馬": 9.76, "埼玉": 9.80, "千葉": 9.77,
  "東京": 9.98, "神奈川": 10.02, "新潟": 9.35, "富山": 9.57,
  "石川": 9.96, "福井": 9.88, "山梨": 9.98, "長野": 9.49,
  "岐阜": 9.80, "静岡": 9.72, "愛知": 10.01, "三重": 9.81,
  "滋賀": 9.84, "京都": 10.11, "大阪": 10.29, "兵庫": 10.18,
  "奈良": 9.91, "和歌山": 9.87, "鳥取": 9.68, "島根": 9.86,
  "岡山": 10.05, "広島": 9.97, "山口": 9.92, "徳島": 10.07,
  "香川": 10.26, "愛媛": 9.87, "高知": 10.09, "福岡": 10.36,
  "佐賀": 10.68, "長崎": 10.21, "熊本": 10.32, "大分": 10.26,
  "宮崎": 9.85, "鹿児島": 10.05, "沖縄": 9.89,
};

export const PREFECTURES = Object.keys(KENPO_RATES);

function getStandardRemuneration(salary: number): number {
  return (REMUNERATION_TABLE.find(r => salary >= r.min && salary < r.max)
    ?? REMUNERATION_TABLE[REMUNERATION_TABLE.length - 1]).standard;
}

// 厚生年金保険料（被保険者負担 9.15%、上限 650,000）
function calcPension(salary: number): number {
  return Math.floor(Math.min(getStandardRemuneration(salary), 650000) * 0.0915);
}

// 健康保険料 + 介護保険料（被保険者負担、協会けんぽ）
function calcHealth(salary: number, prefecture: string, age: number): number {
  const std = getStandardRemuneration(salary);
  const healthRate = (KENPO_RATES[prefecture] ?? 9.98) / 100 / 2;
  const health = Math.floor(std * healthRate);
  // 介護保険：40歳以上65歳未満、1.60%の1/2
  const care = age >= 40 && age < 65 ? Math.floor(std * 0.008) : 0;
  return health + care;
}

// 雇用保険料（被保険者負担 0.6%）
function calcEmployment(salary: number): number {
  return Math.floor(salary * 0.006);
}

// 給与所得控除
function calcEmploymentDeduction(annualGross: number): number {
  if (annualGross <= 1625000) return 550000;
  if (annualGross <= 1800000) return Math.floor(annualGross * 0.4) - 100000;
  if (annualGross <= 3600000) return Math.floor(annualGross * 0.3) + 80000;
  if (annualGross <= 6600000) return Math.floor(annualGross * 0.2) + 440000;
  if (annualGross <= 8500000) return Math.floor(annualGross * 0.1) + 1100000;
  return 1950000;
}

// 所得税（月次、令和6年度）
function calcIncomeTax(grossMonthly: number, socialMonthly: number, dependents: number): number {
  const ag = grossMonthly * 12;
  const as_ = socialMonthly * 12;
  const employmentIncome = ag - calcEmploymentDeduction(ag);
  const taxable = Math.max(0,
    employmentIncome - 480000 - as_ - 380000 * dependents
  );
  let tax: number;
  if (taxable <= 1950000) tax = taxable * 0.05;
  else if (taxable <= 3300000) tax = taxable * 0.10 - 97500;
  else if (taxable <= 6950000) tax = taxable * 0.20 - 427500;
  else if (taxable <= 9000000) tax = taxable * 0.23 - 636000;
  else if (taxable <= 18000000) tax = taxable * 0.33 - 1536000;
  else if (taxable <= 40000000) tax = taxable * 0.40 - 2796000;
  else tax = taxable * 0.45 - 4796000;
  return Math.floor(Math.max(0, tax * 1.021) / 12);
}

// 住民税（月次）
function calcResidentTax(grossMonthly: number, socialMonthly: number, dependents: number): number {
  const ag = grossMonthly * 12;
  const as_ = socialMonthly * 12;
  const employmentIncome = ag - calcEmploymentDeduction(ag);
  const taxable = Math.max(0,
    employmentIncome - 430000 - as_ - 330000 * dependents
  );
  return Math.floor((taxable * 0.10 + 5000) / 12);
}

export interface TakeHomeResult {
  grossMonthly: number;
  pension: number;       // 厚生年金
  health: number;        // 健康保険 + 介護保険
  employment: number;    // 雇用保険
  incomeTax: number;     // 所得税
  residentTax: number;   // 住民税
  totalDeductions: number;
  takeHome: number;      // 手取り
}

export function calcTakeHome(
  grossMonthly: number,
  prefecture: string,
  age: number,
  dependents: number
): TakeHomeResult {
  const pension = calcPension(grossMonthly);
  const health = calcHealth(grossMonthly, prefecture, age);
  const employment = calcEmployment(grossMonthly);
  const social = pension + health + employment;
  const incomeTax = calcIncomeTax(grossMonthly, social, dependents);
  const residentTax = calcResidentTax(grossMonthly, social, dependents);
  const totalDeductions = social + incomeTax + residentTax;
  return {
    grossMonthly, pension, health, employment,
    incomeTax, residentTax, totalDeductions,
    takeHome: grossMonthly - totalDeductions,
  };
}
