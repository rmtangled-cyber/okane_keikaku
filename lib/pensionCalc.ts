// 公的年金（老齢年金）の概算計算ユーティリティ
// 参考: 日本年金機構 / 令和6年度適用額

// 老齢基礎年金満額（令和6年度）
export const NENKIN_KISO_FULL_ANNUAL = 816_000;

/**
 * 老齢基礎年金（年額）
 * = 816,000円 × min(加入月数, 480) / 480
 */
export function calcKisoNenkin(enrolledMonths: number): number {
  const months = Math.min(Math.max(enrolledMonths, 0), 480);
  return Math.floor(NENKIN_KISO_FULL_ANNUAL * months / 480);
}

/**
 * 老齢厚生年金 報酬比例部分（年額）
 * = 平均標準報酬額 × 5.481/1000 × 加入月数
 * ※ 2003年以降の総報酬制に基づく簡易計算
 */
export function calcKoseiNenkin(avgStandardMonthly: number, enrolledMonths: number): number {
  if (avgStandardMonthly <= 0 || enrolledMonths <= 0) return 0;
  return Math.floor(avgStandardMonthly * 5.481 / 1000 * enrolledMonths);
}

export interface PensionResult {
  kisoAnnual: number;   // 老齢基礎年金（年額）
  koseiAnnual: number;  // 老齢厚生年金（年額）
  totalAnnual: number;  // 合計年額
  totalMonthly: number; // 合計月額
}

/**
 * 公的年金合計の概算
 * @param koseiMonths   厚生年金加入月数（0なら国民年金のみ）
 * @param avgMonthly    厚生年金期間の平均標準報酬月額（円）
 * @param kisoMonths    国民年金加入月数（省略時 = koseiMonths、厚生年金期間中は自動加入のため）
 */
export function calcPension(
  koseiMonths: number,
  avgMonthly: number,
  kisoMonths?: number,
): PensionResult {
  const effectiveKisoMonths = kisoMonths !== undefined ? kisoMonths : koseiMonths;
  const kisoAnnual = calcKisoNenkin(effectiveKisoMonths);
  const koseiAnnual = calcKoseiNenkin(avgMonthly, koseiMonths);
  const totalAnnual = kisoAnnual + koseiAnnual;
  return {
    kisoAnnual,
    koseiAnnual,
    totalAnnual,
    totalMonthly: Math.floor(totalAnnual / 12),
  };
}
