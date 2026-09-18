"use client";

import { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Building2, Info, ChevronDown, ChevronUp, AlertTriangle, Plus, Calendar, Pencil, Trash2 } from "lucide-react";
import { loadMortgageSimPlan, saveMortgageSimPlan, loadMortgageProperties, saveMortgageProperties, loadMortgageProperty, loadUserProfile } from "../../lib/storage";
import { useAuth } from "../../lib/auth-context";
import type { DrawdownEntry, MortgageProperty, PropertyCostItem, PropertyRateChange, UserProfile } from "../../lib/types";
import MortgagePropertyModal, { type BorrowerOption } from "./MortgagePropertyModal";

function calcPayment(principal: number, annualPct: number, months: number): number {
  if (months <= 0 || principal <= 0) return 0;
  const r = annualPct / 100 / 12;
  if (r === 0) return principal / months;
  return principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
}

interface SimPeriod { label: string; payment: number; capped: boolean; rateAtStart: number }
interface SimResult {
  periods: SimPeriod[];
  chartPoints: { year: number; principal: number; unpaidInterest: number; total: number }[];
  annualBreakdown: { year: number; interest: number; principal: number }[];
  finalLumpSum: number;
  totalPaid: number;
  totalExtra: number;
  totalInterest: number;
}

function simulateCustom(
  principal: number,
  termMonths: number,
  rateChanges: { fromYear: number; rate: number; extra: number }[],
  bonusSemiAnnual: number = 0,
): SimResult {
  const sorted = [...rateChanges].sort((a, b) => a.fromYear - b.fromYear);

  const getRateForYear = (year: number): number => {
    let r = sorted[0]?.rate ?? 0;
    for (const rc of sorted) {
      if (rc.fromYear <= year) r = rc.rate;
    }
    return r;
  };

  let currentRate = getRateForYear(1);
  let currentPayment = calcPayment(principal, currentRate, termMonths);
  let balance = principal;
  let unpaidInterest = 0;
  let totalPaid = 0;
  let totalExtra = 0;

  const chartPoints: SimResult["chartPoints"] = [
    { year: 0, principal: Math.round(balance), unpaidInterest: 0, total: Math.round(balance) },
  ];
  const annualBreakdown: SimResult["annualBreakdown"] = [];
  let annualInterestAcc = 0;
  let annualPrincipalAcc = 0;
  const periods: SimPeriod[] = [];
  let periodStartYear = 1;
  let periodCapped = false;

  for (let m = 1; m <= termMonths; m++) {
    const year = Math.ceil(m / 12);
    const isFirstMonthOfYear = (m - 1) % 12 === 0;
    const isFirstMonthOf5YearPeriod = m > 1 && (m - 1) % 60 === 0;

    if (isFirstMonthOfYear && year > 1) {
      for (const rc of sorted) {
        if (rc.fromYear === year && rc.extra > 0 && balance > 0) {
          const applied = Math.min(rc.extra, balance);
          balance = Math.max(0, balance - applied);
          totalExtra += applied;
          annualPrincipalAcc += applied;
        }
      }
      currentRate = getRateForYear(year);
    }

    if (isFirstMonthOf5YearPeriod) {
      const periodEndYear = (m - 1) / 12;
      periods.push({
        label: `${periodStartYear}〜${periodEndYear}年目`,
        payment: Math.round(currentPayment),
        capped: periodCapped,
        rateAtStart: getRateForYear(periodStartYear),
      });
      const remaining = termMonths - m + 1;
      const ideal = calcPayment(balance, currentRate, remaining);
      const cap = currentPayment * 1.25;
      periodCapped = ideal > cap;
      currentPayment = balance > 0 ? Math.min(ideal, cap) : 0;
      periodStartYear = year;
    }

    if (bonusSemiAnnual > 0 && m % 6 === 0 && balance > 0) {
      const applied = Math.min(bonusSemiAnnual, balance);
      balance = Math.max(0, balance - applied);
      totalExtra += applied;
      annualPrincipalAcc += applied;
    }

    const balanceBeforeMonthly = balance;
    const monthlyInterest = balance * currentRate / 100 / 12;
    if (currentPayment >= monthlyInterest) {
      const excess = currentPayment - monthlyInterest;
      const repaid = Math.min(unpaidInterest, excess);
      unpaidInterest = Math.max(0, unpaidInterest - repaid);
      balance = Math.max(0, balance - (excess - repaid));
    } else {
      unpaidInterest += monthlyInterest - currentPayment;
    }
    totalPaid += currentPayment;
    annualInterestAcc += monthlyInterest;
    annualPrincipalAcc += Math.max(0, balanceBeforeMonthly - balance);

    if (m % 12 === 0) {
      chartPoints.push({
        year: m / 12,
        principal: Math.round(balance),
        unpaidInterest: Math.round(unpaidInterest),
        total: Math.round(balance + unpaidInterest),
      });
      annualBreakdown.push({
        year: m / 12,
        interest: Math.round(annualInterestAcc),
        principal: Math.round(annualPrincipalAcc),
      });
      annualInterestAcc = 0;
      annualPrincipalAcc = 0;
    }
  }

  periods.push({
    label: `${periodStartYear}〜${termMonths / 12}年目`,
    payment: Math.round(currentPayment),
    capped: periodCapped,
    rateAtStart: getRateForYear(periodStartYear),
  });

  const finalLumpSum = Math.max(0, Math.round(balance + unpaidInterest));
  return {
    periods,
    chartPoints,
    annualBreakdown,
    finalLumpSum,
    totalPaid: Math.round(totalPaid),
    totalExtra: Math.round(totalExtra),
    totalInterest: Math.round(totalPaid + totalExtra + finalLumpSum - principal),
  };
}

