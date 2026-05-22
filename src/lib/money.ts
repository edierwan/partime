export function formatMYR(cents: number | null | undefined): string {
  const v = (cents ?? 0) / 100;
  return `RM ${v.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatHours(minutes: number | null | undefined): string {
  if (minutes == null) return '–';
  return (minutes / 60).toFixed(2);
}

/** Parse "1800" or "18.00" into integer cents. */
export function parseRateInputToCents(input: string): number {
  if (!input) return 0;
  const cleaned = input.replace(/[^0-9.]/g, '');
  if (!cleaned) return 0;
  const v = Number(cleaned);
  if (!isFinite(v) || v < 0) return 0;
  return Math.round(v * 100);
}

export function maskAccount(acc: string | null | undefined): string {
  if (!acc) return '–';
  if (acc.length <= 4) return acc;
  return `**** **** ${acc.slice(-4)}`;
}
