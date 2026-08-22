"use client";

import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { Building2, Info } from "lucide-react";

const BANKS = [
  { name: "足利銀行", rate: 0.975, color: "#3b82f6" },
  { name: "千葉銀行", rate: 1.075, color: "#8b5cf6" },
];

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

interface PhaseResult {
  rate: number;
  payment: number;
  months: number;
}

function calcLoan(
  principal: number,
  termMonths: number,
  baseRate: number,
  hike5: number,
  hike10: number,
) {
  const n1 = Math.min(60, termMonths);          // 〜5年
  const n2 = Math.min(60, termMonths - n1);     // 5〜10年
  const n3 = Math.max(0, termMonths - n1 - n2); // 10年〜

  const r1 = baseRate;
  const r2 = baseRate + hike5;
  const r3 = baseRate + hike5 + hike10;

  const p1 = calcPayment(principal, r1, termMonths);
  const b1 = Math.max(0, remainingBalance(principal, r1, p1, n1));

  const p2 = n2 > 0 && b1 > 0 ? calcPayment(b1, r2, termMonths - n1) : 0;
  const b2 = n2 > 0 ? Math.max(0, remainingBalance(b1, r2, p2, n2)) : 0;

  const p3 = n3 > 0 && b2 > 0 ? calcPayment(b2, r3, n3) : 0;

  const totalPaid = p1 * n1 + p2 * n2 + p3 * n3;
  const totalInterest = totalPaid - principal;

  const phases: PhaseResult[] = [
    { rate: r1, payment: Math.round(p1), months: n1 },
    { rate: r2, payment: Math.round(p2), months: n2 },
    { rate: r3, payment: Math.round(p3), months: n3 },
  ];

  // Chart data: balance at each year
  const chartPoints: { year: number; balance: number }[] = [];
  for (let m = 0; m <= termMonths; m += 12) {
    let balance: number;
    if (m <= n1) {
      balance = remainingBalance(principal, r1, p1, m);
    } else if (m <= n1 + n2) {
      balance = remainingBalance(b1, r2, p2, m - n1);
    } else {
      balance = remainingBalance(b2, r3, p3, m - n1 - n2);
    }
    chartPoints.push({ year: m / 12, balance: Math.max(0, Math.round(balance)) });
  }

  return {
    phases,
    totalPaid: Math.round(totalPaid),
    totalInterest: Math.round(totalInterest),
    chartPoints,
  };
}

interface Scenario { label: string; hike5: number; hike10: number }

const SCENARIOS: Scenario[] = [
  { label: "現状維持（変化なし）",           hike5: 0,   hike10: 0   },
  { label: "+0.5%（5年後）",               hike5: 0.5, hike10: 0   },
  { label: "+1.0%（5年後）",               hike5: 1.0, hike10: 0   },
  { label: "+1.5%（5年後）",               hike5: 1.5, hike10: 0   },
  { label: "+2.0%（5年後）",               hike5: 2.0, hike10: 0   },
  { label: "+0.5%（5年後）+ 0.5%（10年後）", hike5: 0.5, hike10: 0.5 },
  { label: "+1.0%（5年後）+ 1.0%（10年後）", hike5: 1.0, hike10: 1.0 },
  { label: "+2.0%（5年後）+ 1.0%（10年後）", hike5: 2.0, hike10: 1.0 },
];

const fmt = (v: number) =>
  v >= 100_000_000 ? `${(v / 100_000_000).toFixed(2)}億` : `${Math.round(v / 10000)}万`;

