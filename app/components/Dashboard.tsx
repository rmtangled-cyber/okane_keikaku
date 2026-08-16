"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Plus, TrendingUp, Wallet, Target, RefreshCw, Download, BarChart2, Layers } from "lucide-react";

import { Asset, AssetCategory, Goal, StockHolding, FundHolding, calcTax } from "@/lib/types";
import {
  getAssets, saveAssets, loadAssets,
  getGoals, saveGoals, loadGoals,
  getSnapshots, saveSnapshots, loadSnapshots,
  exportToCSV,
  getStocks, saveStocks, loadStocks,
  getFunds, saveFunds, loadFunds,
} from "@/lib/storage";
import AssetCard from "./AssetCard";
import AssetModal from "./AssetModal";
import GoalCard from "./GoalCard";
import GoalModal from "./GoalModal";
import StockCard from "./StockCard";
import StockModal from "./StockModal";
import FundCard from "./FundCard";
import FundModal from "./FundModal";

const CATEGORY_COLOR: Record<string, string> = {
  "現金・預金": "#3b82f6",
  "株式": "#22c55e",
  "投資信託": "#a855f7",
  "債券": "#eab308",
  "不動産": "#f97316",
  "その他": "#6b7280",
};

type Tab = "概要" | "株式" | "投資信託" | "資産" | "目標";

