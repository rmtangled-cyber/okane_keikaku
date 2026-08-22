"use client";

import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { Sun, Zap, TrendingUp, Info } from "lucide-react";

// VBM470KJ02N × 12枚
const PANEL_COUNT = 12;
const PANEL_WATT = 470;
const SYSTEM_KWP = (PANEL_COUNT * PANEL_WATT) / 1000; // 5.64 kWp

// Tokyo NEDO annual irradiance ~1,380 kWh/kWp, system efficiency 0.85
const ANNUAL_GENERATION_KWH = Math.round(SYSTEM_KWP * 1380 * 0.85);
const MONTHLY_GENERATION_KWH = Math.round(ANNUAL_GENERATION_KWH / 12);

// Daytime fraction of generation (panels generate only when sun is out)
const DAYTIME_GEN_FRACTION = 0.80;

interface YearPoint {
  year: number;
  purchase: number;
  enecari: number;
}

export default function SolarCalc() {
  const [purchaseCost, setPurchaseCost] = useState("1320000");
  const [subsidyAmount, setSubsidyAmount] = useState("625000");
  const [daytimeUsage, setDaytimeUsage] = useState("");
  const [nighttimeUsage, setNighttimeUsage] = useState("");
  const [electricityRate, setElectricityRate] = useState("32");
  const [fitRate, setFitRate] = useState("16");
  const [enecariMonthly, setEnecariMonthly] = useState("");
  const [enecariYears, setEnecariYears] = useState("10");

  const purchase = parseFloat(purchaseCost) || 1320000;
  const subsidy = parseFloat(subsidyAmount) || 0;
  const netPurchase = purchase - subsidy;
  const dayKwh = parseFloat(daytimeUsage) || 0;
  const nightKwh = parseFloat(nighttimeUsage) || 0;
  const rate = parseFloat(electricityRate) || 32;
  const fit = parseFloat(fitRate) || 16;
  const enecariMon = parseFloat(enecariMonthly) || 0;
  const enecariContractYears = parseInt(enecariYears) || 10;

  const result = useMemo(() => {
    const monthlyGen = MONTHLY_GENERATION_KWH;
    const daytimeGen = monthlyGen * DAYTIME_GEN_FRACTION;

    // Self-consumed: limited by daytime usage or daytime generation, whichever smaller
    const selfConsumed = Math.min(dayKwh, daytimeGen);
    // Surplus exported to grid
    const exported = monthlyGen - selfConsumed;

    // Monthly savings from solar ownership
    const selfSaving = selfConsumed * rate;
    const fitRevenue = exported * fit;
    const monthlySaving = selfSaving + fitRevenue;

    // Payback period for purchase (months)
    const paybackMonths = monthlySaving > 0 ? netPurchase / monthlySaving : Infinity;
    const paybackYears = paybackMonths / 12;

    // Monthly net for purchase: savings (no fee)
    // Monthly net for enecari: same electricity savings MINUS monthly fee
    const enecariMonthlySaving = monthlySaving - enecariMon;

    // After enecari contract ends, assume panels transfer for free → same as purchase from year N
    const chartData: YearPoint[] = [];
    let purchaseCum = -netPurchase;
    let enecariCum = 0;

    for (let y = 0; y <= 25; y++) {
      if (y > 0) {
        purchaseCum += monthlySaving * 12;
        if (y <= enecariContractYears) {
          enecariCum += enecariMonthlySaving * 12;
        } else {
          // After contract, panels are owned → same saving as purchase (no more fee)
          enecariCum += monthlySaving * 12;
        }
      }
      chartData.push({
        year: y,
        purchase: Math.round(purchaseCum),
        enecari: Math.round(enecariCum),
      });
    }

    // Find crossover year (when purchase becomes better)
    let crossoverYear: number | null = null;
    for (let i = 0; i < chartData.length - 1; i++) {
      if (chartData[i].purchase <= chartData[i].enecari && chartData[i + 1].purchase > chartData[i + 1].enecari) {
        crossoverYear = chartData[i + 1].year;
        break;
      }
    }

    return {
      monthlyGen,
      selfConsumed: Math.round(selfConsumed),
      exported: Math.round(exported),
      selfSaving: Math.round(selfSaving),
      fitRevenue: Math.round(fitRevenue),
      monthlySaving: Math.round(monthlySaving),
      enecariMonthlySaving: Math.round(enecariMonthlySaving),
      paybackYears,
      chartData,
      crossoverYear,
      netPurchase,
    };
  }, [dayKwh, nightKwh, rate, fit, enecariMon, netPurchase, enecariContractYears]);

  const fmtY = (v: number) => v >= 100_0000 ? `${(v / 100_0000).toFixed(0)}万` : `${(v / 1000).toFixed(0)}k`;

  return (
    <div className="space-y-5">
      {/* Panel info banner */}
      <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white shadow-md">
        <div className="flex items-start gap-3">
          <Sun size={28} className="shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-lg leading-tight">太陽光パネル比較シミュレーター</h2>
            <p className="text-amber-100 text-sm mt-0.5">Panasonic VBM470KJ02N × {PANEL_COUNT}枚 / {SYSTEM_KWP}kWp</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4 text-center">
          <div className="bg-white/20 rounded-xl p-3">
            <div className="text-xs text-amber-100">発電容量</div>
            <div className="font-bold text-lg">{SYSTEM_KWP}kWp</div>
          </div>
          <div className="bg-white/20 rounded-xl p-3">
            <div className="text-xs text-amber-100">年間発電量目安</div>
            <div className="font-bold text-lg">{ANNUAL_GENERATION_KWH.toLocaleString()}kWh</div>
          </div>
          <div className="bg-white/20 rounded-xl p-3">
            <div className="text-xs text-amber-100">月間発電量目安</div>
            <div className="font-bold text-lg">{MONTHLY_GENERATION_KWH}kWh</div>
          </div>
        </div>
        <p className="text-xs text-amber-200 mt-2">※ 東京都・NEDO日射量データ・システム効率85%による試算</p>
      </div>

      {/* Input section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Purchase settings */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
            <TrendingUp size={15} className="text-orange-500" /> 購入設定
          </h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">購入費用（円）</label>
            <input type="number" value={purchaseCost} onChange={e => setPurchaseCost(e.target.value)} placeholder="1320000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400" />
            <p className="text-xs text-gray-400 mt-1">VBM470KJ02N×12枚 = 132万円</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">補助金合計（円）</label>
            <input type="number" value={subsidyAmount} onChange={e => setSubsidyAmount(e.target.value)} placeholder="625000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400" />
            <p className="text-xs text-gray-400 mt-1">東京ゼロエミ太陽光加算など</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 text-xs">実質負担額</span>
              <span className="font-bold text-orange-700">¥{result.netPurchase.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Electricity usage */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
            <Zap size={15} className="text-yellow-500" /> 電力使用量（月間）
          </h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">昼間使用量（kWh）</label>
            <input type="number" value={daytimeUsage} onChange={e => setDaytimeUsage(e.target.value)} placeholder="150"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            <p className="text-xs text-gray-400 mt-1">日中（6〜18時）の使用量</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">夜間使用量（kWh）</label>
            <input type="number" value={nighttimeUsage} onChange={e => setNighttimeUsage(e.target.value)} placeholder="100"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            <p className="text-xs text-gray-400 mt-1">夜間（18〜6時）の使用量（常に買電）</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">電気料金（円/kWh）</label>
              <input type="number" value={electricityRate} onChange={e => setElectricityRate(e.target.value)} placeholder="32"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">売電単価（円/kWh）</label>
              <input type="number" value={fitRate} onChange={e => setFitRate(e.target.value)} placeholder="16"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              <p className="text-xs text-gray-400 mt-1">FIT 2026年度目安</p>
            </div>
          </div>
        </div>
      </div>

      {/* エネカリプラス settings */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2 mb-4">
          <Zap size={15} className="text-blue-500" /> TEPCOエネカリプラス設定
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">月額利用料（円/月）</label>
            <input type="number" value={enecariMonthly} onChange={e => setEnecariMonthly(e.target.value)} placeholder="4000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <p className="text-xs text-gray-400 mt-1">TEPCOに要確認</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">契約期間（年）</label>
            <input type="number" value={enecariYears} onChange={e => setEnecariYears(e.target.value)} placeholder="10" min={1} max={25}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <p className="text-xs text-gray-400 mt-1">契約終了後はパネル所有へ移行と想定</p>
          </div>
        </div>
        <div className="flex items-start gap-2 mt-3 bg-blue-50 rounded-xl p-3">
          <Info size={13} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            エネカリプラスでも自家消費・売電の電気代節約効果は同じです。月額費用を払う代わりに初期費用ゼロで設置できます。
            契約終了後はパネルが自分のものになり、その後は購入と同等の節約効果になると想定しています。
          </p>
        </div>
      </div>

      {/* Results */}
      {(dayKwh > 0 || nightKwh > 0 || enecariMon > 0) && (
        <>
          {/* Monthly breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100">
              <h4 className="text-sm font-semibold text-orange-800 mb-3">月間節約効果</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>月間発電量</span>
                  <span className="font-medium text-gray-800">{result.monthlyGen} kWh</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>自家消費</span>
                  <span className="font-medium text-gray-800">{result.selfConsumed} kWh</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>売電量</span>
                  <span className="font-medium text-gray-800">{result.exported} kWh</span>
                </div>
                <div className="border-t border-orange-200 pt-2 space-y-1.5">
                  <div className="flex justify-between text-gray-600">
                    <span>自家消費節約</span>
                    <span className="text-green-700">+¥{result.selfSaving.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>売電収入</span>
                    <span className="text-green-700">+¥{result.fitRevenue.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex justify-between font-bold text-orange-700 pt-1 border-t border-orange-200">
                  <span>月間合計節約</span>
                  <span>¥{result.monthlySaving.toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-400">年間: ¥{(result.monthlySaving * 12).toLocaleString()}</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">比較サマリー</h4>
              <div className="space-y-3 text-sm">
                <div className="bg-orange-50 rounded-xl p-3">
                  <div className="text-xs text-orange-600 font-medium mb-1">購入（実質 ¥{result.netPurchase.toLocaleString()}）</div>
                  <div className="flex justify-between text-gray-700">
                    <span>月間節約</span>
                    <span className="font-bold text-orange-700">¥{result.monthlySaving.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {result.paybackYears === Infinity
                      ? "節約額なし（電力使用量を入力してください）"
                      : `回収期間: 約${result.paybackYears.toFixed(1)}年`}
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <div className="text-xs text-blue-600 font-medium mb-1">エネカリプラス（¥{enecariMon.toLocaleString()}/月）</div>
                  <div className="flex justify-between text-gray-700">
                    <span>月間純節約</span>
                    <span className={`font-bold ${result.enecariMonthlySaving >= 0 ? "text-blue-700" : "text-red-600"}`}>
                      {result.enecariMonthlySaving >= 0 ? "+" : ""}¥{result.enecariMonthlySaving.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    契約{enecariContractYears}年間合計: ¥{(result.enecariMonthlySaving * 12 * enecariContractYears).toLocaleString()}
                  </div>
                </div>
                {result.crossoverYear !== null && (
                  <div className="bg-green-50 rounded-xl p-3 text-xs text-green-700">
                    <span className="font-medium">購入が{result.crossoverYear}年目以降お得</span>になります
                    （エネカリプラス月額 ¥{enecariMon.toLocaleString()} の場合）
                  </div>
                )}
                {result.crossoverYear === null && enecariMon > 0 && dayKwh > 0 && (
                  <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                    25年間でも購入がエネカリプラスより有利になりません。エネカリプラスがお得です。
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h4 className="text-sm font-semibold text-gray-800 mb-1">累積損益比較（25年間）</h4>
            <p className="text-xs text-gray-400 mb-4">購入の場合は初期費用を引いた累積節約額、エネカリプラスは月額費用を引いた累積節約額</p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={result.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} tickFormatter={v => `${v}年`} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtY} width={52} />
                <Tooltip
                  labelFormatter={l => `${l}年後`}
                  formatter={(v, name) => [
                    typeof v === "number" ? `¥${v.toLocaleString()}` : String(v),
                    name === "purchase" ? "購入" : "エネカリプラス",
                  ]}
                />
                <Legend formatter={v => v === "purchase" ? "購入" : "エネカリプラス"} />
                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />
                {result.crossoverYear !== null && (
                  <ReferenceLine x={result.crossoverYear} stroke="#22c55e" strokeDasharray="4 4"
                    label={{ value: `${result.crossoverYear}年で逆転`, position: "top", fontSize: 9, fill: "#16a34a" }} />
                )}
                <Line type="monotone" dataKey="purchase" stroke="#f97316" strokeWidth={2.5} dot={false} name="purchase" />
                <Line type="monotone" dataKey="enecari" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="enecari" strokeDasharray="6 3" />
              </LineChart>
            </ResponsiveContainer>
            {enecariContractYears < 25 && (
              <p className="text-xs text-gray-400 mt-2">
                ※ エネカリプラス契約終了（{enecariContractYears}年後）以降は月額費用なしの同等節約を想定
              </p>
            )}
          </div>
        </>
      )}

      {!dayKwh && !nightKwh && !enecariMon && (
        <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-400">
          <Sun size={32} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm">昼間・夜間の電力使用量とエネカリプラスの月額を入力すると比較結果が表示されます</p>
        </div>
      )}
    </div>
  );
}
