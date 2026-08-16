"use client";

import { StockHolding, calcTax } from "@/lib/types";
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
  onEdit: (s: StockHolding) => void;
  onDelete: (id: string) => void;
}

export default function StockCard({ stock, onEdit, onDelete }: Props) {
  const cost = stock.purchasePrice * stock.shares;
  const currentTotal = stock.currentPrice * stock.shares;
  const gain = currentTotal - cost;
  const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
  const tax = calcTax(gain, stock.accountType);
  const netProceeds = currentTotal - tax;
  const isUp = gain > 0;
  const isDown = gain < 0;

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 ${isUp ? "border-green-100" : isDown ? "border-red-100" : "border-gray-100"}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{stock.ticker}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ACCOUNT_COLORS[stock.accountType]}`}>
              {stock.accountType}
            </span>
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
          <div className="font-medium text-gray-700">¥{stock.purchasePrice.toLocaleString()}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-xs text-gray-400 mb-0.5">現在値</div>
          <div className="font-medium text-gray-700">¥{stock.currentPrice.toLocaleString()}</div>
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
          <div className="font-bold text-gray-900">¥{currentTotal.toLocaleString()}</div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            {isUp ? <TrendingUp size={14} className="text-green-500" /> : isDown ? <TrendingDown size={14} className="text-red-500" /> : <Minus size={14} className="text-gray-400" />}
            <span className={`font-semibold text-sm ${isUp ? "text-green-600" : isDown ? "text-red-600" : "text-gray-500"}`}>
              {isUp ? "+" : ""}{gain.toLocaleString()}円
            </span>
            <span className={`text-xs ${isUp ? "text-green-500" : isDown ? "text-red-500" : "text-gray-400"}`}>
              ({isUp ? "+" : ""}{gainPct.toFixed(1)}%)
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {stock.accountType.startsWith("NISA") || stock.accountType === "iDeCo"
              ? "非課税口座 · 税金 ¥0"
              : gain > 0
                ? `税引後 ¥${netProceeds.toLocaleString()}（税 ¥${tax.toLocaleString()}）`
                : "含み損 · 税金なし"
            }
          </div>
        </div>
      </div>
    </div>
  );
}
