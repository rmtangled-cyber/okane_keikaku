"use client";

import { useState, useEffect } from "react";
import { IncomeProfile, UserProfile } from "@/lib/types";
import { PREFECTURES, calcTakeHome } from "@/lib/taxCalc";
import { calcPension } from "@/lib/pensionCalc";
import { X, AlertTriangle } from "lucide-react";

interface Props {
  profile?: IncomeProfile | null;
  userProfile?: UserProfile | null;
  onSave: (p: Omit<IncomeProfile, "id" | "updatedAt">) => void;
  onClose: () => void;
}

function calcDependentsForMember(
  memberId: "self" | "spouse",
  activeFromYear: number,
  userProfile: UserProfile,
): number {
  const currentYear = new Date().getFullYear();
  const refYear = activeFromYear > 0 ? activeFromYear : currentYear;
  let count = 0;
  if (memberId === "self") {
    const spouse = userProfile.familyMembers.find(m => m.type === "spouse");
    if (spouse?.isDependent) count += 1;
  }
  const children = userProfile.familyMembers.filter(m => m.type === "child");
  for (const child of children) {
    const isOwn = memberId === "self"
      ? (child.dependentOf ?? "self") === "self"
      : child.dependentOf === "spouse";
    if (isOwn && child.birthYear <= refYear) count += 1;
  }
  return count;
}

