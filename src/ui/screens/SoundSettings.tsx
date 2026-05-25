import { useEffect, useState } from "react";
import { FONT_MONO, FONT_DISPLAY } from "../tokens";
import { useSoundSettings } from "../../audio/use-sound-events";
import { soundManager } from "../../audio/sound-manager";
import type { SoundEventType } from "../../simulation/state";
import { MUSIC_MOODS } from "../../audio/ambient-music";

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

type Tab = "gameplay" | "sounds" | "music" | "about";

const TABS: { id: Tab; label: string }[] = [
  { id: "gameplay", label: "GAMEPLAY" },
  { id: "sounds", label: "SOUNDS" },
  { id: "music", label: "MUSIC" },
  { id: "about", label: "ABOUT" },
];

export function SoundSettings({ onClose }: { onClose: () => void }) {
  const { settings, setVolume, setMuted, setMusicVolume, setMusicMuted, setMusicMood } = useSoundSettings();
  const [activeTab, setActiveTab] = useState<Tab>("sounds");

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
          width: "min(520px, 100%)",
          height: 420,
          display: "flex",
          flexDirection: "column",
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

        <div
          style={{
            display: "flex",
            borderBottom: "1px solid rgba(110,200,255,0.12)",
            padding: "0 22px",
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                letterSpacing: "0.16em",
                color: activeTab === tab.id ? "#4ddbff" : "#6b87a3",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === tab.id
                  ? "2px solid #4ddbff"
                  : "2px solid transparent",
                padding: "12px 14px 10px",
                cursor: "pointer",
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "18px 22px", overflowY: "auto", flex: 1 }}>
          {activeTab === "gameplay" && <GameplaySection />}
          {activeTab === "sounds" && (
            <SoundsSection
              volume={settings.volume}
              muted={settings.muted}
              onVolumeChange={setVolume}
              onMutedChange={setMuted}
            />
          )}
          {activeTab === "music" && (
            <MusicSection
              volume={settings.musicVolume}
              muted={settings.musicMuted}
              mood={settings.musicMood}
              onVolumeChange={setMusicVolume}
              onMutedChange={setMusicMuted}
              onMoodChange={setMusicMood}
            />
          )}
          {activeTab === "about" && <AboutSection />}
        </div>
      </div>
    </div>
  );
}

function GameplaySection() {
  return (
    <div
      style={{
        fontFamily: FONT_MONO,
        fontSize: 11,
        color: "#3d5572",
        letterSpacing: "0.06em",
      }}
    >
      No gameplay settings available yet
    </div>
  );
}

function SoundsSection({
  volume,
  muted,
  onVolumeChange,
  onMutedChange,
}: {
  volume: number;
  muted: boolean;
  onVolumeChange: (v: number) => void;
  onMutedChange: (m: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
          value={Math.round(volume * 100)}
          onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
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
          {Math.round(volume * 100)}%
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
          onClick={() => onMutedChange(!muted)}
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            color: muted ? "#ff5555" : "#4cd8a8",
            background: muted
              ? "rgba(255,85,85,0.1)"
              : "rgba(76,216,168,0.1)",
            border: `1px solid ${muted ? "rgba(255,85,85,0.4)" : "rgba(76,216,168,0.4)"}`,
            padding: "6px 14px",
            cursor: "pointer",
            letterSpacing: "0.12em",
          }}
        >
          {muted ? "MUTED" : "ACTIVE"}
        </button>
      </div>

      <div style={{ marginTop: 4 }}>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: "#6b87a3",
            letterSpacing: "0.18em",
            marginBottom: 10,
          }}
        >
          PREVIEW
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
    </div>
  );
}

function MusicSection({
  volume,
  muted,
  mood,
  onVolumeChange,
  onMutedChange,
  onMoodChange,
}: {
  volume: number;
  muted: boolean;
  mood: string;
  onVolumeChange: (v: number) => void;
  onMutedChange: (m: boolean) => void;
  onMoodChange: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
          value={Math.round(volume * 100)}
          onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
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
          {Math.round(volume * 100)}%
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
          onClick={() => onMutedChange(!muted)}
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            color: muted ? "#ff5555" : "#4cd8a8",
            background: muted
              ? "rgba(255,85,85,0.1)"
              : "rgba(76,216,168,0.1)",
            border: `1px solid ${muted ? "rgba(255,85,85,0.4)" : "rgba(76,216,168,0.4)"}`,
            padding: "6px 14px",
            cursor: "pointer",
            letterSpacing: "0.12em",
          }}
        >
          {muted ? "MUTED" : "ACTIVE"}
        </button>
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
          MOOD
        </span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
          {MUSIC_MOODS.map((m) => {
            const active = mood === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onMoodChange(m.id)}
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                  color: active ? "#4ddbff" : "#9ab4cf",
                  background: active
                    ? "rgba(77,219,255,0.12)"
                    : "rgba(8,16,30,0.6)",
                  border: `1px solid ${active ? "rgba(77,219,255,0.5)" : "rgba(110,200,255,0.18)"}`,
                  padding: "6px 10px",
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 10,
          color: "#3d5572",
          letterSpacing: "0.06em",
          paddingLeft: 84,
          marginTop: -6,
        }}
      >
        {MUSIC_MOODS.find(m => m.id === mood)?.description ?? ""}
      </div>
    </div>
  );
}

function AboutSection() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          color: "#9ab4cf",
          lineHeight: 1.8,
        }}
      >
        <div>Lonely Von Neumann Probe</div>
        <div style={{ color: "#6b87a3", fontSize: 10 }}>
          A Bobiverse-inspired idle/progression game
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 4 }}>
        <a
          href={`https://github.com/DFearing/lonely-von-neumann-probe/commit/${__COMMIT_HASH__}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: "#6b87a3",
            letterSpacing: "0.12em",
            textDecoration: "none",
          }}
        >
          BUILD {__COMMIT_HASH__}
        </a>
        <a
          href="https://github.com/DFearing/lonely-von-neumann-probe"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: "#4ddbff",
            letterSpacing: "0.08em",
            textDecoration: "none",
          }}
        >
          GitHub
        </a>
      </div>
    </div>
  );
}
