"use client";

import { StockHolding, calcTax, getCurrencySymbol } from "@/lib/types";
import { Pencil, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";

const ACCOUNT_COLORS: Record<string, string> = {
  "特定口座": "bg-blue-100 text-blue-800",
  "NISA（成長投資枠）": "bg-green-100 text-green-800",
  "NISA（つみたて投資枠）": "bg-emerald-100 text-emerald-800",
  "一般口座": "bg-gray-100 text-gray-800",
  "iDeCo": "bg-purple-100 text-purple-800",
};

interface Props {
  stock: StockHolding;
  memberLabel?: string;
  onEdit: (s: StockHolding) => void;
  onDelete: (id: string) => void;
}

function fmtPrice(price: number, currency: string): string {
  const sym = getCurrencySymbol(currency);
  const isJPY = currency === "JPY";
  const str = isJPY
    ? price.toLocaleString("ja-JP", { maximumFractionDigits: 0 })
    : price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return `${sym}${str}`;
}

function toJPY(amount: number, currency: string, fxRates?: Record<string, number>, legacyRate?: number): number | null {
  if (currency === "JPY") return amount;
  const rate = fxRates?.[currency] ?? (currency === "USD" ? legacyRate : undefined);
  return rate ? amount * rate : null;
}

export default function StockCard({ stock, memberLabel, onEdit, onDelete }: Props) {
  // 旧フィールド currency からの移行
  const legacyCur = stock.currency === "USD" ? "USD" : "JPY";
  const purchaseCur = stock.purchaseCurrency ?? legacyCur;
  const currentCur = stock.currentCurrency ?? legacyCur;
  const fxRates = stock.fxRates;
  const legacyRate = stock.usdJpyRate;

  const purchaseTotalNative = stock.purchasePrice * stock.shares;
  const currentTotalNative = stock.currentPrice * stock.shares;

  // JPY換算
  const purchaseTotalJPY = toJPY(purchaseTotalNative, purchaseCur, fxRates, legacyRate);
  const currentTotalJPY = toJPY(currentTotalNative, currentCur, fxRates, legacyRate);

  // 同一通貨なら native で損益計算
  const sameCurrency = purchaseCur === currentCur;
  const gainNative = sameCurrency ? currentTotalNative - purchaseTotalNative : null;
  const gainPct = gainNative != null && purchaseTotalNative > 0
    ? (gainNative / purchaseTotalNative) * 100
    : null;

  // JPYベースの損益（税計算用）
  const gainJPY = currentTotalJPY != null && purchaseTotalJPY != null
    ? currentTotalJPY - purchaseTotalJPY
    : null;
  const tax = gainJPY != null ? calcTax(gainJPY, stock.accountType) : null;
  const netJPY = currentTotalJPY != null && tax != null ? currentTotalJPY - tax : null;

  const isUp = (gainNative ?? gainJPY ?? 0) > 0;
  const isDown = (gainNative ?? gainJPY ?? 0) < 0;

  const needsRate = purchaseCur !== "JPY" || currentCur !== "JPY";
  const missingRate = needsRate && (currentTotalJPY === null || purchaseTotalJPY === null);

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 ${isUp ? "border-green-100" : isDown ? "border-red-100" : "border-gray-100"}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{stock.ticker}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ACCOUNT_COLORS[stock.accountType]}`}>
              {stock.accountType}
            </span>
            {memberLabel && (
              <span className="text-xs bg-blue-50 text-blue-600 font-medium rounded-full px-2 py-0.5">{memberLabel}</span>
            )}
          </div>
          <span className="font-semibold text-gray-900">{stock.name}</span>
          {stock.note && <span className="text-xs text-gray-400">{stock.note}</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button onClick={() => onEdit(stock)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(stock.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Price info */}
      <div className="grid grid-cols-3 gap-2 text-sm mb-3">
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-xs text-gray-400 mb-0.5">取得単価</div>
          <div className="font-medium text-gray-700">{fmtPrice(stock.purchasePrice, purchaseCur)}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-xs text-gray-400 mb-0.5">現在値</div>
          <div className="font-medium text-gray-700">{fmtPrice(stock.currentPrice, currentCur)}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-xs text-gray-400 mb-0.5">保有株数</div>
          <div className="font-medium text-gray-700">{stock.shares.toLocaleString()}株</div>
        </div>
      </div>

      {/* P&L */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <div>
          <div className="text-xs text-gray-400 mb-0.5">評価額</div>
          <div className="font-bold text-gray-900">{fmtPrice(currentTotalNative, currentCur)}</div>
          {currentCur !== "JPY" && currentTotalJPY != null && (
            <div className="text-xs text-gray-400">≈ ¥{Math.round(currentTotalJPY).toLocaleString()}</div>
          )}
          {missingRate && (
            <div className="text-xs text-orange-400">円換算: 一括取得で更新</div>
          )}
        </div>
        <div className="text-right">
          {gainNative != null && gainPct != null ? (
            <>
              <div className="flex items-center gap-1 justify-end">
                {isUp ? <TrendingUp size={14} className="text-green-500" /> : isDown ? <TrendingDown size={14} className="text-red-500" /> : <Minus size={14} className="text-gray-400" />}
                <span className={`font-semibold text-sm ${isUp ? "text-green-600" : isDown ? "text-red-600" : "text-gray-500"}`}>
                  {isUp ? "+" : ""}{fmtPrice(Math.abs(gainNative), currentCur)}
                </span>
                <span className={`text-xs ${isUp ? "text-green-500" : isDown ? "text-red-500" : "text-gray-400"}`}>
                  ({isUp ? "+" : ""}{gainPct.toFixed(1)}%)
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {stock.accountType.startsWith("NISA") || stock.accountType === "iDeCo"
                  ? "非課税口座 · 税金 ¥0"
                  : missingRate
                    ? "税計算: 一括取得後に表示"
                    : gainJPY != null && gainJPY > 0 && tax != null && netJPY != null
                      ? `税引後 ¥${Math.round(netJPY).toLocaleString()}（税 ¥${tax.toLocaleString()}）`
                      : "含み損 · 税金なし"
                }
              </div>
            </>
          ) : gainJPY != null ? (
            <>
              <div className="flex items-center gap-1 justify-end">
                {isUp ? <TrendingUp size={14} className="text-green-500" /> : isDown ? <TrendingDown size={14} className="text-red-500" /> : <Minus size={14} className="text-gray-400" />}
                <span className={`font-semibold text-sm ${isUp ? "text-green-600" : isDown ? "text-red-600" : "text-gray-500"}`}>
                  {isUp ? "+" : ""}¥{Math.abs(Math.round(gainJPY)).toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">JPY換算損益</div>
            </>
          ) : (
            <div className="text-xs text-orange-400">一括取得でFXレートを更新</div>
          )}
        </div>
      </div>
    </div>
  );
}
