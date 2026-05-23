import { createContext, useContext, useState } from "react";

export type ViewId = "overview" | "fleet" | "systems" | "research";

export interface LVNPGateValue {
  onBack: (() => void) | null;
}

export const LVNPGateContext = createContext<LVNPGateValue>({ onBack: null });

interface NavItem {
  id: ViewId;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview" },
  { id: "fleet", label: "Fleet" },
  { id: "systems", label: "Systems" },
  { id: "research", label: "Research" },
];

const FONT_MONO = "'JetBrains Mono', 'Courier New', monospace";

export function Sidebar({
  activeView,
  onNavigate,
}: {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
}) {
  const gate = useContext(LVNPGateContext);
  const [hoveredId, setHoveredId] = useState<ViewId | null>(null);

  return (
    <div
      style={{
        gridArea: "sidebar",
        borderRight: "1px solid rgba(110,200,255,0.12)",
        background: "rgba(6,12,24,0.6)",
        padding: "18px 0",
        fontSize: 13,
        position: "relative",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = activeView === item.id;
        const hovered = hoveredId === item.id;
        return (
          <div
            key={item.id}
            onClick={() => onNavigate(item.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 18px",
              color: active ? "#4ddbff" : hovered ? "#d6e8f5" : "#9ab4cf",
              background: active
                ? "linear-gradient(90deg, rgba(77,219,255,0.12), transparent)"
                : "transparent",
              borderLeft: active
                ? "2px solid #4ddbff"
                : "2px solid transparent",
              cursor: "pointer",
              fontWeight: active ? 600 : 500,
              letterSpacing: "0.02em",
              transition: "color .15s, background .15s",
            }}
            onMouseEnter={() => {
              if (!active) setHoveredId(item.id);
            }}
            onMouseLeave={() => setHoveredId(null)}
          >
            <span
              style={{
                width: 5,
                height: 5,
                background: active ? "#4ddbff" : "#3d5572",
                boxShadow: active ? "0 0 6px #4ddbff" : "none",
              }}
            />
            {item.label}
          </div>
        );
      })}

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: 160,
          padding: "14px 18px",
          borderTop: "1px solid rgba(110,200,255,0.08)",
          fontFamily: FONT_MONO,
          fontSize: 10,
          color: "#3d5572",
          letterSpacing: "0.08em",
          lineHeight: 1.7,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ color: "#3d5572", letterSpacing: "0.16em" }}>
          BUILD v0.1.0
        </div>
        {gate.onBack && (
          <SwitchOperatorButton onClick={gate.onBack} />
        )}
      </div>
    </div>
  );
}

function SwitchOperatorButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title="Switch operator"
      style={{
        width: 28,
        height: 28,
        background: "transparent",
        border: hovered
          ? "1px solid rgba(77,219,255,0.5)"
          : "1px solid rgba(110,200,255,0.20)",
        color: hovered ? "#4ddbff" : "#9ab4cf",
        fontFamily: FONT_MONO,
        fontSize: 14,
        lineHeight: 1,
        cursor: "pointer",
        borderRadius: 2,
        padding: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "color .15s, border-color .15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      ↩
    </button>
  );
}
