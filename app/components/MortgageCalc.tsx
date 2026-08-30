"use client";

import { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { Building2, Info, ChevronDown, ChevronUp, AlertTriangle, Save, Plus, X } from "lucide-react";
import { loadMortgageSimPlan, saveMortgageSimPlan } from "../../lib/storage";
import { useAuth } from "../../lib/auth-context";

function calcPayment(principal: number, annualPct: number, months: number): number {
  if (months <= 0 || principal <= 0) return 0;
  const r = annualPct / 100 / 12;
  if (r === 0) return principal / months;
  return principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
}

// ── 任意タイミング金利変更対応シミュレーション (5年ルール + 125%ルール) ────────

interface RateChange { id: string; fromYear: string; rate: string; extra: string }
interface SimPeriod { label: string; payment: number; capped: boolean; rateAtStart: number }
interface SimResult {
  periods: SimPeriod[];
  chartPoints: { year: number; principal: number; unpaidInterest: number; total: number }[];
  finalLumpSum: number;
  totalPaid: number;
  totalExtra: number;
  totalInterest: number;
}

function simulateCustom(
  principal: number,
  termMonths: number,
  rateChanges: { fromYear: number; rate: number; extra: number }[],
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
  const periods: SimPeriod[] = [];
  let periodStartYear = 1;
  let periodCapped = false;

  for (let m = 1; m <= termMonths; m++) {
    const year = Math.ceil(m / 12);
    const isFirstMonthOfYear = (m - 1) % 12 === 0;
    const isFirstMonthOf5YearPeriod = m > 1 && (m - 1) % 60 === 0;

    // Year start: apply extra payments and update rate
    if (isFirstMonthOfYear && year > 1) {
      for (const rc of sorted) {
        if (rc.fromYear === year && rc.extra > 0 && balance > 0) {
          const applied = Math.min(rc.extra, balance);
          balance = Math.max(0, balance - applied);
          totalExtra += applied;
        }
      }
      currentRate = getRateForYear(year);
    }

    // 5-year rule: record period and recalculate payment
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

    // Monthly interest/payment
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

    if (m % 12 === 0) {
      chartPoints.push({
        year: m / 12,
        principal: Math.round(balance),
        unpaidInterest: Math.round(unpaidInterest),
        total: Math.round(balance + unpaidInterest),
      });
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
    finalLumpSum,
    totalPaid: Math.round(totalPaid),
    totalExtra: Math.round(totalExtra),
    totalInterest: Math.round(totalPaid + totalExtra + finalLumpSum - principal),
  };
}

// ── クイック比較用 ────────────────────────────────────────────────────────────

function calcLoanTotal(principal: number, termMonths: number, baseRate: number, hike5: number, hike10: number) {
  const n1 = Math.min(60, termMonths);
  const n2 = Math.min(60, termMonths - n1);
  const n3 = Math.max(0, termMonths - n1 - n2);
  const r1 = baseRate, r2 = baseRate + hike5, r3 = baseRate + hike5 + hike10;
  const p1 = calcPayment(principal, r1, termMonths);
  const b1 = Math.max(0, principal * Math.pow(1 + r1/100/12, n1) - p1 * (Math.pow(1 + r1/100/12, n1) - 1) / (r1/100/12 || 1));
  const p2 = n2 > 0 && b1 > 0 ? calcPayment(b1, r2, termMonths - n1) : 0;
  const b2 = n2 > 0 && p2 > 0 ? Math.max(0, b1 * Math.pow(1 + r2/100/12, n2) - p2 * (Math.pow(1 + r2/100/12, n2) - 1) / (r2/100/12 || 1)) : 0;
  const p3 = n3 > 0 && b2 > 0 ? calcPayment(b2, r3, n3) : 0;
  const total = p1 * n1 + p2 * n2 + p3 * n3;
  return { totalPaid: Math.round(total), totalInterest: Math.round(total - principal) };
}

interface Scenario { label: string; hike5: number; hike10: number }
const SCENARIOS: Scenario[] = [
  { label: "現状維持",           hike5: 0,   hike10: 0   },
  { label: "+0.5%（5年後）",     hike5: 0.5, hike10: 0   },
  { label: "+1.0%（5年後）",     hike5: 1.0, hike10: 0   },
  { label: "+1.5%（5年後）",     hike5: 1.5, hike10: 0   },
  { label: "+2.0%（5年後）",     hike5: 2.0, hike10: 0   },
  { label: "+1.0% → +1.0%",    hike5: 1.0, hike10: 1.0 },
  { label: "+2.0% → +1.0%",    hike5: 2.0, hike10: 1.0 },
];

const fmt = (v: number) =>
  v >= 100_000_000 ? `${(v / 100_000_000).toFixed(2)}億` : `${Math.round(v / 10000)}万`;

export default function MortgageCalc() {
  const { user } = useAuth();
  const [principalMan, setPrincipalMan] = useState("");
  const [termYears, setTermYears] = useState("35");
  const [bankName, setBankName] = useState("千葉銀行");
  const [bankRate, setBankRate] = useState("1.075");
  const [editingBank, setEditingBank] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);
  const [rateChanges, setRateChanges] = useState<RateChange[]>([
    { id: "base", fromYear: "1", rate: "1.075", extra: "" },
  ]);
  const [monthlyIncomeMan, setMonthlyIncomeMan] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error" | "login-required">("idle");

  // ログイン後にFirestoreから設定を読み込む
  useEffect(() => {
    if (!user) return;
    loadMortgageSimPlan().then(plan => {
      if (!plan) return;
      setPrincipalMan(plan.principalMan);
      setTermYears(plan.termYears);
      setBankName(plan.bankName);
      setBankRate(plan.bankRate);
      if (plan.monthlyIncomeMan) setMonthlyIncomeMan(plan.monthlyIncomeMan);
      if (plan.periodSettings?.length) {
        const loaded: RateChange[] = plan.periodSettings.map((p, i) => ({
          id: `loaded_${i}`,
          fromYear: String(p.fromYear ?? (i * 5 + 1)),
          rate: p.rate,
          extra: p.extra,
        }));
        // Ensure base (fromYear=1) exists
        if (!loaded.some(rc => rc.fromYear === "1")) {
          loaded.unshift({ id: "base", fromYear: "1", rate: plan.bankRate, extra: "" });
        } else {
          const idx = loaded.findIndex(rc => rc.fromYear === "1");
          loaded[idx] = { ...loaded[idx], rate: plan.bankRate };
        }
        setRateChanges(loaded);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Base entry tracks bank rate
  useEffect(() => {
    setRateChanges(prev => prev.map(rc => rc.id === "base" ? { ...rc, rate: bankRate } : rc));
  }, [bankRate]);

  const handleSave = async () => {
    if (!user) {
      setSaveStatus("login-required");
      setTimeout(() => setSaveStatus("idle"), 3000);
      return;
    }
    setSaveStatus("saving");
    try {
      const timeout = new Promise<void>((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000));
      await Promise.race([
        saveMortgageSimPlan({
          bankName, bankRate, principalMan, termYears,
          monthlyIncomeMan,
          periodSettings: rateChanges.map(rc => ({ fromYear: parseInt(rc.fromYear) || 1, rate: rc.rate, extra: rc.extra })),
          updatedAt: new Date().toISOString(),
        }),
        timeout,
      ]);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const principal = (parseFloat(principalMan) || 0) * 10000;
  const termYearsNum = parseInt(termYears) || 35;
  const termMonths = termYearsNum * 12;
  const rate = parseFloat(bankRate) || 0;

  const parsedRateChanges = useMemo(() =>
    [...rateChanges]
      .filter(rc => { const y = parseInt(rc.fromYear); return y >= 1 && y <= termYearsNum; })
      .sort((a, b) => parseInt(a.fromYear) - parseInt(b.fromYear))
      .map(rc => ({
        fromYear: parseInt(rc.fromYear) || 1,
        rate: parseFloat(rc.rate) || rate,
        extra: (parseFloat(rc.extra) || 0) * 10000,
      })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [JSON.stringify(rateChanges), rate, termYearsNum]);

  const sim = useMemo(() => {
    if (!principal) return null;
    return simulateCustom(principal, termMonths, parsedRateChanges);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [principal, termMonths, JSON.stringify(parsedRateChanges)]);

  const scenarioResults = useMemo(() => {
    if (!principal) return null;
    return SCENARIOS.map(sc => ({ sc, ...calcLoanTotal(principal, termMonths, rate, sc.hike5, sc.hike10) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [principal, termMonths, bankRate]);

  const addRateChange = () => {
    const sorted = [...rateChanges].sort((a, b) => parseInt(a.fromYear) - parseInt(b.fromYear));
    const last = sorted[sorted.length - 1];
    const lastYear = parseInt(last.fromYear) || 1;
    const nextYear = Math.min(lastYear + 5, termYearsNum);
    if (nextYear <= lastYear) return;
    setRateChanges(prev => [...prev, {
      id: `rc_${Date.now()}`,
      fromYear: String(nextYear),
      rate: last.rate,
      extra: "",
    }]);
  };

  const updateRateChange = (id: string, field: "fromYear" | "rate" | "extra", val: string) => {
    setRateChanges(prev => prev.map(rc => rc.id === id ? { ...rc, [field]: val } : rc));
  };

  const removeRateChange = (id: string) => {
    setRateChanges(prev => prev.filter(rc => rc.id !== id));
  };

  const sortedRateChanges = useMemo(() =>
    [...rateChanges].sort((a, b) => parseInt(a.fromYear) - parseInt(b.fromYear)),
  [rateChanges]);

  const monthlyIncome = (parseFloat(monthlyIncomeMan) || 0) * 10000;
  const hasCap = sim?.periods.some(p => p.capped);
  const hasUnpaid = (sim?.finalLumpSum ?? 0) > 0;

  const burdenColor = (ratio: number) => {
    if (ratio < 25) return "text-green-700 bg-green-50";
    if (ratio < 35) return "text-yellow-700 bg-yellow-50";
    return "text-red-700 bg-red-50";
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Building2 size={26} className="shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-lg">住宅ローンシミュレーター</h2>
              <p className="text-blue-200 text-sm mt-0.5">5年ルール・125%ルール 未払い利息シミュレーション</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleSave} disabled={saveStatus === "saving"}
              className={`flex items-center gap-1 text-xs border rounded-lg px-3 py-1.5 transition-colors ${
                saveStatus === "saved" ? "border-green-400/60 text-green-300" :
                saveStatus === "error" ? "border-red-400/60 text-red-300" :
                saveStatus === "login-required" ? "border-yellow-400/60 text-yellow-300" :
                "border-white/30 text-blue-200 hover:text-white hover:border-white/60"
              }`}>
              <Save size={11} />
              {saveStatus === "saving" ? "保存中..." :
               saveStatus === "saved" ? "保存済み" :
               saveStatus === "error" ? "保存失敗" :
               saveStatus === "login-required" ? "要ログイン" :
               "保存"}
            </button>
            <button onClick={() => setEditingBank(v => !v)}
              className="text-xs text-blue-200 hover:text-white border border-white/30 hover:border-white/60 rounded-lg px-3 py-1.5 transition-colors">
              {editingBank ? "完了" : "銀行を編集"}
            </button>
          </div>
        </div>

        {editingBank ? (
          <div className="bg-white/20 rounded-xl p-3 mt-4 space-y-2">
            <input type="text" value={bankName} onChange={e => setBankName(e.target.value)}
              placeholder="銀行名"
              className="w-full bg-white/20 rounded-lg px-2 py-1 text-sm text-white placeholder-blue-300 focus:outline-none focus:ring-1 focus:ring-white/60" />
            <div className="flex items-center gap-1">
              <input type="number" value={bankRate} step="0.025" onChange={e => setBankRate(e.target.value)}
                placeholder="1.075"
                className="w-full bg-white/20 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/60" />
              <span className="text-white text-sm shrink-0">%</span>
            </div>
          </div>
        ) : (
          <div className="bg-white/20 rounded-xl p-4 mt-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-blue-200">{bankName || "銀行"}</div>
              <div className="font-bold text-3xl mt-0.5">{rate}%</div>
            </div>
            <div className="text-right text-xs text-blue-300">現在の変動金利</div>
          </div>
        )}
      </div>

      {/* Loan conditions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">ローン条件</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">借入額（万円）</label>
            <input type="number" value={principalMan} onChange={e => setPrincipalMan(e.target.value)}
              placeholder="4000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            {principal > 0 && <p className="text-xs text-gray-400 mt-1">{fmt(principal)}円</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">返済期間</label>
            <select value={termYears} onChange={e => setTermYears(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400">
              {[20, 25, 30, 35, 40, 45].map(y => <option key={y} value={y}>{y}年</option>)}
            </select>
          </div>
          <div className="col-span-2 pt-1 border-t border-gray-50">
            <label className="block text-xs font-medium text-gray-600 mb-1">月収（万円）<span className="ml-1 text-gray-400 font-normal">返済負担率の計算に使用</span></label>
            <div className="flex items-center gap-2">
              <input type="number" value={monthlyIncomeMan} onChange={e => setMonthlyIncomeMan(e.target.value)}
                placeholder="40"
                className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <span className="text-sm text-gray-500">万円 / 月</span>
              {monthlyIncomeMan && parseFloat(monthlyIncomeMan) > 0 && (
                <span className="text-xs text-gray-400">（年収 {Math.round(parseFloat(monthlyIncomeMan) * 12)}万円）</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rate change plan */}
      {principal > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-800">金利変更・繰り上げ返済プラン</h3>
            <p className="text-xs text-gray-400 mt-0.5">金利が変わる年や繰り上げ返済の年を自由に追加できます</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium whitespace-nowrap">開始年</th>
                  <th className="px-4 py-2.5 text-center text-gray-500 font-medium whitespace-nowrap">適用金利</th>
                  <th className="px-4 py-2.5 text-center text-gray-500 font-medium whitespace-nowrap">繰り上げ返済<br /><span className="font-normal text-gray-400">（年初に一括・万円）</span></th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {/* Base row */}
                <tr className="bg-blue-50/40">
                  <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">
                    1年目〜<span className="ml-1.5 text-blue-500 text-xs">（現在）</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <span className="w-20 text-center text-sm text-gray-400 border border-gray-100 bg-gray-50 rounded-lg px-2 py-1.5">{bankRate}</span>
                      <span className="text-gray-500">%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">—</td>
                  <td className="px-4 py-3"></td>
                </tr>

                {/* Additional rate change rows */}
                {sortedRateChanges.filter(rc => rc.id !== "base").map(rc => {
                  const beyondTerm = (parseInt(rc.fromYear) || 0) > termYearsNum;
                  return (
                    <tr key={rc.id} className={beyondTerm ? "bg-red-50/30 opacity-60" : ""}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={rc.fromYear}
                            min={2}
                            max={termYearsNum}
                            onChange={e => updateRateChange(rc.id, "fromYear", e.target.value)}
                            className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                          <span className="text-gray-500 whitespace-nowrap">年目〜</span>
                        </div>
                        {beyondTerm && <p className="text-xs text-red-400 mt-0.5">返済期間外</p>}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            value={rc.rate}
                            step="0.025"
                            onChange={e => updateRateChange(rc.id, "rate", e.target.value)}
                            className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                          <span className="text-gray-500">%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            value={rc.extra}
                            step="10"
                            min="0"
                            placeholder="0"
                            onChange={e => updateRateChange(rc.id, "extra", e.target.value)}
                            className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                          <span className="text-gray-500">万</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => removeRateChange(rc.id)}
                          className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-gray-50">
            <button
              onClick={addRateChange}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus size={13} />
              金利変更・繰り上げ返済を追加
            </button>
          </div>
        </div>
      )}

      {/* Simulation results */}
      {principal > 0 && sim && (
        <>
          {/* Period payment table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">5年ルール試算結果</h3>
                <p className="text-xs text-gray-400 mt-0.5">125%上限を適用した月額返済の推移</p>
              </div>
              {hasCap && (
                <span className="text-xs bg-red-100 text-red-700 font-medium rounded-full px-2.5 py-1">125%上限あり</span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-gray-500 font-medium">期間</th>
                    <th className="px-4 py-2.5 text-right text-gray-500 font-medium">期首金利</th>
                    <th className="px-4 py-2.5 text-right text-gray-500 font-medium">月額返済</th>
                    {monthlyIncome > 0 && <th className="px-4 py-2.5 text-right text-gray-500 font-medium">返済負担率</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sim.periods.map((p, i) => {
                    const burdenRatio = monthlyIncome > 0 ? (p.payment / monthlyIncome) * 100 : null;
                    return (
                      <tr key={i} className={p.capped ? "bg-red-50" : ""}>
                        <td className="px-4 py-2.5 text-gray-700">{p.label}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600">{p.rateAtStart.toFixed(3)}%</td>
                        <td className="px-4 py-2.5 text-right font-bold">
                          <span className={p.capped ? "text-red-700" : "text-gray-800"}>
                            ¥{p.payment.toLocaleString()}
                            {p.capped && <span className="block text-red-400 font-normal text-xs">（125%上限）</span>}
                          </span>
                        </td>
                        {monthlyIncome > 0 && burdenRatio !== null && (
                          <td className="px-4 py-2.5 text-right">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${burdenColor(burdenRatio)}`}>
                              {burdenRatio.toFixed(1)}%
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Balance chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">残高・未払い利息の推移</h4>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={sim.chartPoints}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} tickFormatter={v => `${v}年`}
                  ticks={[0, 5, 10, 15, 20, 25, 30, 35, 40, 45].filter(y => y <= termYearsNum)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmt(v)} width={56} />
                <Tooltip labelFormatter={l => `${l}年後`} formatter={(v, name) => [fmt(Number(v)), name]} />
                <Legend />
                {parsedRateChanges.filter(rc => rc.extra > 0 && rc.fromYear > 1).map((rc, i) =>
                  <ReferenceLine key={i} x={rc.fromYear - 1} stroke="#3b82f6" strokeDasharray="3 3"
                    label={{ value: `繰上`, position: "insideTopRight", fontSize: 8, fill: "#3b82f6" }} />
                )}
                {parsedRateChanges.filter(rc => rc.fromYear > 1).map((rc, i) =>
                  <ReferenceLine key={`rate_${i}`} x={rc.fromYear - 1} stroke="#f59e0b" strokeDasharray="2 4"
                    label={{ value: `${rc.rate.toFixed ? rc.rate.toFixed(2) : rc.rate}%`, position: "insideTopLeft", fontSize: 8, fill: "#92400e" }} />
                )}
                <Line dataKey="principal" name="元金残高" stroke="#3b82f6" strokeWidth={2} dot={false} type="monotone" />
                <Line dataKey="unpaidInterest" name="未払い利息" stroke="#ef4444" strokeWidth={2} dot={false} type="monotone" />
                <Line dataKey="total" name="合計残債" stroke="#f59e0b" strokeWidth={1.5} dot={false} type="monotone" strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500">月額合計</div>
              <div className="font-bold text-gray-900 text-sm mt-0.5">{fmt(sim.totalPaid)}</div>
            </div>
            {sim.totalExtra > 0 && (
              <div className="bg-blue-50 rounded-xl p-3">
                <div className="text-xs text-gray-500">繰り上げ返済計</div>
                <div className="font-bold text-blue-700 text-sm mt-0.5">{fmt(sim.totalExtra)}</div>
              </div>
            )}
            <div className={`rounded-xl p-3 ${hasUnpaid ? "bg-red-50" : "bg-green-50"}`}>
              <div className="text-xs text-gray-500">期末一括清算額</div>
              <div className={`font-bold text-sm mt-0.5 ${hasUnpaid ? "text-red-700" : "text-green-700"}`}>
                {hasUnpaid ? fmt(sim.finalLumpSum) : "なし"}
              </div>
            </div>
            <div className="bg-orange-50 rounded-xl p-3">
              <div className="text-xs text-gray-500">利息総額（期末含む）</div>
              <div className="font-bold text-orange-700 text-sm mt-0.5">{fmt(sim.totalInterest)}</div>
            </div>
          </div>

          {hasUnpaid && (
            <div className="flex items-start gap-2 bg-red-50 rounded-xl p-4">
              <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">
                現在のプランでは期末に <strong>{fmt(sim.finalLumpSum)}</strong> の残高が残ります。
                金利を下げるか、繰り上げ返済を増やして未払い利息の膨張を防いでください。
              </p>
            </div>
          )}
          {!hasUnpaid && (
            <div className="flex items-start gap-2 bg-green-50 rounded-xl p-4">
              <Info size={13} className="text-green-600 shrink-0 mt-0.5" />
              <p className="text-xs text-green-700">
                このプランでは期末に未払い残高なしで完済できます。
              </p>
            </div>
          )}

          {/* 返済負担率サマリー */}
          {monthlyIncome > 0 && sim.periods.length > 0 && (() => {
            const maxRatio = Math.max(...sim.periods.map(p => (p.payment / monthlyIncome) * 100));
            const minRatio = Math.min(...sim.periods.map(p => (p.payment / monthlyIncome) * 100));
            const annualIncome = monthlyIncome * 12;
            const annualRepayment = sim.periods[0].payment * 12;
            const annualBurden = (annualRepayment / annualIncome) * 100;
            return (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">返済負担率</h4>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-500">初期月額負担率</div>
                    <div className={`font-bold text-lg mt-0.5 ${minRatio < 25 ? "text-green-700" : minRatio < 35 ? "text-yellow-700" : "text-red-700"}`}>
                      {minRatio.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-500">最大月額負担率</div>
                    <div className={`font-bold text-lg mt-0.5 ${maxRatio < 25 ? "text-green-700" : maxRatio < 35 ? "text-yellow-700" : "text-red-700"}`}>
                      {maxRatio.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-500">年間返済負担率</div>
                    <div className={`font-bold text-lg mt-0.5 ${annualBurden < 25 ? "text-green-700" : annualBurden < 35 ? "text-yellow-700" : "text-red-700"}`}>
                      {annualBurden.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 space-y-0.5">
                  <p><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400 mr-1"></span>25%未満：余裕あり</p>
                  <p><span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400 mr-1"></span>25〜35%：要注意（金融機関の一般的な審査基準上限）</p>
                  <p><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400 mr-1"></span>35%超：負担大（家計への影響に注意）</p>
                </div>
              </div>
            );
          })()}

          {/* Quick scenario comparison */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button className="w-full flex items-center justify-between px-5 py-4 text-left"
              onClick={() => setShowScenarios(v => !v)}>
              <div className="flex items-center gap-2">
                <Info size={14} className="text-gray-400 shrink-0" />
                <span className="text-sm font-semibold text-gray-700">参考: 金利シナリオ別クイック比較</span>
              </div>
              {showScenarios ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
            </button>
            {showScenarios && scenarioResults && (
              <div className="border-t border-gray-100">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-gray-500 font-medium">シナリオ</th>
                        <th className="px-4 py-2.5 text-right text-gray-500 font-medium">総支払額</th>
                        <th className="px-4 py-2.5 text-right text-gray-500 font-medium">うち利息</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {scenarioResults.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-700">{row.sc.label}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-blue-700">{fmt(row.totalPaid)}</td>
                          <td className="px-4 py-2.5 text-right text-red-500">{fmt(row.totalInterest)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-400 px-5 py-2.5 border-t border-gray-50">
                  各フェーズ開始時に残高から月額を再計算（5年ルール未適用の参考値）
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {!principal && (
        <div className="bg-gray-50 rounded-2xl p-10 text-center text-gray-400">
          <Building2 size={32} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm">借入額を入力すると試算結果が表示されます</p>
        </div>
      )}
    </div>
  );
}
