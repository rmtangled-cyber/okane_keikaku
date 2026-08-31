"use client";

import { useState, useEffect } from "react";
import { UserProfile, FamilyMember } from "@/lib/types";
import { PREFECTURES } from "@/lib/taxCalc";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  profile: UserProfile | null;
  onSave: (p: UserProfile) => void;
}

export default function UserProfileTab({ profile, onSave }: Props) {
  const currentYear = new Date().getFullYear();

  const [displayName, setDisplayName] = useState("");
  const [birthYear, setBirthYear] = useState(String(currentYear - 30));
  const [prefecture, setPrefecture] = useState("東京");
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName ?? "");
    setBirthYear(String(profile.birthYear));
    setPrefecture(profile.prefecture);
    setFamilyMembers(profile.familyMembers ?? []);
  }, [profile]);

  const birthYearNum = parseInt(birthYear) || currentYear - 30;
  const currentAge = currentYear - birthYearNum;

  const spouse = familyMembers.find(m => m.type === "spouse");
  const children = familyMembers.filter(m => m.type === "child");

  function setSpouse(exists: boolean) {
    if (exists && !spouse) {
      setFamilyMembers(prev => [...prev, { type: "spouse", birthYear: currentYear - 30 }]);
    } else if (!exists) {
      setFamilyMembers(prev => prev.filter(m => m.type !== "spouse"));
    }
  }

  function updateSpouseBirthYear(val: string) {
    const yr = parseInt(val) || currentYear - 30;
    setFamilyMembers(prev => prev.map(m => m.type === "spouse" ? { ...m, birthYear: yr } : m));
  }

  function addChild() {
    setFamilyMembers(prev => [...prev, { type: "child", birthYear: currentYear - 5 }]);
  }

  function updateChildBirthYear(idx: number, val: string) {
    const yr = parseInt(val) || currentYear - 5;
    const childIdx = familyMembers.filter(m => m.type === "child").indexOf(children[idx]);
    const globalIdx = familyMembers.indexOf(familyMembers.filter(m => m.type === "child")[childIdx]);
    setFamilyMembers(prev => prev.map((m, i) => i === globalIdx ? { ...m, birthYear: yr } : m));
  }

  function removeChild(idx: number) {
    const target = children[idx];
    setFamilyMembers(prev => prev.filter(m => m !== target));
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      id: "default",
      displayName: displayName || undefined,
      birthYear: birthYearNum,
      prefecture,
      familyMembers,
      updatedAt: new Date().toISOString(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const totalDependents = (spouse ? 1 : 0) + children.length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">プロフィール設定</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-5">

          {/* 基本情報 */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">基本情報</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名前（任意）</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="例: 田中 太郎"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">生年（西暦）</label>
                <div className="relative">
                  <input
                    type="number"
                    value={birthYear}
                    onChange={e => setBirthYear(e.target.value)}
                    min={1940}
                    max={currentYear - 15}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">年</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">現在 {currentAge} 歳</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">都道府県</label>
                <select
                  value={prefecture}
                  onChange={e => setPrefecture(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 家族構成 */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">家族構成</h3>
            <div className="space-y-3">
              {/* 配偶者 */}
              <div className="flex items-center gap-4 bg-gray-50 rounded-xl px-4 py-3">
                <label className="flex items-center gap-2 cursor-pointer min-w-[80px]">
                  <input
                    type="checkbox"
                    checked={!!spouse}
                    onChange={e => setSpouse(e.target.checked)}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-gray-700">配偶者</span>
                </label>
                {spouse && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">生年:</span>
                    <div className="relative">
                      <input
                        type="number"
                        value={spouse.birthYear}
                        onChange={e => updateSpouseBirthYear(e.target.value)}
                        min={1940}
                        max={currentYear - 15}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-teal-500 pr-8"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">年</span>
                    </div>
                    <span className="text-xs text-gray-400">{currentYear - spouse.birthYear}歳</span>
                  </div>
                )}
              </div>

              {/* 子供 */}
              {children.map((child, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-sm font-medium text-gray-700 min-w-[80px]">子供 {idx + 1}</span>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs text-gray-500">生年:</span>
                    <div className="relative">
                      <input
                        type="number"
                        value={child.birthYear}
                        onChange={e => updateChildBirthYear(idx, e.target.value)}
                        min={currentYear - 30}
                        max={currentYear}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-teal-500 pr-8"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">年</span>
                    </div>
                    <span className="text-xs text-gray-400">{currentYear - child.birthYear}歳</span>
                  </div>
                  <button type="button" onClick={() => removeChild(idx)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <button type="button" onClick={addChild}
                className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 px-4 py-2 hover:bg-teal-50 rounded-xl transition-colors">
                <Plus size={14} />
                子供を追加
              </button>
            </div>
          </div>

          {/* サマリー */}
          {totalDependents > 0 && (
            <div className="bg-teal-50 rounded-xl px-4 py-3 text-sm text-teal-700">
              扶養家族数: <span className="font-semibold">{totalDependents}人</span>
              <span className="ml-2 text-xs text-teal-500">（収入モーダルのデフォルト値に使われます）</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">このプロフィールは収入追加時のデフォルト値として使用されます</p>
            <button type="submit"
              className={`px-5 py-2 rounded-xl text-sm font-medium text-white transition-colors ${saved ? "bg-green-500" : "bg-teal-600 hover:bg-teal-700"}`}>
              {saved ? "保存しました ✓" : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
