import { useEffect } from "react";
import { FONT_MONO, FONT_DISPLAY } from "../tokens";
import { useSoundSettings } from "../../audio/use-sound-events";
import { soundManager } from "../../audio/sound-manager";
import type { SoundEventType } from "../../simulation/state";

const PREVIEW_EVENTS: { label: string; event: SoundEventType }[] = [
  { label: "Research Complete", event: "research_complete" },
  { label: "Probe Constructed", event: "probe_constructed" },
  { label: "Miner Constructed", event: "miner_constructed" },
  { label: "Reactor Constructed", event: "reactor_constructed" },
  { label: "Printer Constructed", event: "printer_constructed" },
  { label: "Station Constructed", event: "station_constructed" },
  { label: "Asteroid Impact", event: "asteroid_impact" },
  { label: "Health Warning", event: "health_threshold" },
];

export function SoundSettings({ onClose }: { onClose: () => void }) {
  const { settings, setVolume, setMuted } = useSoundSettings();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        background: "rgba(2,6,14,0.72)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(480px, 100%)",
          background: "linear-gradient(180deg, #0a1224 0%, #06101e 100%)",
          border: "1px solid rgba(110,200,255,0.25)",
          boxShadow:
            "0 0 60px rgba(77,219,255,0.18), 0 0 0 1px rgba(77,219,255,0.10)",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 22px",
            borderBottom: "1px solid rgba(110,200,255,0.12)",
          }}
        >
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 20,
              fontWeight: 500,
              color: "#d6e8f5",
              letterSpacing: "0.08em",
            }}
          >
            SETTINGS
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              background: "transparent",
              border: "1px solid rgba(110,200,255,0.20)",
              color: "#9ab4cf",
              fontFamily: FONT_MONO,
              fontSize: 16,
              lineHeight: 1,
              cursor: "pointer",
              borderRadius: 2,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            x
          </button>
        </div>

        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
          <SectionHeader label="SOUND" />
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                color: "#6b87a3",
                letterSpacing: "0.14em",
                width: 70,
              }}
            >
              VOLUME
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              style={{
                flex: 1,
                height: 4,
                accentColor: "#4ddbff",
                cursor: "pointer",
              }}
            />
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 12,
                color: "#d6e8f5",
                width: 36,
                textAlign: "right",
              }}
            >
              {Math.round(settings.volume * 100)}%
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                color: "#6b87a3",
                letterSpacing: "0.14em",
                width: 70,
              }}
            >
              MUTE
            </span>
            <button
              onClick={() => setMuted(!settings.muted)}
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                color: settings.muted ? "#ff5555" : "#4cd8a8",
                background: settings.muted
                  ? "rgba(255,85,85,0.1)"
                  : "rgba(76,216,168,0.1)",
                border: `1px solid ${settings.muted ? "rgba(255,85,85,0.4)" : "rgba(76,216,168,0.4)"}`,
                padding: "6px 14px",
                cursor: "pointer",
                letterSpacing: "0.12em",
              }}
            >
              {settings.muted ? "MUTED" : "ACTIVE"}
            </button>
          </div>

          <div
            style={{
              borderTop: "1px solid rgba(110,200,255,0.10)",
              paddingTop: 14,
            }}
          >
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                color: "#6b87a3",
                letterSpacing: "0.18em",
                marginBottom: 10,
              }}
            >
              PREVIEW SOUNDS
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {PREVIEW_EVENTS.map(({ label, event }) => (
                <button
                  key={event}
                  onClick={() => soundManager.preview(event)}
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    color: "#d6e8f5",
                    background: "rgba(8,16,30,0.6)",
                    border: "1px solid rgba(110,200,255,0.18)",
                    padding: "8px 10px",
                    cursor: "pointer",
                    textAlign: "left",
                    letterSpacing: "0.06em",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <SectionHeader label="GAME" />
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 11,
              color: "#3d5572",
              letterSpacing: "0.06em",
            }}
          >
            No game settings available yet
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        fontFamily: FONT_MONO,
        fontSize: 10,
        letterSpacing: "0.22em",
        color: "#6b87a3",
        paddingBottom: 6,
        borderBottom: "1px solid rgba(110,200,255,0.10)",
      }}
    >
      {label}
    </div>
  );
}
