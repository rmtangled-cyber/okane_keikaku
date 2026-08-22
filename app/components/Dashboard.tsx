"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine,
  AreaChart, Area, BarChart, Bar,
} from "recharts";
import {
  Plus, TrendingUp, Wallet, Target, RefreshCw, Download,
  BarChart2, Layers, Receipt, MapPin, BookOpen, ChevronLeft,
  ChevronRight, CreditCard, Sun, Building2,
} from "lucide-react";

import {
  Asset, AssetCategory, Goal, StockHolding, FundHolding,
  MonthlyExpense, IncomeProfile, LifeEvent, InsurancePlan,
  SpendingRecord, LoanPlan, ExpenseCategory, calcTax,
} from "@/lib/types";
import {
  getAssets, saveAssets, loadAssets,
  getGoals, saveGoals, loadGoals,
  getSnapshots, saveSnapshots, loadSnapshots,
  exportToCSV,
  getStocks, saveStocks, loadStocks,
  getFunds, saveFunds, loadFunds,
  getExpenses, saveExpenses, loadExpenses,
  getIncomeProfiles, saveIncomeProfiles, loadIncomeProfiles,
  getLifeEvents, saveLifeEvents, loadLifeEvents,
  getInsurancePlans, saveInsurancePlans, loadInsurancePlans,
  getSpendingRecords, saveSpendingRecords, loadSpendingRecords,
  getLoanPlans, saveLoanPlans, loadLoanPlans,
} from "@/lib/storage";
import { calcTakeHome } from "@/lib/taxCalc";
import { calcEqualPayment, loanEndYM, loanCurrentStatus, loanPaymentForYear } from "@/lib/loanCalc";
import AssetCard from "./AssetCard";
import AssetModal from "./AssetModal";
import GoalCard from "./GoalCard";
import GoalModal from "./GoalModal";
import StockCard from "./StockCard";
import StockModal from "./StockModal";
import FundCard from "./FundCard";
import FundModal from "./FundModal";
import ExpenseCard from "./ExpenseCard";
import ExpenseModal from "./ExpenseModal";
import IncomeProfileCard from "./IncomeProfileCard";
import IncomeProfileModal from "./IncomeProfileModal";
import LifeEventCard from "./LifeEventCard";
import LifeEventModal from "./LifeEventModal";
import InsurancePlanCard from "./InsurancePlanCard";
import InsurancePlanModal from "./InsurancePlanModal";
import SpendingModal from "./SpendingModal";
import LoanCard from "./LoanCard";
import LoanModal from "./LoanModal";
import SolarCalc from "./SolarCalc";
import MortgageCalc from "./MortgageCalc";
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

type Tab = "概要" | "株式" | "投資信託" | "資産" | "目標" | "収支" | "家計簿" | "ライフプラン" | "太陽光" | "住宅ローン";

// ── Life Plan Simulation ───────────────────────────────────────────────────────

function getIncomeForYear(profiles: IncomeProfile[], year: number): IncomeProfile | null {
  const candidates = profiles.filter(p => !p.activeFromYear || p.activeFromYear <= year);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, p) =>
    (p.activeFromYear ?? 0) >= (best.activeFromYear ?? 0) ? p : best
  );
}

function computeWeightedReturn(funds: FundHolding[], stocks: StockHolding[], assets: Asset[]): number {
  const fundsVal = funds.reduce((s, f) => s + f.currentValue, 0);
  const stocksVal = stocks.reduce((s, h) => s + h.currentPrice * h.shares, 0);
  const total = fundsVal + stocksVal + assets.reduce((s, a) => s + a.amount, 0);
  if (total === 0) return 0;
  const fundsReturn = funds.reduce((s, f) => s + f.currentValue * (f.expectedAnnualReturn / 100), 0);
  return (fundsReturn + stocksVal * 0.05) / total;
}

