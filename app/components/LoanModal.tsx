"use client";

import { useState, useEffect } from "react";
import { LoanPlan, LoanType, LOAN_TYPES } from "@/lib/types";
import { calcEqualPayment, calcAmortization, loanEndYM } from "@/lib/loanCalc";
import { X } from "lucide-react";

interface Props {
  loan?: LoanPlan | null;
  onSave: (l: Omit<LoanPlan, "id" | "updatedAt">) => void;
  onClose: () => void;
}

const LOAN_PRESETS = ["住宅ローン", "カーローン", "教育ローン", "フリーローン", "その他"];

export default function LoanModal({ loan, onSave, onClose }: Props) {
  const [name, setName] = useState("住宅ローン");
  const [principal, setPrincipal] = useState("");
  const [annualRate, setAnnualRate] = useState("1.5");
  const [termYears, setTermYears] = useState("35");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loanType, setLoanType] = useState<LoanType>("元利均等");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (loan) {
      setName(loan.name);
      setPrincipal(String(loan.principal));
      setAnnualRate(String(loan.annualRate));
      setTermYears(String(Math.round(loan.termMonths / 12)));
      setStartDate(loan.startDate);
      setLoanType(loan.loanType);
      setNote(loan.note ?? "");
    }
  }, [loan]);

  const p = parseFloat(principal) || 0;
  const r = parseFloat(annualRate) || 0;
  const termMonths = (parseInt(termYears) || 0) * 12;
  const monthlyPayment = p > 0 && termMonths > 0 ? calcEqualPayment(p, r, termMonths) : 0;
  const endYM = startDate && termMonths > 0 ? loanEndYM(startDate, termMonths) : null;

  let totalInterest = 0;
  let totalPayment = 0;
  if (p > 0 && termMonths > 0) {
    const rows = calcAmortization(p, r, termMonths, loanType);
    totalInterest = rows.reduce((s, row) => s + row.interestPart, 0);
    totalPayment = rows.reduce((s, row) => s + row.payment, 0);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || p <= 0 || termMonths <= 0) return;
    onSave({ name, principal: p, annualRate: r, termMonths, startDate, loanType, note: note || undefined });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {loan ? "ローンを編集" : "ローンを追加"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ローン名</label>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {LOAN_PRESETS.map(preset => (
                <button key={preset} type="button"
                  onClick={() => setName(preset)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${name === preset ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">借入元本（円）</label>
            <input
              type="number"
              value={principal}
              onChange={e => setPrincipal(e.target.value)}
              placeholder="30000000"
              min={0}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">年利（%）</label>
              <input
                type="number"
                value={annualRate}
                onChange={e => setAnnualRate(e.target.value)}
                placeholder="1.5"
                min={0}
                max={50}
                step="0.01"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">返済期間（年）</label>
              <input
                type="number"
                value={termYears}
                onChange={e => setTermYears(e.target.value)}
                placeholder="35"
                min={1}
                max={50}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">返済開始月</label>
              <input
                type="month"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">返済方式</label>
              <div className="flex gap-1 mt-1">
                {LOAN_TYPES.map(t => (
                  <button key={t} type="button"
                    onClick={() => setLoanType(t)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${loanType === t ? "bg-blue-600 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live preview */}
          {p > 0 && termMonths > 0 && (
            <div className="bg-blue-50 rounded-xl p-3 space-y-1.5">
              <div className="text-xs font-semibold text-blue-700 mb-2">返済シミュレーション</div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>{loanType === "元利均等" ? "毎月返済額" : "初月返済額（逓減）"}</span>
                <span className="font-bold text-blue-800">¥{monthlyPayment.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>総利息</span>
                <span>¥{totalInterest.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>総返済額</span>
                <span>¥{totalPayment.toLocaleString()}</span>
              </div>
              {endYM && (
                <div className="flex justify-between text-xs text-gray-600 pt-1 border-t border-blue-200">
                  <span>返済完了予定</span>
                  <span className="font-medium">{endYM.replace("-", "年")}月</span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ（任意）</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="銀行名、ローン番号 など"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              キャンセル
            </button>
            <button type="submit"
              className="flex-1 py-2.5 bg-blue-600 rounded-xl text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
