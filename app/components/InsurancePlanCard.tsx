"use client";

import { InsurancePlan } from "@/lib/types";
import { Pencil, Trash2, ShieldCheck } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  "生命保険": "bg-blue-100 text-blue-700",
  "医療保険": "bg-green-100 text-green-700",
  "がん保険": "bg-red-100 text-red-700",
  "火災保険": "bg-orange-100 text-orange-700",
  "地震保険": "bg-yellow-100 text-yellow-700",
  "車両保険": "bg-cyan-100 text-cyan-700",
  "学資保険": "bg-purple-100 text-purple-700",
  "その他": "bg-gray-100 text-gray-700",
};

function parseYearMonth(ym: string): Date {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

function diffMonths(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

interface Props {
  plan: InsurancePlan;
  onEdit: (p: InsurancePlan) => void;
  onDelete: (id: string) => void;
}

export default function InsurancePlanCard({ plan, onEdit, onDelete }: Props) {
  const now = new Date();
  const nowYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const start = parseYearMonth(plan.startDate);
  const end = plan.endDate ? parseYearMonth(plan.endDate) : null;

  const elapsedMonths = Math.max(0, diffMonths(start, now));
  const totalMonths = end ? diffMonths(start, end) : null;
  const remainingMonths = end ? Math.max(0, diffMonths(now, end)) : null;
  const progressPct = totalMonths && totalMonths > 0
    ? Math.min(100, (elapsedMonths / totalMonths) * 100)
    : null;

  const remainingAmount = remainingMonths != null ? remainingMonths * plan.premiumMonthly : null;
  const alreadyPaid = elapsedMonths * plan.premiumMonthly;
  const isCompleted = end != null && nowYM >= plan.endDate!;

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 ${isCompleted ? "border-green-200 bg-green-50/30" : "border-gray-100"}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2">
          <div className={`mt-0.5 p-1.5 rounded-lg ${isCompleted ? "bg-green-100" : "bg-gray-50"}`}>
            <ShieldCheck size={14} className={isCompleted ? "text-green-600" : "text-gray-400"} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[plan.type] ?? "bg-gray-100 text-gray-700"}`}>
                {plan.type}
              </span>
              {isCompleted && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                  支払い完了
                </span>
              )}
            </div>
            <div className="font-semibold text-gray-900 mt-1">{plan.name}</div>
            {plan.note && <div className="text-xs text-gray-400 mt-0.5">{plan.note}</div>}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onEdit(plan)}
            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => { if (confirm("この保険を削除しますか？")) onDelete(plan.id); }}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 text-sm mb-3">
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-xs text-gray-400 mb-0.5">月額保険料</div>
          <div className="font-bold text-gray-900">¥{plan.premiumMonthly.toLocaleString()}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-xs text-gray-400 mb-0.5">支払い済み</div>
          <div className="font-bold text-gray-700">¥{alreadyPaid.toLocaleString()}</div>
          <div className="text-xs text-gray-400">{elapsedMonths}ヶ月</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-xs text-gray-400 mb-0.5">
            {isCompleted ? "支払い完了" : end ? "残り支払い" : "保険期間"}
          </div>
          {end ? (
            isCompleted ? (
              <div className="font-bold text-green-600">完了</div>
            ) : (
              <>
                <div className="font-bold text-rose-600">¥{(remainingAmount ?? 0).toLocaleString()}</div>
                <div className="text-xs text-gray-400">{remainingMonths}ヶ月</div>
              </>
            )
          ) : (
            <div className="font-bold text-gray-500">終身</div>
          )}
        </div>
      </div>

      {/* Period + progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-gray-400">
          <span>加入 {plan.startDate.replace("-", "年")}月</span>
          {end ? (
            <span>完了予定 {end.getFullYear()}年{end.getMonth() + 1}月</span>
          ) : (
            <span>終身保険</span>
          )}
        </div>
        {progressPct != null && (
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isCompleted ? "bg-green-500" : "bg-blue-500"}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
        {totalMonths && !isCompleted && (
          <div className="text-xs text-gray-400 text-right">
            {Math.round(progressPct ?? 0)}% 完了（全{totalMonths}ヶ月）
          </div>
        )}
      </div>

      {/* Coverage amount */}
      {plan.coverageAmount && (
        <div className="mt-3 pt-2 border-t border-gray-50 flex justify-between text-xs text-gray-500">
          <span>保険金額</span>
          <span className="font-medium text-gray-700">¥{plan.coverageAmount.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
