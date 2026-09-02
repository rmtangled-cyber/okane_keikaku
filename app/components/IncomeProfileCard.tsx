"use client";

import { IncomeProfile } from "@/lib/types";
import { calcTakeHome } from "@/lib/taxCalc";
import { Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface Props {
  profile: IncomeProfile;
  onEdit: (p: IncomeProfile) => void;
  onDelete: (id: string) => void;
}

export default function IncomeProfileCard({ profile, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const bonusAnnual = profile.bonusAnnual ?? 0;
  const annualBase = profile.grossAnnual ?? profile.grossMonthly * 12; // ボーナス込み年収
  // 月次給与 = (年収 - ボーナス) / 12 で社保・税計算
  const grossMonthly = profile.grossAnnual
    ? Math.round((profile.grossAnnual - bonusAnnual) / 12)
    : profile.grossMonthly;
  const result = calcTakeHome(grossMonthly, profile.prefecture, profile.age, profile.dependents);
  const bonusNet = bonusAnnual > 0 && grossMonthly > 0
    ? Math.round(bonusAnnual * (result.takeHome / grossMonthly))
    : 0;
  const annualTakeHome = result.takeHome * 12 + bonusNet;

  const rows: { label: string; amount: number; color: string }[] = [
    { label: "厚生年金保険料", amount: result.pension, color: "text-orange-600" },
    { label: "健康保険料" + (profile.age >= 40 && profile.age < 65 ? "・介護保険料" : ""), amount: result.health, color: "text-orange-600" },
    { label: "雇用保険料", amount: result.employment, color: "text-orange-600" },
    { label: "所得税", amount: result.incomeTax, color: "text-red-600" },
    { label: "住民税", amount: result.residentTax, color: "text-red-600" },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs text-gray-400">{profile.name}</span>
              {profile.incomeType === "pension" && (
                <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">年金</span>
              )}
              {profile.memberId === "spouse" && (
                <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full">配偶者</span>
              )}
              {profile.activeFromYear && (
                <span className="text-xs px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded-full">
                  {profile.activeFromYear}年〜
                </span>
              )}
            </div>
            <div className="text-2xl font-bold text-gray-900">¥{annualBase.toLocaleString()}<span className="text-sm font-normal text-gray-400">/年</span></div>
            {bonusAnnual > 0 && (
              <div className="text-xs text-teal-600 mt-0.5">うちボーナス ¥{bonusAnnual.toLocaleString()}/年</div>
            )}
            <div className="text-xs text-gray-500 mt-0.5">{profile.prefecture} · {profile.age}歳 · 扶養{profile.dependents}人</div>
          </div>
          <div className="flex gap-1 items-center">
            <button onClick={() => onEdit(profile)}
              className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
              <Pencil size={14} />
            </button>
            <button onClick={() => { if (confirm("この収入プロファイルを削除しますか？")) onDelete(profile.id); }}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Monthly flow */}
        <div className="mt-3 flex items-center gap-2 text-sm">
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
            <div className="text-xs text-gray-400">月額面</div>
            <div className="font-bold text-gray-700">¥{grossMonthly.toLocaleString()}</div>
          </div>
          <div className="text-gray-300 text-lg">−</div>
          <div className="bg-orange-50 rounded-lg px-3 py-2 text-center">
            <div className="text-xs text-orange-500">月次控除</div>
            <div className="font-bold text-orange-600">¥{result.totalDeductions.toLocaleString()}</div>
          </div>
          <div className="text-gray-300 text-lg">=</div>
          <div className="bg-green-50 rounded-lg px-3 py-2 text-center flex-1">
            <div className="text-xs text-green-600">年間手取り</div>
            <div className="font-bold text-green-700">¥{(annualTakeHome / 10000).toFixed(0)}万</div>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors py-1">
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? "内訳を閉じる" : "控除の内訳を見る"}
        </button>
      </div>

      {/* Breakdown */}
      {expanded && (
        <div className="border-t border-gray-50 bg-gray-50 p-4 space-y-2">
          {rows.map(({ label, amount, color }) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{label}</span>
              <span className={`font-medium ${color}`}>− ¥{amount.toLocaleString()}</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
            <span className="font-semibold text-gray-700">控除合計</span>
            <span className="font-bold text-orange-600">− ¥{result.totalDeductions.toLocaleString()}</span>
          </div>
          <div className="text-xs text-gray-400 pt-1">
            ※ 協会けんぽ {profile.prefecture}（令和6年度）、復興特別所得税込み
          </div>
        </div>
      )}
    </div>
  );
}
