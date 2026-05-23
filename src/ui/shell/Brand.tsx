import type { ViewId } from "./Sidebar";

const FONT_MONO = "'JetBrains Mono', 'Courier New', monospace";

export function Brand({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  return (
    <div
      onClick={() => onNavigate("overview")}
      style={{
        gridArea: "brand",
        borderBottom: "1px solid rgba(110,200,255,0.12)",
        borderRight: "1px solid rgba(110,200,255,0.12)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 18px",
        background: "rgba(8,16,30,0.6)",
        cursor: "pointer",
      }}
    >
      <svg width="22" height="22" viewBox="0 0 22 22">
        <polygon
          points="11,2 20,11 11,20 2,11"
          fill="none"
          stroke="#4ddbff"
          strokeWidth="1.5"
        />
        <polygon
          points="11,6 16,11 11,16 6,11"
          fill="#4ddbff"
          opacity="0.7"
        />
      </svg>
      <div style={{ lineHeight: 1 }}>
        <div
          style={{
            fontSize: 13,
            letterSpacing: "0.18em",
            fontWeight: 600,
            color: "#4ddbff",
          }}
        >
          LVNP
        </div>
        <div
          style={{
            fontSize: 9,
            letterSpacing: "0.22em",
            color: "#6b87a3",
            marginTop: 2,
            fontFamily: FONT_MONO,
          }}
        >
          MISSION&nbsp;CTRL
        </div>
      </div>
    </div>
  );
}
