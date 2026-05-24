const STAR_COLORS: Record<string, string> = {
  yellow: "#ffcb47",
  red: "#ff8a6e",
  blue: "#bcd5ff",
  orange: "#ffaa44",
};

export function starColor(starType: string): string {
  return STAR_COLORS[starType] ?? "#f0f0ff";
}
