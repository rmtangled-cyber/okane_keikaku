export interface QuoteResult {
  name: string;
  price: number;
  currency: string;
}

/**
 * Yahoo Finance Chart API v8 から株価を取得
 * 直接アクセスが CORS でブロックされる場合は allorigins.win プロキシ経由にフォールバック
 */
async function fetchYahooChart(symbol: string): Promise<number | null> {
  const yahooUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

  async function parseYahoo(res: Response): Promise<number | null> {
    if (!res.ok) return null;
    try {
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result) return null;
      const price = result.meta?.regularMarketPrice ?? result.meta?.chartPreviousClose;
      return price && price !== 0 ? price : null;
    } catch {
      return null;
    }
  }

  // 1st: 直接アクセス
  try {
    const res = await fetch(yahooUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    });
    const price = await parseYahoo(res);
    if (price !== null) return price;
  } catch { /* CORS or network error → fallback */ }

  // 2nd: allorigins.win CORS プロキシ経由
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
    return await parseYahoo(res);
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

/**
 * 複数通貨の対円レートを一括取得
 * 1st: jsDelivr CDN ホスト型 currency-api（CORS確実・障害ほぼなし）
 * 2nd: Frankfurter API（フォールバック）
 */
async function fetchFxRates(
  currencies: string[],
): Promise<Record<string, number>> {
  const nonJPY = [...new Set(currencies.filter(c => c && c !== "JPY"))];
  if (nonJPY.length === 0) return {};

  // 1st: jsDelivr CDN (fawazahmed0/currency-api)
  // レスポンス形式: { date, jpy: { usd: 0.0067, eur: 0.0062, ... } }
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/jpy.json",
      { signal: AbortSignal.timeout(8000) },
    );
    if (res.ok) {
      const json = await res.json();
      const jpyRates = json?.jpy as Record<string, number> | undefined;
      if (jpyRates) {
        const rates: Record<string, number> = {};
        for (const cur of nonJPY) {
          const rate = jpyRates[cur.toLowerCase()];
          if (rate && rate > 0) rates[cur] = 1 / rate; // 1JPY=0.0067USD → 1USD=149JPY
        }
        if (Object.keys(rates).length > 0) return rates;
      }
    }
  } catch { /* fallback */ }

  // 2nd: Frankfurter API
  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?base=JPY&symbols=${nonJPY.join(",")}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return {};
    const json = await res.json();
    const rates: Record<string, number> = {};
    for (const [cur, rate] of Object.entries(json.rates as Record<string, number>)) {
      if (rate > 0) rates[cur] = 1 / rate;
    }
    return rates;
  } catch {
    return {};
  }
}

/**
 * 複数銘柄を一括取得 + 使用中の通貨のFXレートも取得
 * Returns { prices, fxRates } where fxRates は { "USD": 150.5, ... } (対円)
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

  const fxRates = await fetchFxRates(currencies);
  return { prices, fxRates };
}

/**
 * 投資信託の基準価額取得 → 手動入力を推奨
 */
export async function fetchFundQuote(_code: string): Promise<QuoteResult | null> {
  return null;
}
