"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Eye } from "lucide-react";
import { loadViewers, addViewer, removeViewer, ViewerEntry, ViewerRole } from "@/lib/storage";

const ROLE_LABELS: Record<ViewerRole, string> = {
  full: "全表示",
  masked: "資産マスク",
};

const ROLE_BADGE: Record<ViewerRole, string> = {
  full: "bg-blue-100 text-blue-700",
  masked: "bg-amber-100 text-amber-700",
};

export default function ViewerInvitePanel() {
  const [viewers, setViewers] = useState<ViewerEntry[]>([]);
  const [input, setInput] = useState("");
  const [role, setRole] = useState<ViewerRole>("full");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadViewers().then(setViewers);
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const email = input.trim().toLowerCase();
    if (!email || !email.includes("@")) { setError("有効なメールアドレスを入力してください"); return; }
    if (viewers.some(v => v.email === email)) { setError("すでに登録されています"); return; }
    setSaving(true);
    setError(null);
    try {
      await addViewer(email, role);
      setViewers(prev => [...prev, { email, role }]);
      setInput("");
    } catch {
      setError("追加に失敗しました。もう一度お試しください。");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(email: string) {
    if (!confirm(`${email} の閲覧権限を削除しますか？`)) return;
    try {
      await removeViewer(email);
      setViewers(prev => prev.filter(v => v.email !== email));
    } catch {
      alert("削除に失敗しました。");
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Eye size={18} className="text-blue-500" />
        <h2 className="text-base font-semibold text-gray-900">閲覧者の管理</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Googleアカウントのメールアドレスを登録すると、そのアカウントでログインした人がこのデータを閲覧できます（編集不可）。
      </p>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 mb-4">
        <input
          type="email"
          value={input}
          onChange={e => { setInput(e.target.value); setError(null); }}
          placeholder="example@gmail.com"
          className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={role}
          onChange={e => setRole(e.target.value as ViewerRole)}
          className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="full">全表示</option>
          <option value="masked">資産マスク</option>
        </select>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Plus size={14} />
          {saving ? "追加中..." : "追加"}
        </button>
      </form>

      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      <div className="text-xs text-gray-400 mb-3 space-y-0.5">
        <p><span className="font-medium text-gray-600">全表示</span>：すべてのデータを閲覧可能</p>
        <p><span className="font-medium text-gray-600">資産マスク</span>：株式・貯金・投資信託の金額を非表示</p>
      </div>

      {viewers.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">登録された閲覧者はいません</p>
      ) : (
        <ul className="space-y-2">
          {viewers.map(v => (
            <li key={v.email} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-gray-700 truncate">{v.email}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${ROLE_BADGE[v.role]}`}>
                  {ROLE_LABELS[v.role]}
                </span>
              </div>
              <button
                onClick={() => handleRemove(v.email)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
