"use client";

import { useState, useEffect } from "react";
import { LifeEvent, LifeEventType } from "@/lib/types";
import { X } from "lucide-react";

const EVENT_TYPES: LifeEventType[] = [
  "収入変化", "支出増加", "支出減少", "一時支出", "一時収入", "その他",
];

interface Props {
  event?: LifeEvent | null;
  onSave: (e: Omit<LifeEvent, "id" | "updatedAt">) => void;
  onClose: () => void;
}

export default function LifeEventModal({ event, onSave, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [type, setType] = useState<LifeEventType>("収入変化");
  const [monthlyChange, setMonthlyChange] = useState("");
  const [oneTime, setOneTime] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setYear(String(event.year));
      setType(event.type);
      setMonthlyChange(String(event.monthlyAmountChange));
      setOneTime(String(event.oneTimeAmount));
      setNote(event.note ?? "");
    }
  }, [event]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) return;
    onSave({
      title,
      year: parseInt(year) || new Date().getFullYear(),
      type,
      monthlyAmountChange: parseFloat(monthlyChange) || 0,
      oneTimeAmount: parseFloat(oneTime) || 0,
      note: note || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {event ? "イベントを編集" : "ライフイベントを追加"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">イベント名</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="転職、結婚、住宅購入 など"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">発生年</label>
              <input
                type="number"
                value={year}
                onChange={e => setYear(e.target.value)}
                placeholder={String(new Date().getFullYear() + 5)}
                min={2020}
                max={2100}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">種別</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as LifeEventType)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              月次収支への影響（円）
              <span className="ml-1 text-xs font-normal text-gray-400">収入増 +、支出増 −</span>
            </label>
            <input
              type="number"
              value={monthlyChange}
              onChange={e => setMonthlyChange(e.target.value)}
              placeholder="例: 50000（収入増）、-30000（支出増）"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              一時金（円）
              <span className="ml-1 text-xs font-normal text-gray-400">受取 +、支払 −</span>
            </label>
            <input
              type="number"
              value={oneTime}
              onChange={e => setOneTime(e.target.value)}
              placeholder="例: -5000000（住宅頭金）、1000000（相続）"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ（任意）</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="備考など"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              キャンセル
            </button>
            <button type="submit"
              className="flex-1 py-2.5 bg-violet-600 rounded-xl text-sm font-medium text-white hover:bg-violet-700 transition-colors">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
