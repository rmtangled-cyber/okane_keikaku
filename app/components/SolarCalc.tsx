"use client";

import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { Sun, Zap, TrendingUp, Info, Wind, Edit2 } from "lucide-react";

// VBM470KJ02N × 12枚
const PANEL_COUNT = 12;
const PANEL_WATT = 470;
const SYSTEM_KWP = (PANEL_COUNT * PANEL_WATT) / 1000; // 5.64 kWp

// Tokyo NEDO annual irradiance ~1,380 kWh/kWp, system efficiency 0.85
const DEFAULT_MONTHLY_GEN = Math.round(SYSTEM_KWP * 1380 * 0.85 / 12); // ~551 kWh

// Daytime fraction of generation (panels generate only when sun is out)
const DAYTIME_GEN_FRACTION = 0.80;

// AC type presets (average running power in kW)
const AC_TYPES = [
  { label: "小型（〜6畳）",  kw: 0.5 },
  { label: "標準（6〜10畳）", kw: 0.8 },
  { label: "大型（10〜18畳）", kw: 1.2 },
  { label: "超大型（18畳〜）", kw: 1.8 },
];

interface YearPoint {
  year: number;
  purchase: number;
  enecari: number;
}

export default function SolarCalc() {
  // System capacity (editable) → monthly gen derived
  const [systemKwpInput, setSystemKwpInput] = useState(String(SYSTEM_KWP));
  const [editingGen, setEditingGen] = useState(false);

  // Purchase / subsidy
  const [purchaseCost, setPurchaseCost] = useState("1320000");
  const [subsidyAmount, setSubsidyAmount] = useState("625000");

  // Electricity usage
  const [daytimeUsage, setDaytimeUsage] = useState("");
  const [nighttimeUsage, setNighttimeUsage] = useState("");
  const [electricityRate, setElectricityRate] = useState("32");
  const [fitRate, setFitRate] = useState("16");

  // エネカリプラス
  const [enecariMonthly, setEnecariMonthly] = useState("");
  const [enecariYears, setEnecariYears] = useState("10");

  // AC estimator
  const [showAcEstimator, setShowAcEstimator] = useState(false);
  const [acTypeIdx, setAcTypeIdx] = useState(1); // 標準
  const [acCount, setAcCount] = useState("2");
  const [acDayHours, setAcDayHours] = useState("8");
  const [acNightHours, setAcNightHours] = useState("4");

  // Derived values
  const systemKwp = Math.max(0.1, parseFloat(systemKwpInput) || SYSTEM_KWP);
  const monthlyGen = Math.round(systemKwp * 1380 * 0.85 / 12);
  const annualGenDisplay = Math.round(monthlyGen * 12);

  const purchase = parseFloat(purchaseCost) || 1320000;
  const subsidy = parseFloat(subsidyAmount) || 0;
  const netPurchase = purchase - subsidy;
  const dayKwh = parseFloat(daytimeUsage) || 0;
  const nightKwh = parseFloat(nighttimeUsage) || 0;
  const rate = parseFloat(electricityRate) || 32;
  const fit = parseFloat(fitRate) || 16;
  const enecariMon = parseFloat(enecariMonthly) || 0;
  const enecariContractYears = parseInt(enecariYears) || 10;

  // AC estimate
  const acKw = AC_TYPES[acTypeIdx].kw;
  const acN = Math.max(1, parseInt(acCount) || 1);
  const acDay = Math.max(0, parseFloat(acDayHours) || 0);
  const acNight = Math.max(0, parseFloat(acNightHours) || 0);
  const acEstDay = Math.round(acKw * acN * acDay * 30);
  const acEstNight = Math.round(acKw * acN * acNight * 30);

  const applyAcEstimate = () => {
    setDaytimeUsage(String(acEstDay));
    setNighttimeUsage(String(acEstNight));
  };

  const result = useMemo(() => {
    const daytimeGen = monthlyGen * DAYTIME_GEN_FRACTION;

    // Self-consumed: limited by daytime usage or daytime generation, whichever smaller
    const selfConsumed = Math.min(dayKwh, daytimeGen);
    // Surplus exported to grid
    const exported = monthlyGen - selfConsumed;

    const selfSaving = selfConsumed * rate;
    const fitRevenue = exported * fit;
    const monthlySavingPurchase = selfSaving + fitRevenue;

    // エネカリプラス: no FIT during contract
    const enecariSelfSaving = selfConsumed * rate;
    const enecariDuringContract = enecariSelfSaving - enecariMon;
    const monthlySavingAfterContract = monthlySavingPurchase;

    const paybackMonths = monthlySavingPurchase > 0 ? netPurchase / monthlySavingPurchase : Infinity;
    const paybackYears = paybackMonths / 12;

    const chartData: YearPoint[] = [];
    let purchaseCum = -netPurchase;
    let enecariCum = 0;

    for (let y = 0; y <= 25; y++) {
      if (y > 0) {
        purchaseCum += monthlySavingPurchase * 12;
        if (y <= enecariContractYears) {
          enecariCum += enecariDuringContract * 12;
        } else {
          enecariCum += monthlySavingAfterContract * 12;
        }
      }
      chartData.push({ year: y, purchase: Math.round(purchaseCum), enecari: Math.round(enecariCum) });
    }

    let crossoverYear: number | null = null;
    for (let i = 0; i < chartData.length - 1; i++) {
      if (chartData[i].purchase <= chartData[i].enecari && chartData[i + 1].purchase > chartData[i + 1].enecari) {
        crossoverYear = chartData[i + 1].year;
        break;
      }
    }

    return {
      selfConsumed: Math.round(selfConsumed),
      exported: Math.round(exported),
      selfSaving: Math.round(selfSaving),
      fitRevenue: Math.round(fitRevenue),
      monthlySavingPurchase: Math.round(monthlySavingPurchase),
      enecariSelfSaving: Math.round(enecariSelfSaving),
      enecariDuringContract: Math.round(enecariDuringContract),
      paybackYears,
      chartData,
      crossoverYear,
      netPurchase,
    };
  }, [monthlyGen, dayKwh, nightKwh, rate, fit, enecariMon, netPurchase, enecariContractYears]);

  const fmtY = (v: number) => v >= 100_0000 ? `${(v / 100_0000).toFixed(0)}万` : `${(v / 1000).toFixed(0)}k`;

  return (
    <div className="space-y-5">
      {/* Panel info banner */}
      <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Sun size={28} className="shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-lg leading-tight">太陽光パネル比較シミュレーター</h2>
              <p className="text-amber-100 text-sm mt-0.5">Panasonic VBM470KJ02N × {PANEL_COUNT}枚 / {systemKwp}kWp</p>
            </div>
          </div>
          <button onClick={() => setEditingGen(v => !v)}
            className="text-xs text-amber-200 hover:text-white border border-white/30 hover:border-white/60 rounded-lg px-3 py-1.5 flex items-center gap-1 transition-colors shrink-0">
            <Edit2 size={11} />{editingGen ? "完了" : "容量を編集"}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4 text-center">
          <div className="bg-white/20 rounded-xl p-3">
            <div className="text-xs text-amber-100">発電容量</div>
            {editingGen ? (
              <div className="flex items-center justify-center gap-1">
                <input
                  type="number"
                  value={systemKwpInput}
                  onChange={e => setSystemKwpInput(e.target.value)}
                  step={0.01}
                  className="w-16 bg-white/30 rounded-lg px-2 py-1 text-white font-bold text-base text-center focus:outline-none focus:ring-1 focus:ring-white/60"
                />
                <span className="text-sm font-semibold">kWp</span>
              </div>
            ) : (
              <div className="font-bold text-lg">{systemKwp}kWp</div>
            )}
          </div>
          <div className="bg-white/20 rounded-xl p-3">
            <div className="text-xs text-amber-100">年間発電量目安</div>
            <div className="font-bold text-lg">{annualGenDisplay.toLocaleString()}kWh</div>
          </div>
          <div className="bg-white/20 rounded-xl p-3">
            <div className="text-xs text-amber-100">月間発電量目安</div>
            <div className="font-bold text-lg">{monthlyGen}kWh</div>
          </div>
        </div>
        <p className="text-xs text-amber-200 mt-2">※ 東京都・NEDO日射量データ・システム効率85%による試算（発電容量は編集可能）</p>
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
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <Zap size={15} className="text-yellow-500" /> 電力使用量（月間）
            </h3>
            <button onClick={() => setShowAcEstimator(v => !v)}
              className="text-xs text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded-lg px-2.5 py-1 flex items-center gap-1 transition-colors">
              <Wind size={11} />エアコン目安
            </button>
          </div>

          {/* AC estimator (collapsible) */}
          {showAcEstimator && (
            <div className="bg-indigo-50 rounded-xl p-3 space-y-3 border border-indigo-100">
              <p className="text-xs font-medium text-indigo-700">エアコン使用量の目安</p>
              <div>
                <label className="block text-xs text-gray-600 mb-1">機種タイプ</label>
                <select value={acTypeIdx} onChange={e => setAcTypeIdx(Number(e.target.value))}
                  className="w-full border border-indigo-200 bg-white rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  {AC_TYPES.map((t, i) => (
                    <option key={i} value={i}>{t.label}（{t.kw}kW）</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">台数</label>
                  <input type="number" value={acCount} onChange={e => setAcCount(e.target.value)} min={1} max={10}
                    className="w-full border border-indigo-200 bg-white rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">昼間 h/日</label>
                  <input type="number" value={acDayHours} onChange={e => setAcDayHours(e.target.value)} min={0} max={12} step={0.5}
                    className="w-full border border-indigo-200 bg-white rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">夜間 h/日</label>
                  <input type="number" value={acNightHours} onChange={e => setAcNightHours(e.target.value)} min={0} max={12} step={0.5}
                    className="w-full border border-indigo-200 bg-white rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-indigo-100">
                <span className="text-xs text-gray-600">
                  昼 <span className="font-bold text-gray-800">{acEstDay}</span> kWh
                  ／夜 <span className="font-bold text-gray-800">{acEstNight}</span> kWh
                  <span className="text-gray-400 ml-1">（月間）</span>
                </span>
                <button onClick={applyAcEstimate}
                  className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 transition-colors">
                  反映
                </button>
              </div>
              <p className="text-xs text-gray-400">昼間 = 6〜18時、夜間 = 18〜6時。エアコン以外の家電も含めて調整してください。</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">昼間使用量（kWh/月）</label>
            <input type="number" value={daytimeUsage} onChange={e => setDaytimeUsage(e.target.value)} placeholder="150"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            <p className="text-xs text-gray-400 mt-1">日中（6〜18時）の使用量</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">夜間使用量（kWh/月）</label>
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
            <span className="font-semibold">契約期間中</span>：余剰電力はTEPCOが利用（売電収入なし）。自家消費分のみ節約効果あり。月額費用が発生。<br/>
            <span className="font-semibold">契約終了後（10年 or 15年）</span>：パネルが無償譲渡され月額ゼロに。以降は購入と同等の節約（自家消費＋売電）が得られる。
          </p>
        </div>
      </div>

      {/* Results */}
      {(dayKwh > 0 || nightKwh > 0 || enecariMon > 0) && (
        <>
          {/* Monthly breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Purchase breakdown */}
            <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100">
              <h4 className="text-sm font-semibold text-orange-800 mb-3">購入した場合の月間節約</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>月間発電量</span>
                  <span className="font-medium text-gray-800">{monthlyGen} kWh</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>自家消費</span>
                  <span className="font-medium text-gray-800">{result.selfConsumed} kWh</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>売電量（FIT）</span>
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
                  <span>¥{result.monthlySavingPurchase.toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-400">
                  {result.paybackYears === Infinity
                    ? "節約額なし（電力使用量を入力）"
                    : `回収期間: 約${result.paybackYears.toFixed(1)}年（実質負担 ¥${result.netPurchase.toLocaleString()}）`}
                </div>
              </div>
            </div>

            {/* エネカリプラス breakdown */}
            <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
              <h4 className="text-sm font-semibold text-blue-800 mb-3">エネカリプラスの月間収支</h4>
              <div className="space-y-2 text-sm">
                <div className="text-xs text-blue-600 font-medium mb-1">契約期間中（〜{enecariContractYears}年後）</div>
                <div className="flex justify-between text-gray-600">
                  <span>自家消費節約</span>
                  <span className="text-green-700">+¥{result.enecariSelfSaving.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>売電収入</span>
                  <span className="text-gray-400">なし（TEPCOへ）</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>月額利用料</span>
                  <span className="text-red-600">−¥{enecariMon.toLocaleString()}</span>
                </div>
                <div className={`flex justify-between font-bold pt-1 border-t border-blue-200 ${result.enecariDuringContract >= 0 ? "text-blue-700" : "text-red-600"}`}>
                  <span>月間純収支</span>
                  <span>{result.enecariDuringContract >= 0 ? "+" : ""}¥{result.enecariDuringContract.toLocaleString()}</span>
                </div>
                <div className="text-xs text-blue-600 font-medium mt-3 pt-2 border-t border-blue-200">
                  {enecariContractYears}年後〜（無償譲渡後）
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>月額利用料</span>
                  <span className="font-medium text-blue-700">¥0（終了）</span>
                </div>
                <div className="flex justify-between font-bold text-blue-700">
                  <span>月間節約（購入と同等）</span>
                  <span>¥{result.monthlySavingPurchase.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary verdict */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">判定</h4>
            <div className="space-y-2 text-sm">
              {result.crossoverYear !== null && (
                <div className="bg-orange-50 rounded-xl p-3 text-orange-800">
                  購入は初期費用 ¥{result.netPurchase.toLocaleString()} がかかりますが、
                  <span className="font-bold"> {result.crossoverYear}年目以降は購入の方がお得</span>になります。
                </div>
              )}
              {result.crossoverYear === null && enecariMon > 0 && dayKwh > 0 && (
                <div className="bg-blue-50 rounded-xl p-3 text-blue-800">
                  25年間でも購入がエネカリプラスを上回りません。<span className="font-bold">エネカリプラスの方がお得</span>です。
                </div>
              )}
              <div className="text-xs text-gray-400 mt-1">
                ※ エネカリプラス契約中は売電収入なし（余剰電力はTEPCOへ）。{enecariContractYears}年後の無償譲渡後は売電も可能になります。
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
          <p className="text-xs mt-1 text-gray-300">「エアコン目安」ボタンで使用量の目安を入力できます</p>
        </div>
      )}
    </div>
  );
}