export default function IncomeProfileModal({ profile, userProfile, onSave, onClose }: Props) {
  const [incomeType, setIncomeType] = useState<"salary" | "pension">("salary");
  const [memberId, setMemberId] = useState<"self" | "spouse">("self");
  const [name, setName] = useState("");
  // salary fields
  const [grossAnnual, setGrossAnnual] = useState("");
  const [bonusAnnual, setBonusAnnual] = useState("");
  const [prefecture, setPrefecture] = useState("東京");
  // pension fields
  const [pensionKoseiYears, setPensionKoseiYears] = useState("35");
  const [pensionAvgMonthly, setPensionAvgMonthly] = useState("");
  // common fields
  const [activeFromYear, setActiveFromYear] = useState("");
  const [activeUntilAge, setActiveUntilAge] = useState("");
  const [fromMode, setFromMode] = useState<"year" | "age">("year");
  const [untilMode, setUntilMode] = useState<"age" | "year">("age");
  const [note, setNote] = useState("");

  const currentYear = new Date().getFullYear();

  function getBirthYear(): number {
    if (!userProfile) return currentYear - 30;
    if (memberId === "spouse") {
      const spouse = userProfile.familyMembers.find(m => m.type === "spouse");
      return spouse?.birthYear ?? currentYear - 30;
    }
    return userProfile.birthYear;
  }

  const birthYear = getBirthYear();
  const fromYearNum = parseInt(activeFromYear) || 0;
  // age は常に currentYear 基準で保存（シミュレーションで age + (year - baseYear) として使う）
  const ageNow = currentYear - birthYear;
  const ageAtFrom = fromYearNum > 0 ? fromYearNum - birthYear : ageNow;
  const ageNum = ageNow; // 保存用
  const depsNum = userProfile
    ? calcDependentsForMember(memberId, fromYearNum, userProfile)
    : 0;

  useEffect(() => {
    if (profile) {
      setIncomeType(profile.incomeType ?? "salary");
      setMemberId(profile.memberId ?? "self");
      setName(profile.name);
      setGrossAnnual(profile.grossAnnual ? String(profile.grossAnnual) : String(profile.grossMonthly * 12));
      setBonusAnnual(profile.bonusAnnual ? String(profile.bonusAnnual) : "");
      setPrefecture(profile.prefecture);
      setPensionKoseiYears(profile.pensionKoseiMonths ? String(Math.round(profile.pensionKoseiMonths / 12)) : "35");
      setPensionAvgMonthly(profile.pensionAvgMonthly ? String(profile.pensionAvgMonthly) : "");
      setActiveFromYear(profile.activeFromYear ? String(profile.activeFromYear) : "");
      setActiveUntilAge(profile.activeUntilAge ? String(profile.activeUntilAge) : "");
      setNote(profile.note ?? "");
    } else if (userProfile) {
      setPrefecture(userProfile.prefecture);
    }
  }, [profile, userProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!profile && userProfile) {
      setPrefecture(userProfile.prefecture);
    }
  }, [memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 年金モード: ラベルを「老齢年金」に自動セット
  useEffect(() => {
    if (incomeType === "pension" && !profile && name === "") {
      setName("老齢年金");
    }
    if (incomeType === "pension" && !profile && activeUntilAge === "") {
      setActiveUntilAge("90");
    }
  }, [incomeType]); // eslint-disable-line react-hooks/exhaustive-deps

  // 年金計算
  const pensionKoseiMonths = (parseInt(pensionKoseiYears) || 0) * 12;
  const pensionAvgMonthlyNum = parseInt(pensionAvgMonthly) || 0;
  const pensionResult = calcPension(pensionKoseiMonths, pensionAvgMonthlyNum);

  // salary fields — grossAnnual = ボーナス込み年収、bonusAnnual = うちボーナス
  const grossAnnualNum = parseFloat(grossAnnual) || 0;
  const bonusAnnualNum = parseFloat(bonusAnnual) || 0;
  const grossMonthlyNum = Math.round((grossAnnualNum - bonusAnnualNum) / 12); // 月次給与（ボーナス除く）

  // 実際に保存する年額（年金なら計算値）
  const effectiveAnnual = incomeType === "pension" ? pensionResult.totalAnnual : grossAnnualNum;
  const effectiveMonthly = Math.round(effectiveAnnual / 12);

  // fromYear ↔ fromAge
  const fromAgeNum = fromYearNum > 0 ? fromYearNum - birthYear : 0;
  const fromDisplayVal = fromMode === "year" ? activeFromYear : (fromYearNum > 0 ? String(fromAgeNum) : "");
  const handleFromChange = (val: string) => {
    if (fromMode === "year") {
      setActiveFromYear(val);
    } else {
      const a = parseInt(val);
      setActiveFromYear(isNaN(a) ? "" : String(birthYear + a));
    }
  };

  // untilAge ↔ untilYear
  const untilAgeNum = parseInt(activeUntilAge) || 0;
  const untilYearNum = untilAgeNum > 0 ? birthYear + untilAgeNum : 0;
  const untilDisplayVal = untilMode === "age" ? activeUntilAge : (untilAgeNum > 0 ? String(untilYearNum) : "");
  const handleUntilChange = (val: string) => {
    if (untilMode === "age") {
      setActiveUntilAge(val);
    } else {
      const yr = parseInt(val);
      setActiveUntilAge(isNaN(yr) ? "" : String(yr - birthYear));
    }
  };

  // プレビューは適用開始年時点の年齢で計算（より正確）
  const salaryPreview = incomeType === "salary" && grossMonthlyNum > 0
    ? calcTakeHome(grossMonthlyNum, prefecture, ageAtFrom, depsNum)
    : null;
  const bonusNet = salaryPreview
    ? Math.round(bonusAnnualNum * (salaryPreview.takeHome / (grossMonthlyNum || 1)))
    : 0;

  const hasSpouse = userProfile?.familyMembers.some(m => m.type === "spouse");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    if (incomeType === "salary" && grossAnnualNum <= 0) return;
    if (incomeType === "pension" && pensionResult.totalAnnual <= 0) return;
    const fromYear = activeFromYear ? parseInt(activeFromYear) : undefined;
    const untilAge = activeUntilAge ? parseInt(activeUntilAge) : undefined;
    onSave({
      incomeType,
      memberId,
      name,
      grossMonthly: effectiveMonthly,
      grossAnnual: effectiveAnnual,
      bonusAnnual: incomeType === "salary" ? (bonusAnnualNum || undefined) : undefined,
      prefecture,
      age: ageNum,
      dependents: depsNum,
      activeFromYear: fromYear,
      activeUntilAge: untilAge,
      pensionKoseiMonths: incomeType === "pension" ? pensionKoseiMonths : undefined,
      pensionAvgMonthly: incomeType === "pension" && pensionAvgMonthlyNum > 0 ? pensionAvgMonthlyNum : undefined,
      note: note || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {profile ? "収入を編集" : "収入を追加"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* 収入の種類 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">収入の種類</label>
            <div className="flex gap-2">
              {(["salary", "pension"] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setIncomeType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    incomeType === t
                      ? "bg-teal-600 text-white border-teal-600"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {t === "salary" ? "給与・副業" : "年金"}
                </button>
              ))}
            </div>
          </div>

          {/* 年金の注意書き */}
          {incomeType === "pension" && (
            <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 space-y-1">
                <p className="font-semibold">設定前に確認してください</p>
                <p>退職までのすべての収入プロファイル（給与など）を登録済みであることを確認してください。ライフプランシミュレーションは退職後の収入として年金を反映します。</p>
              </div>
            </div>
          )}

          {/* 誰の収入か */}
          {hasSpouse && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">誰の収入</label>
              <div className="flex gap-2">
                {(["self", "spouse"] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMemberId(m)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      memberId === m
                        ? "bg-teal-600 text-white border-teal-600"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {m === "self" ? (userProfile?.displayName ?? "自分") : "配偶者"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ラベル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ラベル</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={incomeType === "pension" ? "老齢年金" : "例: 現職、副業"}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          {/* ── 年金モード ── */}
          {incomeType === "pension" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    厚生年金加入期間
                    <span className="ml-1 text-xs font-normal text-gray-400">0年で国民年金のみ</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={pensionKoseiYears}
                      onChange={e => setPensionKoseiYears(e.target.value)}
                      placeholder="35"
                      min={0}
                      max={45}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">年</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    平均標準報酬月額
                    <span className="ml-1 text-xs font-normal text-gray-400">厚生年金期間</span>
                  </label>
                  <input
                    type="number"
                    value={pensionAvgMonthly}
                    onChange={e => setPensionAvgMonthly(e.target.value)}
                    placeholder="350000"
                    min={0}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* 年金計算プレビュー */}
              {pensionKoseiMonths > 0 && (
                <div className="bg-teal-50 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-semibold text-teal-700 mb-2">年金受給額シミュレーション（年額・概算）</div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>老齢基礎年金（国民年金分）</span>
                    <span>¥{pensionResult.kisoAnnual.toLocaleString()}/年</span>
                  </div>
                  {pensionAvgMonthlyNum > 0 && (
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>老齢厚生年金（報酬比例部分）</span>
                      <span>¥{pensionResult.koseiAnnual.toLocaleString()}/年</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-teal-700 pt-2 border-t border-teal-200">
                    <span>年間受給合計</span>
                    <span>¥{pensionResult.totalAnnual.toLocaleString()}/年</span>
                  </div>
                  <div className="flex justify-between text-sm text-teal-600">
                    <span>月額換算</span>
                    <span>¥{pensionResult.totalMonthly.toLocaleString()}/月</span>
                  </div>
                  <p className="text-xs text-gray-400 pt-1">
                    ※ 基礎年金: 816,000円 × 加入月数/480　厚生年金: 平均標準報酬額 × 5.481‰ × 加入月数（令和6年度概算）
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── 給与モード ── */}
          {incomeType === "salary" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    額面年収（円）
                    <span className="ml-1 text-xs font-normal text-gray-400">ボーナス込み</span>
                  </label>
                  <input
                    type="number"
                    value={grossAnnual}
                    onChange={e => setGrossAnnual(e.target.value)}
                    placeholder="5000000"
                    min={0}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                  {grossMonthlyNum > 0 && (
                    <p className="text-xs text-gray-400 mt-1">月次給与: ¥{grossMonthlyNum.toLocaleString()}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    うちボーナス（円）
                    <span className="ml-1 text-xs font-normal text-gray-400">任意・年額</span>
                  </label>
                  <input
                    type="number"
                    value={bonusAnnual}
                    onChange={e => setBonusAnnual(e.target.value)}
                    placeholder="0"
                    min={0}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  {bonusAnnualNum > 0 && grossAnnualNum > 0 && (
                    <p className="text-xs text-gray-400 mt-1">基本給: ¥{(grossAnnualNum - bonusAnnualNum).toLocaleString()}</p>
                  )}
                </div>
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
            </>
          )}

          {/* 適用期間 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  {incomeType === "pension" ? "受給開始年（任意）" : "適用開始（任意）"}
                  <span className="ml-1 text-xs font-normal text-gray-400">
                    {incomeType === "pension" ? "退職・65歳など" : "転職・昇進など"}
                  </span>
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
                  placeholder={fromMode === "year" ? `例: ${birthYear + 65}` : "例: 65"}
                  min={fromMode === "year" ? 2020 : 18}
                  max={fromMode === "year" ? 2100 : 100}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  {fromMode === "year" ? "年" : "歳"}
                </span>
              </div>
              {fromDisplayVal && (
                <p className="text-xs text-gray-400 mt-1">
                  {fromMode === "year" ? `→ ${fromAgeNum}歳` : `→ ${fromYearNum}年`}
                </p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  終了（任意）
                  <span className="ml-1 text-xs font-normal text-gray-400">
                    {incomeType === "pension" ? "想定年齢まで" : "退職など"}
                  </span>
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
                  placeholder={untilMode === "age" ? (incomeType === "pension" ? "例: 90" : "例: 65") : `例: ${birthYear + (incomeType === "pension" ? 90 : 65)}`}
                  min={untilMode === "age" ? 18 : 2020}
                  max={untilMode === "age" ? 110 : 2200}
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

          {/* 年齢・扶養（給与のみ表示） */}
          {incomeType === "salary" && (
            <div className="bg-gray-50 rounded-xl px-4 py-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">
                  年齢（{fromYearNum > 0 ? `${fromYearNum}年時点` : "現在"}）
                </p>
                <p className="font-semibold text-gray-800">{ageAtFrom} 歳</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">
                  扶養家族数（{fromYearNum > 0 ? `${fromYearNum}年時点` : "現在"}）
                </p>
                <p className="font-semibold text-gray-800">{depsNum} 人</p>
              </div>
            </div>
          )}

          {/* 手取りプレビュー（給与のみ） */}
          {salaryPreview && (
            <div className="bg-teal-50 rounded-xl p-3 space-y-1.5 text-sm">
              <div className="text-xs font-semibold text-teal-700 mb-2">手取りシミュレーション（月次）</div>
              {[
                { label: "厚生年金", val: salaryPreview.pension },
                { label: "健康保険" + (ageNum >= 40 && ageNum < 65 ? "・介護" : ""), val: salaryPreview.health },
                { label: "雇用保険", val: salaryPreview.employment },
                { label: "所得税", val: salaryPreview.incomeTax },
                { label: "住民税", val: salaryPreview.residentTax },
              ].map(({ label, val }) => (
                <div key={label} className="flex justify-between text-xs text-gray-600">
                  <span>{label}</span>
                  <span>− ¥{val.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-teal-700 pt-1.5 border-t border-teal-200">
                <span>月間手取り</span>
                <span>¥{salaryPreview.takeHome.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-teal-800 pt-1 border-t border-teal-200">
                <span>年間手取り合計（ボーナス込）</span>
                <span>¥{(salaryPreview.takeHome * 12 + bonusNet).toLocaleString()}</span>
              </div>
              {bonusAnnualNum > 0 && (
                <div className="text-xs text-gray-500 text-right">うちボーナス手取概算: ¥{bonusNet.toLocaleString()}</div>
              )}
            </div>
          )}

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
