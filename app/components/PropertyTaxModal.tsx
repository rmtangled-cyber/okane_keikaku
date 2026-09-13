"use client";

import { useState } from "react";
import { PropertyTaxEntry, calcPropertyTax } from "@/lib/types";
import { X } from "lucide-react";

interface Props {
  entry?: PropertyTaxEntry | null;
  onSave: (e: Omit<PropertyTaxEntry, "id" | "updatedAt">) => void;
  onClose: () => void;
}

export default function PropertyTaxModal({ entry, onSave, onClose }: Props) {
  const [name, setName] = useState(() => entry?.name ?? "");
  const [landValue, setLandValue] = useState(() => entry ? String(entry.landValue) : "");
  const [landArea, setLandArea] = useState(() => entry ? String(entry.landArea) : "");
  const [isResidential, setIsResidential] = useState(() => entry?.isResidential ?? true);
  const [buildingValue, setBuildingValue] = useState(() => entry ? String(entry.buildingValue) : "");
  const [hasUrbanTax, setHasUrbanTax] = useState(() => entry?.hasUrbanTax ?? false);
  const [urbanTaxRate, setUrbanTaxRate] = useState(() => entry ? String(entry.urbanTaxRate) : "0.3");
  const [note, setNote] = useState(() => entry?.note ?? "");

  const preview: PropertyTaxEntry | null = (() => {
    const lv = parseFloat(landValue);
    const la = parseFloat(landArea);
    const bv = parseFloat(buildingValue);
    if (!name || isNaN(lv) || isNaN(la) || isNaN(bv)) return null;
    return {
      id: "", name, landValue: lv, landArea: la, isResidential,
      buildingValue: bv, hasUrbanTax, urbanTaxRate: parseFloat(urbanTaxRate) || 0.3,
      note: note || undefined, updatedAt: "",
    };
  })();

  const result = preview ? calcPropertyTax(preview) : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    onSave({
      name,
      landValue: parseFloat(landValue) || 0,
      landArea: parseFloat(landArea) || 0,
      isResidential,
      buildingValue: parseFloat(buildingValue) || 0,
      hasUrbanTax,
      urbanTaxRate: parseFloat(urbanTaxRate) || 0.3,
      note: note || undefined,
    });
  }

  const fmt = (n: number) => n.toLocaleString("ja-JP");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {entry ? "固定資産税を編集" : "固定資産税を追加"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">物件名</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="自宅、別荘 など"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">土地・固定資産税評価額（円）</label>
              <input
                type="number"
                value={landValue}
                onChange={e => setLandValue(e.target.value)}
                placeholder="例: 10000000"
                min={0}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">土地面積（m²）</label>
              <input
                type="number"
                value={landArea}
                onChange={e => setLandArea(e.target.value)}
                placeholder="例: 150"
                min={0}
                step="0.01"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="isResidential"
              type="checkbox"
              checked={isResidential}
              onChange={e => setIsResidential(e.target.checked)}
              className="w-4 h-4 accent-violet-600"
            />
            <label htmlFor="isResidential" className="text-sm text-gray-700">
              住宅用地（小規模住宅用地の軽減措置を適用）
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">建物・固定資産税評価額（円）</label>
            <input
              type="number"
              value={buildingValue}
              onChange={e => setBuildingValue(e.target.value)}
              placeholder="例: 8000000"
              min={0}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="hasUrbanTax"
              type="checkbox"
              checked={hasUrbanTax}
              onChange={e => setHasUrbanTax(e.target.checked)}
              className="w-4 h-4 accent-violet-600"
            />
            <label htmlFor="hasUrbanTax" className="text-sm text-gray-700">都市計画税あり</label>
          </div>

          {hasUrbanTax && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">都市計画税率（%）</label>
              <input
                type="number"
                value={urbanTaxRate}
                onChange={e => setUrbanTaxRate(e.target.value)}
                placeholder="0.3"
                min={0}
                max={0.3}
                step="0.01"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          )}

          {result && (
            <div className="bg-violet-50 rounded-xl p-4 text-sm">
              <p className="font-medium text-violet-800 mb-2">試算結果（年額）</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-700">
                <span>土地・固定資産税</span><span className="text-right">{fmt(result.landFixedTax)} 円</span>
                <span>建物・固定資産税</span><span className="text-right">{fmt(result.buildingFixedTax)} 円</span>
                {hasUrbanTax && <>
                  <span>土地・都市計画税</span><span className="text-right">{fmt(result.landUrbanTax)} 円</span>
                  <span>建物・都市計画税</span><span className="text-right">{fmt(result.buildingUrbanTax)} 円</span>
                </>}
                <span className="font-semibold text-violet-800 border-t border-violet-200 pt-1 mt-1">合計</span>
                <span className="text-right font-semibold text-violet-800 border-t border-violet-200 pt-1 mt-1">{fmt(result.total)} 円</span>
              </div>
            </div>
          )}

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
