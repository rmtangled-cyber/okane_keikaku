"use client";

import { LifeEvent } from "@/lib/types";
import { Pencil, Trash2, Calendar } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  "収入変化": "bg-teal-100 text-teal-700",
  "支出増加": "bg-red-100 text-red-700",
  "支出減少": "bg-green-100 text-green-700",
  "一時支出": "bg-orange-100 text-orange-700",
  "一時収入": "bg-blue-100 text-blue-700",
  "その他": "bg-gray-100 text-gray-700",
};

interface Props {
  event: LifeEvent;
  onEdit: (e: LifeEvent) => void;
  onDelete: (id: string) => void;
}

export default function LifeEventCard({ event, onEdit, onDelete }: Props) {
  const hasMonthly = event.monthlyAmountChange !== 0;
  const hasOneTime = event.oneTimeAmount !== 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
        <Calendar size={16} className="text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[event.type] ?? "bg-gray-100 text-gray-700"}`}>
            {event.type}
          </span>
          <span className="text-sm font-medium text-gray-900">{event.title}</span>
        </div>
        <div className="flex gap-3 mt-1 text-xs text-gray-500 flex-wrap">
          <span className="font-medium">{event.year}年〜</span>
          {hasMonthly && (
            <span className={event.monthlyAmountChange > 0 ? "text-green-600" : "text-red-600"}>
              月次 {event.monthlyAmountChange > 0 ? "+" : ""}{event.monthlyAmountChange.toLocaleString()}円
            </span>
          )}
          {hasOneTime && (
            <span className={event.oneTimeAmount > 0 ? "text-blue-600" : "text-orange-600"}>
              一時金 {event.oneTimeAmount > 0 ? "+" : ""}{event.oneTimeAmount.toLocaleString()}円
            </span>
          )}
        </div>
        {event.note && <p className="text-xs text-gray-400 mt-0.5 truncate">{event.note}</p>}
      </div>
      <div className="flex gap-1 shrink-0">
        <button onClick={() => onEdit(event)}
          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
          <Pencil size={14} />
        </button>
        <button onClick={() => { if (confirm("このイベントを削除しますか？")) onDelete(event.id); }}
          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
