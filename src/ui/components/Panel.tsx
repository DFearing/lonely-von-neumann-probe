import type { CSSProperties, ReactNode } from "react";

export function Panel({
  label,
  right,
  children,
  style,
  contentStyle,
}: {
  label?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
  contentStyle?: CSSProperties;
}) {
  const isFlexColumn = style?.flexDirection === "column";
  return (
    <div
      style={{
        position: "relative",
        background:
          "linear-gradient(180deg, rgba(13,24,46,0.6) 0%, rgba(8,16,30,0.6) 100%)",
        border: "1px solid rgba(110,200,255,0.14)",
        ...style,
      }}
    >
      {(["tl", "tr", "bl", "br"] as const).map((c) => {
        const pos: CSSProperties =
          c === "tl"
            ? { top: 0, left: 0, borderTop: "2px solid #4ddbff", borderLeft: "2px solid #4ddbff" }
            : c === "tr"
              ? { top: 0, right: 0, borderTop: "2px solid #4ddbff", borderRight: "2px solid #4ddbff" }
              : c === "bl"
                ? { bottom: 0, left: 0, borderBottom: "2px solid #4ddbff", borderLeft: "2px solid #4ddbff" }
                : { bottom: 0, right: 0, borderBottom: "2px solid #4ddbff", borderRight: "2px solid #4ddbff" };
        return (
          <div
            key={c}
            style={{ position: "absolute", width: 10, height: 10, ...pos }}
          />
        );
      })}
      {label != null && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 18px 10px",
            borderBottom: "1px solid rgba(110,200,255,0.10)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: 12,
              letterSpacing: "0.22em",
              color: "#9ab4cf",
            }}
          >
            {label}
          </div>
          {right}
        </div>
      )}
      <div
        style={{
          padding: 18,
          ...(isFlexColumn
            ? { flex: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column" }
            : {}),
          ...contentStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}
