export interface QuoteResult {
  name: string;
  price: number;
  currency: string;
}

/**
 * Yahoo Finance Chart API v8 から株価・FXレートを取得
 * ブラウザから CORS なしでアクセス可能
 */
async function fetchYahooChart(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;
    const price = result.meta?.regularMarketPrice ?? result.meta?.chartPreviousClose;
    if (!price || price === 0) return null;
    return price;
  } catch {
    return null;
  }
}

/**
 * 株式の現在値を取得
 * - 4桁数字 → 東証（symbol: "1234.T"）
 * - それ以外 → 米国株として試して失敗したら ".T" も試す
 */
export async function fetchStockQuote(ticker: string): Promise<QuoteResult | null> {
  const t = ticker.trim().toUpperCase();
  let symbol: string;
  let isJP: boolean;

  if (/^\d{4}$/.test(t)) {
    symbol = `${t}.T`;
    isJP = true;
  } else {
    symbol = t;
    isJP = false;
  }

  let price = await fetchYahooChart(symbol);
  if (price === null && !isJP) {
    price = await fetchYahooChart(`${t}.T`);
    if (price !== null) isJP = true;
  }
  if (price === null) return null;

  return { name: t, price, currency: isJP ? "JPY" : "USD" };
}

// Yahoo Finance の為替シンボル（対円）
const FX_SYMBOLS: Record<string, string> = {
  USD: "USDJPY=X",
  EUR: "EURJPY=X",
  GBP: "GBPJPY=X",
  AUD: "AUDJPY=X",
  CAD: "CADJPY=X",
  CHF: "CHFJPY=X",
  HKD: "HKDJPY=X",
  SGD: "SGDJPY=X",
  CNY: "CNYJPY=X",
};

/**
 * 指定通貨の円レートを取得（JPYなら1を返す）
 */
export async function fetchFxRate(currencyCode: string): Promise<number | null> {
  if (currencyCode === "JPY") return 1;
  const sym = FX_SYMBOLS[currencyCode];
  if (!sym) return null;
  return fetchYahooChart(sym);
}

/**
 * 複数銘柄を一括取得 + 使用されている通貨のFXレートも取得
 * Returns { prices, fxRates } where fxRates is { "USD": 150.5, ... }
 */
export async function fetchStockQuotesBulk(
  tickers: string[],
  currencies: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ prices: Map<string, number>; fxRates: Record<string, number> }> {
  const prices = new Map<string, number>();
  for (let i = 0; i < tickers.length; i++) {
    const q = await fetchStockQuote(tickers[i]);
    if (q) prices.set(tickers[i].toUpperCase(), q.price);
    onProgress?.(i + 1, tickers.length);
  }

  // 使用中の非JPY通貨のFXレートを取得
  const uniqueCurrencies = [...new Set(currencies.filter(c => c && c !== "JPY"))];
  const fxRates: Record<string, number> = {};
  for (const cur of uniqueCurrencies) {
    const rate = await fetchFxRate(cur);
    if (rate) fxRates[cur] = rate;
  }

  return { prices, fxRates };
}

/**
 * 投資信託（ファンドコード8桁）の基準価額を取得
 * → 手動入力を推奨
 */
export async function fetchFundQuote(_code: string): Promise<QuoteResult | null> {
  return null;
}
