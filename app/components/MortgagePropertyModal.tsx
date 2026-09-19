"use client";

import { useState } from "react";
import { X, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import type { MortgageProperty, PropertyCostItem, PrepaymentEntry } from "../../lib/types";

export interface BorrowerOption {
  id: "self" | "spouse";
  label: string;
}

interface Props {
  property?: MortgageProperty | null;
  borrowerOptions?: BorrowerOption[];
  currentBaseRate?: string;
  onSave: (p: MortgageProperty) => void;
  onClose: () => void;
}

export default function MortgagePropertyModal({ property, borrowerOptions, currentBaseRate, onSave, onClose }: Props) {
  const [propertyName, setPropertyName] = useState(property?.propertyName ?? "");
  const [borrowerId, setBorrowerId] = useState<"self" | "spouse" | "">(property?.borrowerId ?? "self");
  const [bankName, setBankName] = useState(property?.bankName ?? "");
  const [isFixed, setIsFixed] = useState(property?.isFixed ?? false);
  const [discountRate, setDiscountRate] = useState(property?.discountRate ?? "1.4");
  const [bankRate, setBankRate] = useState(property?.bankRate ?? "1.5");
  const [termYears, setTermYears] = useState(property?.termYears ?? "35");
  const [note, setNote] = useState(property?.note ?? "");
  const [bonusRepaymentMan, setBonusRepaymentMan] = useState(
    property?.bonusRepaymentMan ? String(property.bonusRepaymentMan) : ""
  );
  const [costItems, setCostItems] = useState<PropertyCostItem[]>(
    property?.costItems?.length
      ? property.costItems
      : [{ id: `ci_${Date.now()}`, name: "", date: "", amountMan: 0 }]
  );
  const [prepayments, setPrepayments] = useState<PrepaymentEntry[]>(
    property?.prepayments ?? []
  );
  const [showPrepayPlan, setShowPrepayPlan] = useState(false);

  function addCostItem() {
    setCostItems(prev => [...prev, { id: `ci_${Date.now()}`, name: "", date: "", amountMan: 0 }]);
  }

  function updateCostItem(id: string, field: keyof PropertyCostItem, value: string | number) {
    setCostItems(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  }

  function removeCostItem(id: string) {
    setCostItems(prev => prev.filter(c => c.id !== id));
  }

  function addPrepayment() {
    const last = prepayments[prepayments.length - 1];
    const lastYear = parseInt(last?.fromYear ?? "0") || 0;
    const nextYear = Math.max(lastYear + 5, 5);
    setPrepayments(prev => [...prev, { id: `pp_${Date.now()}`, fromYear: String(nextYear), extra: "" }]);
  }

  function updatePrepayment(id: string, field: keyof PrepaymentEntry, val: string) {
    setPrepayments(prev => prev.map(pp => pp.id === id ? { ...pp, [field]: val } : pp));
  }

  function removePrepayment(id: string) {
    setPrepayments(prev => prev.filter(pp => pp.id !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!propertyName.trim()) return;
    const validItems = costItems.filter(c => c.name.trim() && c.amountMan > 0);
    const validPrepayments = prepayments.filter(pp => parseFloat(pp.extra) > 0 && parseInt(pp.fromYear) >= 1);
    const bonus = parseFloat(bonusRepaymentMan);
    onSave({
      id: property?.id ?? `prop_${Date.now()}`,
      propertyName: propertyName.trim(),
      borrowerId: borrowerId || undefined,
      bankName: bankName.trim() || undefined,
      bankRate: isFixed ? (bankRate || undefined) : undefined,
      discountRate: !isFixed ? (discountRate || undefined) : undefined,
      isFixed: isFixed || undefined,
      termYears: termYears || undefined,
      rateChanges: undefined,
      prepayments: validPrepayments.length > 0 ? validPrepayments : undefined,
      costItems: validItems,
      bonusRepaymentMan: bonus > 0 ? bonus : undefined,
      note: note || undefined,
      updatedAt: new Date().toISOString(),
    });
  }

  const totalMan = costItems.reduce((s, c) => s + (Number(c.amountMan) || 0), 0);
  const termYearsNum = parseInt(termYears) || 35;
  const inputCls = "border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400";

  const computedRate = !isFixed && currentBaseRate && discountRate
    ? (parseFloat(currentBaseRate) - parseFloat(discountRate))
    : null;

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

          {/* 借入名義人 */}
          {borrowerOptions && borrowerOptions.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">借入名義人</label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                {borrowerOptions.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setBorrowerId(opt.id)}
                    className={`flex-1 px-3 py-2 transition-colors first:border-r first:border-gray-200 ${
                      borrowerId === opt.id
                        ? "bg-blue-600 text-white font-medium"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ローン条件 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">ローン条件</label>
            <div className="space-y-2">
              <input
                type="text"
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                placeholder="金融機関名（例: 千葉銀行）"
                className={`w-full ${inputCls}`}
              />

              {/* 変動/固定トグル */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setIsFixed(false)}
                  className={`flex-1 px-3 py-2 transition-colors border-r border-gray-200 ${
                    !isFixed ? "bg-blue-600 text-white font-medium" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  変動金利
                </button>
                <button
                  type="button"
                  onClick={() => setIsFixed(true)}
                  className={`flex-1 px-3 py-2 transition-colors ${
                    isFixed ? "bg-blue-600 text-white font-medium" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  固定金利
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {!isFixed ? (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">優遇幅（%）</label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">−</span>
                      <input
                        type="number"
                        value={discountRate}
                        step="0.025"
                        onChange={e => setDiscountRate(e.target.value)}
                        placeholder="1.4"
                        className={`flex-1 text-right ${inputCls}`}
                      />
                      <span className="text-xs text-gray-500">%</span>
                    </div>
                    {computedRate !== null && computedRate > 0 && (
                      <div className="mt-1 text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
                        現在の適用金利: <strong>{computedRate.toFixed(3)}%</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">固定金利（%）</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={bankRate}
                        step="0.025"
                        onChange={e => setBankRate(e.target.value)}
                        placeholder="1.5"
                        className={`flex-1 text-right ${inputCls}`}
                      />
                      <span className="text-xs text-gray-500">%</span>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">返済期間</label>
                  <select
                    value={termYears}
                    onChange={e => setTermYears(e.target.value)}
                    className={`w-full ${inputCls}`}
                  >
                    {[20, 25, 30, 35, 40, 45].map(y => <option key={y} value={y}>{y}年</option>)}
                  </select>
                </div>
              </div>
            </div>
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

          {/* 繰り上げ返済プラン */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPrepayPlan(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="text-xs font-medium text-gray-600">
                繰り上げ返済プラン（任意）
                {prepayments.length > 0 && (
                  <span className="ml-2 text-blue-500">{prepayments.length}件</span>
                )}
              </span>
              {showPrepayPlan ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </button>
            {showPrepayPlan && (
              <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                <p className="text-xs text-gray-400 mb-3">繰り上げ返済を行う年と金額を設定できます</p>
                {prepayments.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {prepayments.map(pp => {
                      const beyondTerm = (parseInt(pp.fromYear) || 0) > termYearsNum;
                      return (
                        <div key={pp.id} className={`flex items-center gap-2 ${beyondTerm ? "opacity-50" : ""}`}>
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              value={pp.fromYear}
                              min={1}
                              max={termYearsNum}
                              onChange={e => updatePrepayment(pp.id, "fromYear", e.target.value)}
                              className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                            <span className="text-xs text-gray-500 whitespace-nowrap">年目</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={pp.extra}
                              min={0}
                              step="10"
                              onChange={e => updatePrepayment(pp.id, "extra", e.target.value)}
                              placeholder="100"
                              className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                            <span className="text-xs text-gray-500">万円</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePrepayment(pp.id)}
                            className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  onClick={addPrepayment}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus size={12} />
                  繰り上げ返済を追加
                </button>
              </div>
            )}
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
