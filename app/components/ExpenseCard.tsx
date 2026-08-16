"use client";

import { MonthlyExpense } from "@/lib/types";
import { Pencil, Trash2 } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  "食費": "bg-orange-100 text-orange-700",
  "住居費": "bg-blue-100 text-blue-700",
  "交通費": "bg-cyan-100 text-cyan-700",
  "水道光熱費": "bg-yellow-100 text-yellow-700",
  "通信費": "bg-violet-100 text-violet-700",
  "医療費": "bg-red-100 text-red-700",
  "娯楽費": "bg-pink-100 text-pink-700",
  "教育費": "bg-green-100 text-green-700",
  "保険料": "bg-indigo-100 text-indigo-700",
  "その他": "bg-gray-100 text-gray-700",
};

interface Props {
  expense: MonthlyExpense;
  onEdit: (e: MonthlyExpense) => void;
  onDelete: (id: string) => void;
}

export default function ExpenseCard({ expense, onEdit, onDelete }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[expense.category] ?? "bg-gray-100 text-gray-700"}`}>
            {expense.category}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${expense.isFixed ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-700"}`}>
            {expense.isFixed ? "固定費" : "変動費"}
          </span>
          <span className="text-sm font-medium text-gray-900 truncate">{expense.name}</span>
        </div>
        {expense.note && <p className="text-xs text-gray-400 mt-1 truncate">{expense.note}</p>}
      </div>
      <div className="text-right shrink-0">
        <div className="font-bold text-gray-900">¥{expense.amount.toLocaleString()}</div>
        <div className="text-xs text-gray-400">/ 月</div>
      </div>
      <div className="flex gap-1 shrink-0">
        <button onClick={() => onEdit(expense)}
          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
          <Pencil size={14} />
        </button>
        <button onClick={() => { if (confirm("この支出を削除しますか？")) onDelete(expense.id); }}
          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
