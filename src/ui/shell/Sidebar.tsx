import { createContext, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGaugeHigh, faRocket, faGlobe, faFlask, faTerminal, faStar, faGear, faArrowLeftLong } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FONT_MONO } from "../tokens";
import { useGameState } from "../context";
import { DEV_MODE } from "../../simulation/dev";
import { soundManager } from "../../audio/sound-manager";
import { Tooltip } from "../components/Tooltip";

export type ViewId = "overview" | "fleet" | "systems" | "research" | "log" | "prestige";

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
  { id: "fleet", label: "Fleet", icon: faRocket },
  { id: "systems", label: "Systems", icon: faGlobe },
  { id: "research", label: "Research", icon: faFlask },
  { id: "log", label: "Log", icon: faTerminal },
];

export function Sidebar({
  activeView,
  onNavigate,
  onOpenSettings,
  onBack,
}: {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  onOpenSettings?: () => void;
  onBack?: (() => void) | null;
}) {
  const [hoveredId, setHoveredId] = useState<ViewId | null>(null);
  const state = useGameState();
  const showPrestige = DEV_MODE || state.prestige.blackHoleDiscovered;
  const fleetSystemsUnlocked = state.nextProbeNumber >= 3;

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
        const locked = (item.id === "fleet" || item.id === "systems") && !fleetSystemsUnlocked;
        if (locked && !DEV_MODE) return null;

        const active = activeView === item.id;
        const hovered = hoveredId === item.id;
        const dimmed = locked && DEV_MODE;

        const node = (
          <div
            key={item.id}
            data-tour={`nav-${item.id}`}
            onClick={() => { soundManager.playUI("ui_click"); onNavigate(item.id); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 20px",
              color: dimmed ? "#3d5572" : active ? "#4ddbff" : hovered ? "#d6e8f5" : "#9ab4cf",
              background: active && !dimmed
                ? "linear-gradient(90deg, rgba(77,219,255,0.12), transparent)"
                : "transparent",
              borderLeft: active && !dimmed
                ? "2px solid #4ddbff"
                : "2px solid transparent",
              cursor: "pointer",
              fontWeight: active && !dimmed ? 600 : 500,
              letterSpacing: "0.02em",
              transition: "color .15s, background .15s",
            }}
            onMouseEnter={() => {
              if (!active && !dimmed) { soundManager.playUI("ui_hover"); setHoveredId(item.id); }
            }}
            onMouseLeave={() => setHoveredId(null)}
          >
            <FontAwesomeIcon
              icon={item.icon}
              style={{
                width: 18,
                height: 18,
                color: dimmed ? "#3d5572" : active ? "#4ddbff" : hovered ? "#d6e8f5" : "#9ab4cf",
              }}
            />
            {item.label}{dimmed && " *"}
          </div>
        );

        if (dimmed) {
          return (
            <Tooltip key={item.id} content="Unlocks when a second probe is built" placement="right">
              {node}
            </Tooltip>
          );
        }
        return node;
      })}

      {showPrestige && <PrestigeNavItem active={activeView === "prestige"} hovered={hoveredId === "prestige"} dimmed={!!(DEV_MODE && !state.prestige.blackHoleDiscovered)} onNavigate={onNavigate} onHover={setHoveredId} />}

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: "1px solid rgba(110,200,255,0.08)",
          padding: "8px 0",
        }}
      >
        {onOpenSettings && (
          <div
            onClick={() => { soundManager.playUI("ui_click"); onOpenSettings(); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 20px",
              color: "#6b87a3",
              cursor: "pointer",
              fontSize: 13,
              letterSpacing: "0.02em",
              transition: "color .15s",
            }}
            onMouseEnter={(e) => { soundManager.playUI("ui_hover"); e.currentTarget.style.color = "#d6e8f5"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#6b87a3"; }}
          >
            <FontAwesomeIcon icon={faGear} style={{ width: 18, height: 18 }} />
            Settings
          </div>
        )}
        {onBack && (
          <div
            onClick={() => { soundManager.playUI("ui_click"); onBack(); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 20px",
              color: "#6b87a3",
              cursor: "pointer",
              fontSize: 13,
              letterSpacing: "0.02em",
              transition: "color .15s",
            }}
            onMouseEnter={(e) => { soundManager.playUI("ui_hover"); e.currentTarget.style.color = "#d6e8f5"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#6b87a3"; }}
          >
            <FontAwesomeIcon icon={faArrowLeftLong} style={{ width: 18, height: 18 }} />
            Mission Archives
          </div>
        )}
        <div
          style={{
            padding: "6px 20px 4px",
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: "#6b87a3",
            letterSpacing: "0.16em",
          }}
        >
          BUILD v0.1.0
        </div>
      </div>
    </div>
  );
}

const PRESTIGE_GOLD = "#f0c674";

function PrestigeNavItem({
  active,
  hovered,
  dimmed,
  onNavigate,
  onHover,
}: {
  active: boolean;
  hovered: boolean;
  dimmed: boolean;
  onNavigate: (view: ViewId) => void;
  onHover: (id: ViewId | null) => void;
}) {
  const node = (
    <div
      onClick={() => { soundManager.playUI("ui_click"); onNavigate("prestige"); }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 20px",
        marginTop: 8,
        borderTop: `1px solid ${dimmed ? "rgba(110,200,255,0.08)" : "rgba(240,198,116,0.15)"}`,
        color: dimmed ? "#3d5572" : active ? PRESTIGE_GOLD : hovered ? PRESTIGE_GOLD : "rgba(240,198,116,0.7)",
        background: active && !dimmed
          ? "linear-gradient(90deg, rgba(240,198,116,0.12), transparent)"
          : "transparent",
        borderLeft: active && !dimmed
          ? `2px solid ${PRESTIGE_GOLD}`
          : "2px solid transparent",
        cursor: "pointer",
        fontWeight: active && !dimmed ? 600 : 500,
        letterSpacing: "0.02em",
        transition: "color .15s, background .15s",
      }}
      onMouseEnter={() => {
        if (!active && !dimmed) { soundManager.playUI("ui_hover"); onHover("prestige"); }
      }}
      onMouseLeave={() => onHover(null)}
    >
      <FontAwesomeIcon
        icon={faStar}
        style={{
          width: 18,
          height: 18,
          color: dimmed ? "#3d5572" : active ? PRESTIGE_GOLD : hovered ? PRESTIGE_GOLD : "rgba(240,198,116,0.7)",
        }}
      />
      Prestige{dimmed && " *"}
    </div>
  );

  if (dimmed) {
    return (
      <Tooltip content="Unlocks when a black hole is discovered" placement="right">
        {node}
      </Tooltip>
    );
  }
  return node;
}
