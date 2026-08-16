"use client";

import { useState, useEffect } from "react";
import { StockHolding, AccountType } from "@/lib/types";
import { X } from "lucide-react";

const ACCOUNT_TYPES: AccountType[] = [
  "特定口座", "NISA（成長投資枠）", "NISA（つみたて投資枠）", "一般口座", "iDeCo",
];

interface Props {
  stock?: StockHolding | null;
  onSave: (s: Omit<StockHolding, "id" | "updatedAt">) => void;
  onClose: () => void;
}

export default function StockModal({ stock, onSave, onClose }: Props) {
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("特定口座");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [shares, setShares] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (stock) {
      setTicker(stock.ticker);
      setName(stock.name);
      setAccountType(stock.accountType);
      setPurchasePrice(String(stock.purchasePrice));
      setShares(String(stock.shares));
      setCurrentPrice(String(stock.currentPrice));
      setPurchaseDate(stock.purchaseDate ?? "");
      setNote(stock.note ?? "");
    }
  }, [stock]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pp = parseFloat(purchasePrice);
    const sh = parseFloat(shares);
    const cp = parseFloat(currentPrice);
    if (!ticker || !name || isNaN(pp) || isNaN(sh) || isNaN(cp)) return;
    onSave({
      ticker: ticker.toUpperCase(),
      name, accountType,
      purchasePrice: pp,
      shares: sh,
      currentPrice: cp,
      purchaseDate: purchaseDate || undefined,
      note: note || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {stock ? "株式を編集" : "株式を追加"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                銘柄コード
                <span className="ml-1 text-xs font-normal text-gray-400">例: 7203 / VTI</span>
              </label>
              <input
                type="text"
                value={ticker}
                onChange={e => setTicker(e.target.value)}
                placeholder="7203"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">口座種別</label>
              <select
                value={accountType}
                onChange={e => setAccountType(e.target.value as AccountType)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">銘柄名</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="トヨタ自動車"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">取得単価（円）</label>
              <input
                type="number"
                value={purchasePrice}
                onChange={e => setPurchasePrice(e.target.value)}
                placeholder="2500"
                min={0}
                step="0.01"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">保有株数</label>
              <input
                type="number"
                value={shares}
                onChange={e => setShares(e.target.value)}
                placeholder="100"
                min={0}
                step="0.01"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              現在値（円）
              <span className="ml-1 text-xs font-normal text-gray-400">手動入力</span>
            </label>
            <input
              type="number"
              value={currentPrice}
              onChange={e => setCurrentPrice(e.target.value)}
              placeholder="3200"
              min={0}
              step="0.01"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">取得日（任意）</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={e => setPurchaseDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ（任意）</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="備考など"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              キャンセル
            </button>
            <button type="submit"
              className="flex-1 py-2.5 bg-blue-600 rounded-xl text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
