import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear, faRotateLeft, faForwardFast } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { useGameState, useCurrentSystem, useLoop } from "../context";
import { FONT_MONO } from "../tokens";
import { starColor } from "../data/star-colors";
import type { GameSpeed } from "../../simulation/actions";
import { useSoundSettings } from "../../audio/use-sound-events";
import { DEV_MODE } from "../../simulation/dev";
import { soundManager } from "../../audio/sound-manager";
import { Tooltip } from "../components/Tooltip";
import { fmt } from "../format";

function richnessLabel(value: number): string {
  if (value < 0.7) return "Barren";
  if (value < 0.9) return "Poor";
  if (value < 1.1) return "Moderate";
  if (value < 1.4) return "Rich";
  if (value < 1.8) return "Abundant";
  return "Plentiful";
}

const SPEEDS: GameSpeed[] = DEV_MODE ? [1, 10, 100, 1000] : [1, 2, 3, 4, 5];
const SPEED_LABELS: Record<GameSpeed, string> = DEV_MODE
  ? { 1: "1×", 10: "10×", 100: "100×", 1000: "1000×" }
  : { 1: "1×", 2: "2×", 3: "3×", 4: "4×", 5: "5×" };

export function Topbar({ onOpenSettings, onBack, onOpenAutopilot }: { onOpenSettings?: () => void; onBack?: (() => void) | null; onOpenAutopilot?: () => void }) {
  const state = useGameState();
  const system = useCurrentSystem();
  const loop = useLoop();
  const { settings: soundSettings, setVolume, setMuted } = useSoundSettings();
  const paused = loop.isPaused();
  const currentSpeed = loop.getSpeed();
  const cycle = 1000 + Math.floor(state.elapsedSeconds);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      const key = e.key;
      if (key === "0") { e.preventDefault(); loop.pause(); }
      else if (key >= "1" && key <= String(SPEEDS.length)) {
        e.preventDefault();
        loop.setSpeed(SPEEDS[Number(key) - 1]!);
        if (loop.isPaused()) loop.unpause();
      } else if (key === "=" || key === "+") {
        e.preventDefault();
        const idx = SPEEDS.indexOf(loop.getSpeed());
        if (idx < SPEEDS.length - 1) loop.setSpeed(SPEEDS[idx + 1]!);
        if (loop.isPaused()) loop.unpause();
      } else if (key === "-") {
        e.preventDefault();
        const idx = SPEEDS.indexOf(loop.getSpeed());
        if (idx > 0) loop.setSpeed(SPEEDS[idx - 1]!);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [loop]);

  return (
    <div
      style={{
        gridArea: "topbar",
        borderBottom: "1px solid rgba(110,200,255,0.12)",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 24,
        background: "rgba(8,16,30,0.6)",
        fontFamily: FONT_MONO,
        fontSize: 15,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: starColor(system.starType),
            boxShadow: `0 0 8px ${starColor(system.starType)}`,
            alignSelf: "center",
          }}
        />
        <span style={{ color: "#6b87a3", letterSpacing: "0.14em" }}>
          SYSTEM
        </span>
        <span
          style={{
            color: "#d6e8f5",
            letterSpacing: "0.12em",
            fontWeight: 600,
            fontSize: 16,
          }}
        >
          {system.name}
        </span>
        <span style={{ color: "#3d5572" }}>&middot;</span>
        <span style={{ color: "#d6e8f5" }}>
          {richnessLabel(system.resourceRichness)} materials
        </span>
      </div>
      <div style={{ flex: 1 }} />
      <div data-tour="topbar" style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Tooltip placement="below" content={paused ? "Resume (Ctrl+0)" : "Pause (Ctrl+0)"}>
          <button
            onClick={() => paused ? loop.unpause() : loop.pause()}
            style={{
              fontFamily: FONT_MONO,
              fontSize: 12,
              letterSpacing: "0.1em",
              color: paused ? "#4cd8a8" : "#6b87a3",
              background: paused ? "rgba(76,216,168,0.1)" : "transparent",
              border: `1px solid ${paused ? "rgba(76,216,168,0.4)" : "rgba(110,200,255,0.15)"}`,
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            {paused ? "▶" : "⏸"}
          </button>
        </Tooltip>
        {SPEEDS.map((s, i) => (
          <Tooltip key={s} placement="below" content={`${SPEED_LABELS[s]} speed (Ctrl+${i + 1})`}>
            <button
              onClick={() => { loop.setSpeed(s); if (paused) loop.unpause(); }}
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                color: !paused && currentSpeed === s ? "#d6e8f5" : "#6b87a3",
                background: !paused && currentSpeed === s ? "rgba(110,200,255,0.12)" : "transparent",
                border: `1px solid ${!paused && currentSpeed === s ? "rgba(110,200,255,0.3)" : "rgba(110,200,255,0.1)"}`,
                padding: "4px 8px",
                cursor: "pointer",
              }}
            >
              {SPEED_LABELS[s]}
            </button>
          </Tooltip>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Tooltip placement="below" content={soundSettings.muted ? "Unmute" : "Mute"}>
          <button
            onClick={() => setMuted(!soundSettings.muted)}
            style={{
              fontFamily: FONT_MONO,
              fontSize: 14,
              color: soundSettings.muted ? "#6b87a3" : "#d6e8f5",
              background: "transparent",
              border: "1px solid rgba(110,200,255,0.15)",
              padding: "4px 8px",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            {soundSettings.muted ? "\u{1F507}" : "\u{1F50A}"}
          </button>
        </Tooltip>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(soundSettings.volume * 100)}
          onChange={(e) => setVolume(Number(e.target.value) / 100)}
          onPointerUp={() => soundManager.preview("miner_constructed")}
          style={{
            width: 60,
            height: 4,
            accentColor: "#4ddbff",
            cursor: "pointer",
          }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {onOpenAutopilot && <TopbarIconButton icon={faForwardFast} title="Autopilot" onClick={onOpenAutopilot} />}
        {onOpenSettings && <TopbarIconButton icon={faGear} title="Settings" onClick={onOpenSettings} />}
        {onBack && <TopbarIconButton icon={faRotateLeft} title="Switch operator" onClick={onBack} />}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ color: "#9ab4cf", letterSpacing: "0.14em" }}>CYCLE</span>
        <span
          style={{
            color: "#d6e8f5",
            fontSize: 20,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmt(cycle)}
        </span>
      </div>
    </div>
  );
}

function TopbarIconButton({
  icon,
  title,
  onClick,
}: {
  icon: IconDefinition;
  title: string;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Tooltip placement="below" content={title}>
      <button
        onClick={onClick}
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
        <FontAwesomeIcon icon={icon} style={{ width: 12, height: 12 }} />
      </button>
    </Tooltip>
  );
}
