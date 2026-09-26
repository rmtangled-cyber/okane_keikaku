"use client";

import { useState, useEffect } from "react";
import { StockHolding, AccountType, CURRENCIES } from "@/lib/types";
import { fetchStockQuote } from "@/lib/marketData";
import { X, RefreshCw, Loader2 } from "lucide-react";

const ACCOUNT_TYPES: AccountType[] = [
  "特定口座", "NISA（成長投資枠）", "NISA（つみたて投資枠）", "一般口座", "iDeCo",
];

interface MemberOption { id: string; label: string; }

interface Props {
  stock?: StockHolding | null;
  memberOptions?: MemberOption[];
  onSave: (s: Omit<StockHolding, "id" | "updatedAt">) => void;
  onClose: () => void;
}

export default function StockModal({ stock, memberOptions, onSave, onClose }: Props) {
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("特定口座");
  const [memberId, setMemberId] = useState<string | undefined>(undefined);
  const [purchaseCurrency, setPurchaseCurrency] = useState("JPY");
  const [currentCurrency, setCurrentCurrency] = useState("JPY");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [shares, setShares] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [note, setNote] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (stock) {
      setTicker(stock.ticker);
      setName(stock.name);
      setAccountType(stock.accountType);
      setMemberId(stock.memberId);
      // 旧フィールド currency からの移行
      const legacyCur = stock.currency === "USD" ? "USD" : "JPY";
      setPurchaseCurrency(stock.purchaseCurrency ?? legacyCur);
      setCurrentCurrency(stock.currentCurrency ?? legacyCur);
      setPurchasePrice(String(stock.purchasePrice));
      setShares(String(stock.shares));
      setCurrentPrice(String(stock.currentPrice));
      setPurchaseDate(stock.purchaseDate ?? "");
      setNote(stock.note ?? "");
    }
  }, [stock]);

  async function lookupTicker(t: string) {
    if (!t.trim()) return;
    setFetching(true);
    setFetchError(null);
    const result = await fetchStockQuote(t);
    setFetching(false);
    if (result) {
      if (!name) setName(result.name);
      setCurrentPrice(String(result.price % 1 === 0 ? result.price : result.price.toFixed(2)));
      // 取得した通貨を自動セット
      if (result.currency === "USD") {
        setCurrentCurrency("USD");
        if (!stock) setPurchaseCurrency("USD");
      }
    } else {
      setFetchError("株価を自動取得できませんでした。下の「現在値」欄に手動で入力してください。");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pp = parseFloat(purchasePrice);
    const sh = parseFloat(shares);
    const cp = parseFloat(currentPrice);
    if (!ticker || !name || isNaN(pp) || isNaN(sh) || isNaN(cp)) return;
    onSave({
      ticker: ticker.toUpperCase(),
      name, accountType,
      memberId: memberId || undefined,
      purchaseCurrency,
      currentCurrency,
      purchasePrice: pp,
      shares: sh,
      currentPrice: cp,
      purchaseDate: purchaseDate || undefined,
      note: note || undefined,
    });
  }

  const currencySelect = (value: string, onChange: (v: string) => void, id: string) => (
    <select
      id={id}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shrink-0"
    >
      {CURRENCIES.map(c => (
        <option key={c.code} value={c.code}>
          {c.symbol} {c.name}
        </option>
      ))}
    </select>
  );

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
          {memberOptions && memberOptions.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">名義人</label>
              <div className="flex gap-2">
                {memberOptions.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMemberId(memberId === opt.id ? undefined : opt.id)}
                    className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                      memberId === opt.id
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                銘柄コード
                <span className="ml-1 text-xs font-normal text-gray-400">例: 7203 / VTI</span>
              </label>
              <input
                type="text"
                value={ticker}
                onChange={e => { setTicker(e.target.value); setFetchError(null); }}
                onBlur={e => lookupTicker(e.target.value)}
                placeholder="7203"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              {fetching && (
                <div className="flex items-center gap-1 mt-1 text-xs text-blue-500">
                  <Loader2 size={11} className="animate-spin" /> 取得中…
                </div>
              )}
              {fetchError && (
                <div className="mt-1 text-xs text-orange-500">{fetchError}</div>
              )}
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

          {/* 取得単価 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">取得単価</label>
            <div className="flex gap-2">
              {currencySelect(purchaseCurrency, setPurchaseCurrency, "purchase-currency")}
              <input
                type="number"
                value={purchasePrice}
                onChange={e => setPurchasePrice(e.target.value)}
                placeholder={purchaseCurrency === "JPY" ? "2500" : "150.00"}
                min={0}
                step="0.0001"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">保有株数</label>
            <input
              type="number"
              value={shares}
              onChange={e => setShares(e.target.value)}
              placeholder="100"
              min={0}
              step="0.0001"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* 現在値 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              現在値
              <button
                type="button"
                onClick={() => lookupTicker(ticker)}
                disabled={fetching || !ticker}
                className="ml-2 inline-flex items-center gap-0.5 text-xs text-blue-500 hover:text-blue-700 disabled:opacity-40"
              >
                {fetching ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                再取得
              </button>
            </label>
            <div className="flex gap-2">
              {currencySelect(currentCurrency, setCurrentCurrency, "current-currency")}
              <input
                type="number"
                value={currentPrice}
                onChange={e => { setCurrentPrice(e.target.value); if (fetchError) setFetchError(null); }}
                placeholder={currentCurrency === "JPY" ? "3200" : "155.00"}
                min={0}
                step="0.0001"
                className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${fetchError ? "border-orange-400 ring-orange-200 focus:ring-orange-400 bg-orange-50" : "border-gray-200 focus:ring-blue-500"}`}
                required
                autoFocus={!!fetchError}
              />
            </div>
            {fetchError && !currentPrice && (
              <p className="mt-1 text-xs text-orange-600">↑ ここに現在の株価を入力してください</p>
            )}
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
