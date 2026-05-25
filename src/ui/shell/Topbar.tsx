import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faForwardFast } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { useGameState, useLoop } from "../context";
import { FONT_MONO } from "../tokens";
import type { GameSpeed } from "../../simulation/actions";
import { useSoundSettings } from "../../audio/use-sound-events";
import { DEV_MODE } from "../../simulation/dev";
import { soundManager } from "../../audio/sound-manager";
import { MUSIC_MOODS } from "../../audio/ambient-music";
import { Tooltip } from "../components/Tooltip";
import { fmt } from "../format";

const SPEEDS: GameSpeed[] = DEV_MODE ? [1, 10, 100, 1000] : [1, 2, 3, 4, 5];
const SPEED_LABELS: Record<GameSpeed, string> = DEV_MODE
  ? { 1: "1×", 10: "10×", 100: "100×", 1000: "1000×" }
  : { 1: "1×", 2: "2×", 3: "3×", 4: "4×", 5: "5×" };

export function Topbar({ onOpenAutopilot }: { onOpenAutopilot?: () => void }) {
  const state = useGameState();
  const loop = useLoop();
  const { settings: soundSettings, setVolume, setMuted, setMusicMuted, setMusicMood } = useSoundSettings();

  const currentMoodIndex = MUSIC_MOODS.findIndex(m => m.id === soundSettings.musicMood);
  const currentMoodLabel = MUSIC_MOODS[currentMoodIndex >= 0 ? currentMoodIndex : 0]?.label ?? "Deep Space";
  const cycleMood = () => {
    const nextIndex = (currentMoodIndex + 1) % MUSIC_MOODS.length;
    const nextMood = MUSIC_MOODS[nextIndex];
    if (nextMood) setMusicMood(nextMood.id);
  };
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
        userSelect: "none",
        fontFamily: FONT_MONO,
        fontSize: 15,
      }}
    >
      <div style={{ flex: 1 }} />
      <div data-tour="topbar" style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Tooltip placement="below" content={paused ? "Resume (Ctrl+0)" : "Pause (Ctrl+0)"}>
          <button
            onClick={() => { soundManager.playUI("ui_click"); paused ? loop.unpause() : loop.pause(); }}
            onMouseEnter={() => soundManager.playUI("ui_hover")}
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
              onClick={() => { soundManager.playUI("ui_click"); loop.setSpeed(s); if (paused) loop.unpause(); }}
              onMouseEnter={() => soundManager.playUI("ui_hover")}
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
        <Tooltip placement="below" content={soundSettings.musicMuted ? "Music on" : "Music off"}>
          <button
            onClick={() => setMusicMuted(!soundSettings.musicMuted)}
            style={{
              fontFamily: FONT_MONO,
              fontSize: 14,
              color: soundSettings.musicMuted ? "#6b87a3" : "#d6e8f5",
              background: "transparent",
              border: "1px solid rgba(110,200,255,0.15)",
              padding: "4px 8px",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            {"\u{266B}"}
          </button>
        </Tooltip>
        <Tooltip placement="below" content={`Track: ${currentMoodLabel} (click to cycle)`}>
          <button
            onClick={cycleMood}
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              color: "#d6e8f5",
              background: "rgba(110,200,255,0.08)",
              border: "1px solid rgba(110,200,255,0.15)",
              padding: "3px 6px",
              cursor: "pointer",
              lineHeight: 1,
              letterSpacing: "0.05em",
              width: 72,
              textAlign: "center" as const,
            }}
          >
            {currentMoodLabel}
          </button>
        </Tooltip>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {onOpenAutopilot && <TopbarIconButton icon={faForwardFast} title="Autopilot" onClick={onOpenAutopilot} />}
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
