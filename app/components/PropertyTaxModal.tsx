"use client";

import { useState } from "react";
import { PropertyTaxEntry, calcPropertyTax, calcAcquisitionTax } from "@/lib/types";
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
  const [floorArea, setFloorArea] = useState(() => entry?.floorArea ? String(entry.floorArea) : "");
  const [isNewBuilding, setIsNewBuilding] = useState(() => entry?.isNewBuilding !== false);
  const [isCertifiedHousing, setIsCertifiedHousing] = useState(() => entry?.isCertifiedHousing ?? false);
  const [buildYear, setBuildYear] = useState(() => entry?.buildYear ? String(entry.buildYear) : "");
  const [note, setNote] = useState(() => entry?.note ?? "");

  const previewEntry: PropertyTaxEntry = {
    id: "", name,
    landValue: parseFloat(landValue) || 0,
    landArea: parseFloat(landArea) || 0,
    isResidential,
    buildingValue: parseFloat(buildingValue) || 0,
    hasUrbanTax,
    urbanTaxRate: parseFloat(urbanTaxRate) || 0.3,
    floorArea: parseFloat(floorArea) || undefined,
    isNewBuilding,
    isCertifiedHousing,
    buildYear: buildYear ? parseInt(buildYear) : undefined,
    updatedAt: "",
  };

  const hasValues = !!(parseFloat(landValue) || parseFloat(buildingValue));
  const fixedResult = hasValues ? calcPropertyTax(previewEntry) : null;
  const acqResult = hasValues && parseFloat(floorArea) > 0 ? calcAcquisitionTax(previewEntry) : null;

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
      floorArea: parseFloat(floorArea) || undefined,
      isNewBuilding,
      isCertifiedHousing,
      buildYear: buildYear ? parseInt(buildYear) : undefined,
      note: note || undefined,
    });
  }

  const fmt = (n: number) => n.toLocaleString("ja-JP");

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {entry ? "物件を編集" : "物件を追加"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">物件名</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="自宅、別荘 など" className={inputCls} required />
          </div>

          {/* 固定資産税評価額セクション */}
          <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">固定資産税評価額</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">土地評価額（円）</label>
                <input type="number" value={landValue} onChange={e => setLandValue(e.target.value)}
                  placeholder="例: 10000000" min={0} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">土地面積（m²）</label>
                <input type="number" value={landArea} onChange={e => setLandArea(e.target.value)}
                  placeholder="例: 150" min={0} step="0.01" className={inputCls} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input id="isResidential" type="checkbox" checked={isResidential}
                onChange={e => setIsResidential(e.target.checked)} className="w-4 h-4 accent-violet-600" />
              <label htmlFor="isResidential" className="text-xs text-gray-700">住宅用地（小規模軽減措置を適用）</label>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">建物評価額（円）</label>
              <input type="number" value={buildingValue} onChange={e => setBuildingValue(e.target.value)}
                placeholder="例: 8000000" min={0} className={inputCls} />
            </div>
            <div className="flex items-center gap-2">
              <input id="hasUrbanTax" type="checkbox" checked={hasUrbanTax}
                onChange={e => setHasUrbanTax(e.target.checked)} className="w-4 h-4 accent-violet-600" />
              <label htmlFor="hasUrbanTax" className="text-xs text-gray-700">都市計画税あり</label>
            </div>
            {hasUrbanTax && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">都市計画税率（%）</label>
                <input type="number" value={urbanTaxRate} onChange={e => setUrbanTaxRate(e.target.value)}
                  placeholder="0.3" min={0} max={0.3} step="0.01" className={inputCls} />
              </div>
            )}
          </div>

          {/* 不動産取得税セクション */}
          <div className="bg-amber-50 rounded-xl p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              不動産取得税の軽減計算（任意）
              <span className="ml-1 text-xs font-normal normal-case text-amber-600">延床面積を入力すると試算します</span>
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">延床面積（m²）</label>
              <input type="number" value={floorArea} onChange={e => setFloorArea(e.target.value)}
                placeholder="例: 120（50〜240m²で軽減対象）" min={0} step="0.01" className={inputCls} />
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <input id="isNewBuilding" type="checkbox" checked={isNewBuilding}
                  onChange={e => setIsNewBuilding(e.target.checked)} className="w-4 h-4 accent-violet-600" />
                <label htmlFor="isNewBuilding" className="text-xs text-gray-700">新築</label>
              </div>
              {isNewBuilding && (
                <div className="flex items-center gap-2">
                  <input id="isCertifiedHousing" type="checkbox" checked={isCertifiedHousing}
                    onChange={e => setIsCertifiedHousing(e.target.checked)} className="w-4 h-4 accent-violet-600" />
                  <label htmlFor="isCertifiedHousing" className="text-xs text-gray-700">長期優良住宅（控除1,300万円）</label>
                </div>
              )}
            </div>
            {!isNewBuilding && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">築年（西暦）</label>
                <input type="number" value={buildYear} onChange={e => setBuildYear(e.target.value)}
                  placeholder="例: 2000" min={1950} max={2030} className={inputCls} />
              </div>
            )}
          </div>

          {/* 試算結果 */}
          {(fixedResult || acqResult) && (
            <div className="flex flex-col gap-3">
              {fixedResult && (
                <div className="bg-violet-50 rounded-xl p-4 text-sm">
                  <p className="font-medium text-violet-800 mb-2">固定資産税（年額）</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-700 text-xs">
                    <span>土地・固定資産税</span><span className="text-right">{fmt(fixedResult.landFixedTax)} 円</span>
                    <span>建物・固定資産税</span><span className="text-right">{fmt(fixedResult.buildingFixedTax)} 円</span>
                    {hasUrbanTax && <>
                      <span>土地・都市計画税</span><span className="text-right">{fmt(fixedResult.landUrbanTax)} 円</span>
                      <span>建物・都市計画税</span><span className="text-right">{fmt(fixedResult.buildingUrbanTax)} 円</span>
                    </>}
                    <span className="font-semibold text-violet-800 border-t border-violet-200 pt-1 mt-1">通常年額</span>
                    <span className="text-right font-semibold text-violet-800 border-t border-violet-200 pt-1 mt-1">{fmt(fixedResult.total)} 円</span>
                  </div>
                  {fixedResult.newBuildingQualifies && (
                    <div className="mt-3 pt-3 border-t border-violet-200">
                      <p className="text-xs font-semibold text-green-700 mb-1">
                        🏠 新築軽減適用（最初の{fixedResult.newBuildingReductionYears}年間）
                        <span className="font-normal text-green-600 ml-1">建物分が最大1/2</span>
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-700 text-xs">
                        <span>建物・固定資産税（軽減後）</span><span className="text-right">{fmt(fixedResult.buildingFixedTaxReduced)} 円</span>
                        <span className="font-semibold text-green-700">軽減期間の年額</span>
                        <span className="text-right font-semibold text-green-700">{fmt(fixedResult.totalReduced)} 円</span>
                      </div>
                      {(parseFloat(floorArea) > 120) && (
                        <p className="text-xs text-amber-600 mt-1">※ 延床120m²超の部分は軽減対象外（120m²相当分のみ半額）</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              {acqResult && (
                <div className="bg-amber-50 rounded-xl p-4 text-sm">
                  <p className="font-medium text-amber-800 mb-1">不動産取得税（一時払い）</p>
                  {!acqResult.qualifiesForReduction && (
                    <p className="text-xs text-amber-600 mb-2">⚠ 延床面積が50〜240m²の範囲外のため軽減措置非該当</p>
                  )}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-700 text-xs">
                    <span>建物控除額</span><span className="text-right">{fmt(acqResult.buildingDeduction)} 円</span>
                    <span>建物課税標準</span><span className="text-right">{fmt(acqResult.buildingTaxBase)} 円</span>
                    <span>建物取得税（×3%）</span><span className="text-right">{fmt(acqResult.buildingTax)} 円</span>
                    <span className="text-gray-400">土地取得税（軽減前）</span><span className="text-right text-gray-400">{fmt(acqResult.landBaseTax)} 円</span>
                    <span>土地軽減額</span><span className="text-right">▲{fmt(acqResult.landReduction)} 円</span>
                    <span>土地取得税</span><span className="text-right">{fmt(acqResult.landTax)} 円</span>
                    <span className="font-semibold text-amber-800 border-t border-amber-200 pt-1 mt-1">合計（一時払い）</span>
                    <span className="text-right font-semibold text-amber-800 border-t border-amber-200 pt-1 mt-1">{fmt(acqResult.total)} 円</span>
                  </div>
                  <p className="text-xs text-amber-600 mt-2">※ 土地を先取得後3年以内に住宅を建てた場合は還付申請が必要</p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ（任意）</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              placeholder="備考など" className={inputCls} />
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
