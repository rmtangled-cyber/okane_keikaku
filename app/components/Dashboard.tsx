"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { Plus, TrendingUp, Wallet, Target, RefreshCw, Download, ArrowUpDown, Trash2 } from "lucide-react";

import { Asset, AssetCategory, Goal } from "@/lib/types";
import { getAssets, saveAssets, getGoals, saveGoals, getSnapshots, saveSnapshots, exportToCSV } from "@/lib/storage";
import AssetCard from "./AssetCard";
import AssetModal from "./AssetModal";
import GoalCard from "./GoalCard";
import GoalModal from "./GoalModal";

const COLORS: Record<AssetCategory, string> = {
  "現金・預金": "#3b82f6",
  "株式": "#22c55e",
  "投資信託": "#a855f7",
  "債券": "#eab308",
  "不動産": "#f97316",
  "その他": "#6b7280",
};

type Tab = "概要" | "資産一覧" | "目標";
type SortKey = "amount_desc" | "amount_asc" | "name" | "category" | "updated";

const SORT_LABELS: Record<SortKey, string> = {
  amount_desc: "金額（高い順）",
  amount_asc: "金額（低い順）",
  name: "名前順",
  category: "カテゴリ順",
  updated: "更新日順",
};

export default function Dashboard() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [snapshots, setSnapshots] = useState<{ month: string; total: number }[]>([]);
  const [tab, setTab] = useState<Tab>("概要");
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [filterCategory, setFilterCategory] = useState<AssetCategory | "すべて">("すべて");
  const [sortKey, setSortKey] = useState<SortKey>("amount_desc");
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    setAssets(getAssets());
    setGoals(getGoals());
    setSnapshots(getSnapshots());
  }, []);

  const total = assets.reduce((s, a) => s + a.amount, 0);

  const pieData = Object.entries(
    assets.reduce<Partial<Record<AssetCategory, number>>>((acc, a) => {
      acc[a.category] = (acc[a.category] ?? 0) + a.amount;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Asset save
  const handleSaveAsset = useCallback((data: Omit<Asset, "id" | "updatedAt">) => {
    setAssets(prev => {
      let next: Asset[];
      if (editingAsset) {
        next = prev.map(a => a.id === editingAsset.id ? { ...a, ...data, updatedAt: new Date().toISOString() } : a);
      } else {
        next = [...prev, { id: Date.now().toString(), ...data, updatedAt: new Date().toISOString() }];
      }
      saveAssets(next);
      return next;
    });
    setShowAssetModal(false);
    setEditingAsset(null);
  }, [editingAsset]);

  const handleDeleteAsset = useCallback((id: string) => {
    setAssets(prev => {
      const next = prev.filter(a => a.id !== id);
      saveAssets(next);
      return next;
    });
  }, []);

  // Goal save
  const handleSaveGoal = useCallback((data: Omit<Goal, "id">) => {
    setGoals(prev => {
      let next: Goal[];
      if (editingGoal) {
        next = prev.map(g => g.id === editingGoal.id ? { ...g, ...data } : g);
      } else {
        next = [...prev, { id: Date.now().toString(), ...data }];
      }
      saveGoals(next);
      return next;
    });
    setShowGoalModal(false);
    setEditingGoal(null);
  }, [editingGoal]);

  const handleDeleteGoal = useCallback((id: string) => {
    if (!confirm("この目標を削除しますか？")) return;
    setGoals(prev => {
      const next = prev.filter(g => g.id !== id);
      saveGoals(next);
      return next;
    });
  }, []);

  // Snapshot
  const handleSnapshot = useCallback(() => {
    const month = new Date().toISOString().slice(0, 7);
    setSnapshots(prev => {
      const exists = prev.find(s => s.month === month);
      const snap = { month, total };
      const next = exists ? prev.map(s => s.month === month ? snap : s) : [...prev, snap];
      next.sort((a, b) => a.month.localeCompare(b.month));
      saveSnapshots(next as Parameters<typeof saveSnapshots>[0]);
      return next;
    });
  }, [total]);

  const handleDeleteSnapshot = useCallback((month: string) => {
    setSnapshots(prev => {
      const next = prev.filter(s => s.month !== month);
      saveSnapshots(next as Parameters<typeof saveSnapshots>[0]);
      return next;
    });
  }, []);

  // Sort & filter
  const categories: AssetCategory[] = ["現金・預金", "株式", "投資信託", "債券", "不動産", "その他"];
  const filtered = filterCategory === "すべて" ? assets : assets.filter(a => a.category === filterCategory);
  const sortedAssets = [...filtered].sort((a, b) => {
    switch (sortKey) {
      case "amount_desc": return b.amount - a.amount;
      case "amount_asc": return a.amount - b.amount;
      case "name": return a.name.localeCompare(b.name, "ja");
      case "category": return categories.indexOf(a.category) - categories.indexOf(b.category);
      case "updated": return b.updatedAt.localeCompare(a.updatedAt);
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="text-blue-600" size={24} />
            <h1 className="text-xl font-bold text-gray-900">お金計画</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSnapshot}
              title="今月のスナップショットを記録"
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={15} />
              <span className="hidden sm:inline">記録</span>
            </button>
            <button
              onClick={() => exportToCSV(assets)}
              title="CSVエクスポート"
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download size={15} />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={() => { setEditingAsset(null); setShowAssetModal(true); }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={15} />
              資産追加
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 flex gap-6 border-t border-gray-50">
          {(["概要", "資産一覧", "目標"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t}
              {t === "目標" && goals.length > 0 && (
                <span className="ml-1.5 text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">{goals.length}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Total Banner */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
          <p className="text-sm text-blue-200 mb-1">総資産</p>
          <p className="text-4xl font-bold tracking-tight">¥{total.toLocaleString()}</p>
          <p className="text-xs text-blue-300 mt-2">{new Date().toLocaleDateString("ja-JP")} 現在</p>
        </div>

        {/* 概要タブ */}
        {tab === "概要" && (
          <>
            {/* Stat cards */}
            {pieData.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {pieData
                  .sort((a, b) => (b.value as number) - (a.value as number))
                  .map(({ name, value }) => (
                    <div key={name} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: COLORS[name as AssetCategory] }} />
                        <span className="text-xs text-gray-500">{name}</span>
                      </div>
                      <div className="font-bold text-gray-900">¥{(value as number).toLocaleString()}</div>
                      <div className="text-xs text-gray-400">{total > 0 ? Math.round(((value as number) / total) * 100) : 0}%</div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 shadow-sm">
                資産を追加すると構成が表示されます
              </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pie */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Wallet size={16} className="text-blue-500" /> 資産構成
                </h3>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                        {pieData.map(({ name }) => (
                          <Cell key={name} fill={COLORS[name as AssetCategory]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => typeof v === "number" ? `¥${v.toLocaleString()}` : v} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-gray-300 text-sm">データなし</div>
                )}
              </div>

              {/* Line */}
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
                      <Tooltip formatter={(v) => typeof v === "number" ? `¥${v.toLocaleString()}` : v} labelFormatter={l => `${l}`} />
                      <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="総資産" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-gray-400 text-sm">
                    <span>スナップショットが2件以上あるとグラフ表示されます</span>
                    <button
                      onClick={handleSnapshot}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw size={12} /> 今月を記録する
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Snapshot history */}
            {snapshots.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">月次スナップショット</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {[...snapshots].reverse().map(s => (
                    <div key={s.month} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-gray-500">{s.month}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-800">¥{s.total.toLocaleString()}</span>
                        <button
                          onClick={() => handleDeleteSnapshot(s.month)}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
                          title="削除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* 資産一覧タブ */}
        {tab === "資産一覧" && (
          <div className="space-y-4">
            {/* Filter & Sort row */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-2 flex-wrap flex-1">
                {(["すべて", ...categories] as const).map(c => (
                  <button
                    key={c}
                    onClick={() => setFilterCategory(c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      filterCategory === c ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-full bg-white hover:bg-gray-50 transition-colors"
                >
                  <ArrowUpDown size={12} />
                  {SORT_LABELS[sortKey]}
                </button>
                {showSortMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-20 min-w-36 overflow-hidden">
                    {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => { setSortKey(key); setShowSortMenu(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 transition-colors ${sortKey === key ? "text-blue-600 font-medium" : "text-gray-700"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Summary row */}
            <div className="flex items-center justify-between text-xs text-gray-400 px-1">
              <span>{sortedAssets.length}件</span>
              <span>合計 ¥{sortedAssets.reduce((s, a) => s + a.amount, 0).toLocaleString()}</span>
            </div>

            <div className="space-y-3">
              {sortedAssets.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  {filterCategory === "すべて" ? "資産がありません" : `「${filterCategory}」の資産がありません`}
                </div>
              ) : (
                sortedAssets.map(asset => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    onEdit={a => { setEditingAsset(a); setShowAssetModal(true); }}
                    onDelete={handleDeleteAsset}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* 目標タブ */}
        {tab === "目標" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Target size={16} />
                <span>財務目標の達成状況</span>
              </div>
              <button
                onClick={() => { setEditingGoal(null); setShowGoalModal(true); }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus size={14} />
                目標追加
              </button>
            </div>

            {goals.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 shadow-sm">
                <Target size={32} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm">財務目標がありません</p>
                <button
                  onClick={() => { setEditingGoal(null); setShowGoalModal(true); }}
                  className="mt-3 text-xs text-indigo-600 hover:underline"
                >
                  最初の目標を追加する
                </button>
              </div>
            ) : (
              goals.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={g => { setEditingGoal(g); setShowGoalModal(true); }}
                  onDelete={handleDeleteGoal}
                />
              ))
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {showAssetModal && (
        <AssetModal
          asset={editingAsset}
          onSave={handleSaveAsset}
          onClose={() => { setShowAssetModal(false); setEditingAsset(null); }}
        />
      )}
      {showGoalModal && (
        <GoalModal
          goal={editingGoal}
          totalAssets={total}
          onSave={handleSaveGoal}
          onClose={() => { setShowGoalModal(false); setEditingGoal(null); }}
        />
      )}

      {/* Close sort menu on outside click */}
      {showSortMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
      )}
    </div>
  );
}
