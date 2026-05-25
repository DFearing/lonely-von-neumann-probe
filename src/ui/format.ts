export function fmt(n: number, opts: { decimals?: number; signed?: boolean } = {}): string {
  const { decimals = 0, signed = false } = opts;
  const sign = signed && n > 0 ? "+" : "";
  if (Math.abs(n) >= 1e6) return sign + (n / 1e6).toFixed(2) + "M";
  if (Math.abs(n) >= 1e3) return sign + n.toLocaleString("en-US", { maximumFractionDigits: decimals });
  return sign + n.toFixed(decimals);
}

export function fmtRate(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return sign + n.toFixed(1);
}

export function fmtTime(s: number): string {
  if (s <= 0) return "now";
  if (s < 60) return Math.ceil(s) + "s";
  if (s < 3600) return Math.floor(s / 60) + "m " + Math.floor(s % 60) + "s";
  return Math.floor(s / 3600) + "h " + Math.floor((s % 3600) / 60) + "m";
}

export function fmtPercent(ratio: number): string {
  return Math.round(ratio * 100) + "%";
}

export function fmtCycles(seconds: number): string {
  if (seconds <= 0) return "now";
  const rounded = Math.round(seconds);
  const label = rounded === 1 ? " cycle" : " cycles";
  return fmt(rounded) + label;
}