interface SimPoint { year: number; assets: number; label?: string }

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
): SimPoint[] {
  const points: SimPoint[] = [];
  let assets = startAssets;
  const nowYM = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  for (let i = 0; i <= yearsToProject; i++) {
    const year = startYear + i;

    // Income
    const profile = getIncomeForYear(profiles, year);
    const takeHome = profile
      ? calcTakeHome(profile.grossMonthly, profile.prefecture, profile.age + i, profile.dependents).takeHome
      : 0;

    // Fixed expenses
    const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);

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

    // Life events cumulative monthly
    const cumulativeMonthly = lifeEvents
      .filter(e => e.year <= year)
      .reduce((s, e) => s + e.monthlyAmountChange, 0);

    // One-time events this year
    const oneTime = lifeEvents.filter(e => e.year === year).reduce((s, e) => s + e.oneTimeAmount, 0);

    const monthlyCashFlow = takeHome - expenseTotal - insuranceTotal - loanTotal + cumulativeMonthly;
    const annualCashFlow = monthlyCashFlow * 12;
    const investmentReturn = i > 0 ? assets * weightedReturn : 0;

    if (i > 0) assets = assets + annualCashFlow + oneTime + investmentReturn;

    const yearEvents = lifeEvents.filter(e => e.year === year);
    points.push({
      year,
      assets: Math.round(assets),
      label: yearEvents.map(e => e.title).join(" / ") || undefined,
    });
  }
  return points;
}

