"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronRight, AlertTriangle, Clock, Info } from "lucide-react";

interface CheckItem {
  id: string;
  category: string;
  title: string;
  purpose: string;
  target: string;       // 申請先
  deadline: string;     // 期限
  deadlineType: "before" | "after" | "annual" | "once";  // 申請タイミング種別
  urgency: "high" | "medium" | "low";
  note?: string;
}

const ITEMS: CheckItem[] = [
  // ── 不動産取得税 ─────────────────────────────────────
  {
    id: "acq-building",
    category: "不動産取得税",
    title: "不動産取得税の軽減申請（建物）",
    purpose: "新築・中古住宅の建物取得税を軽減（1,200〜1,300万円控除）",
    target: "都道府県税事務所",
    deadline: "不動産取得後60日以内",
    deadlineType: "after",
    urgency: "high",
    note: "自治体によっては自動適用される場合もあるが、申請しないと軽減されないケースが多い。登記後早めに確認を。",
  },
  {
    id: "acq-land",
    category: "不動産取得税",
    title: "不動産取得税の軽減申請（土地）",
    purpose: "住宅用土地の取得税を軽減（評価額×1/2×3%から最大軽減）",
    target: "都道府県税事務所",
    deadline: "不動産取得後60日以内",
    deadlineType: "after",
    urgency: "high",
    note: "建物と同時に取得する場合は建物と合わせて申請。土地を先に取得した場合は建物完成後に別途手続きが必要。",
  },
  {
    id: "acq-land-refund",
    category: "不動産取得税",
    title: "土地先取得分の不動産取得税還付申請",
    purpose: "土地取得後3年以内に建物を新築した場合、支払済み税額の還付を受ける",
    target: "都道府県税事務所",
    deadline: "建物完成・登記後60日以内（土地取得から3年以内）",
    deadlineType: "after",
    urgency: "high",
    note: "土地だけ先に購入した場合に発生。建物が完成したら速やかに申請。期限を逃すと還付不可。",
  },
  // ── 固定資産税 ────────────────────────────────────────
  {
    id: "prop-new-confirm",
    category: "固定資産税",
    title: "新築軽減の適用確認（3〜5年間1/2）",
    purpose: "延床50〜280m²の新築住宅は建物固定資産税が3年間（長期優良住宅は5年間）半額",
    target: "市区町村（固定資産税課）",
    deadline: "翌年度の納税通知書で確認",
    deadlineType: "annual",
    urgency: "medium",
    note: "通常は自動適用されるが、翌年4〜5月の納税通知書で軽減が反映されているか必ず確認すること。",
  },
  {
    id: "prop-residential",
    category: "固定資産税",
    title: "住宅用地軽減の適用確認（1/6〜1/3）",
    purpose: "住宅用地は固定資産税の課税標準が小規模（200m²以下）1/6、一般1/3に軽減",
    target: "市区町村（固定資産税課）",
    deadline: "翌年度の納税通知書で確認",
    deadlineType: "annual",
    urgency: "medium",
    note: "住宅を取り壊したり更地にすると軽減が外れる。建て替え中は一時的に特例申請が可能な場合がある。",
  },
  {
    id: "prop-valuations",
    category: "固定資産税",
    title: "固定資産税評価額の縦覧・審査申出",
    purpose: "評価額に誤りや不服がある場合、縦覧または審査申出で是正を求める",
    target: "市区町村（固定資産税課）",
    deadline: "縦覧：4〜5月 / 審査申出：納税通知書を受け取ってから3ヶ月以内",
    deadlineType: "annual",
    urgency: "low",
    note: "新築・増改築後の最初の評価は特に確認推奨。評価替えは3年ごと（次回は2027年）。",
  },
  // ── 住宅ローン控除 ────────────────────────────────────
  {
    id: "mortgage-deduction-first",
    category: "住宅ローン控除",
    title: "住宅ローン控除（初年度・確定申告）",
    purpose: "年末ローン残高の0.7%が所得税・住民税から最大13年間控除",
    target: "税務署（確定申告）",
    deadline: "入居した翌年の2月16日〜3月15日",
    deadlineType: "once",
    urgency: "high",
    note: "初年度のみ確定申告が必須。2年目以降は年末調整で自動控除（会社員の場合）。省エネ基準を満たさない新築は2025年以降控除対象外になる場合あり。",
  },
  {
    id: "mortgage-deduction-annual",
    category: "住宅ローン控除",
    title: "住宅ローン控除（年末調整・2年目以降）",
    purpose: "控除継続。会社員は勤務先に残高証明書を提出",
    target: "勤務先（年末調整）/ 税務署（自営の場合）",
    deadline: "毎年10〜11月（年末調整）",
    deadlineType: "annual",
    urgency: "medium",
    note: "金融機関から毎年10月頃に残高証明書が届く。勤務先の年末調整に提出するだけでOK。",
  },
  // ── 長期優良住宅・ZEH ─────────────────────────────────
  {
    id: "longevity-cert",
    category: "長期優良住宅・ZEH",
    title: "長期優良住宅認定申請",
    purpose: "認定を受けると住宅ローン控除の上限増額・不動産取得税控除1,300万・固定資産税軽減5年等",
    target: "所管行政庁（都道府県・市区町村）",
    deadline: "着工前（建築確認申請前に申請）",
    deadlineType: "before",
    urgency: "high",
    note: "着工後は申請不可。建設会社と早めに相談を。認定取得で各種控除が有利になる。",
  },
  {
    id: "zeh-subsidy",
    category: "長期優良住宅・ZEH",
    title: "ZEH補助金申請（子育てエコホーム等）",
    purpose: "ZEH（ネット・ゼロ・エネルギーハウス）建設に対する補助金（最大100万円程度）",
    target: "工務店・ハウスメーカー経由で申請",
    deadline: "着工前（交付申請）/ 完成後に実績報告",
    deadlineType: "before",
    urgency: "high",
    note: "毎年度予算枠があり先着順のため早めに確認。2024〜2025年は「子育てエコホーム支援事業」として実施。工務店が代行申請するケースが多い。",
  },
  {
    id: "kodate-eco",
    category: "長期優良住宅・ZEH",
    title: "子育てエコホーム支援事業（補助金）",
    purpose: "省エネ性能の高い新築住宅に補助金（子育て世帯・若者夫婦世帯：最大100万円）",
    target: "施工業者経由で申請（国交省事業）",
    deadline: "着工前〜引渡し前（予算なくなり次第終了）",
    deadlineType: "before",
    urgency: "high",
    note: "年度により制度名・補助額が変わる。2024年度は工事請負契約が2023年11月2日以降が対象。必ず施工業者に確認。",
  },
  // ── 登録免許税・印紙税 ─────────────────────────────────
  {
    id: "reg-tax",
    category: "登録免許税・印紙税",
    title: "住宅用家屋証明書の取得（登録免許税軽減）",
    purpose: "所有権保存・移転登記の登録免許税を軽減（0.4%→0.15%、0.3%→0.1%等）",
    target: "市区町村（登記前に取得）→ 法務局（登記申請時に添付）",
    deadline: "登記申請前（取得から1年以内に登記）",
    deadlineType: "before",
    urgency: "high",
    note: "司法書士に依頼する場合は代行してもらえる。自分で登記する場合は事前に市区町村で取得。",
  },
  {
    id: "stamp-tax",
    category: "登録免許税・印紙税",
    title: "工事請負契約・売買契約の印紙税軽減確認",
    purpose: "契約書に貼付する印紙税。一定の住宅取得では軽減税率が適用される",
    target: "契約時に自動適用（軽減税率の確認のみ）",
    deadline: "契約時",
    deadlineType: "before",
    urgency: "low",
    note: "2024年3月31日までは軽減措置あり。1,000万超5,000万以下の契約：本則2万円→軽減1万円。延長の可能性あり。",
  },
  // ── 贈与税 ─────────────────────────────────────────────
  {
    id: "gift-housing",
    category: "贈与税",
    title: "住宅取得等資金の贈与税非課税申告",
    purpose: "親・祖父母からの住宅購入資金の贈与が最大1,000万円まで非課税",
    target: "税務署（確定申告）",
    deadline: "贈与を受けた翌年の2月1日〜3月15日",
    deadlineType: "once",
    urgency: "high",
    note: "省エネ等住宅は1,000万円、一般住宅は500万円が非課税枠（2026年末まで）。必ず申告が必要（自動適用なし）。",
  },
];

