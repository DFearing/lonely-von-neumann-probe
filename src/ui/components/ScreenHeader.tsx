import type { CSSProperties, ReactNode } from "react";
import { FONT_DISPLAY, FONT_MONO } from "../tokens";

export function ScreenHeader({
  title,
  breadcrumb,
  actions,
  style,
}: {
  title: string;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        paddingBottom: 14,
        marginBottom: 16,
        borderBottom: "1px solid rgba(110,200,255,0.10)",
        flexShrink: 0,
        userSelect: "none",
        ...style,
      }}
    >
      <div>
        {breadcrumb != null && (
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              letterSpacing: "0.22em",
              color: "#6b87a3",
              marginBottom: 4,
            }}
          >
            {breadcrumb}
          </div>
        )}
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 26,
            fontWeight: 500,
            color: "#d6e8f5",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </div>
      </div>
      {actions != null && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {actions}
        </div>
      )}
    </div>
  );
}
