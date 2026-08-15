"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { Plus, TrendingUp, Wallet, Target, RefreshCw } from "lucide-react";

import { Asset, AssetCategory, Goal } from "@/lib/types";
import { getAssets, saveAssets, getGoals, getSnapshots, saveSnapshots } from "@/lib/storage";
import AssetCard from "./AssetCard";
import AssetModal from "./AssetModal";
import GoalCard from "./GoalCard";

const COLORS: Record<AssetCategory, string> = {
  "現金・預金": "#3b82f6",
  "株式": "#22c55e",
  "投資信託": "#a855f7",
  "債券": "#eab308",
  "不動産": "#f97316",
  "その他": "#6b7280",
};

type Tab = "概要" | "資産一覧" | "目標";

export default function Dashboard() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [snapshots, setSnapshots] = useState<{ month: string; total: number }[]>([]);
  const [tab, setTab] = useState<Tab>("概要");
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [filterCategory, setFilterCategory] = useState<AssetCategory | "すべて">("すべて");

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

  const handleSave = useCallback((data: Omit<Asset, "id" | "updatedAt">) => {
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
    setShowModal(false);
    setEditingAsset(null);
  }, [editingAsset]);

  const handleDelete = useCallback((id: string) => {
    setAssets(prev => {
      const next = prev.filter(a => a.id !== id);
      saveAssets(next);
      return next;
    });
  }, []);

  const handleSnapshot = useCallback(() => {
    const month = new Date().toISOString().slice(0, 7);
    setSnapshots(prev => {
      const exists = prev.find(s => s.month === month);
      const snap = { month, total };
      const next = exists ? prev.map(s => s.month === month ? snap : s) : [...prev, snap];
      saveSnapshots(next as Parameters<typeof saveSnapshots>[0]);
      return next;
    });
  }, [total]);

  const categories: AssetCategory[] = ["現金・預金", "株式", "投資信託", "債券", "不動産", "その他"];
  const filteredAssets = filterCategory === "すべて" ? assets : assets.filter(a => a.category === filterCategory);

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
              onClick={() => { setEditingAsset(null); setShowModal(true); }}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {pieData.map(({ name, value }) => (
                <div key={name} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: COLORS[name as AssetCategory] }} />
                    <span className="text-xs text-gray-500">{name}</span>
                  </div>
                  <div className="font-bold text-gray-900">¥{(value as number).toLocaleString()}</div>
                  <div className="text-xs text-gray-400">{Math.round(((value as number) / total) * 100)}%</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pie */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Wallet size={16} className="text-blue-500" /> 資産構成
                </h3>
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
              </div>

              {/* Line */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <TrendingUp size={16} className="text-green-500" /> 資産推移
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={snapshots.slice(-12)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 10000).toFixed(0)}万`} />
                    <Tooltip formatter={(v) => typeof v === "number" ? `¥${v.toLocaleString()}` : v} labelFormatter={l => `${l}`} />
                    <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={false} name="総資産" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* 資産一覧タブ */}
        {tab === "資産一覧" && (
          <div className="space-y-4">
            {/* Category filter */}
            <div className="flex gap-2 flex-wrap">
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
            <div className="space-y-3">
              {filteredAssets.length === 0 ? (
                <div className="text-center text-gray-400 py-12">資産がありません</div>
              ) : (
                filteredAssets.map(asset => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    onEdit={a => { setEditingAsset(a); setShowModal(true); }}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* 目標タブ */}
        {tab === "目標" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Target size={16} />
              <span>財務目標の達成状況</span>
            </div>
            {goals.map(goal => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <AssetModal
          asset={editingAsset}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingAsset(null); }}
        />
      )}
    </div>
  );
}
