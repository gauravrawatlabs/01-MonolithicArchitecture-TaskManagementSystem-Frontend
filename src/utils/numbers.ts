/**
 * "1,284", "12.9K", "4.2M": compact for large values, full below 10,000 (dataviz guidance:
 * figures stay exact while they still fit).
 */
export function formatCount(value: number, locale?: string): string {
  if (Math.abs(value) < 10_000) {
    return new Intl.NumberFormat(locale).format(value);
  }
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

/** 33.3 → "33.3%", 100 → "100%". */
export function formatPercent(value: number, locale?: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value) + '%';
}
