"use client";

import { useState } from "react";
import { MonthlyExpense, ExpenseCategory } from "@/lib/types";
import { X, User, Users, Baby } from "lucide-react";

type DraftExpense = Omit<MonthlyExpense, "id" | "updatedAt">;

interface Template {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  items: DraftExpense[];
}

function exp(name: string, category: ExpenseCategory, amount: number, isFixed: boolean, note?: string): DraftExpense {
  return { name, category, amount, isFixed, note };
}

const TEMPLATES: Template[] = [
  {
    id: "single_tokyo",
    label: "一人暮らし（東京都）",
    description: "都内一人暮らしの平均的な生活費の目安",
    icon: <User size={20} className="text-blue-500" />,
    items: [
      exp("家賃", "住居費", 85000, true, "都内1K〜1LDK目安"),
      exp("食費", "食費", 40000, false, "自炊・外食込み"),
      exp("水道光熱費", "水道光熱費", 10000, true, "電気・ガス・水道"),
      exp("通信費", "通信費", 8000, true, "スマホ・ネット"),
      exp("交通費", "交通費", 10000, true, "定期代など"),
      exp("日用品・衣類", "その他", 15000, false),
      exp("娯楽・交際費", "娯楽費", 20000, false),
    ],
  },
  {
    id: "couple_tokyo",
    label: "二人暮らし（東京都）",
    description: "都内カップル・夫婦の平均的な生活費の目安",
    icon: <Users size={20} className="text-violet-500" />,
    items: [
      exp("家賃", "住居費", 130000, true, "都内2LDK目安"),
      exp("食費", "食費", 70000, false, "二人分"),
      exp("水道光熱費", "水道光熱費", 15000, true),
      exp("通信費", "通信費", 14000, true, "二人分のスマホ・ネット"),
      exp("交通費", "交通費", 20000, true, "二人分の定期代など"),
      exp("日用品・衣類", "その他", 20000, false),
      exp("娯楽・交際費", "娯楽費", 30000, false),
    ],
  },
  {
    id: "family_tokyo",
    label: "ファミリー（子あり・東京都）",
    description: "子供がいる家族の生活費の目安（子1人想定）",
    icon: <Baby size={20} className="text-pink-500" />,
    items: [
      exp("家賃・住宅費", "住居費", 150000, true, "都内3LDK目安（ローン含む場合は要調整）"),
      exp("食費", "食費", 80000, false, "家族3人分"),
      exp("水道光熱費", "水道光熱費", 18000, true),
      exp("通信費", "通信費", 14000, true, "大人二人分"),
      exp("交通費", "交通費", 25000, true),
      exp("教育費・習い事", "教育費", 20000, true, "保育園・習い事など（ライフプランで別途管理も可）"),
      exp("日用品・衣類", "その他", 25000, false),
      exp("娯楽・交際費", "娯楽費", 25000, false),
      exp("医療費", "医療費", 5000, false),
    ],
  },
];

interface Props {
  onAdd: (items: MonthlyExpense[]) => void;
  onClose: () => void;
}

export default function ExpenseTemplateModal({ onAdd, onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const template = TEMPLATES.find(t => t.id === selected);

  function handleAdd() {
    if (!template) return;
    const now = new Date().toISOString();
    const items: MonthlyExpense[] = template.items.map((d, i) => ({
      ...d,
      id: `exp_draft_${Date.now()}_${i}`,
      updatedAt: now,
    }));
    onAdd(items);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">テンプレートから追加</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-4">
          テンプレートを選ぶと生活費の項目がまとめて追加されます。金額は目安なので、後から個別に編集してください。
        </p>

        <div className="space-y-2 mb-5">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selected === t.id
                  ? "border-rose-400 bg-rose-50"
                  : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                  {t.icon}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{t.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{t.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {template && (
          <div className="mb-5 bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-medium text-gray-500 mb-2">
              追加される項目 · 月計 ¥{template.items.reduce((s, i) => s + i.amount, 0).toLocaleString()}円
            </p>
            <div className="space-y-1">
              {template.items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs ${item.isFixed ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"}`}>
                    {item.isFixed ? "固定" : "変動"}
                  </span>
                  <span className="flex-1 font-medium">{item.name}</span>
                  <span className="text-gray-500">¥{item.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selected}
            className="flex-1 py-2.5 bg-rose-600 rounded-xl text-sm font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            追加する
          </button>
        </div>
      </div>
    </div>
  );
}
