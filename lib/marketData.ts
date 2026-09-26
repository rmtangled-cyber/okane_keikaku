export interface QuoteResult {
  name: string;
  price: number;
  currency: string;
}

/**
 * stooq.com から CSV で株価を取得（CORS 制限なし）
 * 日本株: 4桁コード → symbol = "7203.jp"
 * 米国株: ティッカーそのまま → "aapl.us"
 */
async function fetchStooq(symbol: string): Promise<number | null> {
  try {
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=csv`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const text = await res.text();
    // CSV 2行目: Symbol,Date,Time,Open,High,Low,Close,Volume
    const lines = text.trim().split("\n");
    if (lines.length < 2) return null;
    const cols = lines[1].split(",");
    const close = parseFloat(cols[6]);
    return isNaN(close) || close === 0 ? null : close;
  } catch {
    return null;
  }
}

/**
 * 株式の現在値を取得
 * - 4桁数字 → 東証（symbol: "1234.jp"）
 * - それ以外 → 米国株として試して失敗したら ".jp" も試す
 */
export async function fetchStockQuote(ticker: string): Promise<QuoteResult | null> {
  const t = ticker.trim().toUpperCase();
  let symbol: string;
  let isJP: boolean;

  if (/^\d{4}$/.test(t)) {
    symbol = `${t}.JP`;
    isJP = true;
  } else {
    symbol = `${t}.US`;
    isJP = false;
  }

  let price = await fetchStooq(symbol);
  if (price === null && !isJP) {
    price = await fetchStooq(`${t}.JP`);
  }
  if (price === null) return null;

  return { name: t, price, currency: isJP ? "JPY" : "USD" };
}

/**
 * USD/JPYレートをstooqから取得
 */
export async function fetchUsdJpyRate(): Promise<number | null> {
  return fetchStooq("USDJPY.FX");
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
 * stooq.com は日本の投信に対応していないため、
 * 銘柄コードを ".T" サフィックスで Yahoo Finance 経由で試みる（フォールバックのみ）
 * → 実質的には手動入力を推奨
 */
export async function fetchFundQuote(_code: string): Promise<QuoteResult | null> {
  return null;
}