const fmt = (v: number) =>
  v >= 100_000_000 ? `${(v / 100_000_000).toFixed(2)}億` : `${Math.round(v / 10000)}万`;

function AnnualBreakdownTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const interest = payload.find(p => p.name === "利息")?.value ?? 0;
  const principal = payload.find(p => p.name === "元金返済")?.value ?? 0;
  const annual = interest + principal;
  const monthly = Math.round(annual / 12);
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs min-w-[160px]">
      <div className="font-semibold text-gray-700 mb-2">{label}年目</div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">年間合計</span>
          <span className="font-bold text-gray-900">{fmt(annual)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">月次換算</span>
          <span className="font-medium text-gray-700">{fmt(monthly)}</span>
        </div>
        <div className="border-t border-gray-100 pt-1 mt-1 space-y-0.5">
          <div className="flex justify-between gap-4">
            <span className="text-red-500">利息</span>
            <span className="text-red-600">{fmt(interest)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-blue-500">元金返済</span>
            <span className="text-blue-600">{fmt(principal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BorrowerSimData {
  borrowerId: string;
  label: string;
  properties: MortgageProperty[];
  totalPrincipal: number;
  initialMonthly: number;
  maxTermYears: number;
  sim: SimResult;
  hasCap: boolean;
  hasUnpaid: boolean;
}

export default function MortgageCalc() {
  const { user } = useAuth();
  const [borrowerIncomes, setBorrowerIncomes] = useState<Record<string, string>>({});
  const [properties, setProperties] = useState<MortgageProperty[]>([]);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<MortgageProperty | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [expandedBorrowers, setExpandedBorrowers] = useState<Record<string, boolean>>({});

  function migrateProperty(raw: Record<string, unknown>): MortgageProperty {
    const id = String(raw.id ?? `prop_${Date.now()}`);
    const propertyName = String(raw.propertyName ?? "");
    const note = raw.note ? String(raw.note) : undefined;
    const updatedAt = String(raw.updatedAt ?? new Date().toISOString());
    const borrowerId = raw.borrowerId as "self" | "spouse" | undefined;
    const bankName = raw.bankName as string | undefined;
    const bankRate = raw.bankRate as string | undefined;
    const termYears = raw.termYears as string | undefined;
    const rateChanges = raw.rateChanges as PropertyRateChange[] | undefined;
    const bonusRepaymentMan = raw.bonusRepaymentMan as number | undefined;

    if (Array.isArray(raw.costItems) && raw.costItems.length > 0) {
      return {
        id, propertyName, borrowerId, bankName, bankRate, termYears, rateChanges,
        costItems: raw.costItems as PropertyCostItem[], bonusRepaymentMan, note, updatedAt,
      };
    }

    const price = parseFloat(String(raw.priceTotalMan ?? 0)) || 0;
    const dep = parseFloat(String(raw.depositMan ?? 0)) || 0;
    const mid = parseFloat(String(raw.midPaymentMan ?? 0)) || 0;
    const misc = parseFloat(String(raw.miscCostMan ?? 0)) || 0;
    const balance = Math.max(0, price - dep - mid);
    const costItems: PropertyCostItem[] = [];

    if (dep > 0) costItems.push({ id: `ci_dep_${id}`, name: "手付金", date: String(raw.contractDate ?? ""), amountMan: dep });
    if (mid > 0) costItems.push({ id: `ci_mid_${id}`, name: "中間金", date: "", amountMan: mid });
    if (balance > 0) costItems.push({ id: `ci_bal_${id}`, name: "残金決済", date: String(raw.finalSettlementDate ?? ""), amountMan: balance });
    if (misc > 0) costItems.push({ id: `ci_misc_${id}`, name: "諸費用", date: "", amountMan: misc });

    return { id, propertyName, borrowerId, bankName, bankRate, termYears, rateChanges, costItems, bonusRepaymentMan, note, updatedAt };
  }

  useEffect(() => {
    if (!user) return;
    loadUserProfile().then(p => { if (p) setUserProfile(p); });
    loadMortgageProperties().then(async items => {
      if (items.length > 0) {
        setProperties(items.map(p => migrateProperty(p as unknown as Record<string, unknown>)));
      } else {
        const old = await loadMortgageProperty();
        if (old) {
          const migrated = migrateProperty(old as unknown as Record<string, unknown>);
          setProperties([migrated]);
          saveMortgageProperties([migrated]);
        }
      }
    });
    loadMortgageSimPlan().then(plan => {
      if (!plan) return;
      if (plan.borrowerIncomes) {
        setBorrowerIncomes(plan.borrowerIncomes);
      } else if (plan.monthlyIncomeMan) {
        setBorrowerIncomes(prev => ({ ...prev, self: plan.monthlyIncomeMan! }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user || Object.keys(borrowerIncomes).length === 0) return;
    saveMortgageSimPlan({
      bankName: "", bankRate: "", principalMan: "0", termYears: "35",
      monthlyIncomeMan: borrowerIncomes["self"] ?? "",
      borrowerIncomes,
      periodSettings: [],
      updatedAt: new Date().toISOString(),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borrowerIncomes, user]);

  const handlePropertySave = (prop: MortgageProperty) => {
    setProperties(prev => {
      const idx = prev.findIndex(p => p.id === prop.id);
      const next = idx >= 0 ? prev.map((p, i) => i === idx ? prop : p) : [...prev, prop];
      saveMortgageProperties(next);
      return next;
    });
    setShowPropertyModal(false);
    setEditingProperty(null);
  };

  const handlePropertyDelete = (id: string) => {
    setProperties(prev => {
      const next = prev.filter(p => p.id !== id);
      saveMortgageProperties(next);
      return next;
    });
  };

  const drawdowns = useMemo((): DrawdownEntry[] => {
    const items: DrawdownEntry[] = [];
    for (const prop of properties) {
      for (const cost of (prop.costItems ?? [])) {
        if ((cost.amountMan || 0) > 0 && (cost.paymentType ?? "loan") === "loan") {
          items.push({
            id: cost.id,
            date: cost.date ?? "",
            amountMan: cost.amountMan,
            label: prop.propertyName ? `${prop.propertyName}: ${cost.name}` : cost.name,
          });
        }
      }
    }
    return items.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });
  }, [properties]);

  const borrowerOptions = useMemo((): BorrowerOption[] => {
    const selfLabel = userProfile?.displayName || "自分";
    const opts: BorrowerOption[] = [{ id: "self", label: selfLabel }];
    const spouse = userProfile?.familyMembers?.find(m => m.type === "spouse");
    if (spouse) opts.push({ id: "spouse", label: spouse.name || "配偶者" });
    return opts;
  }, [userProfile]);

  const borrowerLabel = (prop: MortgageProperty) => {
    if (!prop.borrowerId) return null;
    return borrowerOptions.find(o => o.id === prop.borrowerId)?.label ?? null;
  };

  const borrowerSims = useMemo((): BorrowerSimData[] => {
    const groups = new Map<string, MortgageProperty[]>();
    for (const prop of properties) {
      const key = prop.borrowerId ?? "unknown";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(prop);
    }

    const result: BorrowerSimData[] = [];

    for (const [bid, props] of groups) {
      const label = borrowerOptions.find(o => o.id === bid)?.label
        ?? (bid === "unknown" ? "未設定" : bid);

      let totalPrincipal = 0;
      let initialMonthly = 0;
      let maxTermYears = 0;
      let periods: SimPeriod[] = [];

      const allChartPoints = new Map<number, { principal: number; unpaidInterest: number; total: number }>();
      const allAnnual = new Map<number, { interest: number; principal: number }>();
      let totalPaid = 0;
      let totalExtra = 0;
      let totalInterest = 0;
      let finalLumpSum = 0;

      // Find reference date: earliest last-disbursement date across properties
      const propStartDates = props.map(prop => {
        const lastDate = (prop.costItems ?? [])
          .filter(c => (c.paymentType ?? "loan") === "loan" && c.date)
          .map(c => c.date!)
          .sort()
          .at(-1);
        return lastDate ? new Date(lastDate) : new Date();
      });
      const refDate = propStartDates.reduce(
        (min, d) => d < min ? d : min,
        propStartDates[0] ?? new Date()
      );

      for (let pi = 0; pi < props.length; pi++) {
        const prop = props[pi];
        const propPrincipal = (prop.costItems ?? [])
          .filter(c => (c.paymentType ?? "loan") === "loan")
          .reduce((s, c) => s + (c.amountMan || 0), 0) * 10000;

        if (propPrincipal <= 0) continue;

        totalPrincipal += propPrincipal;

        const propTermYears = parseInt(prop.termYears ?? "35") || 35;
        const propRate = parseFloat(prop.bankRate ?? "1.075") || 1.075;
        const propTermMonths = propTermYears * 12;
        const propBonusSemiAnnual = (prop.bonusRepaymentMan ?? 0) * 10000;

        let parsedChanges = (prop.rateChanges ?? [])
          .filter(rc => { const y = parseInt(rc.fromYear); return y >= 1 && y <= propTermYears; })
          .map(rc => ({
            fromYear: parseInt(rc.fromYear) || 1,
            rate: parseFloat(rc.rate) || propRate,
            extra: (parseFloat(rc.extra) || 0) * 10000,
          }));

        if (parsedChanges.length === 0) {
          parsedChanges = [{ fromYear: 1, rate: propRate, extra: 0 }];
        }

        const propSim = simulateCustom(propPrincipal, propTermMonths, parsedChanges, propBonusSemiAnnual);

        totalPaid += propSim.totalPaid;
        totalExtra += propSim.totalExtra;
        totalInterest += propSim.totalInterest;
        finalLumpSum += propSim.finalLumpSum;

        // Calculate year offset from reference date
        const propStart = propStartDates[pi];
        const offsetMonths =
          (propStart.getFullYear() - refDate.getFullYear()) * 12 +
          (propStart.getMonth() - refDate.getMonth());
        const offsetYears = Math.round(offsetMonths / 12);

        // Only add initial monthly payment for properties starting at offset 0
        if (offsetYears === 0 && propSim.periods.length > 0) {
          initialMonthly += propSim.periods[0].payment;
        }

        const effectiveTermYears = offsetYears + propTermYears;
        if (effectiveTermYears > maxTermYears) {
          maxTermYears = effectiveTermYears;
          periods = propSim.periods;
        }

        for (const pt of propSim.chartPoints) {
          const absYear = offsetYears + pt.year;
          const ex = allChartPoints.get(absYear) ?? { principal: 0, unpaidInterest: 0, total: 0 };
          allChartPoints.set(absYear, {
            principal: ex.principal + pt.principal,
            unpaidInterest: ex.unpaidInterest + pt.unpaidInterest,
            total: ex.total + pt.total,
          });
        }
        for (const ab of propSim.annualBreakdown) {
          const absYear = offsetYears + ab.year;
          const ex = allAnnual.get(absYear) ?? { interest: 0, principal: 0 };
          allAnnual.set(absYear, { interest: ex.interest + ab.interest, principal: ex.principal + ab.principal });
        }
      }

      if (totalPrincipal === 0) continue;

      const chartPoints = Array.from(allChartPoints.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([year, v]) => ({ year, ...v }));
      const annualBreakdown = Array.from(allAnnual.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([year, v]) => ({ year, ...v }));

      const sim: SimResult = { periods, chartPoints, annualBreakdown, finalLumpSum, totalPaid, totalExtra, totalInterest };

      result.push({
        borrowerId: bid,
        label,
        properties: props,
        totalPrincipal,
        initialMonthly,
        maxTermYears,
        sim,
        hasCap: periods.some(p => p.capped),
        hasUnpaid: finalLumpSum > 0,
      });
    }

    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties, JSON.stringify(borrowerOptions)]);

  const burdenColor = (ratio: number) => {
    if (ratio < 25) return "text-green-700 bg-green-50";
    if (ratio < 35) return "text-yellow-700 bg-yellow-50";
    return "text-red-700 bg-red-50";
  };

  const totalPrincipal = drawdowns.reduce((s, d) => s + d.amountMan, 0);
  const hasSims = borrowerSims.length > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-md">
        <div className="flex items-start gap-3">
          <Building2 size={26} className="shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-lg">住宅ローンシミュレーター</h2>
            <p className="text-blue-200 text-sm mt-0.5">5年ルール・125%ルール 未払い利息シミュレーション</p>
          </div>
        </div>
      </div>

      {/* Property list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={15} className="text-blue-500 shrink-0" />
            <h3 className="text-sm font-semibold text-gray-800">物件・契約情報</h3>
          </div>
          <button
            onClick={() => { setEditingProperty(null); setShowPropertyModal(true); }}
            className="flex items-center gap-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Plus size={11} />
            追加
          </button>
        </div>

        {properties.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400">
            <Building2 size={28} className="mx-auto mb-2 text-gray-200" />
            <p className="text-xs">「追加」ボタンで物件情報を登録できます</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {properties.map(prop => {
              const items = prop.costItems ?? [];
              const loanTotal = items.filter(c => (c.paymentType ?? "loan") === "loan").reduce((s, c) => s + (c.amountMan || 0), 0);
              const selfTotal = items.filter(c => c.paymentType === "self").reduce((s, c) => s + (c.amountMan || 0), 0);
              return (
                <div key={prop.id} className="px-5 py-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800 truncate">{prop.propertyName || "（物件名なし）"}</span>
                      {borrowerLabel(prop) && (
                        <span className="text-xs bg-blue-50 text-blue-600 font-medium rounded-full px-2 py-0.5 shrink-0">{borrowerLabel(prop)}</span>
                      )}
                      {prop.bankName && (
                        <span className="text-xs bg-gray-50 text-gray-500 rounded-full px-2 py-0.5 shrink-0">{prop.bankName}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-400">
                      {loanTotal > 0 && <span className="text-blue-600">ローン {loanTotal.toLocaleString()}万円</span>}
                      {selfTotal > 0 && <span className="text-amber-600">自己資金 {selfTotal.toLocaleString()}万円</span>}
                      {prop.bankRate && <span>{prop.bankRate}%</span>}
                      {prop.termYears && <span>{prop.termYears}年</span>}
                      {(prop.bonusRepaymentMan ?? 0) > 0 && (
                        <span className="text-emerald-600">ボーナス {prop.bonusRepaymentMan!.toLocaleString()}万円×年2回</span>
                      )}
                    </div>
                    {prop.note && <div className="text-xs text-gray-400 mt-0.5 truncate">{prop.note}</div>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingProperty(prop); setShowPropertyModal(true); }}
                      className="p-1.5 text-gray-300 hover:text-blue-500 rounded transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handlePropertyDelete(prop.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 rounded transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showPropertyModal && (
        <MortgagePropertyModal
          property={editingProperty}
          borrowerOptions={borrowerOptions}
          onSave={handlePropertySave}
          onClose={() => { setShowPropertyModal(false); setEditingProperty(null); }}
        />
      )}

      {/* Drawdown schedule */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-indigo-500 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-gray-800">融資実行スケジュール</h3>
              <p className="text-xs text-gray-400 mt-0.5">物件・契約情報の費用から自動生成されます</p>
            </div>
          </div>
        </div>

        {drawdowns.length > 0 ? (
          <>
            <div className="divide-y divide-gray-50">
              {(() => {
                const grouped = new Map<string, typeof drawdowns>();
                for (const d of drawdowns) {
                  const key = d.date || "__nodate__";
                  if (!grouped.has(key)) grouped.set(key, []);
                  grouped.get(key)!.push(d);
                }
                const sortedKeys = [...grouped.keys()].sort((a, b) => {
                  if (a === "__nodate__") return 1;
                  if (b === "__nodate__") return -1;
                  return a.localeCompare(b);
                });
                return sortedKeys.map(key => {
                  const items = grouped.get(key)!;
                  const total = items.reduce((s, d) => s + d.amountMan, 0);
                  const date = key === "__nodate__" ? null : key;
                  return (
                    <div key={key} className="px-5 py-3.5">
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-sm font-semibold text-gray-700">
                          {date ?? <span className="text-gray-300">日付未設定</span>}
                        </span>
                        <span className="text-sm font-bold text-indigo-700">{total.toLocaleString()}万円</span>
                      </div>
                      <ul className="space-y-0.5 pl-1">
                        {items.map(d => (
                          <li key={d.id} className="flex items-center justify-between text-xs text-gray-500">
                            <span>・{d.label}</span>
                            <span className="text-gray-400 tabular-nums">{d.amountMan.toLocaleString()}万円</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                });
              })()}
            </div>
            <div className="px-5 py-3 bg-indigo-50/50 border-t border-gray-50 text-xs text-indigo-700">
              合計: {totalPrincipal.toLocaleString()}万円
              {(() => {
                const last = [...drawdowns].filter(d => d.date).at(-1);
                return last ? `　最終支払日: ${last.date}以降に元利均等返済スタート` : null;
              })()}
            </div>
          </>
        ) : (
          <div className="px-5 py-8 text-center text-gray-400">
            <Calendar size={28} className="mx-auto mb-2 text-gray-200" />
            <p className="text-xs">物件情報に費用を登録すると、ここに自動表示されます</p>
          </div>
        )}
      </div>

      {/* Per-borrower simulation sections */}
      {borrowerSims.map(data => {
        const isExpanded = expandedBorrowers[data.borrowerId] !== false;
        return (
          <div key={data.borrowerId} className="space-y-4">
            {/* Borrower header */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 p-5">
              <button
                className="w-full text-left"
                onClick={() => setExpandedBorrowers(prev => ({ ...prev, [data.borrowerId]: !isExpanded }))}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-xs font-medium text-indigo-500 mb-1">{data.label} のローン</div>
                    <div className="flex items-baseline gap-4 flex-wrap">
                      <div>
                        <span className="text-xs text-gray-500">借入総額</span>
                        <div className="font-bold text-xl text-gray-900">{fmt(data.totalPrincipal)}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">初期月額返済</span>
                        <div className="font-bold text-xl text-gray-900">¥{Math.round(data.initialMonthly).toLocaleString()}</div>
                      </div>
                      {(() => {
                        const inc = (parseFloat(borrowerIncomes[data.borrowerId] || "") || 0) * 10000;
                        return inc > 0 && data.initialMonthly > 0 ? (
                          <div>
                            <span className="text-xs text-gray-500">返済負担率</span>
                            <div className={`inline-flex font-bold text-sm px-2 py-0.5 rounded-lg mt-0.5 ${burdenColor((data.initialMonthly / inc) * 100)}`}>
                              {((data.initialMonthly / inc) * 100).toFixed(1)}%
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-indigo-400 shrink-0 mt-1" /> : <ChevronDown size={16} className="text-indigo-400 shrink-0 mt-1" />}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {data.properties.map(p => {
                    const loanTotal = (p.costItems ?? []).filter(c => (c.paymentType ?? "loan") === "loan").reduce((s, c) => s + c.amountMan, 0);
                    return (
                      <span key={p.id} className="text-xs bg-white/70 text-gray-600 rounded-full px-2.5 py-1 border border-white/80">
                        {p.propertyName}
                        {loanTotal > 0 ? ` ${loanTotal.toLocaleString()}万円` : ""}
                        {p.bankRate ? ` / ${p.bankRate}%` : ""}
                        {p.termYears ? ` / ${p.termYears}年` : ""}
                      </span>
                    );
                  })}
                </div>
              </button>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-indigo-100/50" onClick={e => e.stopPropagation()}>
                <label className="text-xs text-gray-500 shrink-0">月収</label>
                <input
                  type="number"
                  value={borrowerIncomes[data.borrowerId] ?? ""}
                  onChange={e => setBorrowerIncomes(prev => ({ ...prev, [data.borrowerId]: e.target.value }))}
                  placeholder="40"
                  className="w-24 border border-indigo-100 rounded-lg px-2 py-1.5 text-xs text-gray-900 bg-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <span className="text-xs text-gray-500">万円 / 月</span>
              </div>
            </div>

            {isExpanded && (
              <>
                {/* Annual breakdown chart */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h4 className="text-sm font-semibold text-gray-800 mb-1">年次返済内訳（利息 vs 元金返済）</h4>
                  <p className="text-xs text-gray-400 mb-3">序盤は利息の割合が高く、後半になるほど元金返済が増えます</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.sim.annualBreakdown} barSize={data.maxTermYears > 30 ? 6 : 10}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} tickFormatter={v => `${v}年`}
                        ticks={[5, 10, 15, 20, 25, 30, 35, 40, 45].filter(y => y <= data.maxTermYears)} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmt(v)} width={56} />
                      <Tooltip content={<AnnualBreakdownTooltip />} />
                      <Legend />
                      <Bar dataKey="interest" name="利息" stackId="a" fill="#f87171" />
                      <Bar dataKey="principal" name="元金返済" stackId="a" fill="#60a5fa" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Balance chart */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">残高・未払い利息の推移</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={data.sim.chartPoints}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} tickFormatter={v => `${v}年`}
                        ticks={[0, 5, 10, 15, 20, 25, 30, 35, 40, 45].filter(y => y <= data.maxTermYears)} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmt(v)} width={56} />
                      <Tooltip labelFormatter={l => `${l}年後`} formatter={(v, name) => [fmt(Number(v)), name]} />
                      <Legend />
                      <Line dataKey="principal" name="元金残高" stroke="#3b82f6" strokeWidth={2} dot={false} type="monotone" />
                      <Line dataKey="unpaidInterest" name="未払い利息" stroke="#ef4444" strokeWidth={2} dot={false} type="monotone" />
                      <Line dataKey="total" name="合計残債" stroke="#f59e0b" strokeWidth={1.5} dot={false} type="monotone" strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Summary tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-500">総返済額（月払合計）</div>
                    <div className="font-bold text-gray-900 text-sm mt-0.5">{fmt(data.sim.totalPaid)}</div>
                  </div>
                  {data.sim.totalExtra > 0 && (
                    <div className="bg-blue-50 rounded-xl p-3">
                      <div className="text-xs text-gray-500">繰り上げ返済計</div>
                      <div className="font-bold text-blue-700 text-sm mt-0.5">{fmt(data.sim.totalExtra)}</div>
                    </div>
                  )}
                  <div className={`rounded-xl p-3 ${data.hasUnpaid ? "bg-red-50" : "bg-green-50"}`}>
                    <div className="text-xs text-gray-500">期末一括清算額</div>
                    <div className={`font-bold text-sm mt-0.5 ${data.hasUnpaid ? "text-red-700" : "text-green-700"}`}>
                      {data.hasUnpaid ? fmt(data.sim.finalLumpSum) : "なし"}
                    </div>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-3">
                    <div className="text-xs text-gray-500">利息総額</div>
                    <div className="font-bold text-orange-700 text-sm mt-0.5">{fmt(data.sim.totalInterest)}</div>
                  </div>
                </div>

                {data.hasUnpaid && (
                  <div className="flex items-start gap-2 bg-red-50 rounded-xl p-4">
                    <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">
                      現在のプランでは期末に <strong>{fmt(data.sim.finalLumpSum)}</strong> の残高が残ります。
                      金利を下げるか、繰り上げ返済を増やして未払い利息の膨張を防いでください。
                    </p>
                  </div>
                )}
                {!data.hasUnpaid && (
                  <div className="flex items-start gap-2 bg-green-50 rounded-xl p-4">
                    <Info size={13} className="text-green-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-green-700">
                      このプランでは期末に未払い残高なしで完済できます。
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {!hasSims && (
        <div className="bg-gray-50 rounded-2xl p-10 text-center text-gray-400">
          <Building2 size={32} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm">物件を登録するとシミュレーション結果が表示されます</p>
        </div>
      )}
    </div>
  );
}
