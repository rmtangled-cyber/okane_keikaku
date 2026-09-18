"use client";

import { useState } from "react";
import { Home, CheckCircle2, Circle, Plus, Pencil, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
import { HomePurchase, PaymentItem } from "@/lib/types";
import { saveHomePurchase } from "@/lib/storage";

interface Props {
  home: HomePurchase | null;
  onChange: (home: HomePurchase) => void;
}

const EMPTY_HOME: HomePurchase = {
  propertyName: "",
  totalPrice: 0,
  miscCosts: 0,
  loanAmount: 0,
  loanStartDate: "",
  monthlyPayment: 0,
  payments: [],
  note: "",
};

function fmt(n: number) {
  return `¥${n.toLocaleString()}`;
}

function dateLabel(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function isPast(iso: string) {
  return iso ? new Date(iso) < new Date() : false;
}

// ---- Payment row editor ----
interface PaymentEditorProps {
  item: PaymentItem | null;
  onSave: (item: Omit<PaymentItem, "id">) => void;
  onClose: () => void;
}

function PaymentEditor({ item, onSave, onClose }: PaymentEditorProps) {
  const [form, setForm] = useState({
    label: item?.label ?? "",
    amount: item?.amount?.toString() ?? "",
    dueDate: item?.dueDate ?? "",
    paid: item?.paid ?? false,
    note: item?.note ?? "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      label: form.label,
      amount: Number(form.amount.replace(/,/g, "")),
      dueDate: form.dueDate,
      paid: form.paid,
      note: form.note || undefined,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{item ? "支払い編集" : "支払い追加"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">種別・名称</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="手付金 / 中間金 / 残金 など"
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">金額（円）</label>
            <input
              type="number"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0"
              min={0}
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">支払日</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">メモ</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="任意"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.paid}
              onChange={e => setForm(f => ({ ...f, paid: e.target.checked }))}
              className="accent-orange-500 w-4 h-4"
            />
            支払い済み
          </label>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600">保存</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Contract info editor ----
interface ContractEditorProps {
  home: HomePurchase;
  onSave: (home: HomePurchase) => void;
  onClose: () => void;
}

function ContractEditor({ home, onSave, onClose }: ContractEditorProps) {
  const [form, setForm] = useState({
    propertyName: home.propertyName,
    totalPrice: home.totalPrice.toString(),
    miscCosts: home.miscCosts.toString(),
    loanAmount: home.loanAmount.toString(),
    loanStartDate: home.loanStartDate,
    monthlyPayment: home.monthlyPayment.toString(),
    note: home.note ?? "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      ...home,
      propertyName: form.propertyName,
      totalPrice: Number(form.totalPrice),
      miscCosts: Number(form.miscCosts),
      loanAmount: Number(form.loanAmount),
      loanStartDate: form.loanStartDate,
      monthlyPayment: Number(form.monthlyPayment),
      note: form.note || undefined,
    });
  }

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">契約情報を編集</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { label: "物件名・住所", key: "propertyName" as const, type: "text", placeholder: "○○マンション 101号室" },
            { label: "物件価格（円）", key: "totalPrice" as const, type: "number", placeholder: "0" },
            { label: "諸費用合計（円）", key: "miscCosts" as const, type: "number", placeholder: "0" },
            { label: "住宅ローン借入額（円）", key: "loanAmount" as const, type: "number", placeholder: "0" },
            { label: "ローン開始日", key: "loanStartDate" as const, type: "date", placeholder: "" },
            { label: "毎月返済額（円）", key: "monthlyPayment" as const, type: "number", placeholder: "0" },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-gray-500 mb-1 block">{label}</label>
              <input
                type={type}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form[key]}
                onChange={f(key)}
                placeholder={placeholder}
                required={key === "propertyName"}
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">メモ</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              value={form.note}
              onChange={f("note")}
              rows={2}
              placeholder="任意"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600">保存</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Main tab ----
export default function HomePurchaseTab({ home, onChange }: Props) {
  const [showContractEditor, setShowContractEditor] = useState(!home);
  const [editingPayment, setEditingPayment] = useState<PaymentItem | "new" | null>(null);
  const [showNote, setShowNote] = useState(false);

  const current = home ?? EMPTY_HOME;

  function saveContract(h: HomePurchase) {
    saveHomePurchase(h);
    onChange(h);
    setShowContractEditor(false);
  }

  function savePayment(data: Omit<PaymentItem, "id">) {
    const payments = editingPayment && editingPayment !== "new"
      ? current.payments.map(p => p.id === (editingPayment as PaymentItem).id ? { ...p, ...data } : p)
      : [...current.payments, { id: Date.now().toString(), ...data }];
    const updated = { ...current, payments };
    saveHomePurchase(updated);
    onChange(updated);
    setEditingPayment(null);
  }

  function deletePayment(id: string) {
    const updated = { ...current, payments: current.payments.filter(p => p.id !== id) };
    saveHomePurchase(updated);
    onChange(updated);
  }

  function togglePaid(id: string) {
    const updated = { ...current, payments: current.payments.map(p => p.id === id ? { ...p, paid: !p.paid } : p) };
    saveHomePurchase(updated);
    onChange(updated);
  }

  const sorted = [...current.payments].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const paidTotal = current.payments.filter(p => p.paid).reduce((s, p) => s + p.amount, 0);
  const unpaidTotal = current.payments.filter(p => !p.paid).reduce((s, p) => s + p.amount, 0);
  const selfFundRequired = current.totalPrice + current.miscCosts - current.loanAmount;

  if (!home && !showContractEditor) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
        <Home size={40} className="mb-3 text-orange-300" />
        <p className="text-sm mb-4">マイホームの契約情報がまだ登録されていません</p>
        <button
          onClick={() => setShowContractEditor(true)}
          className="px-4 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          契約情報を登録
        </button>
      </div>
    );
  }

  return (
    <>
      {showContractEditor && (
        <ContractEditor
          home={current}
          onSave={saveContract}
          onClose={() => setShowContractEditor(false)}
        />
      )}
      {editingPayment && (
        <PaymentEditor
          item={editingPayment === "new" ? null : editingPayment}
          onSave={savePayment}
          onClose={() => setEditingPayment(null)}
        />
      )}

      <div className="space-y-5">
        {/* Contract summary card */}
        <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              <Home size={20} />
              <span className="font-bold text-lg leading-tight">{current.propertyName || "物件名未設定"}</span>
            </div>
            <button
              onClick={() => setShowContractEditor(true)}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
              title="契約情報を編集"
            >
              <Pencil size={14} />
            </button>
          </div>
          <p className="text-xs text-orange-100 mb-4">物件価格 + 諸費用 の合計</p>
          <p className="text-3xl font-bold tracking-tight mb-0.5">
            {fmt(current.totalPrice + current.miscCosts)}
          </p>
          <p className="text-xs text-orange-100">物件 {fmt(current.totalPrice)} ＋ 諸費用 {fmt(current.miscCosts)}</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">自己資金必要額</p>
            <p className="text-lg font-bold text-gray-900">{fmt(selfFundRequired)}</p>
            <p className="text-xs text-gray-400 mt-0.5">物件＋諸費用 − ローン</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">住宅ローン借入</p>
            <p className="text-lg font-bold text-blue-600">{fmt(current.loanAmount)}</p>
            {current.monthlyPayment > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">毎月 {fmt(current.monthlyPayment)}</p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">支払済み合計</p>
            <p className="text-lg font-bold text-green-600">{fmt(paidTotal)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{current.payments.filter(p => p.paid).length} 件</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">支払予定（未払）</p>
            <p className="text-lg font-bold text-amber-600">{fmt(unpaidTotal)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{current.payments.filter(p => !p.paid).length} 件</p>
          </div>
        </div>

        {/* Loan info */}
        {current.loanStartDate && (
          <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-800 flex items-center gap-2">
            <Home size={15} className="text-blue-400 shrink-0" />
            <span>ローン開始：{dateLabel(current.loanStartDate)}　毎月返済額：{fmt(current.monthlyPayment)}</span>
          </div>
        )}

        {/* Note */}
        {current.note && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowNote(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 font-medium"
            >
              <span>メモ</span>
              {showNote ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showNote && (
              <div className="px-4 pb-4 text-sm text-gray-600 whitespace-pre-wrap border-t border-gray-50">
                {current.note}
              </div>
            )}
          </div>
        )}

        {/* Payment schedule */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h3 className="font-semibold text-gray-900 text-sm">支払いスケジュール</h3>
            <button
              onClick={() => setEditingPayment("new")}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              <Plus size={13} /> 追加
            </button>
          </div>

          {sorted.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-10">
              支払い項目がありません<br />
              <span className="text-xs">「追加」ボタンから登録してください</span>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {sorted.map(p => {
                const overdue = !p.paid && isPast(p.dueDate);
                return (
                  <li key={p.id} className={`flex items-start gap-3 px-5 py-4 ${overdue ? "bg-red-50" : ""}`}>
                    <button
                      onClick={() => togglePaid(p.id)}
                      className="mt-0.5 shrink-0 text-gray-300 hover:text-green-500 transition-colors"
                      title={p.paid ? "未払いに戻す" : "支払い済みにする"}
                    >
                      {p.paid
                        ? <CheckCircle2 size={20} className="text-green-500" />
                        : <Circle size={20} className={overdue ? "text-red-400" : ""} />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${p.paid ? "line-through text-gray-400" : "text-gray-900"}`}>
                          {p.label}
                        </span>
                        {overdue && (
                          <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">期限超過</span>
                        )}
                        {p.paid && (
                          <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-600 rounded-full font-medium">済</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-400">{dateLabel(p.dueDate)}</span>
                        {p.note && <span className="text-xs text-gray-400 truncate">{p.note}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${p.paid ? "text-gray-400" : overdue ? "text-red-600" : "text-gray-900"}`}>
                        {fmt(p.amount)}
                      </p>
                      <div className="flex gap-1 mt-1 justify-end">
                        <button
                          onClick={() => setEditingPayment(p)}
                          className="p-1 text-gray-300 hover:text-gray-600 transition-colors"
                          title="編集"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deletePayment(p.id)}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                          title="削除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Total row */}
          {sorted.length > 0 && (
            <div className="border-t border-gray-100 px-5 py-3 flex justify-between items-center">
              <span className="text-xs text-gray-500">合計（スケジュール登録分）</span>
              <span className="font-bold text-gray-900 text-sm">
                {fmt(current.payments.reduce((s, p) => s + p.amount, 0))}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
