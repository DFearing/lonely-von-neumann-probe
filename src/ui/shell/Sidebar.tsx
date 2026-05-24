import { createContext, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGaugeHigh, faPrint, faRocket, faGlobe, faFlask, faTerminal, faStar } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FONT_MONO } from "../tokens";
import { useGameState } from "../context";
import { DEV_MODE } from "../../simulation/dev";

export type ViewId = "overview" | "printers" | "fleet" | "systems" | "research" | "log" | "prestige";

export interface LVNPGateValue {
  onBack: (() => void) | null;
}

export const LVNPGateContext = createContext<LVNPGateValue>({ onBack: null });

interface NavItem {
  id: ViewId;
  label: string;
  icon: IconDefinition;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: faGaugeHigh },
  { id: "printers", label: "Printers", icon: faPrint },
  { id: "fleet", label: "Fleet", icon: faRocket },
  { id: "systems", label: "Systems", icon: faGlobe },
  { id: "research", label: "Research", icon: faFlask },
  { id: "log", label: "Log", icon: faTerminal },
];

export function Sidebar({
  activeView,
  onNavigate,
}: {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
}) {
  const [hoveredId, setHoveredId] = useState<ViewId | null>(null);
  const state = useGameState();
  const showPrestige = DEV_MODE || state.prestige.blackHoleDiscovered;

  return (
    <div
      data-tour="sidebar"
      style={{
        gridArea: "sidebar",
        borderRight: "1px solid rgba(110,200,255,0.12)",
        background: "rgba(6,12,24,0.6)",
        padding: "18px 0",
        fontSize: 15,
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
              padding: "10px 20px",
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
            <FontAwesomeIcon
              icon={item.icon}
              style={{
                width: 18,
                height: 18,
                color: active ? "#4ddbff" : hovered ? "#d6e8f5" : "#9ab4cf",
              }}
            />
            {item.label}
          </div>
        );
      })}

      {showPrestige && <PrestigeNavItem active={activeView === "prestige"} hovered={hoveredId === "prestige"} onNavigate={onNavigate} onHover={setHoveredId} />}

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: 200,
          padding: "14px 18px",
          borderTop: "1px solid rgba(110,200,255,0.08)",
          fontFamily: FONT_MONO,
          fontSize: 10,
          color: "#3d5572",
          letterSpacing: "0.16em",
          lineHeight: 1.7,
        }}
      >
        BUILD v0.1.0
      </div>
    </div>
  );
}

const PRESTIGE_GOLD = "#f0c674";

function PrestigeNavItem({
  active,
  hovered,
  onNavigate,
  onHover,
}: {
  active: boolean;
  hovered: boolean;
  onNavigate: (view: ViewId) => void;
  onHover: (id: ViewId | null) => void;
}) {
  return (
    <div
      onClick={() => onNavigate("prestige")}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 20px",
        marginTop: 8,
        borderTop: "1px solid rgba(240,198,116,0.15)",
        color: active ? PRESTIGE_GOLD : hovered ? PRESTIGE_GOLD : "rgba(240,198,116,0.7)",
        background: active
          ? "linear-gradient(90deg, rgba(240,198,116,0.12), transparent)"
          : "transparent",
        borderLeft: active
          ? `2px solid ${PRESTIGE_GOLD}`
          : "2px solid transparent",
        cursor: "pointer",
        fontWeight: active ? 600 : 500,
        letterSpacing: "0.02em",
        transition: "color .15s, background .15s",
      }}
      onMouseEnter={() => {
        if (!active) onHover("prestige");
      }}
      onMouseLeave={() => onHover(null)}
    >
      <FontAwesomeIcon
        icon={faStar}
        style={{
          width: 18,
          height: 18,
          color: active ? PRESTIGE_GOLD : hovered ? PRESTIGE_GOLD : "rgba(240,198,116,0.7)",
        }}
      />
      Prestige
    </div>
  );
}