export default function Dashboard() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stocks, setStocks] = useState<StockHolding[]>([]);
  const [funds, setFunds] = useState<FundHolding[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [snapshots, setSnapshots] = useState<{ month: string; total: number }[]>([]);
  const [tab, setTab] = useState<Tab>("概要");

  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [editingStock, setEditingStock] = useState<StockHolding | null>(null);
  const [showFundModal, setShowFundModal] = useState(false);
  const [editingFund, setEditingFund] = useState<FundHolding | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  useEffect(() => {
    // キャッシュで即時表示
    setAssets(getAssets());
    setStocks(getStocks());
    setFunds(getFunds());
    setGoals(getGoals());
    setSnapshots(getSnapshots());
    // Firestoreから最新データを取得してバックグラウンドで更新
    loadAssets().then(setAssets);
    loadStocks().then(setStocks);
    loadFunds().then(setFunds);
    loadGoals().then(setGoals);
    loadSnapshots().then(setSnapshots);
  }, []);

  // ── Totals ────────────────────────────────────────────
  const stocksTotal = stocks.reduce((s, h) => s + h.currentPrice * h.shares, 0);
  const fundsTotal = funds.reduce((s, f) => s + f.currentValue, 0);
  const assetsTotal = assets.reduce((s, a) => s + a.amount, 0);
  const grandTotal = stocksTotal + fundsTotal + assetsTotal;

  const stocksGain = stocks.reduce((s, h) => s + (h.currentPrice - h.purchasePrice) * h.shares, 0);
  const stocksTax = stocks.reduce((s, h) => {
    const gain = (h.currentPrice - h.purchasePrice) * h.shares;
    return s + calcTax(gain, h.accountType);
  }, 0);
  const fundsGain = funds.reduce((s, f) => s + (f.currentValue - f.purchaseAmount), 0);
  const fundsTax = funds.reduce((s, f) => {
    return s + calcTax(f.currentValue - f.purchaseAmount, f.accountType);
  }, 0);

  // Pie data
  const pieData = [
    { name: "株式", value: stocksTotal },
    { name: "投資信託", value: fundsTotal },
    ...Object.entries(
      assets.reduce<Partial<Record<AssetCategory, number>>>((acc, a) => {
        acc[a.category] = (acc[a.category] ?? 0) + a.amount;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value: value as number })),
  ].filter(d => d.value > 0);

  // ── Asset CRUD ────────────────────────────────────────
  const handleSaveAsset = useCallback((data: Omit<Asset, "id" | "updatedAt">) => {
    setAssets(prev => {
      const next = editingAsset
        ? prev.map(a => a.id === editingAsset.id ? { ...a, ...data, updatedAt: new Date().toISOString() } : a)
        : [...prev, { id: Date.now().toString(), ...data, updatedAt: new Date().toISOString() }];
      saveAssets(next);
      return next;
    });
    setShowAssetModal(false); setEditingAsset(null);
  }, [editingAsset]);

  const handleDeleteAsset = useCallback((id: string) => {
    setAssets(prev => { const next = prev.filter(a => a.id !== id); saveAssets(next); return next; });
  }, []);

  // ── Stock CRUD ────────────────────────────────────────
  const handleSaveStock = useCallback((data: Omit<StockHolding, "id" | "updatedAt">) => {
    setStocks(prev => {
      const next = editingStock
        ? prev.map(s => s.id === editingStock.id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s)
        : [...prev, { id: Date.now().toString(), ...data, updatedAt: new Date().toISOString() }];
      saveStocks(next);
      return next;
    });
    setShowStockModal(false); setEditingStock(null);
  }, [editingStock]);

  const handleDeleteStock = useCallback((id: string) => {
    setStocks(prev => { const next = prev.filter(s => s.id !== id); saveStocks(next); return next; });
  }, []);

  // ── Fund CRUD ─────────────────────────────────────────
  const handleSaveFund = useCallback((data: Omit<FundHolding, "id" | "updatedAt">) => {
    setFunds(prev => {
      const next = editingFund
        ? prev.map(f => f.id === editingFund.id ? { ...f, ...data, updatedAt: new Date().toISOString() } : f)
        : [...prev, { id: Date.now().toString(), ...data, updatedAt: new Date().toISOString() }];
      saveFunds(next);
      return next;
    });
    setShowFundModal(false); setEditingFund(null);
  }, [editingFund]);

  const handleDeleteFund = useCallback((id: string) => {
    setFunds(prev => { const next = prev.filter(f => f.id !== id); saveFunds(next); return next; });
  }, []);

  // ── Goal CRUD ─────────────────────────────────────────
  const handleSaveGoal = useCallback((data: Omit<Goal, "id">) => {
    setGoals(prev => {
      const next = editingGoal
        ? prev.map(g => g.id === editingGoal.id ? { ...g, ...data } : g)
        : [...prev, { id: Date.now().toString(), ...data }];
      saveGoals(next);
      return next;
    });
    setShowGoalModal(false); setEditingGoal(null);
  }, [editingGoal]);

  const handleDeleteGoal = useCallback((id: string) => {
    if (!confirm("この目標を削除しますか？")) return;
    setGoals(prev => { const next = prev.filter(g => g.id !== id); saveGoals(next); return next; });
  }, []);

  // ── Snapshot ──────────────────────────────────────────
  const handleSnapshot = useCallback(() => {
    const month = new Date().toISOString().slice(0, 7);
    setSnapshots(prev => {
      const snap = { month, total: grandTotal };
      const next = prev.find(s => s.month === month)
        ? prev.map(s => s.month === month ? snap : s)
        : [...prev, snap].sort((a, b) => a.month.localeCompare(b.month));
      saveSnapshots(next as Parameters<typeof saveSnapshots>[0]);
      return next;
    });
  }, [grandTotal]);

  // ── Tab add button ────────────────────────────────────
  function renderAddButton() {
    switch (tab) {
      case "株式":
        return (
          <button onClick={() => { setEditingStock(null); setShowStockModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Plus size={15} /> 株式追加
          </button>
        );
      case "投資信託":
        return (
          <button onClick={() => { setEditingFund(null); setShowFundModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            <Plus size={15} /> ファンド追加
          </button>
        );
      case "資産":
        return (
          <button onClick={() => { setEditingAsset(null); setShowAssetModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={15} /> 資産追加
          </button>
        );
      case "目標":
        return (
          <button onClick={() => { setEditingGoal(null); setShowGoalModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus size={15} /> 目標追加
          </button>
        );
      default:
        return null;
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
              <RefreshCw size={15} />
              <span className="hidden sm:inline">記録</span>
            </button>
            <button onClick={() => exportToCSV(assets)} title="CSVエクスポート"
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Download size={15} />
              <span className="hidden sm:inline">CSV</span>
            </button>
            {renderAddButton()}
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 flex gap-1 sm:gap-4 border-t border-gray-50 overflow-x-auto">
          {([
            { key: "概要", icon: <BarChart2 size={14} /> },
            { key: "株式", icon: <TrendingUp size={14} /> },
            { key: "投資信託", icon: <Layers size={14} /> },
            { key: "資産", icon: <Wallet size={14} /> },
            { key: "目標", icon: <Target size={14} /> },
          ] as { key: Tab; icon: React.ReactNode }[]).map(({ key, icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 py-3 px-1 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
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
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Stocks summary */}
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-500">株式</span>
                </div>
                <div className="font-bold text-gray-900">¥{stocksTotal.toLocaleString()}</div>
                <div className={`text-xs mt-0.5 ${stocksGain >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {stocksGain >= 0 ? "+" : ""}{stocksGain.toLocaleString()}円
                </div>
              </div>
              {/* Funds summary */}
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-xs text-gray-500">投資信託</span>
                </div>
                <div className="font-bold text-gray-900">¥{fundsTotal.toLocaleString()}</div>
                <div className={`text-xs mt-0.5 ${fundsGain >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {fundsGain >= 0 ? "+" : ""}{fundsGain.toLocaleString()}円
                </div>
              </div>
              {/* Tax estimate */}
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm col-span-2 sm:col-span-1">
                <div className="text-xs text-gray-500 mb-2">今売ったら税金（概算）</div>
                <div className="font-bold text-orange-600">¥{(stocksTax + fundsTax).toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-0.5">手取り ¥{(grandTotal - stocksTax - fundsTax).toLocaleString()}</div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Wallet size={16} className="text-blue-500" /> 資産構成
                </h3>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                        {pieData.map(({ name }) => (
                          <Cell key={name} fill={CATEGORY_COLOR[name] ?? "#6b7280"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => typeof v === "number" ? `¥${v.toLocaleString()}` : v} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-gray-300 text-sm">データなし</div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <TrendingUp size={16} className="text-green-500" /> 資産推移
                </h3>
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
                    <button onClick={handleSnapshot} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <RefreshCw size={12} /> 今月を記録する
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── 株式 ─────────────────────────────────────── */}
        {tab === "株式" && (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-400">評価額合計</div>
                <div className="font-bold text-gray-900">¥{stocksTotal.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">評価損益</div>
                <div className={`font-bold ${stocksGain >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {stocksGain >= 0 ? "+" : ""}{stocksGain.toLocaleString()}円
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">税引後手取り（概算）</div>
                <div className="font-bold text-gray-700">¥{(stocksTotal - stocksTax).toLocaleString()}</div>
              </div>
              <div className="text-xs text-gray-400 self-end">※税金は特定・一般口座のみ 20.315%</div>
            </div>

            {stocks.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 shadow-sm">
                <TrendingUp size={32} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm">株式保有がありません</p>
                <button onClick={() => { setEditingStock(null); setShowStockModal(true); }}
                  className="mt-3 text-xs text-green-600 hover:underline">最初の銘柄を追加する</button>
              </div>
            ) : (
              <div className="space-y-3">
                {stocks.map(s => (
                  <StockCard key={s.id} stock={s}
                    onEdit={s => { setEditingStock(s); setShowStockModal(true); }}
                    onDelete={handleDeleteStock} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 投資信託 ──────────────────────────────────── */}
        {tab === "投資信託" && (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-400">評価額合計</div>
                <div className="font-bold text-gray-900">¥{fundsTotal.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">評価損益</div>
                <div className={`font-bold ${fundsGain >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {fundsGain >= 0 ? "+" : ""}{fundsGain.toLocaleString()}円
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">月次積立合計</div>
                <div className="font-bold text-purple-700">
                  ¥{funds.reduce((s, f) => s + f.monthlyContribution, 0).toLocaleString()}
                </div>
              </div>
            </div>

            {funds.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 shadow-sm">
                <Layers size={32} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm">投資信託がありません</p>
                <button onClick={() => { setEditingFund(null); setShowFundModal(true); }}
                  className="mt-3 text-xs text-purple-600 hover:underline">最初のファンドを追加する</button>
              </div>
            ) : (
              <div className="space-y-3">
                {funds.map(f => (
                  <FundCard key={f.id} fund={f}
                    onEdit={f => { setEditingFund(f); setShowFundModal(true); }}
                    onDelete={handleDeleteFund} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 資産（現金・その他）──────────────────────── */}
        {tab === "資産" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{assets.length}件 · 合計 ¥{assetsTotal.toLocaleString()}</span>
            </div>
            {assets.length === 0 ? (
              <div className="text-center text-gray-400 py-12">資産がありません</div>
            ) : (
              assets.map(a => (
                <AssetCard key={a.id} asset={a}
                  onEdit={a => { setEditingAsset(a); setShowAssetModal(true); }}
                  onDelete={handleDeleteAsset} />
              ))
            )}
          </div>
        )}

        {/* ── 目標 ─────────────────────────────────────── */}
        {tab === "目標" && (
          <div className="space-y-4">
            {goals.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 shadow-sm">
                <Target size={32} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm">財務目標がありません</p>
                <button onClick={() => { setEditingGoal(null); setShowGoalModal(true); }}
                  className="mt-3 text-xs text-indigo-600 hover:underline">最初の目標を追加する</button>
              </div>
            ) : (
              goals.map(g => (
                <GoalCard key={g.id} goal={g}
                  onEdit={g => { setEditingGoal(g); setShowGoalModal(true); }}
                  onDelete={handleDeleteGoal} />
              ))
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {showAssetModal && (
        <AssetModal asset={editingAsset} onSave={handleSaveAsset}
          onClose={() => { setShowAssetModal(false); setEditingAsset(null); }} />
      )}
      {showStockModal && (
        <StockModal stock={editingStock} onSave={handleSaveStock}
          onClose={() => { setShowStockModal(false); setEditingStock(null); }} />
      )}
      {showFundModal && (
        <FundModal fund={editingFund} onSave={handleSaveFund}
          onClose={() => { setShowFundModal(false); setEditingFund(null); }} />
      )}
      {showGoalModal && (
        <GoalModal goal={editingGoal} totalAssets={grandTotal} onSave={handleSaveGoal}
          onClose={() => { setShowGoalModal(false); setEditingGoal(null); }} />
      )}
    </div>
  );
}
