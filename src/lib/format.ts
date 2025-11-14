// lib/format.ts
/**
 * 숫자를 로케일/소수자릿수에 맞춰 포맷합니다.
 * param n 포맷할 숫자
 * param maximumFractionDigits 최대 소수 자릿수 (기본 6)
 * param locale Intl 로케일 (기본 'en-US')
 */
export function formatAmount(
  n: number,
  maximumFractionDigits = 6,
  locale = "en-US"
): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(n);
}

export function nfmt(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(n);
}
