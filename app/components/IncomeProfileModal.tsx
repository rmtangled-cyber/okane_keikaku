"use client";

import { useState, useEffect } from "react";
import { IncomeProfile, UserProfile } from "@/lib/types";
import { PREFECTURES, calcTakeHome } from "@/lib/taxCalc";
import { X } from "lucide-react";

interface Props {
  profile?: IncomeProfile | null;
  userProfile?: UserProfile | null;
  onSave: (p: Omit<IncomeProfile, "id" | "updatedAt">) => void;
  onClose: () => void;
}

export default function IncomeProfileModal({ profile, userProfile, onSave, onClose }: Props) {
  const [name, setName] = useState("");
  const [grossAnnual, setGrossAnnual] = useState("");
  const [bonusAnnual, setBonusAnnual] = useState("");
  const [prefecture, setPrefecture] = useState("東京");
  const [age, setAge] = useState("");
  const [dependents, setDependents] = useState("");
  const [activeFromYear, setActiveFromYear] = useState("");
  const [activeUntilAge, setActiveUntilAge] = useState("");
  const [fromMode, setFromMode] = useState<"year" | "age">("year");
  const [untilMode, setUntilMode] = useState<"age" | "year">("age");
  const [note, setNote] = useState("");

  const currentYear = new Date().getFullYear();

  // プロフィールから扶養家族数を計算
  function calcDependentsFromProfile(up: UserProfile): number {
    const spouse = up.familyMembers.find(m => m.type === "spouse") ? 1 : 0;
    const childCount = up.familyMembers.filter(m => m.type === "child").length;
    return spouse + childCount;
  }

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      // 年収優先、なければ月収×12（旧データとの互換）
      setGrossAnnual(profile.grossAnnual ? String(profile.grossAnnual) : String(profile.grossMonthly * 12));
      setBonusAnnual(profile.bonusAnnual ? String(profile.bonusAnnual) : "");
      setPrefecture(profile.prefecture);
      setAge(String(profile.age));
      setDependents(String(profile.dependents));
      setActiveFromYear(profile.activeFromYear ? String(profile.activeFromYear) : "");
      setActiveUntilAge(profile.activeUntilAge ? String(profile.activeUntilAge) : "");
      setNote(profile.note ?? "");
    } else if (userProfile) {
      // 新規追加時: プロフィールからデフォルト値を引用
      setPrefecture(userProfile.prefecture);
      setAge(String(currentYear - userProfile.birthYear));
      setDependents(String(calcDependentsFromProfile(userProfile)));
    }
  }, [profile, userProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  const grossAnnualNum = parseFloat(grossAnnual) || 0;
  const grossMonthlyNum = Math.round(grossAnnualNum / 12);
  const bonusAnnualNum = parseFloat(bonusAnnual) || 0;
  const ageNum = parseInt(age) || 30;
  const depsNum = parseInt(dependents) || 0;

  // fromYear ↔ fromAge 変換（内部は年で保持）
  const fromYearNum = parseInt(activeFromYear) || 0;
  const fromAgeNum = fromYearNum > 0 ? ageNum + (fromYearNum - currentYear) : 0;
  const fromDisplayVal = fromMode === "year" ? activeFromYear : (fromYearNum > 0 ? String(fromAgeNum) : "");
  const handleFromChange = (val: string) => {
    if (fromMode === "year") {
      setActiveFromYear(val);
      // プロフィールの生年があれば適用開始年齢を自動更新
      if (userProfile && val) {
        const yr = parseInt(val);
        if (!isNaN(yr)) setAge(String(yr - userProfile.birthYear));
      }
    } else {
      const a = parseInt(val);
      setActiveFromYear(isNaN(a) ? "" : String(currentYear + (a - ageNum)));
    }
  };

  // untilAge ↔ untilYear 変換（内部は年齢で保持）
  const untilAgeNum = parseInt(activeUntilAge) || 0;
  const untilYearNum = untilAgeNum > 0 ? currentYear + (untilAgeNum - ageNum) : 0;
  const untilDisplayVal = untilMode === "age" ? activeUntilAge : (untilAgeNum > 0 ? String(untilYearNum) : "");
  const handleUntilChange = (val: string) => {
    if (untilMode === "age") {
      setActiveUntilAge(val);
    } else {
      const yr = parseInt(val);
      setActiveUntilAge(isNaN(yr) ? "" : String(ageNum + (yr - currentYear)));
    }
  };
  const preview = grossMonthlyNum > 0 ? calcTakeHome(grossMonthlyNum, prefecture, ageNum, depsNum) : null;
  const bonusNet = preview ? Math.round(bonusAnnualNum * (preview.takeHome / (grossMonthlyNum || 1))) : 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || grossAnnualNum <= 0) return;
    const fromYear = activeFromYear ? parseInt(activeFromYear) : undefined;
    const untilAge = activeUntilAge ? parseInt(activeUntilAge) : undefined;
    onSave({
      name,
      grossMonthly: grossMonthlyNum,
      grossAnnual: grossAnnualNum,
      bonusAnnual: bonusAnnualNum || undefined,
      prefecture,
      age: ageNum,
      dependents: depsNum,
      activeFromYear: fromYear,
      activeUntilAge: untilAge,
      note: note || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {profile ? "収入を編集" : "収入を追加"}
            </h2>
            {!profile && userProfile && (
              <p className="text-xs text-teal-600 mt-0.5">プロフィールから都道府県・年齢・扶養を引用しました</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ラベル</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例: 現職、副業"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                年収・基本給（円）
                <span className="ml-1 text-xs font-normal text-gray-400">ボーナス除く</span>
              </label>
              <input
                type="number"
                value={grossAnnual}
                onChange={e => setGrossAnnual(e.target.value)}
                placeholder="4200000"
                min={0}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
              {grossMonthlyNum > 0 && (
                <p className="text-xs text-gray-400 mt-1">月換算: ¥{grossMonthlyNum.toLocaleString()}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ボーナス年額（円）
                <span className="ml-1 text-xs font-normal text-gray-400">任意・額面</span>
              </label>
              <input
                type="number"
                value={bonusAnnual}
                onChange={e => setBonusAnnual(e.target.value)}
                placeholder="0"
                min={0}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">年齢</label>
              <input
                type="number"
                value={age}
                onChange={e => setAge(e.target.value)}
                placeholder="30"
                min={18}
                max={80}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">扶養家族</label>
              <input
                type="number"
                value={dependents}
                onChange={e => setDependents(e.target.value)}
                placeholder="0"
                min={0}
                max={10}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Live preview */}
          {preview && (
            <div className="bg-teal-50 rounded-xl p-3 space-y-1.5 text-sm">
              <div className="text-xs font-semibold text-teal-700 mb-2">手取りシミュレーション（月次）</div>
              {[
                { label: "厚生年金", val: preview.pension },
                { label: "健康保険" + (ageNum >= 40 && ageNum < 65 ? "・介護" : ""), val: preview.health },
                { label: "雇用保険", val: preview.employment },
                { label: "所得税", val: preview.incomeTax },
                { label: "住民税", val: preview.residentTax },
              ].map(({ label, val }) => (
                <div key={label} className="flex justify-between text-xs text-gray-600">
                  <span>{label}</span>
                  <span>− ¥{val.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-teal-700 pt-1.5 border-t border-teal-200">
                <span>月間手取り</span>
                <span>¥{preview.takeHome.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-teal-800 pt-1 border-t border-teal-200">
                <span>年間手取り合計（ボーナス込）</span>
                <span>¥{(preview.takeHome * 12 + bonusNet).toLocaleString()}</span>
              </div>
              {bonusAnnualNum > 0 && (
                <div className="text-xs text-gray-500 text-right">うちボーナス手取概算: ¥{bonusNet.toLocaleString()}</div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  適用開始（任意）
                  <span className="ml-1 text-xs font-normal text-gray-400">転職・昇進など</span>
                </label>
                <button type="button" onClick={() => setFromMode(m => m === "year" ? "age" : "year")}
                  className="text-xs px-2 py-0.5 rounded-full border border-teal-300 text-teal-600 hover:bg-teal-50 transition-colors">
                  {fromMode === "year" ? "年齢で入力" : "年で入力"}
                </button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={fromDisplayVal}
                  onChange={e => handleFromChange(e.target.value)}
                  placeholder={fromMode === "year" ? `例: ${currentYear + 5}` : "例: 35"}
                  min={fromMode === "year" ? 2020 : 18}
                  max={fromMode === "year" ? 2100 : 80}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  {fromMode === "year" ? "年" : "歳"}
                </span>
              </div>
              {fromDisplayVal && (
                <p className="text-xs text-gray-400 mt-1">
                  {fromMode === "year" ? `→ ${ageNum}歳から${fromAgeNum}歳` : `→ ${fromYearNum}年`}
                </p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  終了（任意）
                  <span className="ml-1 text-xs font-normal text-gray-400">退職など</span>
                </label>
                <button type="button" onClick={() => setUntilMode(m => m === "age" ? "year" : "age")}
                  className="text-xs px-2 py-0.5 rounded-full border border-teal-300 text-teal-600 hover:bg-teal-50 transition-colors">
                  {untilMode === "age" ? "年で入力" : "年齢で入力"}
                </button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={untilDisplayVal}
                  onChange={e => handleUntilChange(e.target.value)}
                  placeholder={untilMode === "age" ? "例: 65" : `例: ${currentYear + (65 - ageNum)}`}
                  min={untilMode === "age" ? 18 : 2020}
                  max={untilMode === "age" ? 100 : 2100}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  {untilMode === "age" ? "歳" : "年"}
                </span>
              </div>
              {untilDisplayVal && (
                <p className="text-xs text-gray-400 mt-1">
                  {untilMode === "age" ? `→ ${untilYearNum}年` : `→ ${untilAgeNum}歳`}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ（任意）</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="備考など"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              キャンセル
            </button>
            <button type="submit"
              className="flex-1 py-2.5 bg-teal-600 rounded-xl text-sm font-medium text-white hover:bg-teal-700 transition-colors">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
