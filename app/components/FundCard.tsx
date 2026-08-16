"use client";

import { FundHolding, calcTax, calcFutureValue } from "@/lib/types";
import { Pencil, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";

const ACCOUNT_COLORS: Record<string, string> = {
  "特定口座": "bg-blue-100 text-blue-800",
  "NISA（成長投資枠）": "bg-green-100 text-green-800",
  "NISA（つみたて投資枠）": "bg-emerald-100 text-emerald-800",
  "一般口座": "bg-gray-100 text-gray-800",
  "iDeCo": "bg-purple-100 text-purple-800",
};

const PROJECTION_YEARS = [5, 10, 20, 30];

interface Props {
  fund: FundHolding;
  onEdit: (f: FundHolding) => void;
  onDelete: (id: string) => void;
}

export default function FundCard({ fund, onEdit, onDelete }: Props) {
  const gain = fund.currentValue - fund.purchaseAmount;
  const gainPct = fund.purchaseAmount > 0 ? (gain / fund.purchaseAmount) * 100 : 0;
  const tax = calcTax(gain, fund.accountType);
  const netProceeds = fund.currentValue - tax;
  const isUp = gain > 0;
  const isDown = gain < 0;

  const projections = PROJECTION_YEARS.map(y => ({
    years: y,
    value: calcFutureValue(fund.currentValue, fund.expectedAnnualReturn, fund.monthlyContribution, y),
  }));

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 ${isUp ? "border-green-100" : isDown ? "border-red-100" : "border-gray-100"}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-col gap-1">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${ACCOUNT_COLORS[fund.accountType]}`}>
            {fund.accountType}
          </span>
          <span className="font-semibold text-gray-900">{fund.name}</span>
          {fund.note && <span className="text-xs text-gray-400">{fund.note}</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button onClick={() => onEdit(fund)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(fund.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Values */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-xs text-gray-400 mb-0.5">取得金額</div>
          <div className="font-medium text-gray-700">¥{fund.purchaseAmount.toLocaleString()}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-xs text-gray-400 mb-0.5">現在評価額</div>
          <div className="font-bold text-gray-900">¥{fund.currentValue.toLocaleString()}</div>
        </div>
      </div>

      {/* P&L */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50 mb-3">
        <div className="flex items-center gap-1">
          {isUp ? <TrendingUp size={14} className="text-green-500" /> : isDown ? <TrendingDown size={14} className="text-red-500" /> : <Minus size={14} className="text-gray-400" />}
          <span className={`font-semibold text-sm ${isUp ? "text-green-600" : isDown ? "text-red-600" : "text-gray-500"}`}>
            {isUp ? "+" : ""}{gain.toLocaleString()}円
          </span>
          <span className={`text-xs ${isUp ? "text-green-500" : isDown ? "text-red-500" : "text-gray-400"}`}>
            ({isUp ? "+" : ""}{gainPct.toFixed(1)}%)
          </span>
        </div>
        <div className="text-xs text-gray-400 text-right">
          {fund.accountType.startsWith("NISA") || fund.accountType === "iDeCo"
            ? "非課税 · 税金 ¥0"
            : gain > 0
              ? `税引後 ¥${netProceeds.toLocaleString()}`
              : "含み損 · 税金なし"
          }
        </div>
      </div>

      {/* Projection */}
      <div className="bg-indigo-50 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-indigo-700">将来予測（年利 {fund.expectedAnnualReturn}%）</span>
          {fund.monthlyContribution > 0 && (
            <span className="text-xs text-indigo-500">月積立 ¥{fund.monthlyContribution.toLocaleString()}</span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {projections.map(({ years, value }) => (
            <div key={years} className="bg-white rounded-lg p-2 text-center">
              <div className="text-xs text-gray-400">{years}年後</div>
              <div className="text-xs font-bold text-indigo-700">
                {value >= 100000000
                  ? `${(value / 100000000).toFixed(1)}億`
                  : `${Math.round(value / 10000)}万`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
