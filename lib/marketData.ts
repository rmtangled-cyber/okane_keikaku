export interface QuoteResult {
  name: string;
  price: number;
  currency: string;
}

/**
 * Yahoo Finance Chart API v8 から株価を取得
 * ブラウザから CORS なしでアクセス可能なエンドポイント
 * 日本株: 4桁コード → symbol = "7203.T"
 * 米国株: ティッカーそのまま → "AAPL"
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
    // 米国として失敗した場合、東証を試す
    price = await fetchYahooChart(`${t}.T`);
    if (price !== null) isJP = true;
  }
  if (price === null) return null;

  return { name: t, price, currency: isJP ? "JPY" : "USD" };
}

/**
 * USD/JPYレートをYahoo Financeから取得
 */
export async function fetchUsdJpyRate(): Promise<number | null> {
  return fetchYahooChart("USDJPY=X");
}

/**
 * 複数銘柄を一括取得（直列、間隔なし）
 * Returns { prices: map of ticker → price, usdJpyRate: USD/JPYレート or null }
 */
export async function fetchStockQuotesBulk(
  tickers: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ prices: Map<string, number>; usdJpyRate: number | null }> {
  const prices = new Map<string, number>();
  for (let i = 0; i < tickers.length; i++) {
    const q = await fetchStockQuote(tickers[i]);
    if (q) prices.set(tickers[i].toUpperCase(), q.price);
    onProgress?.(i + 1, tickers.length);
  }
  const usdJpyRate = await fetchUsdJpyRate();
  return { prices, usdJpyRate };
}

/**
 * 投資信託（ファンドコード8桁）の基準価額を取得
 * → 手動入力を推奨
 */
export async function fetchFundQuote(_code: string): Promise<QuoteResult | null> {
  return null;
}
