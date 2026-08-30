"use client";

import { useState } from "react";
import { LifeEvent, LifeEventType } from "@/lib/types";
import { X, Baby, Home, Sunrise } from "lucide-react";

type DraftEvent = Omit<LifeEvent, "id" | "updatedAt"> & { isDraft: true };

interface Template {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  paramLabel?: string;
  paramPlaceholder?: string;
  paramDefault?: string;
  build: (param: string) => DraftEvent[];
}

function evt(
  year: number,
  title: string,
  type: LifeEventType,
  monthly: number,
  oneTime: number,
  note?: string,
): DraftEvent {
  return { year, title, type, monthlyAmountChange: monthly, oneTimeAmount: oneTime, note, isDraft: true };
}

const TEMPLATES: Template[] = [
  {
    id: "child_tokyo",
    label: "子供誕生（東京都）",
    description: "出産費用・給付金・育休・保育園・教育費など東京都の補助を含む一連のイベント",
    icon: <Baby size={20} className="text-pink-500" />,
    paramLabel: "出生予定年",
    paramPlaceholder: "例: 2027",
    paramDefault: String(new Date().getFullYear() + 1),
    build: (param) => {
      const Y = parseInt(param) || new Date().getFullYear() + 1;
      return [
        evt(Y, "出産・準備費用", "一時支出", 0, -500000, "入院費・ベビー用品など"),
        evt(Y, "出産関連給付金", "一時収入", 0, 650000, "出産育児一時金50万+都給付金5万+赤ちゃんファースト10万+α"),
        evt(Y, "育休取得（収入減）", "収入変化", -100000, 0, "育休中。育児休業給付金で一部補填"),
        evt(Y + 1, "児童手当", "収入変化", 15000, 0, "〜中学卒業まで（3歳未満は15,000円/月）"),
        evt(Y + 1, "保育園・育児費用", "支出増加", -50000, 0, "保育料・おむつ・習い事など"),
        evt(Y + 7, "小学校入学", "支出増加", -15000, -150000, "ランドセル・学用品など一時費用含む"),
        evt(Y + 13, "中学校入学", "支出増加", -30000, 0, "部活・塾など"),
        evt(Y + 16, "高校入学", "支出増加", -40000, 0, "授業料・交通費など"),
        evt(Y + 19, "大学入学", "支出増加", -100000, -1000000, "入学金・前期授業料など"),
      ];
    },
  },
  {
    id: "home_purchase",
    label: "住宅購入",
    description: "頭金・諸費用・固定資産税など住宅購入に伴う一連のイベント",
    icon: <Home size={20} className="text-blue-500" />,
    paramLabel: "購入予定年",
    paramPlaceholder: "例: 2026",
    paramDefault: String(new Date().getFullYear() + 1),
    build: (param) => {
      const Y = parseInt(param) || new Date().getFullYear() + 1;
      return [
        evt(Y, "頭金・諸費用", "一時支出", 0, -3000000, "頭金・仲介手数料・登記費用など（金額は要調整）"),
        evt(Y, "住宅ローン返済開始", "支出増加", -100000, 0, "月額は要調整"),
        evt(Y, "固定資産税", "支出増加", -12000, 0, "年約14万円を月割り（地域・評価額で異なる）"),
      ];
    },
  },
  {
    id: "retirement",
    label: "老後・退職",
    description: "退職・年金受給開始など老後に向けたイベント",
    icon: <Sunrise size={20} className="text-orange-500" />,
    paramLabel: "退職予定年",
    paramPlaceholder: "例: 2055",
    paramDefault: String(new Date().getFullYear() + 30),
    build: (param) => {
      const Y = parseInt(param) || new Date().getFullYear() + 30;
      return [
        evt(Y, "退職", "収入変化", -250000, 0, "給与収入がなくなる（金額は要調整）"),
        evt(Y, "退職金", "一時収入", 0, 20000000, "退職金（金額は要調整）"),
        evt(Y + 5, "年金受給開始", "収入変化", 150000, 0, "夫婦合計の目安（実際は年金定期便で確認）"),
      ];
    },
  },
];

interface Props {
  onAdd: (drafts: LifeEvent[]) => void;
  onClose: () => void;
}

export default function LifeEventTemplateModal({ onAdd, onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [param, setParam] = useState("");

  const template = TEMPLATES.find(t => t.id === selected);

  function handleSelect(t: Template) {
    setSelected(t.id);
    setParam(t.paramDefault ?? "");
  }

  function handleAdd() {
    if (!template) return;
    const now = new Date().toISOString();
    const drafts = template.build(param).map((d, i) => ({
      ...d,
      id: `draft_${Date.now()}_${i}`,
      updatedAt: now,
    }));
    onAdd(drafts);
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
          テンプレートを選ぶと「下書き」イベントとして追加されます。内容を確認して個別に確定してください。
        </p>

        <div className="space-y-2 mb-5">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => handleSelect(t)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selected === t.id
                  ? "border-violet-400 bg-violet-50"
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

        {template?.paramLabel && (
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">{template.paramLabel}</label>
            <input
              type="number"
              value={param}
              onChange={e => setParam(e.target.value)}
              placeholder={template.paramPlaceholder}
              min={2020}
              max={2100}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        )}

        {selected && template && (
          <div className="mb-5 bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-medium text-gray-500 mb-2">追加されるイベント（下書き）</p>
            <div className="space-y-1">
              {template.build(param).map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="text-gray-400 w-12 shrink-0">{d.year}年</span>
                  <span className="font-medium">{d.title}</span>
                  {d.oneTimeAmount !== 0 && (
                    <span className={d.oneTimeAmount > 0 ? "text-blue-500" : "text-orange-500"}>
                      一時{d.oneTimeAmount > 0 ? "+" : ""}{d.oneTimeAmount.toLocaleString()}円
                    </span>
                  )}
                  {d.monthlyAmountChange !== 0 && (
                    <span className={d.monthlyAmountChange > 0 ? "text-green-500" : "text-red-500"}>
                      月次{d.monthlyAmountChange > 0 ? "+" : ""}{d.monthlyAmountChange.toLocaleString()}円
                    </span>
                  )}
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
            className="flex-1 py-2.5 bg-violet-600 rounded-xl text-sm font-medium text-white hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            下書きとして追加
          </button>
        </div>
      </div>
    </div>
  );
}
