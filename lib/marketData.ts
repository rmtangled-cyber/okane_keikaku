// Yahoo Finance 非公式 API を使った銘柄情報取得
// ブラウザから直接 fetch（静的サイト向け、CORSはYahoo Finance側で許可済み）

export interface QuoteResult {
  name: string;
  price: number;  // 株式: 現在株価（円）、投信: 基準価額（円/10000口）
  currency: string;
}

async function fetchChart(symbol: string): Promise<QuoteResult | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?region=JP&lang=ja`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    return {
      name: meta.longName ?? meta.shortName ?? symbol,
      price: meta.regularMarketPrice,
      currency: meta.currency ?? "JPY",
    };
  } catch {
    return null;
  }
}

// Yahoo Finance 検索 API: 銘柄名→シンボル解決に使う
async function searchSymbol(query: string): Promise<string | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&lang=ja&region=JP&quotesCount=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = await res.json();
    const first = json?.quotes?.[0];
    return first?.symbol ?? null;
  } catch {
    return null;
  }
}

/**
 * 株式の現在値と銘柄名を取得
 * - 4桁数字 → 東証（.T サフィックス）
 * - それ以外 → そのまま試して失敗したら .T も試す
 */
export async function fetchStockQuote(ticker: string): Promise<QuoteResult | null> {
  const t = ticker.trim().toUpperCase();
  if (/^\d{4}$/.test(t)) return fetchChart(`${t}.T`);
  const direct = await fetchChart(t);
  if (direct) return direct;
  return fetchChart(`${t}.T`);
}

/**
 * 投資信託（ファンドコード8桁）の基準価額と銘柄名を取得
 * Yahoo Finance の検索 API でシンボルを解決してから quote を取得する
 */
export async function fetchFundQuote(code: string): Promise<QuoteResult | null> {
  const c = code.trim();
  // まず直接コードで検索してシンボルを取得
  const symbol = await searchSymbol(c);
  if (symbol) {
    const result = await fetchChart(symbol);
    if (result) return result;
  }
  // フォ��ルバック: .T サフィックスで直接試す
  return fetchChart(`${c}.T`);
}