const CATEGORIES = [...new Set(ITEMS.map(i => i.category))];

const URGENCY_BADGE: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-500",
};

const URGENCY_LABEL: Record<string, string> = {
  high: "要対応",
  medium: "確認",
  low: "任意",
};

const DEADLINE_TYPE_ICON: Record<string, React.ReactNode> = {
  before: <span className="text-blue-600 font-semibold">⬆ 事前</span>,
  after: <span className="text-red-600 font-semibold">⬇ 事後</span>,
  annual: <span className="text-amber-600 font-semibold">↻ 毎年</span>,
  once: <span className="text-green-700 font-semibold">◎ 一回</span>,
};

const LS_KEY = "okane_taxChecklist_v1";

function loadChecked(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveChecked(ids: Set<string>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify([...ids])); } catch { /* quota */ }
}

export default function TaxChecklist() {
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    setChecked(loadChecked());
  }, []);

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveChecked(next);
      return next;
    });
  }

  function toggleCategory(cat: string) {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }

  const doneCount = ITEMS.filter(i => checked.has(i.id)).length;

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">不動産・住宅税制の申請チェックリスト</h3>
          <p className="text-xs text-gray-500 mt-0.5">申請しないと軽減・控除が受けられない手続きをまとめています</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-violet-600">{doneCount}<span className="text-sm font-normal text-gray-400">/{ITEMS.length}</span></p>
          <p className="text-xs text-gray-400">完了</p>
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 px-1">
        <span className="flex items-center gap-1">{DEADLINE_TYPE_ICON.before} 着工・登記・契約前</span>
        <span className="flex items-center gap-1">{DEADLINE_TYPE_ICON.after} 取得・完成後に期限あり</span>
        <span className="flex items-center gap-1">{DEADLINE_TYPE_ICON.annual} 毎年確認</span>
        <span className="flex items-center gap-1">{DEADLINE_TYPE_ICON.once} 一度だけ</span>
      </div>

      {/* カテゴリ別リスト */}
      {CATEGORIES.map(cat => {
        const items = ITEMS.filter(i => i.category === cat);
        const catDone = items.filter(i => checked.has(i.id)).length;
        const collapsed = collapsedCategories.has(cat);
        return (
          <div key={cat} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => toggleCategory(cat)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {collapsed ? <ChevronRight size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                <span className="text-sm font-semibold text-gray-800">{cat}</span>
                <span className="text-xs text-gray-400">{catDone}/{items.length}</span>
              </div>
              {catDone === items.length
                ? <span className="text-xs text-green-600 font-medium">✓ 完了</span>
                : items.some(i => i.urgency === "high" && !checked.has(i.id))
                  ? <span className={`text-xs px-2 py-0.5 rounded-full ${URGENCY_BADGE.high}`}>要対応あり</span>
                  : null
              }
            </button>

            {!collapsed && (
              <div className="divide-y divide-gray-50">
                {items.map(item => {
                  const done = checked.has(item.id);
                  const showNote = expandedNote === item.id;
                  return (
                    <div key={item.id} className={`px-4 py-3 ${done ? "bg-gray-50" : ""}`}>
                      <div className="flex items-start gap-3">
                        <button onClick={() => toggle(item.id)} className="mt-0.5 flex-shrink-0">
                          {done
                            ? <CheckCircle2 size={18} className="text-green-500" />
                            : <Circle size={18} className="text-gray-300" />
                          }
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className={`text-sm font-medium ${done ? "line-through text-gray-400" : "text-gray-800"}`}>
                              {item.title}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${URGENCY_BADGE[item.urgency]}`}>
                              {URGENCY_LABEL[item.urgency]}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mb-1.5">{item.purpose}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                            <span className="flex items-center gap-1 text-gray-500">
                              <Clock size={11} />{DEADLINE_TYPE_ICON[item.deadlineType]}&ensp;{item.deadline}
                            </span>
                            <span className="text-gray-400">申請先：{item.target}</span>
                          </div>
                          {item.note && (
                            <button
                              onClick={() => setExpandedNote(showNote ? null : item.id)}
                              className="mt-1.5 flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800"
                            >
                              <Info size={11} />
                              {showNote ? "詳細を閉じる" : "詳細・注意事項"}
                            </button>
                          )}
                          {showNote && item.note && (
                            <div className="mt-1.5 bg-violet-50 rounded-lg px-3 py-2 text-xs text-gray-700 leading-relaxed">
                              {item.note}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <p className="text-xs text-gray-400 text-center pb-2">
        ※ 制度は毎年改正されます。申請前に必ず最新情報をご確認ください。
      </p>
    </div>
  );
}
