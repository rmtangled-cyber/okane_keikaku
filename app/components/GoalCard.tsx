"use client";

import { Goal } from "@/lib/types";
import { Target } from "lucide-react";

interface Props {
  goal: Goal;
}

export default function GoalCard({ goal }: Props) {
  const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
  const remaining = goal.targetAmount - goal.currentAmount;
  const targetDate = new Date(goal.targetDate);
  const today = new Date();
  const monthsLeft = Math.max(0, (targetDate.getFullYear() - today.getFullYear()) * 12 + targetDate.getMonth() - today.getMonth());

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Target size={16} className="text-indigo-600" />
          </div>
          <span className="font-semibold text-gray-900">{goal.title}</span>
        </div>
        <span className="text-xs text-gray-400">{goal.targetDate} 目標</span>
      </div>
      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-500">達成率</span>
          <span className="font-semibold text-indigo-600">{pct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="flex justify-between text-sm mt-3">
        <div>
          <span className="text-gray-400">現在</span>
          <div className="font-semibold text-gray-800">¥{goal.currentAmount.toLocaleString()}</div>
        </div>
        <div className="text-right">
          <span className="text-gray-400">目標</span>
          <div className="font-semibold text-gray-800">¥{goal.targetAmount.toLocaleString()}</div>
        </div>
      </div>
      {remaining > 0 && (
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