export default function MortgageCalc() {
  const [principalMan, setPrincipalMan] = useState("");
  const [termYears, setTermYears] = useState("35");
  const [selectedIdx, setSelectedIdx] = useState(0);

  const principal = (parseFloat(principalMan) || 0) * 10000;
  const termMonths = (parseInt(termYears) || 35) * 12;
  const scenario = SCENARIOS[selectedIdx];

  const allResults = useMemo(() => {
    if (!principal) return null;
    return SCENARIOS.map(sc => ({
      sc,
      banks: BANKS.map(b => ({ bank: b, loan: calcLoan(principal, termMonths, b.rate, sc.hike5, sc.hike10) })),
    }));
  }, [principal, termMonths]);

  const detail = useMemo(() => {
    if (!principal) return null;
    return BANKS.map(b => ({ bank: b, loan: calcLoan(principal, termMonths, b.rate, scenario.hike5, scenario.hike10) }));
  }, [principal, termMonths, scenario]);

  // Merged chart data for selected scenario
  const chartData = useMemo(() => {
    if (!detail) return [];
    const len = detail[0].loan.chartPoints.length;
    return Array.from({ length: len }, (_, i) => ({
      year: detail[0].loan.chartPoints[i].year,
      足利銀行: detail[0].loan.chartPoints[i].balance,
      千葉銀行: detail[1].loan.chartPoints[i].balance,
    }));
  }, [detail]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-md">
        <div className="flex items-start gap-3">
          <Building2 size={26} className="shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-lg">住宅ローン比較シミュレーター</h2>
            <p className="text-blue-200 text-sm mt-0.5">足利銀行 vs 千葉銀行 / 変動金利・金利上昇シナリオ</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          {BANKS.map(b => (
            <div key={b.name} className="bg-white/20 rounded-xl p-3 text-center">
              <div className="text-xs text-blue-200">{b.name}</div>
              <div className="font-bold text-2xl">{b.rate}%</div>
              <div className="text-xs text-blue-300">現在の変動金利</div>
            </div>
          ))}
        </div>
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
              {[20, 25, 30, 35].map(y => <option key={y} value={y}>{y}年</option>)}
            </select>
          </div>
        </div>
      </div>

      {principal > 0 && allResults && (
        <>
          {/* Scenario table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-800">シナリオ別 総支払額比較</h3>
              <p className="text-xs text-gray-400 mt-0.5">元利均等 / 各フェーズで残高から月額を再計算</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-gray-500 font-medium whitespace-nowrap">金利シナリオ</th>
                    <th className="px-4 py-2.5 text-right text-blue-600 font-medium whitespace-nowrap">
                      足利銀行 0.975%<br /><span className="text-gray-400 font-normal text-xs">総支払 / 利息</span>
                    </th>
                    <th className="px-4 py-2.5 text-right text-purple-600 font-medium whitespace-nowrap">
                      千葉銀行 1.075%<br /><span className="text-gray-400 font-normal text-xs">総支払 / 利息</span>
                    </th>
                    <th className="px-4 py-2.5 text-right text-gray-500 font-medium whitespace-nowrap">
                      差額<br /><span className="text-gray-400 font-normal">（千葉−足利）</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allResults.map((row, i) => {
                    const a = row.banks[0].loan;
                    const c = row.banks[1].loan;
                    const diff = c.totalPaid - a.totalPaid;
                    return (
                      <tr key={i}
                        className={`cursor-pointer transition-colors ${selectedIdx === i ? "bg-blue-50" : "hover:bg-gray-50"}`}
                        onClick={() => setSelectedIdx(i)}>
                        <td className="px-4 py-2.5 text-gray-700 font-medium whitespace-nowrap">
                          {selectedIdx === i && <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 mb-0.5" />}
                          {row.sc.label}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="font-bold text-blue-700">{fmt(a.totalPaid)}</div>
                          <div className="text-gray-400">利息 {fmt(a.totalInterest)}</div>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="font-bold text-purple-700">{fmt(c.totalPaid)}</div>
                          <div className="text-gray-400">利息 {fmt(c.totalInterest)}</div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-red-600 whitespace-nowrap">
                          +{fmt(diff)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 px-5 py-2.5 border-t border-gray-50">行をタップしてシナリオ詳細を表示</p>
          </div>

          {/* Detail cards for selected scenario */}
          {detail && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">詳細: {scenario.label}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {detail.map(({ bank, loan }) => (
                    <div key={bank.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="px-5 py-3 border-b-2" style={{ borderBottomColor: bank.color }}>
                        <span className="font-semibold text-gray-800 text-sm">{bank.name}</span>
                        <span className="ml-2 text-xs text-gray-400">変動 {bank.rate}%〜</span>
                      </div>
                      <div className="p-5 space-y-3 text-sm">
                        {loan.phases.map((ph, pi) => {
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
                            <span className="font-bold text-gray-900">{fmt(loan.totalPaid)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">うち利息総額</span>
                            <span className="font-bold text-red-600">{fmt(loan.totalInterest)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">返済率（月収比目安）</span>
                            <span className="text-gray-600 text-xs">月 ¥{loan.phases[0].payment.toLocaleString()} / 収入で確認</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Balance chart */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h4 className="text-sm font-semibold text-gray-800 mb-1">残高推移（{scenario.label}）</h4>
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} tickFormatter={v => `${v}年`}
                      ticks={[0, 5, 10, 15, 20, 25, 30, 35].filter(y => y <= parseInt(termYears))} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmt(v)} width={56} />
                    <Tooltip labelFormatter={l => `${l}年後`}
                      formatter={(v, name) => [fmt(Number(v)), name]} />
                    <Legend />
                    {scenario.hike5 > 0 && (
                      <ReferenceLine x={5} stroke="#f59e0b" strokeDasharray="4 4"
                        label={{ value: `+${scenario.hike5}%`, position: "insideTopLeft", fontSize: 9, fill: "#92400e" }} />
                    )}
                    {scenario.hike10 > 0 && (
                      <ReferenceLine x={10} stroke="#ef4444" strokeDasharray="4 4"
                        label={{ value: `+${scenario.hike10}%`, position: "insideTopLeft", fontSize: 9, fill: "#991b1b" }} />
                    )}
                    <Line dataKey="足利銀行" stroke="#3b82f6" strokeWidth={2.5} dot={false} type="monotone" />
                    <Line dataKey="千葉銀行" stroke="#8b5cf6" strokeWidth={2.5} dot={false} type="monotone" strokeDasharray="6 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 bg-amber-50 rounded-xl p-4">
            <Info size={13} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              変動金利の実際の返済では「5年ルール（月額は5年間固定）」と「125%ルール（増加上限）」がありますが、
              このシミュレーターでは各フェーズ開始時に残高から月額を再計算しているため実態より月額変動が大きく見えます。
              金利上昇の影響額・総利息の参考値としてご利用ください。
            </p>
          </div>
        </>
      )}

      {!principal && (
        <div className="bg-gray-50 rounded-2xl p-10 text-center text-gray-400">
          <Building2 size={32} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm">借入額を入力すると比較結果が表示されます</p>
        </div>
      )}
    </div>
  );
}
