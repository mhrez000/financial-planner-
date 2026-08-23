/**
 * Money utilities. All amounts are integer cents to avoid floating point
 * drift; formatting is centralised so currency/locale can vary per user later.
 */

export function formatAUD(cents: number, opts: { compact?: boolean; signed?: boolean } = {}): string {
  const dollars = cents / 100;
  const formatter = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    notation: opts.compact ? "compact" : "standard",
    maximumFractionDigits: opts.compact ? 1 : Math.abs(cents) % 100 === 0 ? 0 : 2,
  });
  const abs = formatter.format(Math.abs(dollars));
  if (opts.signed) return `${dollars < 0 ? "−" : "+"}${abs}`;
  return dollars < 0 ? `−${abs}` : abs;
}

export function percent(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}
