"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import type { MortgageProperty, PropertyCostItem } from "../../lib/types";

interface Props {
  property?: MortgageProperty | null;
  onSave: (p: MortgageProperty) => void;
  onClose: () => void;
}

export default function MortgagePropertyModal({ property, onSave, onClose }: Props) {
  const [propertyName, setPropertyName] = useState(property?.propertyName ?? "");
  const [note, setNote] = useState(property?.note ?? "");
  const [bonusRepaymentMan, setBonusRepaymentMan] = useState(
    property?.bonusRepaymentMan ? String(property.bonusRepaymentMan) : ""
  );
  const [costItems, setCostItems] = useState<PropertyCostItem[]>(
    property?.costItems?.length
      ? property.costItems
      : [{ id: `ci_${Date.now()}`, name: "", date: "", amountMan: 0 }]
  );

  function addCostItem() {
    setCostItems(prev => [...prev, { id: `ci_${Date.now()}`, name: "", date: "", amountMan: 0 }]);
  }

  function updateCostItem(id: string, field: keyof PropertyCostItem, value: string | number) {
    setCostItems(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  }

  function removeCostItem(id: string) {
    setCostItems(prev => prev.filter(c => c.id !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!propertyName.trim()) return;
    const validItems = costItems.filter(c => c.name.trim() && c.amountMan > 0);
    const bonus = parseFloat(bonusRepaymentMan);
    onSave({
      id: property?.id ?? `prop_${Date.now()}`,
      propertyName: propertyName.trim(),
      costItems: validItems,
      bonusRepaymentMan: bonus > 0 ? bonus : undefined,
      note: note || undefined,
      updatedAt: new Date().toISOString(),
    });
  }

  const totalMan = costItems.reduce((s, c) => s + (Number(c.amountMan) || 0), 0);
  const inputCls = "border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {property ? "物件を編集" : "物件を追加"}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 物件名 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              物件名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={propertyName}
              onChange={e => setPropertyName(e.target.value)}
              placeholder="例: ○○マンション 302号室"
              required
              className={`w-full ${inputCls}`}
            />
          </div>

          {/* 費用一覧 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">費用一覧</label>
              {totalMan > 0 && (
                <span className="text-xs text-blue-600 font-medium">合計 {totalMan.toLocaleString()}万円</span>
              )}
            </div>

            <div className="space-y-2">
              {costItems.map((item, idx) => (
                <div key={item.id} className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={e => updateCostItem(item.id, "name", e.target.value)}
                    placeholder="費用名（例: 手付金）"
                    className={`flex-1 min-w-[120px] ${inputCls}`}
                  />
                  <input
                    type="date"
                    value={item.date}
                    onChange={e => updateCostItem(item.id, "date", e.target.value)}
                    className={`w-36 shrink-0 ${inputCls}`}
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      value={item.amountMan || ""}
                      onChange={e => updateCostItem(item.id, "amountMan", parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min={0}
                      className={`w-24 text-right ${inputCls}`}
                    />
                    <span className="text-xs text-gray-500 whitespace-nowrap">万円</span>
                  </div>
                  {/* ローン / 自己資金トグル */}
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden shrink-0 text-xs">
                    <button
                      type="button"
                      onClick={() => updateCostItem(item.id, "paymentType", "loan")}
                      className={`px-2.5 py-1.5 transition-colors ${
                        (item.paymentType ?? "loan") === "loan"
                          ? "bg-blue-600 text-white font-medium"
                          : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      ローン
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCostItem(item.id, "paymentType", "self")}
                      className={`px-2.5 py-1.5 transition-colors border-l border-gray-200 ${
                        item.paymentType === "self"
                          ? "bg-amber-500 text-white font-medium"
                          : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      自己資金
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCostItem(item.id)}
                    disabled={costItems.length === 1 && idx === 0}
                    className="p-1.5 text-gray-300 hover:text-red-500 rounded transition-colors disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addCostItem}
              className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus size={13} />
              費用を追加
            </button>
          </div>

          {/* ボーナス返済額 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              ボーナス返済額（万円/回・任意）
              <span className="ml-1.5 font-normal text-gray-400">年2回（6月・12月）の加算分</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={bonusRepaymentMan}
                onChange={e => setBonusRepaymentMan(e.target.value)}
                placeholder="0"
                min={0}
                className={`w-28 text-right ${inputCls}`}
              />
              <span className="text-xs text-gray-500">万円 × 年2回</span>
              {bonusRepaymentMan && parseFloat(bonusRepaymentMan) > 0 && (
                <span className="text-xs text-blue-500">年間 {(parseFloat(bonusRepaymentMan) * 2).toLocaleString()}万円</span>
              )}
            </div>
          </div>

          {/* メモ */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">メモ（任意）</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="備考など"
              className={`w-full ${inputCls} resize-none`}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              キャンセル
            </button>
            <button type="submit"
              className="flex-1 bg-blue-600 rounded-xl py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