export default function Dashboard() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stocks, setStocks] = useState<StockHolding[]>([]);
  const [funds, setFunds] = useState<FundHolding[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [snapshots, setSnapshots] = useState<{ month: string; total: number }[]>([]);
  const [expenses, setExpenses] = useState<MonthlyExpense[]>([]);
  const [incomeProfiles, setIncomeProfiles] = useState<IncomeProfile[]>([]);
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([]);
  const [insurancePlans, setInsurancePlans] = useState<InsurancePlan[]>([]);
  const [spendingRecords, setSpendingRecords] = useState<SpendingRecord[]>([]);
  const [loanPlans, setLoanPlans] = useState<LoanPlan[]>([]);
  const [tab, setTab] = useState<Tab>("概要");

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
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<InsurancePlan | null>(null);
  const [showSpendingModal, setShowSpendingModal] = useState(false);
  const [editingSpending, setEditingSpending] = useState<SpendingRecord | null>(null);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanPlan | null>(null);

  // 家計簿 month
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    if (authLoading) return;
    setAssets(getAssets()); setStocks(getStocks()); setFunds(getFunds());
    setGoals(getGoals()); setSnapshots(getSnapshots()); setExpenses(getExpenses());
    setIncomeProfiles(getIncomeProfiles()); setLifeEvents(getLifeEvents());
    setInsurancePlans(getInsurancePlans()); setSpendingRecords(getSpendingRecords());
    setLoanPlans(getLoanPlans());
    loadAssets().then(setAssets); loadStocks().then(setStocks); loadFunds().then(setFunds);
    loadGoals().then(setGoals); loadSnapshots().then(setSnapshots); loadExpenses().then(setExpenses);
    loadIncomeProfiles().then(setIncomeProfiles); loadLifeEvents().then(setLifeEvents);
    loadInsurancePlans().then(setInsurancePlans); loadSpendingRecords().then(setSpendingRecords);
    loadLoanPlans().then(setLoanPlans);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // ── Totals ────────────────────────────────────────────
  const stocksTotal = stocks.reduce((s, h) => s + h.currentPrice * h.shares, 0);
  const fundsTotal = funds.reduce((s, f) => s + f.currentValue, 0);
  const assetsTotal = assets.reduce((s, a) => s + a.amount, 0);
  const grandTotal = stocksTotal + fundsTotal + assetsTotal;

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
  const totalExpenses = fixedExpenses + variableExpenses + insurancePremiums + loanPaymentsTotal;
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

  // ── Life Plan Simulation ──────────────────────────────
  const weightedReturn = computeWeightedReturn(funds, stocks, assets);
  const simData = simulate(
    grandTotal, incomeProfiles, expenses, insurancePlans, loanPlans,
    lifeEvents, weightedReturn, currentYear, 40
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
        ? prev.map(f => f.id === editingFund.id ? { ...f, ...data, updatedAt: new Date().toISOString() } : f)
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

  const handleSaveIncome = useCallback((data: Omit<IncomeProfile, "id" | "updatedAt">) => {
    setIncomeProfiles(prev => {
      const next = editingIncome
        ? prev.map(p => p.id === editingIncome.id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p)
        : [...prev, { id: Date.now().toString(), ...data, updatedAt: new Date().toISOString() }];
      saveIncomeProfiles(next); return next;
    });
    setShowIncomeModal(false); setEditingIncome(null);
  }, [editingIncome]);
  const handleDeleteIncome = useCallback((id: string) => {
    setIncomeProfiles(prev => { const next = prev.filter(p => p.id !== id); saveIncomeProfiles(next); return next; });
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
      case "家計簿":
        return <button onClick={() => { setEditingSpending(null); setShowSpendingModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
          <Plus size={15} /> 記録を追加</button>;
      case "ライフプラン":
        return <button onClick={() => { setEditingLifeEvent(null); setShowLifeEventModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
          <Plus size={15} /> イベント追加</button>;
      default: return null;
    }
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
            <button onClick={handleSnapshot} title="今月のスナップショットを記録"
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <RefreshCw size={15} /><span className="hidden sm:inline">記録</span>
            </button>
            <button onClick={() => exportToCSV(assets)} title="CSVエクスポート"
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Download size={15} /><span className="hidden sm:inline">CSV</span>
            </button>
            {renderAddButton()}
            {!authLoading && (
              user ? (
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
        <div className="max-w-4xl mx-auto px-4 flex gap-1 sm:gap-3 border-t border-gray-50 overflow-x-auto">
          {([
            { key: "概要", icon: <BarChart2 size={14} /> },
            { key: "株式", icon: <TrendingUp size={14} /> },
            { key: "投資信託", icon: <Layers size={14} /> },
            { key: "資産", icon: <Wallet size={14} /> },
            { key: "目標", icon: <Target size={14} /> },
            { key: "収支", icon: <Receipt size={14} /> },
            { key: "家計簿", icon: <BookOpen size={14} /> },
            { key: "ライフプラン", icon: <MapPin size={14} /> },
            { key: "太陽光", icon: <Sun size={14} /> },
            { key: "住宅ローン", icon: <Building2 size={14} /> },
          ] as { key: Tab; icon: React.ReactNode }[]).map(({ key, icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 py-3 px-1 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {icon}{key}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Total Banner */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
          <p className="text-sm text-blue-200 mb-1">総資産</p>
          <p className="text-4xl font-bold tracking-tight">¥{grandTotal.toLocaleString()}</p>
          <div className="flex gap-4 mt-3 text-xs text-blue-300">
            <span>株式 ¥{stocksTotal.toLocaleString()}</span>
            <span>投資信託 ¥{fundsTotal.toLocaleString()}</span>
            <span>その他 ¥{assetsTotal.toLocaleString()}</span>
          </div>
          <p className="text-xs text-blue-400 mt-1">{new Date().toLocaleDateString("ja-JP")} 現在</p>
        </div>

        {/* ── 概要 ─────────────────────────────────────── */}
        {tab === "概要" && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm col-span-2 sm:col-span-1">
                <div className="text-xs text-gray-500 mb-2">今売ったら税金（概算）</div>
                <div className="font-bold text-orange-600">¥{(stocksTax + fundsTax).toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-0.5">手取り ¥{(grandTotal - stocksTax - fundsTax).toLocaleString()}</div>
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
          </>
        )}

        {/* ── 株式 ─────────────────────────────────────── */}
        {tab === "株式" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-4 text-sm">
              <div><div className="text-xs text-gray-400">評価額合計</div><div className="font-bold text-gray-900">¥{stocksTotal.toLocaleString()}</div></div>
              <div><div className="text-xs text-gray-400">評価損益</div><div className={`font-bold ${stocksGain >= 0 ? "text-green-600" : "text-red-600"}`}>{stocksGain >= 0 ? "+" : ""}{stocksGain.toLocaleString()}円</div></div>
              <div><div className="text-xs text-gray-400">税引後手取り（概算）</div><div className="font-bold text-gray-700">¥{(stocksTotal - stocksTax).toLocaleString()}</div></div>
              <div className="text-xs text-gray-400 self-end">※税金は特定・一般口座のみ 20.315%</div>
            </div>
            {stocks.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 shadow-sm">
                <TrendingUp size={32} className="mx-auto mb-3 text-gray-200" /><p className="text-sm">株式保有がありません</p>
                <button onClick={() => { setEditingStock(null); setShowStockModal(true); }} className="mt-3 text-xs text-green-600 hover:underline">最初の銘柄を追加する</button>
              </div>
            ) : (
              <div className="space-y-3">{stocks.map(s => <StockCard key={s.id} stock={s} onEdit={s => { setEditingStock(s); setShowStockModal(true); }} onDelete={handleDeleteStock} />)}</div>
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
              <div className="space-y-3">{funds.map(f => <FundCard key={f.id} fund={f} onEdit={f => { setEditingFund(f); setShowFundModal(true); }} onDelete={handleDeleteFund} />)}</div>
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
                  {[...incomeProfiles].sort((a, b) => (a.activeFromYear ?? 0) - (b.activeFromYear ?? 0)).map(p => (
                    <IncomeProfileCard key={p.id} profile={p}
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
                  {activeLoans.length > 0 && <span>返済中 {activeLoans.length}件 · 月計 ¥{loanPaymentsTotal.toLocaleString()}</span>}
                </div>
              </div>
              {loanPlans.length === 0 ? (
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

        {/* ── 家計簿 ────────────────────────────────────── */}
        {tab === "家計簿" && (
          <div className="space-y-5">
            {/* Month navigator */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => shiftMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronLeft size={18} />
                </button>
                <div className="text-center">
                  <div className="font-bold text-gray-900 text-lg">
                    {selectedMonth.replace("-", "年")}月
                  </div>
                  <div className="text-xs text-gray-400">{monthRecords.length}件 · 合計 ¥{monthTotal.toLocaleString()}</div>
                </div>
                <button onClick={() => shiftMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Category breakdown */}
              {categoryTotals.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {categoryTotals.slice(0, 10).map(([cat, amt]) => {
                    const budget = budgetMap.get(cat);
                    const over = budget != null && amt > budget;
                    return (
                      <div key={cat} className={`rounded-lg p-2 text-center ${over ? "bg-red-50 border border-red-100" : "bg-gray-50"}`}>
                        <div className="text-xs text-gray-500 truncate">{cat}</div>
                        <div className={`text-xs font-bold ${over ? "text-red-600" : "text-gray-800"}`}>
                          ¥{amt >= 10000 ? `${Math.round(amt / 1000)}k` : amt.toLocaleString()}
                        </div>
                        {budget != null && (
                          <div className="text-xs text-gray-400">/{budget >= 10000 ? `${Math.round(budget / 1000)}k` : budget.toLocaleString()}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Budget vs Actual table */}
            {expenses.length > 0 && categoryTotals.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 text-sm font-semibold text-gray-700">予算対比</div>
                <div className="divide-y divide-gray-50">
                  {expenses.map(e => {
                    const actual = monthRecords.filter(r => r.category === e.category).reduce((s, r) => s + r.amount, 0);
                    const diff = e.amount - actual;
                    return (
                      <div key={e.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                        <span className="flex-1 text-gray-700">{e.name}</span>
                        <span className="text-gray-400 text-xs">{e.category}</span>
                        <span className="w-20 text-right text-gray-500">予 ¥{e.amount.toLocaleString()}</span>
                        <span className="w-20 text-right font-medium text-gray-800">実 ¥{actual.toLocaleString()}</span>
                        <span className={`w-20 text-right text-xs font-medium ${diff >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {diff >= 0 ? "+" : ""}¥{diff.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Transaction list */}
            {monthRecords.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400 shadow-sm">
                <BookOpen size={32} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm">この月の記録がありません</p>
                <button onClick={() => { setEditingSpending(null); setShowSpendingModal(true); }}
                  className="mt-2 text-xs text-emerald-600 hover:underline">支出を記録する</button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {monthRecords.map(r => (
                    <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-12 shrink-0">{r.date.slice(5).replace("-", "/")}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium`}
                        style={{ background: EXPENSE_CATEGORY_COLOR[r.category] + "20", color: EXPENSE_CATEGORY_COLOR[r.category] }}>
                        {r.category}
                      </span>
                      <span className="flex-1 text-sm text-gray-800 truncate">{r.name}</span>
                      {r.note && <span className="text-xs text-gray-400 truncate hidden sm:block max-w-[100px]">{r.note}</span>}
                      <span className="font-bold text-gray-900 shrink-0">¥{r.amount.toLocaleString()}</span>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => { setEditingSpending(r); setShowSpendingModal(true); }}
                          className="p-1.5 text-gray-300 hover:text-blue-600 rounded transition-colors">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => { if (confirm("削除しますか？")) handleDeleteSpending(r.id); }}
                          className="p-1.5 text-gray-300 hover:text-red-600 rounded transition-colors">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 bg-gray-50 flex justify-between text-sm font-bold text-gray-700 border-t border-gray-100">
                  <span>合計</span><span>¥{monthTotal.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 太陽光 ───────────────────────────────────── */}
        {tab === "太陽光" && <SolarCalc />}

        {/* ── 住宅ローン ───────────────────────────────── */}
        {tab === "住宅ローン" && <MortgageCalc />}

        {/* ── ライフプラン ──────────────────────────────── */}
        {tab === "ライフプラン" && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                <MapPin size={16} className="text-violet-500" /> 資産シミュレーション（40年）
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                年齢別収入・ローン・保険・ライフイベントを考慮した試算
                {weightedReturn > 0 && `（加重平均リターン ${(weightedReturn * 100).toFixed(1)}%/年）`}
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={simData}>
                  <defs>
                    <linearGradient id="assetGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} tickFormatter={v => `${v}年`} interval={4} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v =>
                    v >= 100000000 ? `${(v / 100000000).toFixed(0)}億` : `${(v / 10000).toFixed(0)}万`
                  } width={52} />
                  <Tooltip
                    formatter={(v) => {
                      const n = typeof v === "number" ? v : 0;
                      return n >= 100000000 ? `¥${(n / 100000000).toFixed(2)}億` : `¥${n.toLocaleString()}`;
                    }}
                    labelFormatter={l => `${l}年`}
                  />
                  {lifeEvents.map(e => (
                    <ReferenceLine key={e.id} x={e.year} stroke="#f59e0b" strokeDasharray="4 4"
                      label={{ value: e.title, position: "top", fontSize: 9, fill: "#92400e" }} />
                  ))}
                  {loanPlans.map(l => {
                    const endY = parseInt(loanEndYM(l.startDate, l.termMonths).split("-")[0]);
                    return <ReferenceLine key={l.id} x={endY} stroke="#22c55e" strokeDasharray="3 3"
                      label={{ value: `${l.name}完済`, position: "insideTopRight", fontSize: 8, fill: "#15803d" }} />;
                  })}
                  <Area type="monotone" dataKey="assets" stroke="#8b5cf6" strokeWidth={2} fill="url(#assetGrad)" name="総資産" />
                </AreaChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-4 gap-2 mt-4">
                {[10, 20, 30, 40].map(y => {
                  const pt = simData[y];
                  const v = pt?.assets ?? 0;
                  return (
                    <div key={y} className="bg-violet-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-gray-400">{y}年後</div>
                      <div className="text-xs font-bold text-violet-700">
                        {v >= 100000000 ? `${(v / 100000000).toFixed(1)}億` : `${Math.round(v / 10000)}万`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Life events */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">ライフイベント</h3>
              </div>
              {lifeEvents.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 shadow-sm">
                  <MapPin size={32} className="mx-auto mb-3 text-gray-200" />
                  <p className="text-sm">ライフイベントがありません</p>
                  <button onClick={() => { setEditingLifeEvent(null); setShowLifeEventModal(true); }}
                    className="mt-2 text-xs text-violet-600 hover:underline">転職・結婚・住宅購入などを追加する</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...lifeEvents].sort((a, b) => a.year - b.year).map(e => (
                    <LifeEventCard key={e.id} event={e}
                      onEdit={e => { setEditingLifeEvent(e); setShowLifeEventModal(true); }}
                      onDelete={handleDeleteLifeEvent} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {showAssetModal && <AssetModal asset={editingAsset} onSave={handleSaveAsset} onClose={() => { setShowAssetModal(false); setEditingAsset(null); }} />}
      {showStockModal && <StockModal stock={editingStock} onSave={handleSaveStock} onClose={() => { setShowStockModal(false); setEditingStock(null); }} />}
      {showFundModal && <FundModal fund={editingFund} onSave={handleSaveFund} onClose={() => { setShowFundModal(false); setEditingFund(null); }} />}
      {showGoalModal && <GoalModal goal={editingGoal} totalAssets={grandTotal} onSave={handleSaveGoal} onClose={() => { setShowGoalModal(false); setEditingGoal(null); }} />}
      {showExpenseModal && <ExpenseModal expense={editingExpense} onSave={handleSaveExpense} onClose={() => { setShowExpenseModal(false); setEditingExpense(null); }} />}
      {showIncomeModal && <IncomeProfileModal profile={editingIncome} onSave={handleSaveIncome} onClose={() => { setShowIncomeModal(false); setEditingIncome(null); }} />}
      {showLifeEventModal && <LifeEventModal event={editingLifeEvent} onSave={handleSaveLifeEvent} onClose={() => { setShowLifeEventModal(false); setEditingLifeEvent(null); }} />}
      {showInsuranceModal && <InsurancePlanModal plan={editingInsurance} onSave={handleSaveInsurance} onClose={() => { setShowInsuranceModal(false); setEditingInsurance(null); }} />}
      {showSpendingModal && <SpendingModal record={editingSpending} defaultDate={`${selectedMonth}-01`} onSave={handleSaveSpending} onClose={() => { setShowSpendingModal(false); setEditingSpending(null); }} />}
      {showLoanModal && <LoanModal loan={editingLoan} onSave={handleSaveLoan} onClose={() => { setShowLoanModal(false); setEditingLoan(null); }} />}
    </div>
  );
}
