"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine,
  AreaChart, Area, BarChart, Bar,
} from "recharts";
import {
  Plus, TrendingUp, Wallet, Target, RefreshCw, Download,
  BarChart2, Layers, Receipt, MapPin, BookOpen, ChevronLeft,
  ChevronRight, CreditCard, Sun, Building2, Pencil, Trash2, UserRound, Landmark, CheckCircle2, Eye, PiggyBank, X,
} from "lucide-react";

import {
  Asset, AssetCategory, Goal, StockHolding, FundHolding,
  MonthlyExpense, IncomeProfile, LifeEvent, InsurancePlan,
  SpendingRecord, LoanPlan, ExpenseCategory, calcTax,
  MortgageSimPlan, MortgageProperty, RateScenarioEntry,
  UserProfile, PropertyTaxEntry, calcPropertyTax, calcPropertyTaxForYear,
  SavingsAccount, SavingsAccountType,
  InvestmentProperty, InvestmentPropertyType,
  getMemberLabel, getMemberOptions,
} from "@/lib/types";
import { applyMonthlyContributions } from "@/lib/autoContrib";
import {
  getAssets, saveAssets, loadAssets,
  getGoals, saveGoals, loadGoals,
  getSnapshots, saveSnapshots, loadSnapshots,
  exportToCSV,
  getStocks, saveStocks, loadStocks,
  getFunds, saveFunds, loadFunds,
  getSavingsAccounts, saveSavingsAccounts, loadSavingsAccounts,
  getInvestmentProperties, saveInvestmentProperties, loadInvestmentProperties,
  getExpenses, saveExpenses, loadExpenses,
  getIncomeProfiles, loadIncomeProfiles, upsertIncomeProfile, deleteIncomeProfileById,
  getLifeEvents, saveLifeEvents, loadLifeEvents,
  getInsurancePlans, saveInsurancePlans, loadInsurancePlans,
  getSpendingRecords, saveSpendingRecords, loadSpendingRecords,
  getLoanPlans, saveLoanPlans, loadLoanPlans,
  loadMortgageSimPlan,
  loadMortgageProperties,
  saveUserProfile, loadUserProfile,
  savePropertyTaxEntries, loadPropertyTaxEntries,
  clearAllUserData,
} from "@/lib/storage";
import { calcTakeHome } from "@/lib/taxCalc";
import { calcEqualPayment, loanEndYM, loanCurrentStatus, loanPaymentForYear, mortgageMonthlyPaymentByYear, mortgageMonthlyPaymentWithDrawdown } from "@/lib/loanCalc";
import AssetCard from "./AssetCard";
import AssetModal from "./AssetModal";
import GoalCard from "./GoalCard";
import GoalModal from "./GoalModal";
import StockCard from "./StockCard";
import StockModal from "./StockModal";
import FundCard from "./FundCard";
import FundModal from "./FundModal";
import IncomeProfileCard from "./IncomeProfileCard";
import IncomeProfileModal from "./IncomeProfileModal";
import LifeEventCard from "./LifeEventCard";
import LifeEventModal from "./LifeEventModal";
import LifeEventTemplateModal from "./LifeEventTemplateModal";
import ExpenseCard from "./ExpenseCard";
import ExpenseModal from "./ExpenseModal";
// ExpenseTemplateModal not used in new inline UI
import InsurancePlanCard from "./InsurancePlanCard";
import InsurancePlanModal from "./InsurancePlanModal";
import SpendingModal from "./SpendingModal";
import LoanCard from "./LoanCard";
import LoanModal from "./LoanModal";
import SolarCalc from "./SolarCalc";
import MortgageCalc from "./MortgageCalc";
import PropertyTaxModal from "./PropertyTaxModal";
import TaxChecklist from "./TaxChecklist";
import UserProfileTab from "./UserProfileTab";
import CustomHomeTab from "./CustomHomeTab";
import { useAuth } from "@/lib/auth-context";

const CATEGORY_COLOR: Record<string, string> = {
  "現金・預金": "#3b82f6",
  "株式": "#22c55e",
  "投資信託": "#a855f7",
  "債券": "#eab308",
  "不動産": "#f97316",
  "その他": "#6b7280",
};

const EXPENSE_CATEGORY_COLOR: Record<string, string> = {
  "食費": "#f97316", "住居費": "#3b82f6", "交通費": "#06b6d4",
  "水道光熱費": "#eab308", "通信費": "#8b5cf6", "医療費": "#ef4444",
  "娯楽費": "#ec4899", "教育費": "#22c55e", "保険料": "#6366f1", "その他": "#6b7280",
};

type Tab = "概要" | "株式" | "貯金" | "投資信託" | "投資物件" | "資産" | "目標" | "収支" | "家計簿" | "生活費" | "固定資産税" | "申請チェック" | "太陽光" | "住宅ローン" | "注文住宅" | "プロフィール";
type TabGroup = "トップ" | "資産" | "生活費" | "マイホーム" | "設定";

const LIFE_EXPENSE_PRESETS: { name: string; emoji: string; category: import("@/lib/types").ExpenseCategory; isFixed: boolean }[] = [
  { name: "家賃",     emoji: "🏠", category: "住居費",    isFixed: true  },
  { name: "食費",     emoji: "🍚", category: "食費",      isFixed: false },
  { name: "日用雑貨", emoji: "🛒", category: "その他",    isFixed: false },
  { name: "交通費",   emoji: "🚃", category: "交通費",    isFixed: true  },
  { name: "水道",     emoji: "💧", category: "水道光熱費",isFixed: true  },
  { name: "光熱",     emoji: "💡", category: "水道光熱費",isFixed: true  },
  { name: "通信",     emoji: "📱", category: "通信費",    isFixed: true  },
  { name: "医療",     emoji: "🏥", category: "医療費",    isFixed: false },
  { name: "教育",     emoji: "📚", category: "教育費",    isFixed: false },
  { name: "美容",     emoji: "💄", category: "その他",    isFixed: false },
  { name: "衣服",     emoji: "👕", category: "その他",    isFixed: false },
  { name: "車",       emoji: "🚗", category: "交通費",    isFixed: true  },
  { name: "交際費",   emoji: "🍻", category: "娯楽費",    isFixed: false },
  { name: "エンタメ", emoji: "🎮", category: "娯楽費",    isFixed: false },
  { name: "旅行",     emoji: "✈️", category: "娯楽費",    isFixed: false },
];

// ── Life Plan Simulation ───────────────────────────────────────────────────────

// 各 memberId (self/spouse) ごとに最新の有効プロファイルを1つずつ返す
// age は currentYear 時点での年齢として保存されている前提
function getActiveProfilesForYear(profiles: IncomeProfile[], year: number, baseYear: number): IncomeProfile[] {
  const groups = new Map<string, IncomeProfile>();
  for (const p of profiles) {
    if (p.activeFromYear && p.activeFromYear > year) continue;
    if (p.activeUntilAge) {
      const ageAtYear = p.age + (year - baseYear); // age = baseYear時点の年齢
      if (ageAtYear > p.activeUntilAge) continue;
    }
    const key = p.memberId ?? "self";
    const existing = groups.get(key);
    if (!existing || (p.activeFromYear ?? 0) >= (existing.activeFromYear ?? 0)) {
      groups.set(key, p);
    }
  }
  return [...groups.values()];
}

// 後方互換: 収支タブ等で単一プロファイルが必要な場合
function getIncomeForYear(profiles: IncomeProfile[], year: number, baseYear: number = new Date().getFullYear()): IncomeProfile | null {
  const active = getActiveProfilesForYear(profiles, year, baseYear);
  const self = active.find(p => (p.memberId ?? "self") === "self");
  return self ?? active[0] ?? null;
}

function computeWeightedReturn(funds: FundHolding[], stocks: StockHolding[], assets: Asset[]): number {
  const fundsVal = funds.reduce((s, f) => s + f.currentValue, 0);
  const stocksVal = stocks.reduce((s, h) => s + h.currentPrice * h.shares, 0);
  const total = fundsVal + stocksVal + assets.reduce((s, a) => s + a.amount, 0);
  if (total === 0) return 0;
  const fundsReturn = funds.reduce((s, f) => s + f.currentValue * (f.expectedAnnualReturn / 100), 0);
  return (fundsReturn + stocksVal * 0.05) / total;
}

interface BreakdownItem { label: string; monthly: number }
interface OneTimeItem { label: string; amount: number }
interface SimPoint {
  year: number; assets: number; label?: string;
  annualIncome: number; annualExpense: number; oneTime: number;
  incomeItems: BreakdownItem[];
  expenseItems: BreakdownItem[];
  oneTimeItems: OneTimeItem[];
}

function LifePlanTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: SimPoint }[]; label?: number }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const fmtY = (v: number) => v >= 100_000_000 ? `${(v / 100_000_000).toFixed(1)}億` : `${Math.round(v / 10000)}万`;
  const balance = d.annualIncome - d.annualExpense;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs min-w-[160px]">
      <div className="font-bold text-gray-800 mb-2 text-sm">{label}年</div>
      <div className="space-y-1.5">
        <div className="flex justify-between gap-4 text-teal-700">
          <span>収入</span><span>+{fmtY(d.annualIncome)}円</span>
        </div>
        <div className="flex justify-between gap-4 text-rose-600">
          <span>支出</span><span>−{fmtY(d.annualExpense)}円</span>
        </div>
        {d.oneTime !== 0 && (
          <div className={`flex justify-between gap-4 ${d.oneTime > 0 ? "text-blue-500" : "text-orange-500"}`}>
            <span>一時金</span><span>{d.oneTime > 0 ? "+" : ""}{fmtY(d.oneTime)}円</span>
          </div>
        )}
        <div className={`flex justify-between gap-4 border-t border-gray-100 pt-1.5 font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
          <span>収支</span><span>{balance >= 0 ? "+" : ""}{fmtY(balance)}円</span>
        </div>
        <div className="flex justify-between gap-4 text-violet-600 border-t border-gray-100 pt-1.5 font-bold">
          <span>総資産</span><span>{fmtY(d.assets)}円</span>
        </div>
      </div>
    </div>
  );
}

function buildPropPeriodSettings(
  prop: MortgageProperty,
  sharedBaseRate: number,
  rateScenario: RateScenarioEntry[],
  loanStartCalYear: number,
): { fromYear?: number; rate: string; extra: string }[] {
  const hasNewRateModel = prop.isFixed !== undefined || prop.discountRate !== undefined;
  if (!hasNewRateModel) {
    const propRate = parseFloat(prop.bankRate ?? "1.075") || 1.075;
    const changes = (prop.rateChanges ?? [])
      .filter(rc => parseInt(rc.fromYear) >= 1)
      .map(rc => ({ fromYear: parseInt(rc.fromYear), rate: rc.rate, extra: rc.extra ?? "0" }));
    return changes.length > 0 ? changes : [{ rate: String(propRate), extra: "0" }];
  }
  if (prop.isFixed) {
    const fixedRate = parseFloat(prop.bankRate ?? "1.5") || 1.5;
    const settings: { fromYear?: number; rate: string; extra: string }[] = [
      { fromYear: 1, rate: String(fixedRate), extra: "0" },
    ];
    for (const pp of (prop.prepayments ?? [])) {
      const year = parseInt(pp.fromYear) || 1;
      const ex = parseFloat(pp.extra) || 0;
      if (ex > 0) settings.push({ fromYear: year, rate: String(fixedRate), extra: String(ex) });
    }
    return settings;
  }
  const discount = parseFloat(prop.discountRate ?? "1.4") || 1.4;
  const sortedScen = [...rateScenario].sort((a, b) => parseInt(a.fromYear) - parseInt(b.fromYear));
  // rateScenario.fromYear is a calendar year; convert to loan year for this property
  const calToLoanYear = (calYear: number) => Math.max(1, calYear - loanStartCalYear + 1);
  const getBase = (loanYear: number) => {
    const calYear = loanStartCalYear + loanYear - 1;
    let base = sharedBaseRate;
    for (const rs of sortedScen) {
      if (parseInt(rs.fromYear) <= calYear) base = parseFloat(rs.baseRate) || base;
    }
    return base;
  };
  const changeYears = new Set<number>([1]);
  sortedScen.forEach(rs => {
    const loanY = calToLoanYear(parseInt(rs.fromYear));
    if (loanY > 1) changeYears.add(loanY);
  });
  (prop.prepayments ?? []).forEach(pp => { const y = parseInt(pp.fromYear); if (y >= 1) changeYears.add(y); });
  return Array.from(changeYears).map(year => ({
    fromYear: year,
    rate: String(Math.max(0, getBase(year) - discount)),
    extra: String((prop.prepayments ?? [])
      .filter(pp => parseInt(pp.fromYear) === year)
      .reduce((s, pp) => s + (parseFloat(pp.extra) || 0), 0)),
  }));
}

function calcMortgagePaymentForSimYear(
  props: MortgageProperty[],
  simStartYear: number,
  simYearIndex: number,
  sharedBaseRate: number,
  rateScenario: RateScenarioEntry[],
): number {
  let total = 0;
  const calYear = simStartYear + simYearIndex;
  for (const prop of props) {
    const loanCostItems = (prop.costItems ?? []).filter(c => (c.paymentType ?? "loan") === "loan");
    const principal = loanCostItems.reduce((s, c) => s + (c.amountMan || 0), 0) * 10000;
    if (principal <= 0) continue;
    const termYears = parseInt(prop.termYears ?? "35") || 35;
    const datedItems = loanCostItems.filter(c => c.date);
    const sortedDates = datedItems.map(c => c.date!).sort();
    const firstDate = sortedDates[0];
    const lastDate = sortedDates[sortedDates.length - 1];
    const firstYear = firstDate ? parseInt(firstDate.slice(0, 4)) : calYear;
    const loanStartYear = lastDate ? parseInt(lastDate.slice(0, 4)) : simStartYear;

    const distinctDates = new Set(datedItems.map(c => c.date!));
    const hasBridge = distinctDates.size >= 2 && !!prop.bridgeLoanRate;

    if (hasBridge && calYear >= firstYear && calYear < loanStartYear) {
      const bridgeRate = parseFloat(prop.bridgeLoanRate!) || 0;
      const disbursed = loanCostItems
        .filter(c => c.date && parseInt(c.date.slice(0, 4)) <= calYear)
        .reduce((s, c) => s + (c.amountMan || 0), 0) * 10000;
      total += Math.floor(disbursed * bridgeRate / 100 / 12);
    } else if (calYear >= loanStartYear) {
      const loanYearIndex = calYear - loanStartYear;
      if (loanYearIndex >= termYears) continue;
      const periodSettings = buildPropPeriodSettings(prop, sharedBaseRate, rateScenario, loanStartYear);
      const paymentsByYear = mortgageMonthlyPaymentByYear(principal, termYears, periodSettings, prop.repaymentType ?? "元利均等");
      total += paymentsByYear[loanYearIndex] ?? 0;
    }
  }
  return total;
}

function simulate(
  startAssets: number,
  profiles: IncomeProfile[],
  expenses: MonthlyExpense[],
  insurancePlans: InsurancePlan[],
  loanPlans: LoanPlan[],
  lifeEvents: LifeEvent[],
  weightedReturn: number,
  startYear: number,
  yearsToProject: number,
  mortgageSimPlan?: MortgageSimPlan | null,
  propertyTaxEntries?: PropertyTaxEntry[],
  inflationRate?: number,
  funds?: FundHolding[],
  mortgageProperties?: MortgageProperty[],
  simSharedBaseRate?: number,
  simRateScenario?: RateScenarioEntry[],
  investmentProperties?: InvestmentProperty[],
): SimPoint[] {
  const points: SimPoint[] = [];
  let assets = startAssets;

  const mortgageTermYears = mortgageSimPlan ? (parseInt(mortgageSimPlan.termYears) || 35) : 0;
  // 年別月次返済額（変動金利・繰上返済・分割実行を反映）
  const mortgagePaymentByYear: number[] = (() => {
    if (!mortgageSimPlan) return [];
    const drawdowns = mortgageSimPlan.drawdownSchedule?.filter(d => d.amountMan > 0) ?? [];
    if (drawdowns.length > 0) {
      return mortgageMonthlyPaymentWithDrawdown(
        mortgageTermYears,
        drawdowns.map(d => ({ date: d.date, amountMan: d.amountMan })),
        mortgageSimPlan.periodSettings ?? [],
        startYear,
      );
    }
    const principal = (parseFloat(mortgageSimPlan.principalMan) || 0) * 10000;
    if (principal <= 0) return [];
    if (mortgageSimPlan.periodSettings?.length) {
      return mortgageMonthlyPaymentByYear(principal, mortgageTermYears, mortgageSimPlan.periodSettings);
    }
    const rate = parseFloat(mortgageSimPlan.bankRate) || 0;
    const termMonths = mortgageTermYears * 12;
    const monthly = calcEqualPayment(principal, rate, termMonths);
    return Array(mortgageTermYears).fill(monthly);
  })();

  for (let i = 0; i <= yearsToProject; i++) {
    const year = startYear + i;

    // Income — 全 memberId 分を合算
    const activeProfiles = getActiveProfilesForYear(profiles, year, startYear);
    let takeHome = 0;
    let bonusTakeHome = 0;
    const incomeItemsFromProfiles: BreakdownItem[] = [];
    for (const p of activeProfiles) {
      // grossAnnual = ボーナス込み年収、bonusAnnual = うちボーナス額
      const baseAnnual = p.grossAnnual ?? (p.grossMonthly * 12);
      const bonusAnnual = p.bonusAnnual ?? 0;
      // 月次給与（ボーナス除く）で社保・税計算
      const monthlyBase = Math.round((baseAnnual - bonusAnnual) / 12);
      const result = calcTakeHome(monthlyBase, p.prefecture, p.age + (year - startYear), p.dependents);
      const pTakeHome = result.takeHome;
      const pBonus = bonusAnnual > 0 && monthlyBase > 0
        ? Math.round(bonusAnnual * (pTakeHome / monthlyBase))
        : 0;
      takeHome += pTakeHome;
      bonusTakeHome += pBonus;
      incomeItemsFromProfiles.push({ label: p.name, monthly: pTakeHome + Math.round(pBonus / 12) });
    }

    // Fixed expenses (inflation-adjusted)
    const baseExpenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
    const expenseTotal = inflationRate && inflationRate > 0
      ? Math.round(baseExpenseTotal * Math.pow(1 + inflationRate, i))
      : baseExpenseTotal;

    // Insurance (active in this year)
    const insuranceTotal = insurancePlans.filter(p => {
      const startY = parseInt(p.startDate.split("-")[0]);
      const endY = p.endDate ? parseInt(p.endDate.split("-")[0]) : 9999;
      return year >= startY && year <= endY;
    }).reduce((s, p) => s + p.premiumMonthly, 0);

    // Loan payments active this year
    const loanTotal = loanPlans.reduce((s, l) => s + loanPaymentForYear(
      l.principal, l.annualRate, l.termMonths, l.loanType, l.startDate, year
    ), 0);

    // Mortgage payment: per-property if available, otherwise legacy mortgageSimPlan
    const mortgagePayment = (mortgageProperties && mortgageProperties.length > 0)
      ? calcMortgagePaymentForSimYear(mortgageProperties, startYear, i, simSharedBaseRate ?? 2.475, simRateScenario ?? [])
      : (i < mortgageTermYears ? (mortgagePaymentByYear[i] ?? 0) : 0);

    // Life events cumulative monthly（endYearがある場合はその年まで）
    const cumulativeMonthly = lifeEvents
      .filter(e => e.year <= year && (e.endYear === undefined || e.endYear >= year))
      .reduce((s, e) => s + e.monthlyAmountChange, 0);

    // One-time events this year
    const yearOneTimeEvents = lifeEvents.filter(e => e.year === year && e.oneTimeAmount !== 0);
    const oneTime = yearOneTimeEvents.reduce((s, e) => s + e.oneTimeAmount, 0);
    const oneTimeItems: OneTimeItem[] = yearOneTimeEvents.map(e => ({ label: e.title, amount: e.oneTimeAmount }));

    // takeHome には既にボーナス手取り月換算が含まれている（incomeItemsFromProfiles 側で合算済み）
    const totalTakeHomeMonthly = takeHome + bonusTakeHome / 12;
    const propTaxAnnual = (propertyTaxEntries ?? []).reduce((s, e) => s + calcPropertyTaxForYear(e, year), 0);
    const propTax = propTaxAnnual / 12;

    // 投資物件キャッシュフロー
    const investmentRentMonthly = (investmentProperties ?? []).reduce((s, p) => s + p.monthlyRent, 0);
    const investmentCostMonthly = (investmentProperties ?? []).reduce((s, p) =>
      s + (p.monthlyManagementFee ?? 0) + (p.monthlyRepairReserve ?? 0)
        + (p.annualPropertyTax ?? 0) / 12 + (p.monthlyOtherCosts ?? 0) + (p.loanMonthlyPayment ?? 0), 0);

    const monthlyCashFlow = totalTakeHomeMonthly - expenseTotal - insuranceTotal - loanTotal - mortgagePayment - propTax + cumulativeMonthly + investmentRentMonthly - investmentCostMonthly;
    const annualCashFlow = monthlyCashFlow * 12;
    const investmentReturn = i > 0 ? assets * weightedReturn : 0;

    if (i > 0) assets = assets + annualCashFlow + oneTime + investmentReturn;

    const yearEvents = lifeEvents.filter(e => e.year === year);

    // 継続的収入増のライフイベントを個別に展開
    const incomeItems: BreakdownItem[] = [...incomeItemsFromProfiles];
    lifeEvents
      .filter(e => e.monthlyAmountChange > 0 && e.year <= year && (e.endYear === undefined || e.endYear >= year))
      .forEach(e => incomeItems.push({ label: e.title, monthly: e.monthlyAmountChange }));

    // 投資信託月次積立（キャッシュフロー計算には含めないが内訳に表示）
    const fundMonthly = (funds ?? []).reduce((s, f) => s + (f.monthlyContribution ?? 0), 0);

    const expenseItems: BreakdownItem[] = [];
    if (expenseTotal > 0) expenseItems.push({ label: "生活費", monthly: expenseTotal });
    if (insuranceTotal > 0) expenseItems.push({ label: "保険料", monthly: insuranceTotal });
    if (loanTotal > 0) expenseItems.push({ label: "ローン返済", monthly: loanTotal });
    if (fundMonthly > 0) expenseItems.push({ label: "投資信託積立", monthly: fundMonthly });
    if (mortgagePayment > 0) expenseItems.push({ label: "住宅ローン", monthly: mortgagePayment });
    if (propTaxAnnual > 0) expenseItems.push({ label: "固定資産税", monthly: propTaxAnnual / 12 });
    if (investmentCostMonthly > 0) expenseItems.push({ label: "投資物件コスト", monthly: investmentCostMonthly });
    // 継続的支出増のライフイベントを個別に展開
    lifeEvents
      .filter(e => e.monthlyAmountChange < 0 && e.year <= year && (e.endYear === undefined || e.endYear >= year))
      .forEach(e => expenseItems.push({ label: e.title, monthly: Math.abs(e.monthlyAmountChange) }));

    if (investmentRentMonthly > 0) incomeItems.push({ label: "投資物件家賃", monthly: investmentRentMonthly });

    points.push({
      year,
      assets: Math.round(assets),
      label: yearEvents.map(e => e.title).join(" / ") || undefined,
      annualIncome: Math.round((totalTakeHomeMonthly + Math.max(0, cumulativeMonthly) + investmentRentMonthly) * 12),
      annualExpense: Math.round((expenseTotal + insuranceTotal + loanTotal + mortgagePayment + propTax + fundMonthly + investmentCostMonthly + Math.max(0, -cumulativeMonthly)) * 12),
      oneTime,
      incomeItems,
      expenseItems,
      oneTimeItems,
    });
  }
  return points;
}

export default function Dashboard() {
  const { user, loading: authLoading, viewerOwnerUid, viewerDisplayName, signIn, signOut } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stocks, setStocks] = useState<StockHolding[]>([]);
  const [funds, setFunds] = useState<FundHolding[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [snapshots, setSnapshots] = useState<{ month: string; total: number }[]>([]);
  const [expenses, setExpenses] = useState<MonthlyExpense[]>([]);
  const [incomeProfiles, setIncomeProfiles] = useState<IncomeProfile[]>([]);
  const incomeLoadedRef = useRef(false);
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([]);
  const [insurancePlans, setInsurancePlans] = useState<InsurancePlan[]>([]);
  const [spendingRecords, setSpendingRecords] = useState<SpendingRecord[]>([]);
  const [loanPlans, setLoanPlans] = useState<LoanPlan[]>([]);
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([]);
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [editingSavings, setEditingSavings] = useState<SavingsAccount | null>(null);
  const [investmentProperties, setInvestmentProperties] = useState<InvestmentProperty[]>([]);
  const [showInvestmentPropertyModal, setShowInvestmentPropertyModal] = useState(false);
  const [editingInvestmentProperty, setEditingInvestmentProperty] = useState<InvestmentProperty | null>(null);
  const [mortgageSimPlan, setMortgageSimPlan] = useState<MortgageSimPlan | null>(null);
  const [mortgageProperties, setMortgageProperties] = useState<MortgageProperty[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [propertyTaxEntries, setPropertyTaxEntries] = useState<PropertyTaxEntry[]>([]);
  const [showPropertyTaxModal, setShowPropertyTaxModal] = useState(false);
  const [editingPropertyTax, setEditingPropertyTax] = useState<PropertyTaxEntry | null>(null);
  const [tab, setTab] = useState<Tab>(() => {
    try {
      const saved = localStorage.getItem("okane_tab");
      const tabs: Tab[] = ["概要", "株式", "貯金", "投資信託", "投資物件", "生活費", "住宅ローン", "固定資産税", "太陽光", "申請チェック", "プロフィール"];
      return (tabs.includes(saved as Tab) ? saved : "概要") as Tab;
    } catch { return "概要"; }
  });

  const handleTabChange = (t: Tab) => {
    setTab(t);
    try { localStorage.setItem("okane_tab", t); } catch { /* ignore */ }
  };

  const TAB_GROUPS: { group: TabGroup; icon: React.ReactNode; tabs: { key: Tab; label: string; icon: React.ReactNode }[] }[] = [
    { group: "トップ", icon: <BarChart2 size={14} />, tabs: [
      { key: "概要", label: "サマリ", icon: <BarChart2 size={13} /> },
    ]},
    { group: "資産", icon: <Wallet size={14} />, tabs: [
      { key: "株式",     label: "株式",     icon: <TrendingUp size={13} /> },
      { key: "貯金",     label: "貯金",     icon: <PiggyBank size={13} /> },
      { key: "投資信託", label: "投資信託", icon: <Layers size={13} /> },
      { key: "投資物件", label: "投資物件", icon: <Building2 size={13} /> },
    ]},
    { group: "生活費", icon: <BookOpen size={14} />, tabs: [
      { key: "生活費", label: "生活費", icon: <BookOpen size={13} /> },
    ]},
    { group: "マイホーム", icon: <Building2 size={14} />, tabs: [
      { key: "注文住宅",    label: "注文住宅",    icon: <Building2 size={13} /> },
      { key: "住宅ローン",  label: "住宅ローン",  icon: <Building2 size={13} /> },
      { key: "固定資産税",  label: "固定資産税",  icon: <Landmark size={13} /> },
      { key: "太陽光",      label: "太陽光",      icon: <Sun size={13} /> },
      { key: "申請チェック", label: "申請チェック", icon: <CheckCircle2 size={13} /> },
    ]},
    { group: "設定", icon: <UserRound size={14} />, tabs: [
      { key: "プロフィール", label: "プロフィール", icon: <UserRound size={13} /> },
    ]},
  ];

  const getGroupForTab = (t: Tab): TabGroup => {
    for (const g of TAB_GROUPS) {
      if (g.tabs.some(s => s.key === t)) return g.group;
    }
    return "トップ";
  };

  // Modal states
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [editingStock, setEditingStock] = useState<StockHolding | null>(null);
  const [showFundModal, setShowFundModal] = useState(false);
  const [editingFund, setEditingFund] = useState<FundHolding | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<MonthlyExpense | null>(null);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeProfile | null>(null);
  const [showLifeEventModal, setShowLifeEventModal] = useState(false);
  const [editingLifeEvent, setEditingLifeEvent] = useState<LifeEvent | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showExpenseTemplateModal, setShowExpenseTemplateModal] = useState(false);
  const [inflationRate, setInflationRate] = useState<number>(0.005);
  // 生活費カテゴリ入力用の一時state（name → 入力文字列）
  const [expenseInputs, setExpenseInputs] = useState<Record<string, string>>({});
  const [draftEvents, setDraftEvents] = useState<LifeEvent[]>([]);
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<InsurancePlan | null>(null);
  const [showSpendingModal, setShowSpendingModal] = useState(false);
  const [editingSpending, setEditingSpending] = useState<SpendingRecord | null>(null);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanPlan | null>(null);

  // 家計簿 month
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  // ライフプラン: クリックで選択した年のポイント
  const [selectedSimPoint, setSelectedSimPoint] = useState<SimPoint | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    loadAssets().then(setAssets);
    loadStocks().then(setStocks);
    loadFunds().then(loaded => {
      const { funds: withContrib, changed } = applyMonthlyContributions(loaded);
      setFunds(withContrib);
      if (changed && !viewerOwnerUid) saveFunds(withContrib);
    });
    loadGoals().then(setGoals);
    loadSnapshots().then(setSnapshots);
    loadExpenses().then(setExpenses);
    incomeLoadedRef.current = false;
    loadIncomeProfiles().then(data => { incomeLoadedRef.current = true; setIncomeProfiles(data); });
    loadLifeEvents().then(setLifeEvents);
    loadInsurancePlans().then(setInsurancePlans);
    loadSpendingRecords().then(setSpendingRecords);
    loadLoanPlans().then(setLoanPlans);
    loadSavingsAccounts().then(setSavingsAccounts);
    loadInvestmentProperties().then(setInvestmentProperties);
    loadMortgageSimPlan().then(plan => { if (plan) setMortgageSimPlan(plan); });
    loadMortgageProperties().then(setMortgageProperties);
    loadUserProfile().then(p => { if (p) setUserProfile(p); });
    loadPropertyTaxEntries().then(setPropertyTaxEntries);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, viewerOwnerUid]);

  const handleClearAllData = useCallback(async () => {
    if (!confirm("すべてのデータを削除します。この操作は元に戻せません。続けますか？")) return;
    await clearAllUserData();
    setAssets([]); setStocks([]); setFunds([]); setGoals([]); setSnapshots([]);
    setExpenses([]); setIncomeProfiles([]); setLifeEvents([]); setInsurancePlans([]);
    setSpendingRecords([]); setLoanPlans([]); setPropertyTaxEntries([]);
  }, []);

  // ── Totals ────────────────────────────────────────────
  const stocksTotal = stocks.reduce((s, h) => s + h.currentPrice * h.shares, 0);
  const fundsTotal = funds.reduce((s, f) => s + f.currentValue, 0);
  const assetsTotal = assets.reduce((s, a) => s + a.amount, 0);
  const savingsTotal = savingsAccounts.reduce((s, a) => s + a.balance, 0);
  const grandTotal = stocksTotal + fundsTotal + assetsTotal + savingsTotal;

  const stocksGain = stocks.reduce((s, h) => s + (h.currentPrice - h.purchasePrice) * h.shares, 0);
  const stocksTax = stocks.reduce((s, h) => s + calcTax((h.currentPrice - h.purchasePrice) * h.shares, h.accountType), 0);
  const fundsGain = funds.reduce((s, f) => s + (f.currentValue - f.purchaseAmount), 0);
  const fundsTax = funds.reduce((s, f) => s + calcTax(f.currentValue - f.purchaseAmount, f.accountType), 0);

  // ── 収支 ──────────────────────────────────────────────
  const nowYM = new Date().toISOString().slice(0, 7);
  const currentYear = new Date().getFullYear();
  const primaryProfile = getIncomeForYear(incomeProfiles, currentYear);
  const takeHomeResult = primaryProfile
    ? calcTakeHome(primaryProfile.grossMonthly, primaryProfile.prefecture, primaryProfile.age, primaryProfile.dependents)
    : null;
  const monthlyTakeHome = takeHomeResult?.takeHome ?? 0;
  const fixedExpenses = expenses.filter(e => e.isFixed).reduce((s, e) => s + e.amount, 0);
  const variableExpenses = expenses.filter(e => !e.isFixed).reduce((s, e) => s + e.amount, 0);
  const activeInsurance = insurancePlans.filter(p => !p.endDate || p.endDate > nowYM);
  const insurancePremiums = activeInsurance.reduce((s, p) => s + p.premiumMonthly, 0);
  const activeLoans = loanPlans.filter(l => {
    const endYM = loanEndYM(l.startDate, l.termMonths);
    return l.startDate <= nowYM && endYM >= nowYM;
  });
  const loanPaymentsTotal = activeLoans.reduce((s, l) => {
    const status = loanCurrentStatus(l.principal, l.annualRate, l.termMonths, l.loanType, l.startDate);
    return s + status.currentPayment;
  }, 0);
  // 住宅ローンシミュレーターの今月返済額（現在年の月額）
  const mortgageMonthlyNow = useMemo(() => {
    if (mortgageProperties.length > 0) {
      const baseRate = parseFloat(mortgageSimPlan?.sharedBaseRate ?? "2.475") || 2.475;
      const rateScen = mortgageSimPlan?.rateScenario ?? [];
      return calcMortgagePaymentForSimYear(mortgageProperties, currentYear, 0, baseRate, rateScen);
    }
    if (!mortgageSimPlan) return 0;
    const termYears = parseInt(mortgageSimPlan.termYears) || 0;
    if (termYears <= 0) return 0;
    const drawdowns = mortgageSimPlan.drawdownSchedule?.filter(d => d.amountMan > 0) ?? [];
    if (drawdowns.length > 0) {
      const arr = mortgageMonthlyPaymentWithDrawdown(
        termYears,
        drawdowns.map(d => ({ date: d.date, amountMan: d.amountMan })),
        mortgageSimPlan.periodSettings ?? [],
        currentYear,
      );
      return arr[0] ?? 0;
    }
    const principal = (parseFloat(mortgageSimPlan.principalMan) || 0) * 10000;
    if (principal <= 0) return 0;
    if (mortgageSimPlan.periodSettings?.length) {
      return mortgageMonthlyPaymentByYear(principal, termYears, mortgageSimPlan.periodSettings)[0] ?? 0;
    }
    const rate = parseFloat(mortgageSimPlan.bankRate) || 0;
    return calcEqualPayment(principal, rate, termYears * 12);
  }, [mortgageProperties, mortgageSimPlan, currentYear]);

  const totalExpenses = fixedExpenses + variableExpenses + insurancePremiums + loanPaymentsTotal + mortgageMonthlyNow;
  const monthlySavings = monthlyTakeHome - totalExpenses;

  // ── 家計簿 ────────────────────────────────────────────
  const monthRecords = useMemo(() =>
    spendingRecords
      .filter(r => r.date.startsWith(selectedMonth))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [spendingRecords, selectedMonth]
  );
  const monthTotal = monthRecords.reduce((s, r) => s + r.amount, 0);
  const categoryTotals = useMemo(() => {
    const map = new Map<ExpenseCategory, number>();
    for (const r of monthRecords) map.set(r.category, (map.get(r.category) ?? 0) + r.amount);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [monthRecords]);
  const budgetMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of expenses) m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
    return m;
  }, [expenses]);

  function shiftMonth(delta: number) {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  // Pie data
  const pieData = [
    { name: "株式", value: stocksTotal },
    { name: "投資信託", value: fundsTotal },
    ...Object.entries(
      assets.reduce<Partial<Record<AssetCategory, number>>>((acc, a) => {
        acc[a.category] = (acc[a.category] ?? 0) + a.amount; return acc;
      }, {})
    ).map(([name, value]) => ({ name, value: value as number })),
  ].filter(d => d.value > 0);

  const memberOptions = useMemo(() => getMemberOptions(userProfile), [userProfile]);

  // ── Life Plan Simulation ──────────────────────────────
  const weightedReturn = computeWeightedReturn(funds, stocks, assets);
  const selfAge = userProfile ? currentYear - userProfile.birthYear : 40;
  const simYears = Math.max(10, 90 - selfAge);
  const propertyTaxAnnual = propertyTaxEntries.reduce((s, e) => s + calcPropertyTax(e).total, 0);
  const simData = simulate(
    grandTotal, incomeProfiles, expenses, insurancePlans, loanPlans,
    lifeEvents, weightedReturn, currentYear, simYears, mortgageSimPlan,
    propertyTaxEntries, inflationRate, funds,
    mortgageProperties,
    parseFloat(mortgageSimPlan?.sharedBaseRate ?? "2.475") || 2.475,
    mortgageSimPlan?.rateScenario ?? [],
    investmentProperties,
  );

  // ── CRUD callbacks ────────────────────────────────────
  const handleSaveAsset = useCallback((data: Omit<Asset, "id" | "updatedAt">) => {
    setAssets(prev => {
      const next = editingAsset
        ? prev.map(a => a.id === editingAsset.id ? { ...a, ...data, updatedAt: new Date().toISOString() } : a)
        : [...prev, { id: Date.now().toString(), ...data, updatedAt: new Date().toISOString() }];
      saveAssets(next); return next;
    });
    setShowAssetModal(false); setEditingAsset(null);
  }, [editingAsset]);
  const handleDeleteAsset = useCallback((id: string) => {
    setAssets(prev => { const next = prev.filter(a => a.id !== id); saveAssets(next); return next; });
  }, []);

  const handleSaveStock = useCallback((data: Omit<StockHolding, "id" | "updatedAt">) => {
    setStocks(prev => {
      const next = editingStock
        ? prev.map(s => s.id === editingStock.id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s)
        : [...prev, { id: Date.now().toString(), ...data, updatedAt: new Date().toISOString() }];
      saveStocks(next); return next;
    });
    setShowStockModal(false); setEditingStock(null);
  }, [editingStock]);
  const handleDeleteStock = useCallback((id: string) => {
    setStocks(prev => { const next = prev.filter(s => s.id !== id); saveStocks(next); return next; });
  }, []);

  const handleSaveFund = useCallback((data: Omit<FundHolding, "id" | "updatedAt">) => {
    setFunds(prev => {
      const next = editingFund
        ? prev.map(f => f.id === editingFund.id ? { ...f, ...data, lastAutoContribYearMonth: f.lastAutoContribYearMonth, updatedAt: new Date().toISOString() } : f)
        : [...prev, { id: Date.now().toString(), ...data, updatedAt: new Date().toISOString() }];
      saveFunds(next); return next;
    });
    setShowFundModal(false); setEditingFund(null);
  }, [editingFund]);
  const handleDeleteFund = useCallback((id: string) => {
    setFunds(prev => { const next = prev.filter(f => f.id !== id); saveFunds(next); return next; });
  }, []);

  const handleSaveGoal = useCallback((data: Omit<Goal, "id">) => {
    setGoals(prev => {
      const next = editingGoal
        ? prev.map(g => g.id === editingGoal.id ? { ...g, ...data } : g)
        : [...prev, { id: Date.now().toString(), ...data }];
      saveGoals(next); return next;
    });
    setShowGoalModal(false); setEditingGoal(null);
  }, [editingGoal]);
  const handleDeleteGoal = useCallback((id: string) => {
    if (!confirm("この目標を削除しますか？")) return;
    setGoals(prev => { const next = prev.filter(g => g.id !== id); saveGoals(next); return next; });
  }, []);

  const handleSaveExpense = useCallback((data: Omit<MonthlyExpense, "id" | "updatedAt">) => {
    setExpenses(prev => {
      const next = editingExpense
        ? prev.map(e => e.id === editingExpense.id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e)
        : [...prev, { id: Date.now().toString(), ...data, updatedAt: new Date().toISOString() }];
      saveExpenses(next); return next;
    });
    setShowExpenseModal(false); setEditingExpense(null);
  }, [editingExpense]);
  const handleDeleteExpense = useCallback((id: string) => {
    setExpenses(prev => { const next = prev.filter(e => e.id !== id); saveExpenses(next); return next; });
  }, []);

  const handleSetExpenseAmount = useCallback((preset: typeof LIFE_EXPENSE_PRESETS[number], amount: number) => {
    setExpenses(prev => {
      const existing = prev.find(e => e.name === preset.name);
      let next: typeof prev;
      if (amount <= 0) {
        next = existing ? prev.filter(e => e.name !== preset.name) : prev;
      } else if (existing) {
        next = prev.map(e => e.name === preset.name
          ? { ...e, amount, updatedAt: new Date().toISOString() }
          : e);
      } else {
        next = [...prev, {
          id: `life_${preset.name}_${Date.now()}`,
          name: preset.name,
          category: preset.category,
          amount,
          isFixed: preset.isFixed,
          updatedAt: new Date().toISOString(),
        }];
      }
      saveExpenses(next);
      return next;
    });
  }, []);

  const handleSaveIncome = useCallback(async (data: Omit<IncomeProfile, "id" | "updatedAt">) => {
    if (!incomeLoadedRef.current) return;
    const profile: IncomeProfile = editingIncome
      ? { ...editingIncome, ...data, updatedAt: new Date().toISOString() }
      : { id: Date.now().toString(), ...data, updatedAt: new Date().toISOString() };
    try {
      await upsertIncomeProfile(profile);
    } catch (e) {
      console.error("収入の保存に失敗:", e);
      alert("収入の保存に失敗しました。ログイン状態を確認してください。");
      return;
    }
    setIncomeProfiles(prev =>
      editingIncome ? prev.map(p => p.id === editingIncome.id ? profile : p) : [...prev, profile]
    );
    setShowIncomeModal(false); setEditingIncome(null);
  }, [editingIncome]);
  const handleDeleteIncome = useCallback(async (id: string) => {
    if (!incomeLoadedRef.current) return;
    try {
      await deleteIncomeProfileById(id);
    } catch (e) {
      console.error("収入の削除に失敗:", e);
      alert("収入の削除に失敗しました。");
      return;
    }
    setIncomeProfiles(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleSaveLifeEvent = useCallback((data: Omit<LifeEvent, "id" | "updatedAt">) => {
    setLifeEvents(prev => {
      const next = editingLifeEvent
        ? prev.map(e => e.id === editingLifeEvent.id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e)
        : [...prev, { id: Date.now().toString(), ...data, updatedAt: new Date().toISOString() }];
      saveLifeEvents(next); return next;
    });
    setShowLifeEventModal(false); setEditingLifeEvent(null);
  }, [editingLifeEvent]);
  const handleDeleteLifeEvent = useCallback((id: string) => {
    setLifeEvents(prev => { const next = prev.filter(e => e.id !== id); saveLifeEvents(next); return next; });
  }, []);

  const handleAddDrafts = useCallback((drafts: LifeEvent[]) => {
    setDraftEvents(prev => [...prev, ...drafts]);
  }, []);
  const handleAddExpenseTemplates = useCallback((items: MonthlyExpense[]) => {
    setExpenses(prev => { const next = [...prev, ...items]; saveExpenses(next); return next; });
  }, []);
  const handleConfirmDraft = useCallback((id: string) => {
    setDraftEvents(prev => {
      const draft = prev.find(e => e.id === id);
      if (!draft) return prev;
      const confirmed = { ...draft, isDraft: false, updatedAt: new Date().toISOString() };
      setLifeEvents(cur => { const next = [...cur, confirmed]; saveLifeEvents(next); return next; });
      return prev.filter(e => e.id !== id);
    });
  }, []);
  const handleDiscardDraft = useCallback((id: string) => {
    setDraftEvents(prev => prev.filter(e => e.id !== id));
  }, []);
  const handleConfirmAllDrafts = useCallback(() => {
    if (draftEvents.length === 0) return;
    const confirmed = draftEvents.map(d => ({ ...d, isDraft: false, updatedAt: new Date().toISOString() }));
    setLifeEvents(prev => { const next = [...prev, ...confirmed]; saveLifeEvents(next); return next; });
    setDraftEvents([]);
  }, [draftEvents]);

  const handleSaveInsurance = useCallback((data: Omit<InsurancePlan, "id" | "updatedAt">) => {
    setInsurancePlans(prev => {
      const next = editingInsurance
        ? prev.map(p => p.id === editingInsurance.id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p)
        : [...prev, { id: Date.now().toString(), ...data, updatedAt: new Date().toISOString() }];
      saveInsurancePlans(next); return next;
    });
    setShowInsuranceModal(false); setEditingInsurance(null);
  }, [editingInsurance]);
  const handleDeleteInsurance = useCallback((id: string) => {
    setInsurancePlans(prev => { const next = prev.filter(p => p.id !== id); saveInsurancePlans(next); return next; });
  }, []);

  const handleSaveSpending = useCallback((data: Omit<SpendingRecord, "id" | "createdAt">) => {
    setSpendingRecords(prev => {
      const next = editingSpending
        ? prev.map(r => r.id === editingSpending.id ? { ...r, ...data } : r)
        : [...prev, { id: Date.now().toString(), ...data, createdAt: new Date().toISOString() }];
      saveSpendingRecords(next); return next;
    });
    setShowSpendingModal(false); setEditingSpending(null);
  }, [editingSpending]);
  const handleDeleteSpending = useCallback((id: string) => {
    setSpendingRecords(prev => { const next = prev.filter(r => r.id !== id); saveSpendingRecords(next); return next; });
  }, []);

  const handleSaveLoan = useCallback((data: Omit<LoanPlan, "id" | "updatedAt">) => {
    setLoanPlans(prev => {
      const next = editingLoan
        ? prev.map(l => l.id === editingLoan.id ? { ...l, ...data, updatedAt: new Date().toISOString() } : l)
        : [...prev, { id: Date.now().toString(), ...data, updatedAt: new Date().toISOString() }];
      saveLoanPlans(next); return next;
    });
    setShowLoanModal(false); setEditingLoan(null);
  }, [editingLoan]);
  const handleDeleteLoan = useCallback((id: string) => {
    setLoanPlans(prev => { const next = prev.filter(l => l.id !== id); saveLoanPlans(next); return next; });
  }, []);

  const handleSavePropertyTax = useCallback((data: Omit<PropertyTaxEntry, "id" | "updatedAt">) => {
    setPropertyTaxEntries(prev => {
      const next = editingPropertyTax
        ? prev.map(e => e.id === editingPropertyTax.id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e)
        : [...prev, { id: Date.now().toString(), ...data, updatedAt: new Date().toISOString() }];
      savePropertyTaxEntries(next); return next;
    });
    setShowPropertyTaxModal(false); setEditingPropertyTax(null);
  }, [editingPropertyTax]);
  const handleDeletePropertyTax = useCallback((id: string) => {
    setPropertyTaxEntries(prev => { const next = prev.filter(e => e.id !== id); savePropertyTaxEntries(next); return next; });
  }, []);

  const handleSnapshot = useCallback(() => {
    const month = new Date().toISOString().slice(0, 7);
    setSnapshots(prev => {
      const snap = { month, total: grandTotal };
      const next = prev.find(s => s.month === month)
        ? prev.map(s => s.month === month ? snap : s)
        : [...prev, snap].sort((a, b) => a.month.localeCompare(b.month));
      saveSnapshots(next as Parameters<typeof saveSnapshots>[0]); return next;
    });
  }, [grandTotal]);

  // ── Tab add button ────────────────────────────────────
  function renderAddButton() {
    if (viewerOwnerUid) return null;
    switch (tab) {
      case "株式":
        return <button onClick={() => { setEditingStock(null); setShowStockModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          <Plus size={15} /> 株式追加</button>;
      case "投資信託":
        return <button onClick={() => { setEditingFund(null); setShowFundModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
          <Plus size={15} /> ファンド追加</button>;
      case "資産":
        return <button onClick={() => { setEditingAsset(null); setShowAssetModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={15} /> 資産追加</button>;
      case "目標":
        return <button onClick={() => { setEditingGoal(null); setShowGoalModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus size={15} /> 目標追加</button>;
      case "収支":
        return (
          <div className="flex gap-2">
            <button onClick={() => { setEditingLoan(null); setShowLoanModal(true); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus size={15} /> ローン
            </button>
            <button onClick={() => { setEditingInsurance(null); setShowInsuranceModal(true); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors">
              <Plus size={15} /> 保険
            </button>
            <button onClick={() => { setEditingExpense(null); setShowExpenseModal(true); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors">
              <Plus size={15} /> 支出
            </button>
          </div>
        );
      case "投資物件":
        return <button onClick={() => { setEditingInvestmentProperty(null); setShowInvestmentPropertyModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={15} /> 物件追加</button>;
      case "概要":
        return <button onClick={() => { setEditingLifeEvent(null); setShowLifeEventModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
          <Plus size={15} /> イベント追加</button>;
      default: return null;
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-sm w-full text-center space-y-6">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <Wallet size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">お金計画</h1>
            <p className="text-gray-500 text-sm mt-2">Googleアカウントでログインして<br/>資産データを管理・同期しましょう</p>
          </div>
          <button onClick={signIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-gray-200 hover:border-blue-300 rounded-2xl text-gray-700 font-medium transition-colors shadow-sm hover:shadow">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
            </svg>
            Googleでログイン
          </button>
          <p className="text-xs text-gray-400">ログインするとPC・スマホ間でデータが同期されます</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="text-blue-600" size={24} />
            <h1 className="text-xl font-bold text-gray-900">お金計画</h1>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => exportToCSV(assets)} title="CSVエクスポート"
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Download size={15} /><span className="hidden sm:inline">CSV</span>
            </button>
            {renderAddButton()}
            {!authLoading && (
              user ? (
                <>
                <button onClick={signOut} title={`ログアウト (${user.displayName ?? user.email})`}
                  className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors">
                  {user.photoURL
                    ? <img src={user.photoURL} className="w-6 h-6 rounded-full" alt="" />
                    : <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-bold">
                        {(user.displayName ?? user.email ?? "?")[0].toUpperCase()}
                      </div>
                  }
                  <span className="text-xs text-gray-500 hidden sm:inline">ログアウト</span>
                </button>
                </>
              ) : (
                <button onClick={signIn}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
                  </svg>
                  <span className="hidden sm:inline">Googleでログイン</span>
                </button>
              )
            )}
          </div>
        </div>
        {/* 上段: グループタブ */}
        <div className="max-w-4xl mx-auto px-4 flex gap-1 sm:gap-2 border-t border-gray-100 overflow-x-auto">
          {TAB_GROUPS.map(({ group, icon, tabs }) => {
            const isActive = getGroupForTab(tab) === group;
            return (
              <button key={group}
                onClick={() => handleTabChange(tabs[0].key)}
                className={`flex items-center gap-1.5 py-2.5 px-2 sm:px-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${isActive ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                {icon}{group}
              </button>
            );
          })}
        </div>
        {/* 下段: サブタブ（サブタブが2つ以上あるグループのみ表示） */}
        {(() => {
          const activeGroup = TAB_GROUPS.find(g => g.group === getGroupForTab(tab));
          if (!activeGroup || activeGroup.tabs.length <= 1) return null;
          return (
            <div className="max-w-4xl mx-auto px-4 flex gap-1 sm:gap-2 bg-gray-50/80 overflow-x-auto">
              {activeGroup.tabs.map(({ key, label, icon }) => (
                <button key={key} onClick={() => handleTabChange(key)}
                  className={`flex items-center gap-1 py-2 px-2 sm:px-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${tab === key ? "border-blue-500 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                  {icon}{label}
                </button>
              ))}
            </div>
          );
        })()}
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Viewer mode banner */}
        {viewerOwnerUid && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-amber-800">
            <Eye size={16} className="text-amber-500 shrink-0" />
            <span>
              <span className="font-medium">{viewerDisplayName ?? "オーナー"}さん</span>のデータを閲覧中です（編集不可）
            </span>
          </div>
        )}
        {/* Total Banner */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
          <p className="text-sm text-blue-200 mb-1">総資産</p>
          <p className="text-4xl font-bold tracking-tight">¥{grandTotal.toLocaleString()}</p>
          <div className="flex gap-4 mt-3 text-xs text-blue-300 flex-wrap">
            <span>株式 ¥{stocksTotal.toLocaleString()}</span>
            <span>貯金 ¥{savingsTotal.toLocaleString()}</span>
            <span>投資信託 ¥{fundsTotal.toLocaleString()}</span>
            <span>その他 ¥{assetsTotal.toLocaleString()}</span>
          </div>
          <p className="text-xs text-blue-400 mt-1">{new Date().toLocaleDateString("ja-JP")} 現在</p>
        </div>

        {/* ── 概要 ─────────────────────────────────────── */}
        {tab === "概要" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="text-xs text-gray-500">株式</span></div>
                <div className="font-bold text-gray-900">¥{stocksTotal.toLocaleString()}</div>
                <div className={`text-xs mt-0.5 ${stocksGain >= 0 ? "text-green-600" : "text-red-600"}`}>{stocksGain >= 0 ? "+" : ""}{stocksGain.toLocaleString()}円</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2"><div className="w-3 h-3 rounded-full bg-purple-500" /><span className="text-xs text-gray-500">投資信託</span></div>
                <div className="font-bold text-gray-900">¥{fundsTotal.toLocaleString()}</div>
                <div className={`text-xs mt-0.5 ${fundsGain >= 0 ? "text-green-600" : "text-red-600"}`}>{fundsGain >= 0 ? "+" : ""}{fundsGain.toLocaleString()}円</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Wallet size={16} className="text-blue-500" /> 資産構成</h3>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                        {pieData.map(({ name }) => <Cell key={name} fill={CATEGORY_COLOR[name] ?? "#6b7280"} />)}
                      </Pie>
                      <Tooltip formatter={(v) => typeof v === "number" ? `¥${v.toLocaleString()}` : v} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="h-[200px] flex items-center justify-center text-gray-300 text-sm">データなし</div>}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-green-500" /> 資産推移</h3>
                {snapshots.length >= 2 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={snapshots.slice(-12)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 10000).toFixed(0)}万`} />
                      <Tooltip formatter={(v) => typeof v === "number" ? `¥${v.toLocaleString()}` : v} />
                      <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="総資産" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-gray-400 text-sm">
                    <span>2件以上でグラフ表示</span>
                    <button onClick={handleSnapshot} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><RefreshCw size={12} /> 今月を記録する</button>
                  </div>
                )}
              </div>
            </div>

            {/* ── ライフプラン（サマリに統合） ─────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                <MapPin size={16} className="text-violet-500" /> 資産シミュレーション（〜90歳）
              </h3>
              <p className="text-xs text-gray-400 mb-3">
                年齢別収入・ローン・保険・ライフイベントを考慮した試算
                {weightedReturn > 0 && `（加重平均リターン ${(weightedReturn * 100).toFixed(1)}%/年）`}
              </p>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs text-gray-500 shrink-0">生活費インフレ率</span>
                <input
                  type="range" min={0} max={5} step={0.5}
                  value={inflationRate * 100}
                  onChange={e => setInflationRate(parseFloat(e.target.value) / 100)}
                  className="flex-1 accent-violet-500"
                />
                <span className="text-xs font-medium text-gray-700 w-10 text-right shrink-0">
                  {inflationRate === 0 ? "なし" : `${(inflationRate * 100).toFixed(1)}%`}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={userProfile && userProfile.familyMembers.length > 0 ? 260 + 11 * (userProfile.familyMembers.filter(m => m.type === "spouse").length + userProfile.familyMembers.filter(m => m.type === "child").length) : 260}>
                <AreaChart data={simData} onClick={(e) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const ev = e as any;
                  const pt: SimPoint | undefined = ev?.activePayload?.[0]?.payload
                    ?? (ev?.activeLabel != null ? simData.find(p => p.year === ev.activeLabel) : undefined);
                  if (pt) setSelectedSimPoint(prev => prev?.year === pt.year ? null : pt);
                }} style={{ cursor: "pointer" }}>
                  <defs>
                    <linearGradient id="assetGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="year" interval={4} height={userProfile && userProfile.familyMembers.length > 0 ? 14 + 11 * (1 + userProfile.familyMembers.filter(m => m.type === "spouse").length + userProfile.familyMembers.filter(m => m.type === "child").length) : 30}
                    tick={(props: { x: string | number; y: string | number; payload: { value: number } }) => {
                      const x = Number(props.x);
                      const y = Number(props.y);
                      const { payload } = props;
                      const year = payload.value;
                      const lines: { key: string; age: number }[] = [];
                      if (userProfile) {
                        lines.push({ key: userProfile.displayName ?? "自分", age: year - userProfile.birthYear });
                        const spouse = userProfile.familyMembers.find(m => m.type === "spouse");
                        if (spouse) lines.push({ key: spouse.name || "配偶者", age: year - spouse.birthYear });
                        userProfile.familyMembers.filter(m => m.type === "child").forEach((c, i) => {
                          if (year >= c.birthYear) lines.push({ key: c.name || `子${i + 1}`, age: year - c.birthYear });
                        });
                      }
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text x={0} y={0} dy={12} textAnchor="middle" fontSize={10} fill="#6b7280">{year}年</text>
                          {lines.map((l, i) => (
                            <text key={l.key} x={0} y={0} dy={12 + 11 * (i + 1)} textAnchor="middle" fontSize={8} fill="#9ca3af">{l.age}歳</text>
                          ))}
                        </g>
                      );
                    }}
                  />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v =>
                    v >= 100000000 ? `${(v / 100000000).toFixed(0)}億` : `${(v / 10000).toFixed(0)}万`
                  } width={52} />
                  <Tooltip content={<LifePlanTooltip />} />
                  {lifeEvents.map(e => (
                    <ReferenceLine key={e.id} x={e.year} stroke="#f59e0b" strokeDasharray="4 4"
                      label={{ value: e.title, position: "top", fontSize: 9, fill: "#92400e" }} />
                  ))}
                  {loanPlans.map(l => {
                    const endY = parseInt(loanEndYM(l.startDate, l.termMonths).split("-")[0]);
                    return <ReferenceLine key={l.id} x={endY} stroke="#22c55e" strokeDasharray="3 3"
                      label={{ value: `${l.name}完済`, position: "insideTopRight", fontSize: 8, fill: "#15803d" }} />;
                  })}
                  {mortgageSimPlan && parseFloat(mortgageSimPlan.principalMan) > 0 && (
                    <ReferenceLine
                      x={currentYear + (parseInt(mortgageSimPlan.termYears) || 35)}
                      stroke="#3b82f6"
                      strokeDasharray="3 3"
                      label={{ value: `${mortgageSimPlan.bankName || "住宅ローン"}完済`, position: "insideTopRight", fontSize: 8, fill: "#1d4ed8" }}
                    />
                  )}
                  <Area type="monotone" dataKey="assets" stroke="#8b5cf6" strokeWidth={2} fill="url(#assetGrad)" name="総資産" />
                </AreaChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-4 gap-2 mt-4">
                {[65, 70, 80, 90].map(age => {
                  const y = age - selfAge;
                  const pt = y > 0 ? simData[y] : undefined;
                  const v = pt?.assets ?? 0;
                  return (
                    <div key={age} className="bg-violet-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-gray-400">{age}歳時点</div>
                      <div className="text-xs font-bold text-violet-700">
                        {y <= 0 ? "−" : v >= 100000000 ? `${(v / 100000000).toFixed(1)}億` : `${Math.round(v / 10000)}万`}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">グラフをタップすると年別の収支明細が表示されます</p>

              {/* 年別収支明細 */}
              {selectedSimPoint && (() => {
                const d = selectedSimPoint;
                const fmtM = (v: number) => `¥${Math.round(v).toLocaleString()}`;
                const fmtY = (v: number) => v >= 100_000_000 ? `${(v / 100_000_000).toFixed(2)}億` : `${Math.round(v / 10000).toLocaleString()}万`;
                const balance = d.annualIncome - d.annualExpense;
                const selfAgeAtYear = userProfile ? d.year - userProfile.birthYear : null;
                return (
                  <div className="mt-4 border border-violet-200 rounded-xl overflow-hidden">
                    <div className="bg-violet-50 px-4 py-3 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-gray-800 text-sm">{d.year}年</span>
                        {selfAgeAtYear != null && <span className="ml-2 text-xs text-gray-500">（{selfAgeAtYear}歳）</span>}
                        {d.label && <span className="ml-2 text-xs text-violet-600 bg-violet-100 rounded px-1.5 py-0.5">{d.label}</span>}
                      </div>
                      <button onClick={() => setSelectedSimPoint(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕ 閉じる</button>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {/* 収入 */}
                      <div className="px-4 py-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-semibold text-teal-700">収入（年間）</span>
                          <span className="text-sm font-bold text-teal-700">+{fmtY(d.annualIncome)}円</span>
                        </div>
                        <table className="w-full text-xs">
                          <tbody className="divide-y divide-gray-50">
                            {d.incomeItems.map((item, i) => (
                              <tr key={i}>
                                <td className="py-1 text-gray-500 pl-2">{item.label}</td>
                                <td className="py-1 text-right text-gray-600">{fmtM(item.monthly)}<span className="text-gray-400">/月</span></td>
                                <td className="py-1 text-right text-gray-500 pl-3">{fmtY(item.monthly * 12)}円/年</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* 支出 */}
                      <div className="px-4 py-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-semibold text-rose-600">支出（年間）</span>
                          <span className="text-sm font-bold text-rose-600">−{fmtY(d.annualExpense)}円</span>
                        </div>
                        <table className="w-full text-xs">
                          <tbody className="divide-y divide-gray-50">
                            {d.expenseItems.map((item, i) => (
                              <tr key={i}>
                                <td className="py-1 text-gray-500 pl-2">{item.label}</td>
                                <td className="py-1 text-right text-gray-600">{fmtM(item.monthly)}<span className="text-gray-400">/月</span></td>
                                <td className="py-1 text-right text-gray-500 pl-3">{fmtY(item.monthly * 12)}円/年</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* 一時金 */}
                      {d.oneTime !== 0 && (
                        <div className="px-4 py-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className={`text-xs font-semibold ${d.oneTime > 0 ? "text-blue-600" : "text-orange-600"}`}>一時金</span>
                            <span className={`text-sm font-bold ${d.oneTime > 0 ? "text-blue-700" : "text-orange-700"}`}>{d.oneTime > 0 ? "+" : ""}{fmtY(d.oneTime)}円</span>
                          </div>
                          <table className="w-full text-xs">
                            <tbody className="divide-y divide-gray-50">
                              {d.oneTimeItems.map((item, i) => (
                                <tr key={i}>
                                  <td className="py-1 text-gray-500 pl-2">{item.label}</td>
                                  <td className="py-1 text-right font-medium pl-3" style={{color: item.amount > 0 ? "#1d4ed8" : "#c2410c"}}>{item.amount > 0 ? "+" : ""}{fmtY(item.amount)}円</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {/* 合計 */}
                      <div className="px-4 py-3 bg-gray-50">
                        <div className="flex justify-between items-center">
                          <span className={`text-xs font-bold ${balance >= 0 ? "text-green-700" : "text-red-600"}`}>年間収支</span>
                          <span className={`text-sm font-bold ${balance >= 0 ? "text-green-700" : "text-red-600"}`}>{balance >= 0 ? "+" : ""}{fmtY(balance)}円</span>
                        </div>
                        <div className="flex justify-between items-center mt-1.5">
                          <span className="text-xs font-bold text-violet-700">総資産</span>
                          <span className="text-sm font-bold text-violet-700">{fmtY(d.assets)}円</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Income profiles */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Wallet size={16} className="text-teal-500" /> 収入プロファイル
                </h3>
                <button
                  onClick={() => { setEditingIncome(null); setShowIncomeModal(true); }}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                >
                  <Plus size={13} /> 追加
                </button>
              </div>
              {incomeProfiles.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">
                  <Wallet size={28} className="mx-auto mb-2 text-gray-200" />
                  収入を追加するとシミュレーションに反映されます
                </div>
              ) : (
                <div className="space-y-2">
                  {[...incomeProfiles]
                    .sort((a, b) => {
                      const ageA = a.age + ((a.activeFromYear ?? currentYear) - currentYear);
                      const ageB = b.age + ((b.activeFromYear ?? currentYear) - currentYear);
                      return ageA - ageB;
                    })
                    .map(p => {
                      const fromYearLabel = p.activeFromYear ? `${p.activeFromYear}年〜` : "現在〜";
                      return (
                        <div key={p.id} className="flex items-center justify-between bg-teal-50 rounded-xl px-3 py-2.5 gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">{p.name}</div>
                            <div className="text-xs text-teal-700 mt-0.5">
                              {fromYearLabel}（{p.age + ((p.activeFromYear ?? currentYear) - currentYear)}歳〜）{p.activeUntilAge ? `${p.activeUntilAge}歳まで` : ""}
                              {" "}年収 ¥{(p.grossAnnual ?? p.grossMonthly * 12).toLocaleString()}
                              {p.bonusAnnual ? ` うちボーナス ¥${p.bonusAnnual.toLocaleString()}` : ""}
                            </div>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => { setEditingIncome(p); setShowIncomeModal(true); }}
                              className="p-1.5 hover:bg-teal-100 rounded-lg transition-colors text-teal-600"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteIncome(p.id)}
                              className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Life events */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">ライフイベント</h3>
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 transition-colors"
                >
                  テンプレートから追加
                </button>
              </div>

              {draftEvents.length > 0 && (
                <div className="mb-3 bg-amber-50 rounded-xl border border-amber-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-amber-700">下書きイベント（{draftEvents.length}件）— 確認して確定してください</span>
                    <button
                      onClick={handleConfirmAllDrafts}
                      className="text-xs px-3 py-1 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                    >
                      全て確定
                    </button>
                  </div>
                  <div className="space-y-2">
                    {[...draftEvents].sort((a, b) => a.year - b.year).map(e => (
                      <LifeEventCard key={e.id} event={e}
                        onEdit={() => {}}
                        onDelete={() => {}}
                        onConfirmDraft={handleConfirmDraft}
                        onDiscardDraft={handleDiscardDraft} />
                    ))}
                  </div>
                </div>
              )}

              {lifeEvents.length === 0 && draftEvents.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 shadow-sm">
                  <MapPin size={32} className="mx-auto mb-3 text-gray-200" />
                  <p className="text-sm">ライフイベントがありません</p>
                  <div className="flex gap-3 justify-center mt-2">
                    <button onClick={() => { setEditingLifeEvent(null); setShowLifeEventModal(true); }}
                      className="text-xs text-violet-600 hover:underline">手動で追加する</button>
                    <span className="text-xs text-gray-300">|</span>
                    <button onClick={() => setShowTemplateModal(true)}
                      className="text-xs text-violet-600 hover:underline">テンプレートから追加する</button>
                  </div>
                </div>
              ) : lifeEvents.length > 0 ? (
                <div className="space-y-2">
                  {[...lifeEvents].sort((a, b) => a.year - b.year).map(e => (
                    <LifeEventCard key={e.id} event={e}
                      onEdit={e => { setEditingLifeEvent(e); setShowLifeEventModal(true); }}
                      onDelete={handleDeleteLifeEvent} />
                  ))}
                </div>
              ) : null}
            </div>
          </>
        )}

        {/* ── 株式 ─────────────────────────────────────── */}
        {tab === "株式" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-4 text-sm">
              <div><div className="text-xs text-gray-400">評価額合計</div><div className="font-bold text-gray-900">¥{stocksTotal.toLocaleString()}</div></div>
              <div><div className="text-xs text-gray-400">評価損益</div><div className={`font-bold ${stocksGain >= 0 ? "text-green-600" : "text-red-600"}`}>{stocksGain >= 0 ? "+" : ""}{stocksGain.toLocaleString()}円</div></div>
              <div className="border-l border-gray-100 pl-4">
                <div className="text-xs text-gray-400">今売ったら税金（概算）</div>
                <div className="font-bold text-orange-500">¥{stocksTax.toLocaleString()}</div>
              </div>
              <div><div className="text-xs text-gray-400">税引後手取り</div><div className="font-bold text-gray-700">¥{(stocksTotal - stocksTax).toLocaleString()}</div></div>
              <div className="text-xs text-gray-400 self-end w-full">※特定・一般口座のみ 20.315%</div>
            </div>
            {stocks.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 shadow-sm">
                <TrendingUp size={32} className="mx-auto mb-3 text-gray-200" /><p className="text-sm">株式保有がありません</p>
                <button onClick={() => { setEditingStock(null); setShowStockModal(true); }} className="mt-3 text-xs text-green-600 hover:underline">最初の銘柄を追加する</button>
              </div>
            ) : (
              <div className="space-y-3">{stocks.map(s => <StockCard key={s.id} stock={s} memberLabel={s.memberId ? memberOptions.find(o => o.id === s.memberId)?.label : undefined} onEdit={s => { setEditingStock(s); setShowStockModal(true); }} onDelete={handleDeleteStock} />)}</div>
            )}
          </div>
        )}

        {/* ── 貯金 ──────────────────────────────────────── */}
        {tab === "貯金" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-gray-500">残高合計</span>
                <span className="ml-2 font-bold text-gray-900">¥{savingsTotal.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-500">口座数</span>
                <span className="ml-2 font-bold text-gray-900">{savingsAccounts.length}件</span>
              </div>
            </div>

            {!viewerOwnerUid && (
              <button onClick={() => { setEditingSavings(null); setShowSavingsModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                <Plus size={16} />口座を追加
              </button>
            )}

            <div className="space-y-3">
              {savingsAccounts.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
                  口座がありません。「口座を追加」から登録してください。
                </div>
              ) : (
                savingsAccounts.map(acct => (
                  <div key={acct.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 truncate">{acct.bankName}</span>
                          <span className="text-gray-500 text-sm truncate">{acct.accountName}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${acct.accountType === "定期" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                            {acct.accountType}
                          </span>
                          {acct.memberId && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                              {getMemberLabel(acct.memberId, userProfile)}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-baseline gap-3 flex-wrap">
                          <span className="text-xl font-bold text-gray-900">¥{acct.balance.toLocaleString()}</span>
                          {acct.interestRate > 0 && (
                            <span className="text-xs text-green-600">金利 {acct.interestRate}%</span>
                          )}
                        </div>
                        {acct.note && <p className="text-xs text-gray-400 mt-1">{acct.note}</p>}
                      </div>
                      {!viewerOwnerUid && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => { setEditingSavings(acct); setShowSavingsModal(true); }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => {
                            if (!confirm(`「${acct.bankName} ${acct.accountName}」を削除しますか？`)) return;
                            const updated = savingsAccounts.filter(a => a.id !== acct.id);
                            setSavingsAccounts(updated);
                            saveSavingsAccounts(updated);
                          }} className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 貯金口座モーダル */}
            {showSavingsModal && (
              <SavingsAccountModal
                account={editingSavings}
                userProfile={userProfile}
                onClose={() => setShowSavingsModal(false)}
                onSave={(acct) => {
                  const updated = editingSavings
                    ? savingsAccounts.map(a => a.id === acct.id ? acct : a)
                    : [...savingsAccounts, acct];
                  setSavingsAccounts(updated);
                  saveSavingsAccounts(updated);
                  setShowSavingsModal(false);
                }}
              />
            )}
          </div>
        )}

        {/* ── 投資信託 ──────────────────────────────────── */}
        {tab === "投資信託" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-4 text-sm">
              <div><div className="text-xs text-gray-400">評価額合計</div><div className="font-bold text-gray-900">¥{fundsTotal.toLocaleString()}</div></div>
              <div><div className="text-xs text-gray-400">評価損益</div><div className={`font-bold ${fundsGain >= 0 ? "text-green-600" : "text-red-600"}`}>{fundsGain >= 0 ? "+" : ""}{fundsGain.toLocaleString()}円</div></div>
              <div><div className="text-xs text-gray-400">月次積立合計</div><div className="font-bold text-purple-700">¥{funds.reduce((s, f) => s + f.monthlyContribution, 0).toLocaleString()}</div></div>
            </div>
            {funds.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 shadow-sm">
                <Layers size={32} className="mx-auto mb-3 text-gray-200" /><p className="text-sm">投資信託がありません</p>
                <button onClick={() => { setEditingFund(null); setShowFundModal(true); }} className="mt-3 text-xs text-purple-600 hover:underline">最初のファンドを追加する</button>
              </div>
            ) : (
              <div className="space-y-3">{funds.map(f => <FundCard key={f.id} fund={f} memberLabel={f.memberId ? memberOptions.find(o => o.id === f.memberId)?.label : undefined} onEdit={f => { setEditingFund(f); setShowFundModal(true); }} onDelete={handleDeleteFund} />)}</div>
            )}
          </div>
        )}

        {/* ── 資産 ─────────────────────────────────────── */}
        {tab === "資産" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-gray-500"><span>{assets.length}件 · 合計 ¥{assetsTotal.toLocaleString()}</span></div>
            {assets.length === 0 ? <div className="text-center text-gray-400 py-12">資産がありません</div> : assets.map(a => <AssetCard key={a.id} asset={a} onEdit={a => { setEditingAsset(a); setShowAssetModal(true); }} onDelete={handleDeleteAsset} />)}
          </div>
        )}

        {/* ── 目標 ─────────────────────────────────────── */}
        {tab === "目標" && (
          <div className="space-y-4">
            {goals.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 shadow-sm">
                <Target size={32} className="mx-auto mb-3 text-gray-200" /><p className="text-sm">財務目標がありません</p>
                <button onClick={() => { setEditingGoal(null); setShowGoalModal(true); }} className="mt-3 text-xs text-indigo-600 hover:underline">最初の目標を追加する</button>
              </div>
            ) : goals.map(g => <GoalCard key={g.id} goal={g} onEdit={g => { setEditingGoal(g); setShowGoalModal(true); }} onDelete={handleDeleteGoal} />)}
          </div>
        )}

        {/* ── 収支 ─────────────────────────────────────── */}
        {tab === "収支" && (
          <div className="space-y-5">
            {/* Income */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">収入プロファイル</h3>
                <button onClick={() => { setEditingIncome(null); setShowIncomeModal(true); }}
                  className="flex items-center gap-1 text-xs text-teal-600 hover:underline"><Plus size={12} /> 追加</button>
              </div>
              {incomeProfiles.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400 shadow-sm">
                  <p className="text-sm">収入プロファイルがありません</p>
                  <button onClick={() => { setEditingIncome(null); setShowIncomeModal(true); }} className="mt-2 text-xs text-teal-600 hover:underline">給与情報を入力する</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...incomeProfiles].sort((a, b) => {
                    const ageA = a.age + ((a.activeFromYear ?? currentYear) - currentYear);
                    const ageB = b.age + ((b.activeFromYear ?? currentYear) - currentYear);
                    return ageA - ageB;
                  }).map(p => (
                    <IncomeProfileCard key={p.id} profile={p}
                      memberLabel={p.memberId && p.memberId !== "self" ? getMemberLabel(p.memberId, userProfile) : undefined}
                      onEdit={p => { setEditingIncome(p); setShowIncomeModal(true); }}
                      onDelete={handleDeleteIncome} />
                  ))}
                </div>
              )}
            </div>

            {/* Loans */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">ローン</h3>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {(activeLoans.length > 0 || mortgageMonthlyNow > 0) && (
                    <span>月計 ¥{(loanPaymentsTotal + mortgageMonthlyNow).toLocaleString()}</span>
                  )}
                </div>
              </div>
              {/* 住宅ローンシミュレーター */}
              {mortgageMonthlyNow > 0 && mortgageSimPlan && (
                <div className="bg-white rounded-xl border border-blue-100 p-4 shadow-sm mb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {mortgageSimPlan.bankName || "住宅ローン"}
                        <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">シミュレーター</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {mortgageSimPlan.principalMan}万円 · {mortgageSimPlan.termYears}年 · {mortgageSimPlan.bankRate}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-rose-600">¥{mortgageMonthlyNow.toLocaleString()}/月</p>
                      <button onClick={() => handleTabChange("住宅ローン")} className="text-xs text-blue-500 hover:underline mt-0.5">詳細 →</button>
                    </div>
                  </div>
                </div>
              )}
              {loanPlans.length === 0 && mortgageMonthlyNow === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400 shadow-sm">
                  <p className="text-sm">ローンが登録されていません</p>
                  <button onClick={() => { setEditingLoan(null); setShowLoanModal(true); }} className="mt-2 text-xs text-blue-600 hover:underline">ローンを追加する</button>
                </div>
              ) : (
                <div className="space-y-3">{loanPlans.map(l => <LoanCard key={l.id} loan={l} onEdit={l => { setEditingLoan(l); setShowLoanModal(true); }} onDelete={handleDeleteLoan} />)}</div>
              )}
            </div>

            {/* Insurance */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">保険</h3>
                <div className="text-xs text-gray-500">{activeInsurance.length > 0 && `支払い中 ${activeInsurance.length}件 · 月計 ¥${insurancePremiums.toLocaleString()}`}</div>
              </div>
              {insurancePlans.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400 shadow-sm">
                  <p className="text-sm">保険が登録されていません</p>
                  <button onClick={() => { setEditingInsurance(null); setShowInsuranceModal(true); }} className="mt-2 text-xs text-sky-600 hover:underline">保険を追加する</button>
                </div>
              ) : (
                <div className="space-y-3">{insurancePlans.map(p => <InsurancePlanCard key={p.id} plan={p} onEdit={p => { setEditingInsurance(p); setShowInsuranceModal(true); }} onDelete={handleDeleteInsurance} />)}</div>
              )}
            </div>

            {/* Expenses */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">月次予算（支出）</h3>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>固定費 ¥{fixedExpenses.toLocaleString()}</span>
                  <span>変動費 ¥{variableExpenses.toLocaleString()}</span>
                </div>
              </div>
              {expenses.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400 shadow-sm">
                  <p className="text-sm">支出予算がありません</p>
                  <button onClick={() => { setEditingExpense(null); setShowExpenseModal(true); }} className="mt-2 text-xs text-rose-600 hover:underline">支出を追加する</button>
                </div>
              ) : (
                <div className="space-y-2">{expenses.map(e => <ExpenseCard key={e.id} expense={e} onEdit={e => { setEditingExpense(e); setShowExpenseModal(true); }} onDelete={handleDeleteExpense} />)}</div>
              )}
            </div>

            {/* Monthly balance summary */}
            {(monthlyTakeHome > 0 || totalExpenses > 0) && (
              <div className={`rounded-2xl p-5 ${monthlySavings >= 0 ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"}`}>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">月間収支サマリー</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">手取り収入</span><span className="font-medium text-teal-700">+¥{monthlyTakeHome.toLocaleString()}</span></div>
                  {(fixedExpenses + variableExpenses) > 0 && <div className="flex justify-between"><span className="text-gray-600">支出予算</span><span className="font-medium text-rose-600">−¥{(fixedExpenses + variableExpenses).toLocaleString()}</span></div>}
                  {insurancePremiums > 0 && <div className="flex justify-between"><span className="text-gray-600">保険料</span><span className="font-medium text-rose-600">−¥{insurancePremiums.toLocaleString()}</span></div>}
                  {loanPaymentsTotal > 0 && <div className="flex justify-between"><span className="text-gray-600">ローン返済</span><span className="font-medium text-rose-600">−¥{loanPaymentsTotal.toLocaleString()}</span></div>}
                  {mortgageMonthlyNow > 0 && <div className="flex justify-between"><span className="text-gray-600">{mortgageSimPlan?.bankName ? `${mortgageSimPlan.bankName}（住宅ローン）` : "住宅ローン"}</span><span className="font-medium text-rose-600">−¥{mortgageMonthlyNow.toLocaleString()}</span></div>}
                  <div className={`flex justify-between font-bold pt-2 border-t ${monthlySavings >= 0 ? "border-green-200" : "border-red-200"}`}>
                    <span className="text-gray-800">月間収支</span>
                    <span className={monthlySavings >= 0 ? "text-green-700" : "text-red-700"}>{monthlySavings >= 0 ? "+" : ""}¥{monthlySavings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>年間貯蓄予測</span><span>{(monthlySavings * 12) >= 0 ? "+" : ""}¥{(monthlySavings * 12).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 投資物件 ──────────────────────────────────── */}
        {tab === "投資物件" && (
          <div className="space-y-4">
            {/* サマリバー */}
            {investmentProperties.length > 0 && (() => {
              const totalRent = investmentProperties.reduce((s, p) => s + p.monthlyRent, 0);
              const totalCost = investmentProperties.reduce((s, p) =>
                s + (p.monthlyManagementFee ?? 0) + (p.monthlyRepairReserve ?? 0)
                  + (p.annualPropertyTax ?? 0) / 12 + (p.monthlyOtherCosts ?? 0) + (p.loanMonthlyPayment ?? 0), 0);
              const monthlyCF = totalRent - totalCost;
              return (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-4 text-sm">
                  <div><div className="text-xs text-gray-400">物件数</div><div className="font-bold text-gray-900">{investmentProperties.length}件</div></div>
                  <div><div className="text-xs text-gray-400">月額家賃収入</div><div className="font-bold text-teal-600">¥{totalRent.toLocaleString()}</div></div>
                  <div><div className="text-xs text-gray-400">月額コスト合計</div><div className="font-bold text-rose-500">¥{Math.round(totalCost).toLocaleString()}</div></div>
                  <div className="border-l border-gray-100 pl-4">
                    <div className="text-xs text-gray-400">月次CF</div>
                    <div className={`font-bold ${monthlyCF >= 0 ? "text-green-600" : "text-red-600"}`}>{monthlyCF >= 0 ? "+" : ""}¥{Math.round(monthlyCF).toLocaleString()}</div>
                  </div>
                  <div><div className="text-xs text-gray-400">年次CF</div><div className={`font-bold ${monthlyCF >= 0 ? "text-green-600" : "text-red-600"}`}>{monthlyCF * 12 >= 0 ? "+" : ""}¥{Math.round(monthlyCF * 12).toLocaleString()}</div></div>
                </div>
              );
            })()}

            {/* 物件カード一覧 */}
            {investmentProperties.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center text-gray-400 shadow-sm">
                <Building2 size={32} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm">投資物件がありません</p>
                {!viewerOwnerUid && (
                  <button onClick={() => { setEditingInvestmentProperty(null); setShowInvestmentPropertyModal(true); }}
                    className="mt-3 text-xs text-blue-600 hover:underline">最初の物件を追加する</button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {investmentProperties.map(prop => {
                  const monthlyCost = (prop.monthlyManagementFee ?? 0) + (prop.monthlyRepairReserve ?? 0)
                    + (prop.annualPropertyTax ?? 0) / 12 + (prop.monthlyOtherCosts ?? 0) + (prop.loanMonthlyPayment ?? 0);
                  const monthlyCF = prop.monthlyRent - monthlyCost;
                  const surfaceYield = prop.purchasePriceMan > 0
                    ? (prop.monthlyRent * 12) / (prop.purchasePriceMan * 10000) * 100 : 0;
                  const annualNetIncome = prop.monthlyRent * 12
                    - ((prop.monthlyManagementFee ?? 0) + (prop.monthlyRepairReserve ?? 0) + (prop.monthlyOtherCosts ?? 0)) * 12
                    - (prop.annualPropertyTax ?? 0);
                  const netYield = prop.purchasePriceMan > 0
                    ? annualNetIncome / (prop.purchasePriceMan * 10000) * 100 : 0;
                  const equity = prop.purchasePriceMan * 10000 - (prop.loanBalanceMan ?? 0) * 10000;
                  return (
                    <div key={prop.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      {/* ヘッダー */}
                      <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-gray-50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{prop.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{prop.propertyType}</span>
                            {prop.memberId && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                {memberOptions.find(o => o.id === prop.memberId)?.label ?? prop.memberId}
                              </span>
                            )}
                          </div>
                          {prop.location && <div className="text-xs text-gray-400 mt-0.5">{prop.location}</div>}
                        </div>
                        {!viewerOwnerUid && (
                          <div className="flex gap-1.5 shrink-0">
                            <button onClick={() => { setEditingInvestmentProperty(prop); setShowInvestmentPropertyModal(true); }}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"><Pencil size={14} /></button>
                            <button onClick={() => {
                              if (!confirm(`「${prop.name}」を削除しますか？`)) return;
                              const updated = investmentProperties.filter(p => p.id !== prop.id);
                              setInvestmentProperties(updated);
                              saveInvestmentProperties(updated);
                            }} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-red-400"><Trash2 size={14} /></button>
                          </div>
                        )}
                      </div>
                      {/* 数値グリッド */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-50">
                        <div className="bg-white px-4 py-3">
                          <div className="text-xs text-gray-400">購入価格</div>
                          <div className="text-sm font-bold text-gray-800">{prop.purchasePriceMan.toLocaleString()}万円</div>
                          {prop.loanBalanceMan != null && (
                            <div className="text-xs text-gray-400 mt-0.5">残債 {prop.loanBalanceMan.toLocaleString()}万円</div>
                          )}
                        </div>
                        <div className="bg-white px-4 py-3">
                          <div className="text-xs text-gray-400">エクイティ</div>
                          <div className="text-sm font-bold text-gray-800">{(equity / 10000).toLocaleString()}万円</div>
                        </div>
                        <div className="bg-white px-4 py-3">
                          <div className="text-xs text-gray-400">表面利回り</div>
                          <div className={`text-sm font-bold ${surfaceYield >= 5 ? "text-green-600" : "text-gray-700"}`}>{surfaceYield.toFixed(2)}%</div>
                        </div>
                        <div className="bg-white px-4 py-3">
                          <div className="text-xs text-gray-400">実質利回り</div>
                          <div className={`text-sm font-bold ${netYield >= 3 ? "text-teal-600" : "text-gray-700"}`}>{netYield.toFixed(2)}%</div>
                        </div>
                      </div>
                      {/* 収支詳細 */}
                      <div className="px-5 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                        <span>家賃 <strong className="text-teal-600">+¥{prop.monthlyRent.toLocaleString()}</strong>/月</span>
                        {(prop.loanMonthlyPayment ?? 0) > 0 && <span>ローン返済 <strong className="text-gray-700">¥{prop.loanMonthlyPayment!.toLocaleString()}</strong>/月</span>}
                        {(prop.monthlyManagementFee ?? 0) > 0 && <span>管理費 ¥{prop.monthlyManagementFee!.toLocaleString()}/月</span>}
                        {(prop.monthlyRepairReserve ?? 0) > 0 && <span>修繕積立 ¥{prop.monthlyRepairReserve!.toLocaleString()}/月</span>}
                        {(prop.annualPropertyTax ?? 0) > 0 && <span>固定資産税 ¥{prop.annualPropertyTax!.toLocaleString()}/年</span>}
                        {(prop.monthlyOtherCosts ?? 0) > 0 && <span>その他 ¥{prop.monthlyOtherCosts!.toLocaleString()}/月</span>}
                        <span className={`font-semibold ml-auto ${monthlyCF >= 0 ? "text-green-600" : "text-red-600"}`}>
                          月次CF {monthlyCF >= 0 ? "+" : ""}¥{Math.round(monthlyCF).toLocaleString()}
                        </span>
                      </div>
                      {prop.note && <div className="px-5 pb-3 text-xs text-gray-400">{prop.note}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 生活費 ────────────────────────────────────── */}
        {tab === "生活費" && (
          <div className="space-y-5">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-gray-700">月間生活費</h3>
                <span className="text-xl font-bold text-gray-900">¥{(fixedExpenses + variableExpenses).toLocaleString()}</span>
              </div>
              <p className="text-xs text-gray-400">入力した金額がライフプランのシミュレーションに反映されます</p>
            </div>

            {/* Category grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {LIFE_EXPENSE_PRESETS.map(preset => {
                const saved = expenses.find(e => e.name === preset.name);
                const inputVal = expenseInputs[preset.name] ?? (saved ? String(saved.amount) : "");
                return (
                  <div key={preset.name} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg leading-none">{preset.emoji}</span>
                      <span className="text-xs font-medium text-gray-700">{preset.name}</span>
                      <span className={`ml-auto text-xs px-1.5 py-0.5 rounded ${preset.isFixed ? "bg-blue-50 text-blue-500" : "bg-orange-50 text-orange-500"}`}>
                        {preset.isFixed ? "固定" : "変動"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">¥</span>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        placeholder="0"
                        value={inputVal}
                        onChange={e => setExpenseInputs(prev => ({ ...prev, [preset.name]: e.target.value }))}
                        onBlur={e => {
                          const v = parseInt(e.target.value) || 0;
                          handleSetExpenseAmount(preset, v);
                          setExpenseInputs(prev => ({ ...prev, [preset.name]: v > 0 ? String(v) : "" }));
                        }}
                        className="w-full text-sm font-medium text-gray-900 bg-gray-50 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Monthly balance summary */}
            {(monthlyTakeHome > 0 || totalExpenses > 0) && (
              <div className={`rounded-2xl p-5 ${monthlySavings >= 0 ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"}`}>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">月間収支サマリー</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">手取り収入</span><span className="font-medium text-teal-700">+¥{monthlyTakeHome.toLocaleString()}</span></div>
                  {(fixedExpenses + variableExpenses) > 0 && <div className="flex justify-between"><span className="text-gray-600">生活費</span><span className="font-medium text-rose-600">−¥{(fixedExpenses + variableExpenses).toLocaleString()}</span></div>}
                  {insurancePremiums > 0 && <div className="flex justify-between"><span className="text-gray-600">保険料</span><span className="font-medium text-rose-600">−¥{insurancePremiums.toLocaleString()}</span></div>}
                  {loanPaymentsTotal > 0 && <div className="flex justify-between"><span className="text-gray-600">ローン返済</span><span className="font-medium text-rose-600">−¥{loanPaymentsTotal.toLocaleString()}</span></div>}
                  {mortgageMonthlyNow > 0 && <div className="flex justify-between"><span className="text-gray-600">{mortgageSimPlan?.bankName ? `${mortgageSimPlan.bankName}（住宅ローン）` : "住宅ローン"}</span><span className="font-medium text-rose-600">−¥{mortgageMonthlyNow.toLocaleString()}</span></div>}
                  <div className={`flex justify-between font-bold pt-2 border-t ${monthlySavings >= 0 ? "border-green-200" : "border-red-200"}`}>
                    <span className="text-gray-800">月間収支</span>
                    <span className={monthlySavings >= 0 ? "text-green-700" : "text-red-700"}>{monthlySavings >= 0 ? "+" : ""}¥{monthlySavings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>年間貯蓄予測</span><span>{(monthlySavings * 12) >= 0 ? "+" : ""}¥{(monthlySavings * 12).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 固定資産税 ────────────────────────────────── */}
        {tab === "固定資産税" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Landmark size={16} className="text-violet-500" /> 固定資産税
              </h3>
              <button onClick={() => { setEditingPropertyTax(null); setShowPropertyTaxModal(true); }}
                className="flex items-center gap-1.5 text-sm bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 transition-colors">
                <Plus size={14} /> 追加
              </button>
            </div>
            {propertyTaxEntries.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 shadow-sm">
                <Landmark size={32} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm">固定資産税の物件がありません</p>
                <button onClick={() => { setEditingPropertyTax(null); setShowPropertyTaxModal(true); }}
                  className="text-xs text-violet-600 hover:underline mt-2">追加する</button>
              </div>
            ) : (
              <>
                <div className="bg-violet-50 rounded-xl p-4 text-sm text-gray-700">
                  <p className="font-medium text-violet-800 mb-1">合計（年額）</p>
                  <p className="text-2xl font-bold text-violet-700">¥{propertyTaxAnnual.toLocaleString("ja-JP")}</p>
                  <p className="text-xs text-gray-400 mt-0.5">月換算 ¥{Math.round(propertyTaxAnnual / 12).toLocaleString("ja-JP")}</p>
                </div>
                <div className="space-y-3">
                  {propertyTaxEntries.map(entry => {
                    const r = calcPropertyTax(entry);
                    return (
                      <div key={entry.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{entry.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {entry.isResidential ? "住宅用地" : "非住宅"} ·
                              土地 {entry.landArea.toLocaleString()}m² ·
                              {entry.hasUrbanTax ? ` 都市計画税 ${entry.urbanTaxRate}%あり` : " 都市計画税なし"}
                            </p>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <button onClick={() => { setEditingPropertyTax(entry); setShowPropertyTaxModal(true); }}
                              className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => { if (confirm(`「${entry.name}」を削除しますか？`)) handleDeletePropertyTax(entry.id); }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                          <span>土地・固定資産税</span><span className="text-right">¥{r.landFixedTax.toLocaleString()}</span>
                          <span>建物・固定資産税</span><span className="text-right">¥{r.buildingFixedTax.toLocaleString()}</span>
                          {entry.hasUrbanTax && <>
                            <span>土地・都市計画税</span><span className="text-right">¥{r.landUrbanTax.toLocaleString()}</span>
                            <span>建物・都市計画税</span><span className="text-right">¥{r.buildingUrbanTax.toLocaleString()}</span>
                          </>}
                          <span className="font-semibold text-gray-800 pt-1 border-t border-gray-100">合計（年額）</span>
                          <span className="text-right font-semibold text-gray-800 pt-1 border-t border-gray-100">¥{r.total.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── 注文住宅 ──────────────────────────────────── */}
        {tab === "注文住宅" && <CustomHomeTab />}

        {/* ── 太陽光 ───────────────────────────────────── */}
        {tab === "太陽光" && <SolarCalc />}

        {/* ── 住宅ローン ───────────────────────────────── */}
        {/* ── 申請チェックリスト ─────────────────────────── */}
        {tab === "申請チェック" && <TaxChecklist />}

        {tab === "住宅ローン" && <MortgageCalc />}

        {/* ── プロフィール ──────────────────────────────── */}
        {tab === "プロフィール" && (
          <UserProfileTab
            profile={userProfile}
            onSave={async (p) => { setUserProfile(p); await saveUserProfile(p); }}
            isViewer={!!viewerOwnerUid}
          />
        )}

      </main>

      {/* Modals */}
      {showAssetModal && <AssetModal asset={editingAsset} onSave={handleSaveAsset} onClose={() => { setShowAssetModal(false); setEditingAsset(null); }} />}
      {showStockModal && <StockModal stock={editingStock} memberOptions={memberOptions} onSave={handleSaveStock} onClose={() => { setShowStockModal(false); setEditingStock(null); }} />}
      {showFundModal && <FundModal fund={editingFund} memberOptions={memberOptions} onSave={handleSaveFund} onClose={() => { setShowFundModal(false); setEditingFund(null); }} />}
      {showGoalModal && <GoalModal goal={editingGoal} totalAssets={grandTotal} onSave={handleSaveGoal} onClose={() => { setShowGoalModal(false); setEditingGoal(null); }} />}
      {showExpenseModal && <ExpenseModal expense={editingExpense} onSave={handleSaveExpense} onClose={() => { setShowExpenseModal(false); setEditingExpense(null); }} />}
      {showIncomeModal && <IncomeProfileModal profile={editingIncome} userProfile={userProfile} onSave={handleSaveIncome} onClose={() => { setShowIncomeModal(false); setEditingIncome(null); }} />}
      {showLifeEventModal && <LifeEventModal key={editingLifeEvent?.id ?? "new"} event={editingLifeEvent} onSave={handleSaveLifeEvent} onClose={() => { setShowLifeEventModal(false); setEditingLifeEvent(null); }} />}
      {showTemplateModal && <LifeEventTemplateModal onAdd={handleAddDrafts} onClose={() => setShowTemplateModal(false)} />}
      {showInsuranceModal && <InsurancePlanModal plan={editingInsurance} onSave={handleSaveInsurance} onClose={() => { setShowInsuranceModal(false); setEditingInsurance(null); }} />}
      {showSpendingModal && <SpendingModal record={editingSpending} defaultDate={`${selectedMonth}-01`} onSave={handleSaveSpending} onClose={() => { setShowSpendingModal(false); setEditingSpending(null); }} />}
      {showLoanModal && <LoanModal loan={editingLoan} onSave={handleSaveLoan} onClose={() => { setShowLoanModal(false); setEditingLoan(null); }} />}
      {showPropertyTaxModal && <PropertyTaxModal key={editingPropertyTax?.id ?? "new"} entry={editingPropertyTax} onSave={handleSavePropertyTax} onClose={() => { setShowPropertyTaxModal(false); setEditingPropertyTax(null); }} />}
      {showInvestmentPropertyModal && (
        <InvestmentPropertyModal
          property={editingInvestmentProperty}
          memberOptions={memberOptions}
          onClose={() => { setShowInvestmentPropertyModal(false); setEditingInvestmentProperty(null); }}
          onSave={prop => {
            const updated = editingInvestmentProperty
              ? investmentProperties.map(p => p.id === editingInvestmentProperty.id ? prop : p)
              : [...investmentProperties, prop];
            setInvestmentProperties(updated);
            saveInvestmentProperties(updated);
            setShowInvestmentPropertyModal(false);
            setEditingInvestmentProperty(null);
          }}
        />
      )}
    </div>
  );
}

// ── SavingsAccountModal ───────────────────────────────────────────────────────

function SavingsAccountModal({ account, userProfile, onClose, onSave }: {
  account: SavingsAccount | null;
  userProfile: UserProfile | null;
  onClose: () => void;
  onSave: (acct: SavingsAccount) => void;
}) {
  const [bankName, setBankName] = useState(account?.bankName ?? "");
  const [accountName, setAccountName] = useState(account?.accountName ?? "");
  const [balance, setBalance] = useState(account ? String(account.balance) : "");
  const [interestRate, setInterestRate] = useState(account ? String(account.interestRate) : "0");
  const [accountType, setAccountType] = useState<SavingsAccountType>(account?.accountType ?? "普通");
  const [memberId, setMemberId] = useState<string>(account?.memberId ?? "");
  const [note, setNote] = useState(account?.note ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bal = Math.round(parseFloat(balance.replace(/,/g, "")) || 0);
    const rate = parseFloat(interestRate) || 0;
    onSave({
      id: account?.id ?? crypto.randomUUID(),
      bankName: bankName.trim(),
      accountName: accountName.trim(),
      balance: bal,
      interestRate: rate,
      accountType,
      memberId: memberId || undefined,
      note: note.trim() || undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{account ? "口座を編集" : "口座を追加"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">金融機関名 *</label>
              <input value={bankName} onChange={e => setBankName(e.target.value)} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: 三菱UFJ銀行" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">口座名</label>
              <input value={accountName} onChange={e => setAccountName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: 給与口座" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">残高（円） *</label>
            <input value={balance} onChange={e => setBalance(e.target.value)} required type="text" inputMode="numeric"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: 500000" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">種別</label>
              <select value={accountType} onChange={e => setAccountType(e.target.value as SavingsAccountType)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="普通">普通</option>
                <option value="定期">定期</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">金利（%）</label>
              <input value={interestRate} onChange={e => setInterestRate(e.target.value)} type="text" inputMode="decimal"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: 0.02" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">名義人</label>
            <select value={memberId} onChange={e => setMemberId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">未設定</option>
              {getMemberOptions(userProfile).map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">メモ</label>
            <input value={note} onChange={e => setNote(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="任意のメモ" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              キャンセル
            </button>
            <button type="submit"
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── InvestmentPropertyModal ───────────────────────────────────────────────────

const INVESTMENT_PROPERTY_TYPES: InvestmentPropertyType[] = ["区分マンション", "一棟マンション", "戸建て", "その他"];

function InvestmentPropertyModal({ property, memberOptions, onClose, onSave }: {
  property: InvestmentProperty | null;
  memberOptions: { id: string; label: string }[];
  onClose: () => void;
  onSave: (p: InvestmentProperty) => void;
}) {
  const [name, setName] = useState(property?.name ?? "");
  const [location, setLocation] = useState(property?.location ?? "");
  const [propertyType, setPropertyType] = useState<InvestmentPropertyType>(property?.propertyType ?? "区分マンション");
  const [memberId, setMemberId] = useState<string>(property?.memberId ?? "");
  const [purchasePriceMan, setPurchasePriceMan] = useState(property ? String(property.purchasePriceMan) : "");
  const [purchaseDate, setPurchaseDate] = useState(property?.purchaseDate ?? "");
  const [loanBalanceMan, setLoanBalanceMan] = useState(property?.loanBalanceMan != null ? String(property.loanBalanceMan) : "");
  const [loanMonthlyPayment, setLoanMonthlyPayment] = useState(property?.loanMonthlyPayment != null ? String(property.loanMonthlyPayment) : "");
  const [monthlyRent, setMonthlyRent] = useState(property ? String(property.monthlyRent) : "");
  const [monthlyManagementFee, setMonthlyManagementFee] = useState(property?.monthlyManagementFee != null ? String(property.monthlyManagementFee) : "");
  const [monthlyRepairReserve, setMonthlyRepairReserve] = useState(property?.monthlyRepairReserve != null ? String(property.monthlyRepairReserve) : "");
  const [annualPropertyTax, setAnnualPropertyTax] = useState(property?.annualPropertyTax != null ? String(property.annualPropertyTax) : "");
  const [monthlyOtherCosts, setMonthlyOtherCosts] = useState(property?.monthlyOtherCosts != null ? String(property.monthlyOtherCosts) : "");
  const [note, setNote] = useState(property?.note ?? "");

  const num = (s: string) => s === "" ? undefined : parseFloat(s) || 0;
  const req = (s: string) => parseFloat(s) || 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = req(purchasePriceMan);
    const rent = req(monthlyRent);
    if (!name || price <= 0 || rent < 0) return;
    onSave({
      id: property?.id ?? crypto.randomUUID(),
      name: name.trim(),
      location: location.trim() || undefined,
      propertyType,
      memberId: memberId || undefined,
      purchasePriceMan: price,
      purchaseDate: purchaseDate || undefined,
      loanBalanceMan: num(loanBalanceMan),
      loanMonthlyPayment: num(loanMonthlyPayment),
      monthlyRent: rent,
      monthlyManagementFee: num(monthlyManagementFee),
      monthlyRepairReserve: num(monthlyRepairReserve),
      annualPropertyTax: num(annualPropertyTax),
      monthlyOtherCosts: num(monthlyOtherCosts),
      note: note.trim() || undefined,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">{property ? "物件を編集" : "投資物件を追加"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">物件名</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="〇〇マンション 301号室"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">種別</label>
              <select value={propertyType} onChange={e => setPropertyType(e.target.value as InvestmentPropertyType)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {INVESTMENT_PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {memberOptions.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名義人</label>
                <select value={memberId} onChange={e => setMemberId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">未設定</option>
                  {memberOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">所在地（任意）</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="東京都〇〇区"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">購入価格（万円）</label>
              <input type="number" value={purchasePriceMan} onChange={e => setPurchasePriceMan(e.target.value)} placeholder="2000" min={0}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">購入日（任意）</label>
              <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-gray-500 mb-3">ローン</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">借入残高（万円）</label>
                <input type="number" value={loanBalanceMan} onChange={e => setLoanBalanceMan(e.target.value)} placeholder="1500" min={0}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">月返済額（円）</label>
                <input type="number" value={loanMonthlyPayment} onChange={e => setLoanMonthlyPayment(e.target.value)} placeholder="60000" min={0}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-gray-500 mb-3">収支</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">月額家賃収入（円）</label>
                <input type="number" value={monthlyRent} onChange={e => setMonthlyRent(e.target.value)} placeholder="80000" min={0}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">管理費（円/月）</label>
                <input type="number" value={monthlyManagementFee} onChange={e => setMonthlyManagementFee(e.target.value)} placeholder="5000" min={0}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">修繕積立金（円/月）</label>
                <input type="number" value={monthlyRepairReserve} onChange={e => setMonthlyRepairReserve(e.target.value)} placeholder="3000" min={0}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">固定資産税（円/年）</label>
                <input type="number" value={annualPropertyTax} onChange={e => setAnnualPropertyTax(e.target.value)} placeholder="80000" min={0}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">その他コスト（円/月）</label>
                <input type="number" value={monthlyOtherCosts} onChange={e => setMonthlyOtherCosts(e.target.value)} placeholder="2000" min={0}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ（任意）</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="備考など"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              キャンセル
            </button>
            <button type="submit"
              className="flex-1 py-2.5 bg-blue-600 rounded-xl text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
