"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { MortgageProperty, DrawdownEntry } from "../../lib/types";

interface Props {
  property?: MortgageProperty | null;
  drawdowns: DrawdownEntry[];
  onSave: (p: MortgageProperty) => void;
  onClose: () => void;
}

export default function MortgagePropertyModal({ property, drawdowns, onSave, onClose }: Props) {
  const [form, setForm] = useState({
    propertyName: property?.propertyName ?? "",
    contractDate: property?.contractDate ?? "",
    priceTotalMan: property?.priceTotalMan ?? "",
    depositMan: property?.depositMan ?? "",
    midPaymentMan: property?.midPaymentMan ?? "",
    finalSettlementDate: property?.finalSettlementDate ?? "",
    miscCostMan: property?.miscCostMan ?? "",
    paymentLinks: property?.paymentLinks ?? {} as NonNullable<MortgageProperty["paymentLinks"]>,
    note: property?.note ?? "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.propertyName) return;
    onSave({
      ...form,
      id: property?.id ?? `prop_${Date.now()}`,
      updatedAt: new Date().toISOString(),
    });
  }

  const price = parseFloat(form.priceTotalMan) || 0;
  const dep = parseFloat(form.depositMan) || 0;
  const mid = parseFloat(form.midPaymentMan) || 0;
  const misc = parseFloat(form.miscCostMan) || 0;
  const balance = Math.max(0, price - dep - mid);

  type PayKey = keyof NonNullable<MortgageProperty["paymentLinks"]>;
  const allPayments: { key: PayKey; label: string; amount: number; date?: string }[] = ([
    { key: "deposit" as PayKey, label: "手付金", amount: dep, date: form.contractDate || undefined },
    { key: "midPayment" as PayKey, label: "中間金", amount: mid },
    { key: "finalSettlement" as PayKey, label: "残金決済", amount: balance, date: form.finalSettlementDate || undefined },
    { key: "miscCost" as PayKey, label: "諸費用", amount: misc },
  ] as { key: PayKey; label: string; amount: number; date?: string }[]).filter(p => p.amount > 0);

  const ddOptions = [...drawdowns].filter(d => d.date).sort((a, b) => a.date.localeCompare(b.date));
  const links = form.paymentLinks ?? {};

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400";

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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">物件名 <span className="text-red-500">*</span></label>
            <input type="text" value={form.propertyName} placeholder="例: ○○マンション 302号室" required
              onChange={e => setForm(f => ({ ...f, propertyName: e.target.value }))}
              className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">契約日</label>
              <input type="date" value={form.contractDate ?? ""}
                onChange={e => setForm(f => ({ ...f, contractDate: e.target.value }))}
                className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">物件価格（万円）</label>
              <input type="number" value={form.priceTotalMan} placeholder="4500" min={0}
                onChange={e => setForm(f => ({ ...f, priceTotalMan: e.target.value }))}
                className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">手付金（万円）</label>
              <input type="number" value={form.depositMan} placeholder="450" min={0}
                onChange={e => setForm(f => ({ ...f, depositMan: e.target.value }))}
                className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">中間金（万円）</label>
              <input type="number" value={form.midPaymentMan} placeholder="0" min={0}
                onChange={e => setForm(f => ({ ...f, midPaymentMan: e.target.value }))}
                className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">残金決済日</label>
              <input type="date" value={form.finalSettlementDate ?? ""}
                onChange={e => setForm(f => ({ ...f, finalSettlementDate: e.target.value }))}
                className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">諸費用（万円）</label>
              <input type="number" value={form.miscCostMan} placeholder="150" min={0}
                onChange={e => setForm(f => ({ ...f, miscCostMan: e.target.value }))}
                className={inputCls} />
            </div>
          </div>

          {allPayments.length > 0 && (
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">支払いスケジュール（融資実行日との紐づけ）</div>
              <div className="divide-y divide-gray-50">
                {allPayments.map(p => (
                  <div key={p.key} className="flex items-center gap-2 px-3 py-2">
                    <div className="w-24 shrink-0">
                      <div className="text-xs font-medium text-gray-700">{p.label}</div>
                      {p.date && <div className="text-xs text-gray-400 mt-0.5">{p.date}</div>}
                    </div>
                    <div className="text-xs font-semibold text-gray-800 w-20 text-right shrink-0">
                      ¥{p.amount.toLocaleString()}万
                    </div>
                    <div className="flex-1 min-w-0">
                      <select
                        value={links[p.key] ?? ""}
                        onChange={e => setForm(f => ({
                          ...f,
                          paymentLinks: { ...(f.paymentLinks ?? {}), [p.key]: e.target.value || undefined },
                        }))}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        <option value="">— 紐づけない —</option>
                        {ddOptions.map(d => (
                          <option key={d.id} value={d.id}>{d.date}{d.label ? `（${d.label}）` : ""}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-800">
                  <span>合計（諸費用込み）</span>
                  <span>¥{(price + misc).toLocaleString()}万</span>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">メモ</label>
            <textarea value={form.note ?? ""} rows={2} placeholder="備考など"
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
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
