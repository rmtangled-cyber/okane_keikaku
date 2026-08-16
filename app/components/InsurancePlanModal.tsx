"use client";

import { useState, useEffect } from "react";
import { InsurancePlan, InsuranceType, INSURANCE_TYPES } from "@/lib/types";
import { X } from "lucide-react";

interface Props {
  plan?: InsurancePlan | null;
  onSave: (p: Omit<InsurancePlan, "id" | "updatedAt">) => void;
  onClose: () => void;
}

export default function InsurancePlanModal({ plan, onSave, onClose }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<InsuranceType>("医療保険");
  const [premiumMonthly, setPremiumMonthly] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [coverageAmount, setCoverageAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (plan) {
      setName(plan.name);
      setType(plan.type);
      setPremiumMonthly(String(plan.premiumMonthly));
      setStartDate(plan.startDate);
      setHasEndDate(!!plan.endDate);
      setEndDate(plan.endDate ?? "");
      setCoverageAmount(plan.coverageAmount ? String(plan.coverageAmount) : "");
      setNote(plan.note ?? "");
    }
  }, [plan]);

  // Derived stats for preview
  const premium = parseFloat(premiumMonthly) || 0;
  const start = startDate ? new Date(startDate.replace("-", "/") + "/01") : null;
  const end = hasEndDate && endDate ? new Date(endDate.replace("-", "/") + "/01") : null;
  const totalMonths = start && end
    ? Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()))
    : null;
  const totalCost = totalMonths != null ? totalMonths * premium : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pm = parseFloat(premiumMonthly);
    if (!name || isNaN(pm) || pm < 0) return;
    onSave({
      name, type,
      premiumMonthly: pm,
      startDate,
      endDate: hasEndDate && endDate ? endDate : undefined,
      coverageAmount: coverageAmount ? parseFloat(coverageAmount) : undefined,
      note: note || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {plan ? "保険を編集" : "保険を追加"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">保険名</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="〇〇生命 終身医療保険 など"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">保険種別</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as InsuranceType)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {INSURANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">月額保険料（円）</label>
              <input
                type="number"
                value={premiumMonthly}
                onChange={e => setPremiumMonthly(e.target.value)}
                placeholder="3500"
                min={0}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">加入開始月</label>
            <input
              type="month"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <input
                id="hasEndDate"
                type="checkbox"
                checked={hasEndDate}
                onChange={e => setHasEndDate(e.target.checked)}
                className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
              />
              <label htmlFor="hasEndDate" className="text-sm font-medium text-gray-700">
                支払い完了予定月を設定する
              </label>
            </div>
            {hasEndDate && (
              <input
                type="month"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                min={startDate}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            )}
            {!hasEndDate && (
              <p className="text-xs text-gray-400">未設定の場合は終身保険として扱います</p>
            )}
          </div>

          {/* Preview */}
          {premium > 0 && (
            <div className="bg-sky-50 rounded-xl p-3 text-sm space-y-1">
              <div className="text-xs font-semibold text-sky-700 mb-1.5">支払いシミュレーション</div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>月額保険料</span>
                <span>¥{premium.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>年間保険料</span>
                <span>¥{(premium * 12).toLocaleString()}</span>
              </div>
              {totalMonths != null && totalCost != null && (
                <>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>支払い期間</span>
                    <span>{totalMonths}ヶ月（{(totalMonths / 12).toFixed(1)}年）</span>
                  </div>
                  <div className="flex justify-between font-bold text-sky-700 pt-1 border-t border-sky-200">
                    <span>総支払額</span>
                    <span>¥{totalCost.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">保険金額（任意）</label>
            <input
              type="number"
              value={coverageAmount}
              onChange={e => setCoverageAmount(e.target.value)}
              placeholder="10000000"
              min={0}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ（任意）</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="保険証券番号、担当者名 など"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              キャンセル
            </button>
            <button type="submit"
              className="flex-1 py-2.5 bg-sky-600 rounded-xl text-sm font-medium text-white hover:bg-sky-700 transition-colors">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
