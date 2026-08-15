"use client";

import { Goal } from "@/lib/types";
import { Target, Pencil, Trash2 } from "lucide-react";

interface Props {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
}

export default function GoalCard({ goal, onEdit, onDelete }: Props) {
  const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
  const remaining = goal.targetAmount - goal.currentAmount;
  const targetDate = new Date(goal.targetDate);
  const today = new Date();
  const monthsLeft = Math.max(0, (targetDate.getFullYear() - today.getFullYear()) * 12 + targetDate.getMonth() - today.getMonth());
  const isAchieved = pct >= 100;

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-5 ${isAchieved ? "border-green-200" : "border-gray-100"}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${isAchieved ? "bg-green-50" : "bg-indigo-50"}`}>
            <Target size={16} className={isAchieved ? "text-green-600" : "text-indigo-600"} />
          </div>
          <div>
            <span className="font-semibold text-gray-900">{goal.title}</span>
            {goal.note && <p className="text-xs text-gray-400 mt-0.5">{goal.note}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          <span className="text-xs text-gray-400">{goal.targetDate} 目標</span>
          <button
            onClick={() => onEdit(goal)}
            className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(goal.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-500">達成率</span>
          <span className={`font-semibold ${isAchieved ? "text-green-600" : "text-indigo-600"}`}>{pct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isAchieved ? "bg-green-500" : "bg-indigo-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="flex justify-between text-sm mt-3">
        <div>
          <span className="text-gray-400 text-xs">現在</span>
          <div className="font-semibold text-gray-800">¥{goal.currentAmount.toLocaleString()}</div>
        </div>
        <div className="text-right">
          <span className="text-gray-400 text-xs">目標</span>
          <div className="font-semibold text-gray-800">¥{goal.targetAmount.toLocaleString()}</div>
        </div>
      </div>
      {isAchieved ? (
        <div className="mt-3 pt-3 border-t border-green-50 text-xs text-green-600 font-medium">
          目標達成！ おめでとうございます 🎉
        </div>
      ) : remaining > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400">
          あと ¥{remaining.toLocaleString()} · 残り{monthsLeft}ヶ月
          {monthsLeft > 0 && (
            <span className="ml-1">
              （月あたり ¥{Math.ceil(remaining / monthsLeft).toLocaleString()}）
            </span>
          )}
        </div>
      )}
    </div>
  );
}
