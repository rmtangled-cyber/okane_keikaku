"use client";

import { useState, useEffect } from "react";
import { UserProfile, CURRENCIES } from "@/lib/types";

interface Props {
  profile: UserProfile | null;
  onSave: (p: UserProfile) => void;
  isViewer?: boolean;
}

export default function FxRatesTab({ profile, onSave, isViewer }: Props) {
  const [rates, setRates] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fx: Record<string, string> = {};
    for (const [k, v] of Object.entries(profile?.manualFxRates ?? {})) {
      fx[k] = String(v);
    }
    setRates(fx);
  }, [profile]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (isViewer) return;
    const fxRates: Record<string, number> = {};
    for (const [k, v] of Object.entries(rates)) {
      const n = parseFloat(v);
      if (n > 0) fxRates[k] = n;
    }
    onSave({
      id: "default",
      displayName: profile?.displayName,
      birthYear: profile?.birthYear ?? (new Date().getFullYear() - 30),
      prefecture: profile?.prefecture ?? "東京",
      familyMembers: profile?.familyMembers ?? [],
      manualFxRates: Object.keys(fxRates).length > 0 ? fxRates : undefined,
      updatedAt: new Date().toISOString(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1">為替レート手動設定</h2>
      <p className="text-xs text-gray-400 mb-5">自動取得に失敗したときのフォールバック値として使用されます（円/1外貨）</p>

      <form onSubmit={handleSave}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          {CURRENCIES.filter(c => c.code !== "JPY").map(cur => (
            <div key={cur.code}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {cur.symbol} {cur.name}（{cur.code}）
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={rates[cur.code] ?? ""}
                  onChange={e => setRates(prev => ({ ...prev, [cur.code]: e.target.value }))}
                  placeholder="未設定"
                  disabled={isViewer}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 pr-8 disabled:bg-gray-50 disabled:text-gray-400"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">円</span>
              </div>
            </div>
          ))}
        </div>

        {!isViewer && (
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button type="submit"
              className={`px-5 py-2 rounded-xl text-sm font-medium text-white transition-colors ${saved ? "bg-green-500" : "bg-teal-600 hover:bg-teal-700"}`}>
              {saved ? "保存しました ✓" : "保存"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
