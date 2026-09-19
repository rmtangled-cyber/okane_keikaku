"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Eye } from "lucide-react";
import { loadViewerEmails, addViewerEmail, removeViewerEmail } from "@/lib/storage";

export default function ViewerInvitePanel() {
  const [emails, setEmails] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadViewerEmails().then(setEmails);
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const email = input.trim().toLowerCase();
    if (!email || !email.includes("@")) { setError("有効なメールアドレスを入力してください"); return; }
    if (emails.includes(email)) { setError("すでに登録されています"); return; }
    setSaving(true);
    setError(null);
    try {
      await addViewerEmail(email);
      setEmails(prev => [...prev, email]);
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
      await removeViewerEmail(email);
      setEmails(prev => prev.filter(e => e !== email));
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

      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input
          type="email"
          value={input}
          onChange={e => { setInput(e.target.value); setError(null); }}
          placeholder="example@gmail.com"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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

      {emails.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">登録された閲覧者はいません</p>
      ) : (
        <ul className="space-y-2">
          {emails.map(email => (
            <li key={email} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
              <span className="text-sm text-gray-700">{email}</span>
              <button
                onClick={() => handleRemove(email)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
