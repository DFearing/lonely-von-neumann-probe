import { useState } from "react";
import type { SaveSlotInfo } from "../../../persistence/save-load";
import { deleteSlot } from "../../../persistence/save-load";
import { Panel } from "../../components/Panel";
import { FONT_MONO, FONT_DISPLAY } from "../../tokens";

const MAX_SLOTS = 4;

const STARFIELD =
  "radial-gradient(1px 1px at 12% 18%, #6da4d4 0, transparent 50%)," +
  "radial-gradient(1px 1px at 27% 42%, #8fb8e0 0, transparent 50%)," +
  "radial-gradient(1px 1px at 71% 12%, #5d8aa8 0, transparent 50%)," +
  "radial-gradient(1px 1px at 84% 71%, #9bc3e6 0, transparent 50%)," +
  "radial-gradient(1px 1px at 38% 88%, #6da4d4 0, transparent 50%)," +
  "radial-gradient(1px 1px at 92% 34%, #8fb8e0 0, transparent 50%)," +
  "radial-gradient(1px 1px at 55% 22%, #aac5e0 0, transparent 50%)," +
  "radial-gradient(1px 1px at 14% 72%, #5d8aa8 0, transparent 50%)," +
  "radial-gradient(1px 1px at 48% 58%, #aac5e0 0, transparent 50%)," +
  "radial-gradient(1px 1px at 8% 36%, #8fb8e0 0, transparent 50%)";

export function PreGameFrame({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  const dateStr = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, ".");
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "radial-gradient(ellipse at top, #0a1a30 0%, #050913 70%)",
        color: "#d6e8f5",
        fontFamily: FONT_DISPLAY,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
      data-screen-label={`LVNP · ${label}`}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: STARFIELD,
          opacity: 0.55,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 50%, transparent 0%, rgba(5,9,19,0.55) 80%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {children}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 22,
          left: 0,
          right: 0,
          zIndex: 1,
          display: "flex",
          justifyContent: "center",
          gap: 24,
          fontFamily: FONT_MONO,
          fontSize: 9,
          color: "#3d5572",
          letterSpacing: "0.22em",
        }}
      >
        <span>LVNP / BUILD 0.1.0</span>
        <span>{"·"}</span>
        <span>MISSION CTRL {"·"} SOL UPLINK NOMINAL</span>
        <span>{"·"}</span>
        <span>{dateStr}</span>
      </div>
    </div>
  );
}

export function PreGameLogo() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        marginBottom: 28,
      }}
    >
      <svg width="72" height="72" viewBox="0 0 22 22">
        <polygon
          points="11,2 20,11 11,20 2,11"
          fill="none"
          stroke="#4ddbff"
          strokeWidth="1.2"
        />
        <polygon
          points="11,6 16,11 11,16 6,11"
          fill="#4ddbff"
          opacity="0.75"
        />
      </svg>
      <div style={{ textAlign: "center", lineHeight: 1.5 }}>
        <div
          style={{
            fontSize: 28,
            letterSpacing: "0.34em",
            fontWeight: 600,
            color: "#4ddbff",
            textShadow: "0 0 12px rgba(77,219,255,0.35)",
          }}
        >
          LVNP
        </div>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.36em",
            color: "#6b87a3",
            marginTop: 6,
            fontFamily: FONT_MONO,
          }}
        >
          LONELY {"·"} VON {"·"} NEUMANN {"·"} PROBE
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  probeName,
  onConfirm,
  onCancel,
}: {
  probeName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(2,6,14,0.80)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 400,
          background: "linear-gradient(180deg, #0a1224 0%, #06101e 100%)",
          border: "1px solid rgba(255,100,100,0.30)",
          boxShadow: "0 0 40px rgba(255,100,100,0.12)",
          padding: 28,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 12,
            color: "#ff6b6b",
            letterSpacing: "0.20em",
            marginBottom: 16,
          }}
        >
          ⚠ DELETE MISSION
        </div>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 14,
            color: "#d6e8f5",
            marginBottom: 8,
          }}
        >
          Permanently delete <span style={{ color: "#4ddbff", fontWeight: 600 }}>{probeName}</span>?
        </div>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: "#6b87a3",
            marginBottom: 24,
          }}
        >
          This cannot be undone.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "12px 0",
              background: "transparent",
              border: "1px solid rgba(110,200,255,0.22)",
              color: "#9ab4cf",
              fontFamily: FONT_MONO,
              fontSize: 11,
              letterSpacing: "0.16em",
              cursor: "pointer",
            }}
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "12px 0",
              background: "rgba(255,100,100,0.12)",
              border: "1px solid rgba(255,100,100,0.50)",
              color: "#ff6b6b",
              fontFamily: FONT_MONO,
              fontSize: 11,
              letterSpacing: "0.16em",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            DELETE
          </button>
        </div>
      </div>
    </div>
  );
}

