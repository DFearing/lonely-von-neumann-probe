import type { CSSProperties } from "react";
import { FONT_MONO } from "../tokens";

export function btnFlush(): CSSProperties {
  return {
    background: "transparent",
    border: "1px solid rgba(110,200,255,0.18)",
    color: "#9ab4cf",
    padding: "6px 12px",
    fontFamily: FONT_MONO,
    fontSize: 10,
    letterSpacing: "0.14em",
    cursor: "pointer",
    borderRadius: 2,
  };
}

export function btnPrimary(): CSSProperties {
  return {
    background: "rgba(77,219,255,0.08)",
    border: "1px solid rgba(77,219,255,0.4)",
    color: "#4ddbff",
    padding: "8px 14px",
    fontFamily: FONT_MONO,
    fontSize: 11,
    letterSpacing: "0.14em",
    cursor: "pointer",
    borderRadius: 2,
  };
}
