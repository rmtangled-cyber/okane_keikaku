"use client";

import { useState, useEffect } from "react";
import { Goal } from "@/lib/types";
import { X } from "lucide-react";

interface Props {
  goal?: Goal | null;
  totalAssets: number;
  onSave: (goal: Omit<Goal, "id">) => void;
  onClose: () => void;
}

export default function GoalModal({ goal, totalAssets, onSave, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [note, setNote] = useState("");
  const [useTotal, setUseTotal] = useState(false);

  useEffect(() => {
    if (goal) {
      setTitle(goal.title);
      setTargetAmount(String(goal.targetAmount));
      setCurrentAmount(String(goal.currentAmount));
      setTargetDate(goal.targetDate);
      setNote(goal.note ?? "");
    } else {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setTargetDate(nextYear.toISOString().slice(0, 10));
    }
  }, [goal]);

  useEffect(() => {
    if (useTotal) setCurrentAmount(String(totalAssets));
  }, [useTotal, totalAssets]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const target = parseInt(targetAmount.replace(/,/g, ""), 10);
    const current = parseInt(currentAmount.replace(/,/g, ""), 10);
    if (!title || isNaN(target) || isNaN(current) || !targetDate) return;
    onSave({ title, targetAmount: target, currentAmount: current, targetDate, note: note || undefined });
  }

  const minDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {goal ? "目標を編集" : "目標を追加"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目標名</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例: 住宅購入頭金"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目標金額（円）</label>
            <input
              type="number"
              value={targetAmount}
              onChange={e => setTargetAmount(e.target.value)}
              placeholder="5000000"
              min={1}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">現在の金額（円）</label>
              <label className="flex items-center gap-1.5 text-xs text-indigo-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useTotal}
                  onChange={e => setUseTotal(e.target.checked)}
                  className="rounded"
                />
                総資産を使用（¥{totalAssets.toLocaleString()}）
              </label>
            </div>
            <input
              type="number"
              value={currentAmount}
              onChange={e => { setUseTotal(false); setCurrentAmount(e.target.value); }}
              placeholder="0"
              min={0}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目標日</label>
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              min={minDate}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ（任意）</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="備考など"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-indigo-600 rounded-xl text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
