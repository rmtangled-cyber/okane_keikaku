"use client";

import { useState, useMemo } from "react";
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

function remainingBalance(principal: number, annualPct: number, payment: number, paidMonths: number): number {
  const r = annualPct / 100 / 12;
  if (r === 0) return principal - payment * paidMonths;
  return principal * Math.pow(1 + r, paidMonths) - payment * (Math.pow(1 + r, paidMonths) - 1) / r;
}

interface PhaseResult { rate: number; payment: number; months: number }

function calcLoan(principal: number, termMonths: number, baseRate: number, hike5: number, hike10: number) {
  const n1 = Math.min(60, termMonths);
  const n2 = Math.min(60, termMonths - n1);
  const n3 = Math.max(0, termMonths - n1 - n2);
  const r1 = baseRate, r2 = baseRate + hike5, r3 = baseRate + hike5 + hike10;

  const p1 = calcPayment(principal, r1, termMonths);
  const b1 = Math.max(0, remainingBalance(principal, r1, p1, n1));
  const p2 = n2 > 0 && b1 > 0 ? calcPayment(b1, r2, termMonths - n1) : 0;
  const b2 = n2 > 0 ? Math.max(0, remainingBalance(b1, r2, p2, n2)) : 0;
  const p3 = n3 > 0 && b2 > 0 ? calcPayment(b2, r3, n3) : 0;

  const totalPaid = p1 * n1 + p2 * n2 + p3 * n3;
  const phases: PhaseResult[] = [
    { rate: r1, payment: Math.round(p1), months: n1 },
    { rate: r2, payment: Math.round(p2), months: n2 },
    { rate: r3, payment: Math.round(p3), months: n3 },
  ];

  const chartPoints: { year: number; balance: number }[] = [];
  for (let m = 0; m <= termMonths; m += 12) {
    let balance: number;
    if (m <= n1) balance = remainingBalance(principal, r1, p1, m);
    else if (m <= n1 + n2) balance = remainingBalance(b1, r2, p2, m - n1);
    else balance = remainingBalance(b2, r3, p3, m - n1 - n2);
    chartPoints.push({ year: m / 12, balance: Math.max(0, Math.round(balance)) });
  }

  return { phases, totalPaid: Math.round(totalPaid), totalInterest: Math.round(totalPaid - principal), chartPoints };
}

// ── 5年ルール・125%ルール month-by-month simulation ───────────────────────────

interface SimPeriod { label: string; payment: number; capped: boolean; rateAtStart: number }
interface SimResult {
  periods: SimPeriod[];
  chartPoints: { year: number; principal: number; unpaidInterest: number; total: number }[];
  finalLumpSum: number;
  totalPaid: number;
  totalInterest: number;
}

