"use client";

import { useState, useEffect } from "react";
import { MonthlyExpense, ExpenseCategory, EXPENSE_CATEGORIES } from "@/lib/types";
import { X } from "lucide-react";

interface Props {
  expense?: MonthlyExpense | null;
  onSave: (e: Omit<MonthlyExpense, "id" | "updatedAt">) => void;
  onClose: () => void;
}

export default function ExpenseModal({ expense, onSave, onClose }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("その他");
  const [amount, setAmount] = useState("");
  const [isFixed, setIsFixed] = useState(true);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (expense) {
      setName(expense.name);
      setCategory(expense.category);
      setAmount(String(expense.amount));
      setIsFixed(expense.isFixed);
      setNote(expense.note ?? "");
    }
  }, [expense]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!name || isNaN(amt) || amt < 0) return;
    onSave({ name, category, amount: amt, isFixed, note: note || undefined });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {expense ? "支出を編集" : "支出を追加"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">支出名</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="家賃、食費 など"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ExpenseCategory)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">種別</label>
              <div className="flex gap-2 mt-1">
                <button type="button"
                  onClick={() => setIsFixed(true)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${isFixed ? "bg-slate-700 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  固定費
                </button>
                <button type="button"
                  onClick={() => setIsFixed(false)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${!isFixed ? "bg-amber-500 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  変動費
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">月額（円）</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="50000"
              min={0}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
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
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              キャンセル
            </button>
            <button type="submit"
              className="flex-1 py-2.5 bg-rose-600 rounded-xl text-sm font-medium text-white hover:bg-rose-700 transition-colors">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
