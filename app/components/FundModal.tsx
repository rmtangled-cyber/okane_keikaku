"use client";

import { useState, useEffect } from "react";
import { FundHolding, AccountType, calcFutureValue } from "@/lib/types";
import { X } from "lucide-react";

const ACCOUNT_TYPES: AccountType[] = [
  "特定口座", "NISA（成長投資枠）", "NISA（つみたて投資枠）", "一般口座", "iDeCo",
];

interface Props {
  fund?: FundHolding | null;
  onSave: (f: Omit<FundHolding, "id" | "updatedAt">) => void;
  onClose: () => void;
}

export default function FundModal({ fund, onSave, onClose }: Props) {
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("NISA（つみたて投資枠）");
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("7");
  const [monthlyContrib, setMonthlyContrib] = useState("0");
  const [startDate, setStartDate] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (fund) {
      setName(fund.name);
      setAccountType(fund.accountType);
      setPurchaseAmount(String(fund.purchaseAmount));
      setCurrentValue(String(fund.currentValue));
      setExpectedReturn(String(fund.expectedAnnualReturn));
      setMonthlyContrib(String(fund.monthlyContribution));
      setStartDate(fund.startDate ?? "");
      setNote(fund.note ?? "");
    }
  }, [fund]);

  const cv = parseFloat(currentValue) || 0;
  const er = parseFloat(expectedReturn) || 0;
  const mc = parseFloat(monthlyContrib) || 0;
  const preview10 = calcFutureValue(cv, er, mc, 10);
  const preview30 = calcFutureValue(cv, er, mc, 30);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pa = parseFloat(purchaseAmount);
    const cv2 = parseFloat(currentValue);
    if (!name || isNaN(pa) || isNaN(cv2)) return;
    onSave({
      name, accountType,
      purchaseAmount: pa,
      currentValue: cv2,
      expectedAnnualReturn: parseFloat(expectedReturn) || 0,
      monthlyContribution: parseFloat(monthlyContrib) || 0,
      startDate: startDate || undefined,
      note: note || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {fund ? "投資信託を編集" : "投資信託を追加"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ファンド名</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="eMAXIS Slim 全世界株式"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">口座種別</label>
            <select
              value={accountType}
              onChange={e => setAccountType(e.target.value as AccountType)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">取得金額（円）</label>
              <input
                type="number"
                value={purchaseAmount}
                onChange={e => setPurchaseAmount(e.target.value)}
                placeholder="1200000"
                min={0}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">現在評価額（円）</label>
              <input
                type="number"
                value={currentValue}
                onChange={e => setCurrentValue(e.target.value)}
                placeholder="1450000"
                min={0}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                期待年利（%）
                <span className="ml-1 text-xs font-normal text-gray-400">全世界株は7%が目安</span>
              </label>
              <input
                type="number"
                value={expectedReturn}
                onChange={e => setExpectedReturn(e.target.value)}
                placeholder="7"
                min={0}
                max={50}
                step="0.1"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">月次積立額（円）</label>
              <input
                type="number"
                value={monthlyContrib}
                onChange={e => setMonthlyContrib(e.target.value)}
                placeholder="50000"
                min={0}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Preview */}
          {cv > 0 && (
            <div className="bg-indigo-50 rounded-xl p-3 text-sm">
              <div className="text-xs font-semibold text-indigo-700 mb-2">将来予測プレビュー（年利 {er}%）</div>
              <div className="flex gap-4">
                <div>
                  <span className="text-xs text-gray-500">10年後: </span>
                  <span className="font-bold text-indigo-700">
                    {preview10 >= 100000000 ? `${(preview10 / 100000000).toFixed(1)}億` : `${Math.round(preview10 / 10000)}万`}円
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500">30年後: </span>
                  <span className="font-bold text-indigo-700">
                    {preview30 >= 100000000 ? `${(preview30 / 100000000).toFixed(1)}億` : `${Math.round(preview30 / 10000)}万`}円
                  </span>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">開始日（任意）</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ（任意）</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="備考など"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              キャンセル
            </button>
            <button type="submit"
              className="flex-1 py-2.5 bg-indigo-600 rounded-xl text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