function OperatorRow({
  slot,
  onSelect,
  onDelete,
}: {
  slot: SaveSlotInfo;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const elapsed = Date.now() - slot.timestamp;
  const lastPlayed = formatElapsed(elapsed);
  const systemLabel =
    slot.systemCount === 1
      ? `${slot.systemCount} SYSTEM`
      : `${slot.systemCount} SYSTEMS`;

  return (
    <>
      {confirming && (
        <DeleteConfirmModal
          probeName={slot.probeName}
          onConfirm={() => {
            setConfirming(false);
            onDelete();
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
      <div
        onClick={onSelect}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          padding: "14px 16px",
          background: hover ? "rgba(77,219,255,0.10)" : "rgba(8,16,30,0.5)",
          border: `1px solid ${hover ? "#4ddbff" : "rgba(110,200,255,0.16)"}`,
          cursor: "pointer",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto auto",
          alignItems: "center",
          gap: 14,
          transition: "background .15s, border-color .15s",
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#4cd8a8",
            boxShadow: "0 0 6px #4cd8a8",
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 15,
              fontWeight: 600,
              color: "#d6e8f5",
              letterSpacing: "0.04em",
            }}
          >
            {slot.probeName}
          </div>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              color: "#6b87a3",
              marginTop: 4,
              letterSpacing: "0.14em",
            }}
          >
            YEAR {slot.year} {"·"} {systemLabel} {"·"}{" "}
            {slot.structureCount} STRUCTURES
          </div>
        </div>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            color: "#6b87a3",
            letterSpacing: "0.18em",
            whiteSpace: "nowrap",
          }}
        >
          {lastPlayed}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setConfirming(true);
          }}
          style={{
            background: "transparent",
            border: "1px solid rgba(110,200,255,0.18)",
            color: "#6b87a3",
            padding: "5px 10px",
            fontFamily: FONT_MONO,
            fontSize: 9,
            letterSpacing: "0.20em",
            cursor: "pointer",
            borderRadius: 2,
          }}
        >
          DEL
        </button>
      </div>
    </>
  );
}

function NewMissionSlot({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "14px 16px",
        background: hover
          ? "rgba(77,219,255,0.10)"
          : "rgba(77,219,255,0.03)",
        border: `1px dashed ${hover ? "#4ddbff" : "rgba(77,219,255,0.35)"}`,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 14,
        transition: "background .15s, border-color .15s",
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          background: "rgba(77,219,255,0.10)",
          border: "1px solid rgba(77,219,255,0.6)",
          color: "#4ddbff",
          fontFamily: FONT_MONO,
          fontSize: 16,
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 2,
        }}
      >
        +
      </span>
      <div>
        <div style={{ fontSize: 14, color: "#4ddbff", fontWeight: 500 }}>
          Initiate New Mission
        </div>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: "#6b87a3",
            marginTop: 3,
            letterSpacing: "0.14em",
          }}
        >
          Activate a new von Neumann probe in Sol
        </div>
      </div>
    </div>
  );
}

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function CharacterSelector({
  saves,
  onLoadSlot,
  onNewMission,
}: {
  saves: SaveSlotInfo[];
  onLoadSlot: (slot: SaveSlotInfo) => void;
  onNewMission: () => void;
}) {
  const [slots, setSlots] = useState(saves);
  const empty = Math.max(0, MAX_SLOTS - slots.length);

  function handleDelete(key: string) {
    deleteSlot(key);
    setSlots((s) => s.filter((slot) => slot.key !== key));
  }

  return (
    <PreGameFrame label="character-selector">
      <PreGameLogo />
      <div style={{ width: 560 }}>
        <Panel
          label="MISSION ARCHIVE"
          right={
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                color: "#6b87a3",
                letterSpacing: "0.16em",
              }}
            >
              {slots.length} ACTIVE {"·"} {empty} EMPTY
            </span>
          }
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            {slots.map((slot) => (
              <OperatorRow
                key={slot.key}
                slot={slot}
                onSelect={() => onLoadSlot(slot)}
                onDelete={() => handleDelete(slot.key)}
              />
            ))}

            {slots.length < MAX_SLOTS && (
              <NewMissionSlot onClick={onNewMission} />
            )}
          </div>
        </Panel>
      </div>
    </PreGameFrame>
  );
}