function simulateJP5Year(principal: number, termMonths: number, baseRate: number, hike5: number, hike10: number): SimResult {
  const getRate = (m: number) => m <= 60 ? baseRate : m <= 120 ? baseRate + hike5 : baseRate + hike5 + hike10;

  let currentPayment = calcPayment(principal, baseRate, termMonths);
  let balance = principal, unpaidInterest = 0, totalPaid = 0;
  const chartPoints: SimResult["chartPoints"] = [
    { year: 0, principal: Math.round(balance), unpaidInterest: 0, total: Math.round(balance) },
  ];
  const periods: SimPeriod[] = [];
  let periodStart = 0, periodRate = baseRate, periodCapped = false;

  for (let m = 1; m <= termMonths; m++) {
    const monthlyInterest = balance * getRate(m) / 100 / 12;
    if (currentPayment >= monthlyInterest) {
      let excess = currentPayment - monthlyInterest;
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

    if (m % 60 === 0 && m < termMonths) {
      periods.push({ label: `${periodStart / 12 + 1}〜${m / 12}年目`, payment: Math.round(currentPayment), capped: periodCapped, rateAtStart: periodRate });
      const newRate = getRate(m + 1);
      const ideal = calcPayment(balance, newRate, termMonths - m);
      const cap = currentPayment * 1.25;
      periodCapped = ideal > cap;
      currentPayment = Math.min(ideal, cap);
      periodStart = m; periodRate = newRate;
    }
  }

  periods.push({ label: `${periodStart / 12 + 1}〜${termMonths / 12}年目`, payment: Math.round(currentPayment), capped: periodCapped, rateAtStart: periodRate });
  const finalLumpSum = Math.max(0, Math.round(balance + unpaidInterest));

  return { periods, chartPoints, finalLumpSum, totalPaid: Math.round(totalPaid), totalInterest: Math.round(totalPaid + finalLumpSum - principal) };
}

// ─────────────────────────────────────────────────────────────────────────────

interface Scenario { label: string; hike5: number; hike10: number }

const SCENARIOS: Scenario[] = [
  { label: "現状維持（変化なし）",              hike5: 0,   hike10: 0   },
  { label: "+0.5%（5年後）",                  hike5: 0.5, hike10: 0   },
  { label: "+1.0%（5年後）",                  hike5: 1.0, hike10: 0   },
  { label: "+1.5%（5年後）",                  hike5: 1.5, hike10: 0   },
  { label: "+2.0%（5年後）",                  hike5: 2.0, hike10: 0   },
  { label: "+0.5%（5年後）+ 0.5%（10年後）",   hike5: 0.5, hike10: 0.5 },
  { label: "+1.0%（5年後）+ 1.0%（10年後）",   hike5: 1.0, hike10: 1.0 },
  { label: "+2.0%（5年後）+ 1.0%（10年後）",   hike5: 2.0, hike10: 1.0 },
];

const fmt = (v: number) =>
  v >= 100_000_000 ? `${(v / 100_000_000).toFixed(2)}億` : `${Math.round(v / 10000)}万`;

export default function MortgageCalc() {
  const [principalMan, setPrincipalMan] = useState("");
  const [termYears, setTermYears] = useState("35");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [bankName, setBankName] = useState("千葉銀行");
  const [bankRate, setBankRate] = useState("1.075");
  const [editingBank, setEditingBank] = useState(false);
  const [showRulesSim, setShowRulesSim] = useState(false);

  const principal = (parseFloat(principalMan) || 0) * 10000;
  const termMonths = (parseInt(termYears) || 35) * 12;
  const rate = parseFloat(bankRate) || 0;
  const scenario = SCENARIOS[selectedIdx];

  const allResults = useMemo(() => {
    if (!principal) return null;
    return SCENARIOS.map(sc => ({ sc, loan: calcLoan(principal, termMonths, rate, sc.hike5, sc.hike10) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [principal, termMonths, bankRate]);

  const detail = useMemo(() => {
    if (!principal) return null;
    return calcLoan(principal, termMonths, rate, scenario.hike5, scenario.hike10);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [principal, termMonths, scenario, bankRate]);

  const rulesSim = useMemo(() => {
    if (!principal || !showRulesSim) return null;
    return simulateJP5Year(principal, termMonths, rate, scenario.hike5, scenario.hike10);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [principal, termMonths, scenario, showRulesSim, bankRate]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Building2 size={26} className="shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-lg">住宅ローンシミュレーター</h2>
              <p className="text-blue-200 text-sm mt-0.5">変動金利・金利上昇シナリオ試算</p>
            </div>
          </div>
          <button onClick={() => setEditingBank(v => !v)}
            className="text-xs text-blue-200 hover:text-white border border-white/30 hover:border-white/60 rounded-lg px-3 py-1.5 transition-colors shrink-0">
            {editingBank ? "完了" : "銀行を編集"}
          </button>
        </div>

        {editingBank ? (
          <div className="bg-white/20 rounded-xl p-3 mt-4 space-y-2">
            <input
              type="text" value={bankName}
              onChange={e => setBankName(e.target.value)}
              placeholder="銀行名"
              className="w-full bg-white/20 rounded-lg px-2 py-1 text-sm text-white placeholder-blue-300 focus:outline-none focus:ring-1 focus:ring-white/60"
            />
            <div className="flex items-center gap-1">
              <input
                type="number" value={bankRate} step="0.025"
                onChange={e => setBankRate(e.target.value)}
                placeholder="1.075"
                className="w-full bg-white/20 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/60"
              />
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

        <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-300">
          <Info size={11} />
          <span>金利優遇幅は維持と仮定 / 10月以降の上昇を複数シナリオで試算</span>
        </div>
      </div>

      {/* Input */}
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

      {principal > 0 && allResults && (
        <>
          {/* Scenario table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-800">シナリオ別 総支払額</h3>
              <p className="text-xs text-gray-400 mt-0.5">元利均等 / 各フェーズで残高から月額を再計算</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-gray-500 font-medium">金利シナリオ</th>
                    <th className="px-4 py-2.5 text-right text-blue-600 font-medium">総支払額</th>
                    <th className="px-4 py-2.5 text-right text-gray-500 font-medium">うち利息</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allResults.map((row, i) => (
                    <tr key={i}
                      className={`cursor-pointer transition-colors ${selectedIdx === i ? "bg-blue-50" : "hover:bg-gray-50"}`}
                      onClick={() => setSelectedIdx(i)}>
                      <td className="px-4 py-2.5 text-gray-700 font-medium whitespace-nowrap">
                        {selectedIdx === i && <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 mb-0.5" />}
                        {row.sc.label}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-blue-700">{fmt(row.loan.totalPaid)}</td>
                      <td className="px-4 py-2.5 text-right text-red-500">{fmt(row.loan.totalInterest)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 px-5 py-2.5 border-t border-gray-50">行をタップしてシナリオ詳細を表示</p>
          </div>

          {/* Detail for selected scenario */}
          {detail && (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b-2 border-blue-500">
                  <span className="font-semibold text-gray-800 text-sm">{bankName || "銀行"}</span>
                  <span className="ml-2 text-xs text-gray-400">変動 {rate}%〜 / {scenario.label}</span>
                </div>
                <div className="p-5 space-y-3 text-sm">
                  {detail.phases.map((ph, pi) => {
                    if (ph.months === 0 || ph.payment === 0) return null;
                    const labels = ["当初〜5年", "5〜10年", "10年以降"];
                    const colors = ["text-gray-800", "text-orange-700", "text-red-700"];
                    return (
                      <div key={pi} className={`flex justify-between items-center ${pi > 0 ? "pt-2 border-t border-gray-50" : ""}`}>
                        <div>
                          <span className="text-xs text-gray-500">{labels[pi]}</span>
                          <span className="ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{ph.rate}%</span>
                        </div>
                        <span className={`font-bold ${colors[pi]}`}>月 ¥{ph.payment.toLocaleString()}</span>
                      </div>
                    );
                  })}
                  <div className="pt-3 mt-1 border-t border-gray-100 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-500">総支払額</span>
                      <span className="font-bold text-gray-900">{fmt(detail.totalPaid)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">うち利息総額</span>
                      <span className="font-bold text-red-600">{fmt(detail.totalInterest)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Balance chart */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h4 className="text-sm font-semibold text-gray-800 mb-1">残高推移（{scenario.label}）</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={detail.chartPoints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} tickFormatter={v => `${v}年`}
                      ticks={[0, 5, 10, 15, 20, 25, 30, 35, 40, 45].filter(y => y <= parseInt(termYears))} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmt(v)} width={56} />
                    <Tooltip labelFormatter={l => `${l}年後`} formatter={(v) => [fmt(Number(v)), "残高"]} />
                    {scenario.hike5 > 0 && (
                      <ReferenceLine x={5} stroke="#f59e0b" strokeDasharray="4 4"
                        label={{ value: `+${scenario.hike5}%`, position: "insideTopLeft", fontSize: 9, fill: "#92400e" }} />
                    )}
                    {scenario.hike10 > 0 && (
                      <ReferenceLine x={10} stroke="#ef4444" strokeDasharray="4 4"
                        label={{ value: `+${scenario.hike10}%`, position: "insideTopLeft", fontSize: 9, fill: "#991b1b" }} />
                    )}
                    <Line dataKey="balance" name="残高" stroke="#3b82f6" strokeWidth={2.5} dot={false} type="monotone" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 bg-amber-50 rounded-xl p-4">
            <Info size={13} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              上の比較表は各フェーズ開始時に残高から月額を再計算するため、実態より月額変動が大きく見えます。
              金利上昇の影響額・総利息の参考値としてご利用ください。
            </p>
          </div>

          {/* 5年・125%ルール simulation */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left"
              onClick={() => setShowRulesSim(v => !v)}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-orange-500 shrink-0" />
                <span className="text-sm font-semibold text-gray-800">5年ルール・125%ルール 未払い利息シミュレーション</span>
              </div>
              {showRulesSim ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
            </button>

            {showRulesSim && (
              <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 pt-4">
                  月額を5年間固定し、再計算時に前回比125%上限を設けます。上限に抑えられた分は
                  <strong>未払い利息</strong>として蓄積され、期末に一括清算が必要になる場合があります。
                  選択中のシナリオ（{scenario.label}）で試算しています。
                </p>

                {rulesSim && (
                  <>
                    {/* Period payment table */}
                    <div className="rounded-xl border border-gray-100 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-gray-500 font-medium">期間</th>
                            <th className="px-3 py-2 text-right text-gray-500 font-medium">適用金利</th>
                            <th className="px-3 py-2 text-right text-gray-500 font-medium">月額返済</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {rulesSim.periods.map((p, i) => (
                            <tr key={i} className={p.capped ? "bg-red-50" : ""}>
                              <td className="px-3 py-2 text-gray-700">{p.label}</td>
                              <td className="px-3 py-2 text-right text-gray-600">{p.rateAtStart.toFixed(3)}%</td>
                              <td className="px-3 py-2 text-right font-bold">
                                <span className={p.capped ? "text-red-700" : "text-gray-800"}>
                                  ¥{p.payment.toLocaleString()}
                                  {p.capped && <span className="ml-1 text-red-400 font-normal">（125%上限）</span>}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Balance chart */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">残高・未払い利息推移</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={rulesSim.chartPoints}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="year" tick={{ fontSize: 10 }} tickFormatter={v => `${v}年`} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmt(v)} width={56} />
                          <Tooltip labelFormatter={l => `${l}年後`} formatter={(v, name) => [fmt(Number(v)), name]} />
                          <Legend />
                          <Line dataKey="principal" name="元金残高" stroke="#3b82f6" strokeWidth={2} dot={false} type="monotone" />
                          <Line dataKey="unpaidInterest" name="未払い利息" stroke="#ef4444" strokeWidth={2} dot={false} type="monotone" />
                          <Line dataKey="total" name="合計残債" stroke="#f59e0b" strokeWidth={1.5} dot={false} type="monotone" strokeDasharray="4 2" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Summary row */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-xs text-gray-500">月額合計（返済期間中）</div>
                        <div className="font-bold text-gray-900 text-sm mt-0.5">{fmt(rulesSim.totalPaid)}</div>
                      </div>
                      <div className={`rounded-xl p-3 ${rulesSim.finalLumpSum > 0 ? "bg-red-50" : "bg-green-50"}`}>
                        <div className="text-xs text-gray-500">期末一括清算額</div>
                        <div className={`font-bold text-sm mt-0.5 ${rulesSim.finalLumpSum > 0 ? "text-red-700" : "text-green-700"}`}>
                          {rulesSim.finalLumpSum > 0 ? fmt(rulesSim.finalLumpSum) : "なし"}
                        </div>
                      </div>
                      <div className="bg-orange-50 rounded-xl p-3 col-span-2 sm:col-span-1">
                        <div className="text-xs text-gray-500">利息総額（期末含む）</div>
                        <div className="font-bold text-orange-700 text-sm mt-0.5">{fmt(rulesSim.totalInterest)}</div>
                      </div>
                    </div>

                    {rulesSim.finalLumpSum > 0 && (
                      <div className="flex items-start gap-2 bg-red-50 rounded-xl p-3">
                        <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700">
                          返済期末に <strong>{fmt(rulesSim.finalLumpSum)}</strong> の残高（元金＋未払い利息）が残ります。
                          一括返済または借換えが必要になる可能性があります。
                        </p>
                      </div>
                    )}
                  </>
                )}
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
