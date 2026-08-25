"use client";

import { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { Building2, Info, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

function calcPayment(principal: number, annualPct: number, months: number): number {
  if (months <= 0 || principal <= 0) return 0;
  const r = annualPct / 100 / 12;
  if (r === 0) return principal / months;
  return principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
}

// ── カスタム期別シミュレーション (5年ルール + 125%ルール) ─────────────────────

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
  periodRates: number[],  // rate for each 5-year period (0-indexed)
  periodExtras: number[], // extra lump-sum repayment applied at start of each period (index 0 = ignored)
): SimResult {
  const numPeriods = Math.ceil(termMonths / 60);
  const getRate = (periodIdx: number) =>
    periodRates[Math.min(periodIdx, numPeriods - 1)] ?? periodRates[periodRates.length - 1] ?? 0;

  let currentPayment = calcPayment(principal, getRate(0), termMonths);
  let balance = principal, unpaidInterest = 0, totalPaid = 0, totalExtra = 0;

  const chartPoints: SimResult["chartPoints"] = [
    { year: 0, principal: Math.round(balance), unpaidInterest: 0, total: Math.round(balance) },
  ];
  const periods: SimPeriod[] = [];
  let periodStart = 0, periodCapped = false;

  for (let m = 1; m <= termMonths; m++) {
    const periodIdx = Math.floor((m - 1) / 60);
    const rate = getRate(periodIdx);
    const monthlyInterest = balance * rate / 100 / 12;

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

    // 5年期末: 期をまとめ、繰り上げ返済を適用し、月額を再計算
    if (m % 60 === 0 && m < termMonths) {
      const endedPeriodIdx = m / 60 - 1;
      periods.push({
        label: `${periodStart / 12 + 1}〜${m / 12}年目`,
        payment: Math.round(currentPayment),
        capped: periodCapped,
        rateAtStart: getRate(endedPeriodIdx),
      });

      // 繰り上げ返済
      const nextPeriodIdx = m / 60;
      const extra = periodExtras[nextPeriodIdx] ?? 0;
      if (extra > 0 && balance > 0) {
        const applied = Math.min(extra, balance);
        balance = Math.max(0, balance - applied);
        totalExtra += applied;
      }

      const remaining = termMonths - m;
      const nextRate = getRate(nextPeriodIdx);
      const ideal = calcPayment(balance, nextRate, remaining);
      const cap = currentPayment * 1.25;
      periodCapped = ideal > cap;
      currentPayment = balance > 0 ? Math.min(ideal, cap) : 0;
      periodStart = m;
    }
  }

  const lastPeriodIdx = Math.floor(periodStart / 60);
  periods.push({
    label: `${periodStart / 12 + 1}〜${termMonths / 12}年目`,
    payment: Math.round(currentPayment),
    capped: periodCapped,
    rateAtStart: getRate(lastPeriodIdx),
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

// ── クイック比較用 (参考値) ──────────────────────────────────────────────────

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

interface PeriodSetting { rate: string; extra: string }

export default function MortgageCalc() {
  const [principalMan, setPrincipalMan] = useState("");
  const [termYears, setTermYears] = useState("35");
  const [bankName, setBankName] = useState("千葉銀行");
  const [bankRate, setBankRate] = useState("1.075");
  const [editingBank, setEditingBank] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);
  const [periodSettings, setPeriodSettings] = useState<PeriodSetting[]>(
    Array.from({ length: 9 }, () => ({ rate: "1.075", extra: "" }))
  );

  const principal = (parseFloat(principalMan) || 0) * 10000;
  const termMonths = (parseInt(termYears) || 35) * 12;
  const numPeriods = Math.ceil(termMonths / 60);
  const rate = parseFloat(bankRate) || 0;

  // Period 1 rate always follows bank rate; expand array if needed
  useEffect(() => {
    setPeriodSettings(prev => {
      const next = [...prev];
      // Always sync period 1 to bank rate
      next[0] = { ...next[0], rate: bankRate };
      // Fill any new periods beyond current length with bank rate
      while (next.length < numPeriods) next.push({ rate: bankRate, extra: "" });
      return next;
    });
  }, [bankRate, numPeriods]);

  const parsedRates = periodSettings.slice(0, numPeriods).map(p => parseFloat(p.rate) || rate);
  const parsedExtras = periodSettings.slice(0, numPeriods).map(p => (parseFloat(p.extra) || 0) * 10000);

  const sim = useMemo(() => {
    if (!principal) return null;
    return simulateCustom(principal, termMonths, parsedRates, parsedExtras);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [principal, termMonths, JSON.stringify(parsedRates), JSON.stringify(parsedExtras)]);

  const scenarioResults = useMemo(() => {
    if (!principal) return null;
    return SCENARIOS.map(sc => ({ sc, ...calcLoanTotal(principal, termMonths, rate, sc.hike5, sc.hike10) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [principal, termMonths, bankRate]);

  const updatePeriod = (i: number, field: "rate" | "extra", val: string) => {
    if (i === 0 && field === "rate") return; // period 1 rate is locked to bank rate
    setPeriodSettings(prev => prev.map((p, j) => j === i ? { ...p, [field]: val } : p));
  };

  const hasCap = sim?.periods.some(p => p.capped);
  const hasUnpaid = (sim?.finalLumpSum ?? 0) > 0;

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
          <button onClick={() => setEditingBank(v => !v)}
            className="text-xs text-blue-200 hover:text-white border border-white/30 hover:border-white/60 rounded-lg px-3 py-1.5 transition-colors shrink-0">
            {editingBank ? "完了" : "銀行を編集"}
          </button>
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
        </div>
      </div>

      {/* Period input table */}
      {principal > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-800">金利・繰り上げ返済プラン</h3>
            <p className="text-xs text-gray-400 mt-0.5">5年ごとの予想金利と繰り上げ返済額を入力してください</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium whitespace-nowrap">期間</th>
                  <th className="px-4 py-2.5 text-center text-gray-500 font-medium whitespace-nowrap">適用金利</th>
                  <th className="px-4 py-2.5 text-center text-gray-500 font-medium whitespace-nowrap">繰り上げ返済<br /><span className="font-normal text-gray-400">（期首に一括・万円）</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {Array.from({ length: numPeriods }, (_, i) => {
                  const startYr = i * 5 + 1;
                  const endYr = Math.min((i + 1) * 5, parseInt(termYears));
                  const p = periodSettings[i] ?? { rate: bankRate, extra: "" };
                  return (
                    <tr key={i} className={i === 0 ? "bg-blue-50/40" : ""}>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap font-medium">
                        {startYr}〜{endYr}年目
                        {i === 0 && <span className="ml-1.5 text-blue-500 text-xs">（現在）</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number" value={p.rate} step="0.025"
                            disabled={i === 0}
                            onChange={e => updatePeriod(i, "rate", e.target.value)}
                            className={`w-20 border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400 ${i === 0 ? "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed" : "border-gray-200 text-gray-900"}`}
                          />
                          <span className="text-gray-500">%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {i === 0 ? (
                          <div className="text-center text-gray-300">—</div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number" value={p.extra} step="10" min="0"
                              placeholder="0"
                              onChange={e => updatePeriod(i, "extra", e.target.value)}
                              className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                            <span className="text-gray-500">万</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-2.5 border-t border-gray-50">
            <p className="text-xs text-gray-400">繰り上げ返済は各期首（{[...Array(numPeriods - 1)].map((_, i) => `${(i + 1) * 5}年後`).join("・")}）に残高から一括控除します</p>
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
                    <th className="px-4 py-2.5 text-right text-gray-500 font-medium">金利</th>
                    <th className="px-4 py-2.5 text-right text-gray-500 font-medium">月額返済</th>
                    <th className="px-4 py-2.5 text-right text-gray-500 font-medium">繰り上げ返済</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sim.periods.map((p, i) => {
                    const extra = parsedExtras[i + 1] ?? 0; // extras are applied at start of next period
                    const extraForThisPeriodDisplay = i < numPeriods - 1 ? (parsedExtras[i + 1] ?? 0) : 0;
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
                        <td className="px-4 py-2.5 text-right text-blue-700 font-medium">
                          {extraForThisPeriodDisplay > 0 ? `${fmt(extraForThisPeriodDisplay)}` : <span className="text-gray-300">—</span>}
                        </td>
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
                  ticks={[0, 5, 10, 15, 20, 25, 30, 35, 40, 45].filter(y => y <= parseInt(termYears))} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmt(v)} width={56} />
                <Tooltip labelFormatter={l => `${l}年後`} formatter={(v, name) => [fmt(Number(v)), name]} />
                <Legend />
                {parsedExtras.slice(1).map((ex, i) =>
                  ex > 0 ? (
                    <ReferenceLine key={i} x={i + 1} stroke="#3b82f6" strokeDasharray="3 3"
                      label={{ value: `繰上`, position: "insideTopRight", fontSize: 8, fill: "#3b82f6" }} />
                  ) : null
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

          {/* Quick scenario comparison (collapsed) */}
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
