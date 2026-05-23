export function fmt(value: number, decimals = 0): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}k`;
  if (decimals === 0) return Math.floor(value).toLocaleString();
  return value.toFixed(decimals);
}

export function fmtRate(rate: number): string {
  const sign = rate >= 0 ? "+" : "";
  return `${sign}${rate.toFixed(1)}/s`;
}

export function fmtTime(seconds: number): string {
  if (seconds <= 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function fmtPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
