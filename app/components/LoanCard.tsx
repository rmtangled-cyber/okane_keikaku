"use client";

import { LoanPlan } from "@/lib/types";
import { calcEqualPayment, calcAmortization, loanEndYM, loanCurrentStatus } from "@/lib/loanCalc";
import { Pencil, Trash2, Home, Car, GraduationCap, CreditCard } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";

const LOAN_ICONS: Record<string, React.ReactNode> = {
  "住宅ローン": <Home size={14} />,
  "カーローン": <Car size={14} />,
  "教育ローン": <GraduationCap size={14} />,
};

interface Props {
  loan: LoanPlan;
  onEdit: (l: LoanPlan) => void;
  onDelete: (id: string) => void;
}

export default function LoanCard({ loan, onEdit, onDelete }: Props) {
  const status = loanCurrentStatus(loan.principal, loan.annualRate, loan.termMonths, loan.loanType, loan.startDate);
  const endYM = loanEndYM(loan.startDate, loan.termMonths);
  const endYear = parseInt(endYM.split("-")[0]);
  const endMonth = parseInt(endYM.split("-")[1]);

  const rows = calcAmortization(loan.principal, loan.annualRate, loan.termMonths, loan.loanType);
  const totalPaid = rows.reduce((s, r) => s + r.payment, 0);
  const totalInterest = rows.reduce((s, r) => s + r.interestPart, 0);

  // Yearly balance for mini chart
  const chartData: { year: number; balance: number }[] = [];
  for (let m = 0; m < rows.length; m += 12) {
    chartData.push({ year: Math.floor(m / 12) + 1, balance: rows[m].balance });
  }
  if (chartData.length > 0) chartData.push({ year: loan.termMonths / 12, balance: 0 });

  const progressPct = loan.termMonths > 0 ? Math.min(100, (status.elapsedMonths / loan.termMonths) * 100) : 0;

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 ${status.isCompleted ? "border-green-200" : "border-gray-100"}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-2">
          <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600 mt-0.5">
            {LOAN_ICONS[loan.name] ?? <CreditCard size={14} />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">{loan.name}</span>
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{loan.loanType}</span>
              {status.isCompleted && (
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">返済完了</span>
              )}
            </div>
            {loan.note && <div className="text-xs text-gray-400 mt-0.5">{loan.note}</div>}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onEdit(loan)}
            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => { if (confirm("このローンを削除しますか？")) onDelete(loan.id); }}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-sm">
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-xs text-gray-400 mb-0.5">借入元本</div>
          <div className="font-bold text-gray-800">¥{loan.principal.toLocaleString()}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-xs text-gray-400 mb-0.5">金利 / 期間</div>
          <div className="font-bold text-gray-800">{loan.annualRate}% / {loan.termMonths / 12}年</div>
        </div>
        <div className={`rounded-lg p-2 ${status.isCompleted ? "bg-green-50" : "bg-blue-50"}`}>
          <div className="text-xs text-gray-400 mb-0.5">{status.isCompleted ? "返済完了" : "今月の返済額"}</div>
          <div className={`font-bold ${status.isCompleted ? "text-green-700" : "text-blue-700"}`}>
            {status.isCompleted ? "完済" : `¥${status.currentPayment.toLocaleString()}`}
          </div>
        </div>
        <div className="bg-orange-50 rounded-lg p-2">
          <div className="text-xs text-gray-400 mb-0.5">残債</div>
          <div className="font-bold text-orange-700">¥{status.balance.toLocaleString()}</div>
          {!status.isCompleted && <div className="text-xs text-gray-400">残{status.remainingMonths}ヶ月</div>}
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1 mb-3">
        <div className="flex justify-between text-xs text-gray-400">
          <span>開始 {loan.startDate.replace("-", "年")}月</span>
          <span>完了予定 {endYear}年{endMonth}月</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${status.isCompleted ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>{Math.round(progressPct)}% 返済済み</span>
          <span>総利息 ¥{totalInterest.toLocaleString()}</span>
        </div>
      </div>

      {/* Mini balance chart */}
      {chartData.length >= 2 && (
        <div className="bg-gray-50 rounded-xl p-2">
          <div className="text-xs text-gray-400 mb-1">残高推移</div>
          <ResponsiveContainer width="100%" height={60}>
            <AreaChart data={chartData} margin={{ top: 2, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id={`loanGrad-${loan.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="year" hide />
              <Tooltip
                formatter={(v) => typeof v === "number" ? `¥${v.toLocaleString()}` : v}
                labelFormatter={l => `${l}年目`}
              />
              <Area type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={1.5}
                fill={`url(#loanGrad-${loan.id})`} name="残高" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Total cost summary */}
      <div className="mt-3 flex justify-between text-xs text-gray-500 border-t border-gray-50 pt-2">
        <span>総返済額 ¥{totalPaid.toLocaleString()}</span>
        <span>うち利息 ¥{totalInterest.toLocaleString()}（{((totalInterest / loan.principal) * 100).toFixed(1)}%）</span>
      </div>
    </div>
  );
}
