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
      setFamilyMembers(prev => [...prev, { type: "spouse", birthYear: currentYear - 30, isDependent: false }]);
    } else if (!exists) {
      setFamilyMembers(prev => prev.filter(m => m.type !== "spouse"));
    }
  }

  function updateSpouse(patch: Partial<FamilyMember>) {
    setFamilyMembers(prev => prev.map(m => m.type === "spouse" ? { ...m, ...patch } : m));
  }

  function addChild() {
    setFamilyMembers(prev => [...prev, { type: "child", birthYear: currentYear - 5, dependentOf: "self" }]);
  }

  function updateChild(idx: number, patch: Partial<FamilyMember>) {
    const target = children[idx];
    setFamilyMembers(prev => prev.map(m => m === target ? { ...m, ...patch } : m));
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

  const spouseIsDependent = spouse?.isDependent ?? false;
  const selfDependents = (spouseIsDependent ? 1 : 0) + children.filter(c => c.dependentOf !== "spouse").length;
  const spouseDependents = children.filter(c => c.dependentOf === "spouse").length;
  const hasSpouse = !!spouse;

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
                <label className="block text-sm font-medium text-gray-700 mb-1">ニックネーム（任意）</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="例: タロウ"
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
              <div className="flex flex-wrap items-center gap-4 bg-gray-50 rounded-xl px-4 py-3">
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
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">生年:</span>
                      <div className="relative">
                        <input
                          type="number"
                          value={spouse.birthYear}
                          onChange={e => updateSpouse({ birthYear: parseInt(e.target.value) || currentYear - 30 })}
                          min={1940}
                          max={currentYear - 15}
                          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-teal-500 pr-8"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">年</span>
                      </div>
                      <span className="text-xs text-gray-400">{currentYear - spouse.birthYear}歳</span>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={spouseIsDependent}
                        onChange={e => updateSpouse({ isDependent: e.target.checked })}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-xs text-gray-600">自分の扶養に入る</span>
                    </label>
                  </>
                )}
              </div>

              {/* 子供 */}
              {children.map((child, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-sm font-medium text-gray-700 min-w-[64px]">子供 {idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">生年:</span>
                    <div className="relative">
                      <input
                        type="number"
                        value={child.birthYear}
                        onChange={e => updateChild(idx, { birthYear: parseInt(e.target.value) || currentYear })}
                        min={currentYear - 30}
                        max={currentYear + 10}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-teal-500 pr-8"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">年</span>
                    </div>
                    {child.birthYear <= currentYear ? (
                      <span className="text-xs text-gray-400">{currentYear - child.birthYear}歳</span>
                    ) : (
                      <span className="text-xs text-teal-500">{child.birthYear - currentYear}年後に生まれる予定</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">扶養:</span>
                    <select
                      value={child.dependentOf ?? "self"}
                      onChange={e => updateChild(idx, { dependentOf: e.target.value as "self" | "spouse" })}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="self">自分</option>
                      {hasSpouse && <option value="spouse">配偶者</option>}
                    </select>
                  </div>
                  <button type="button" onClick={() => removeChild(idx)}
                    className="ml-auto p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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
          {(selfDependents > 0 || spouseDependents > 0) && (
            <div className="bg-teal-50 rounded-xl px-4 py-3 text-sm text-teal-700 space-y-1">
              <div>
                自分の扶養家族: <span className="font-semibold">{selfDependents}人</span>
                {spouseDependents > 0 && (
                  <span className="ml-3">配偶者の扶養家族: <span className="font-semibold">{spouseDependents}人</span></span>
                )}
              </div>
              <p className="text-xs text-teal-500">収入プロファイルの手取り計算に使われます</p>
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
