import { useState } from "react";
import { useGameState, useDispatch } from "../context";
import { ScreenHeader } from "../components/ScreenHeader";
import { Panel } from "../components/Panel";
import { FONT_MONO, FONT_DISPLAY } from "../tokens";
import { fmt } from "../format";
import {
  PRESTIGE_UPGRADES,
  calculatePrestigePoints,
} from "../../simulation/prestige";
import type { PrestigeUpgradeId, PrestigeState } from "../../simulation/prestige";

const CORE = "#f0c674";
const CORE_DIM = "rgba(240,198,116,0.4)";
const CORE_BG = "rgba(240,198,116,0.08)";
const LEGACY = "#d488ec";
const ACQUIRED = "#4cd8a8";
const LOCKED = "#3d5572";

interface BranchMeta {
  icon: string;
  color: string;
  name: string;
  blurb: string;
}

const BRANCH_META: Record<PrestigeUpgradeId, BranchMeta> = {
  mining_mastery: { icon: "⬢", color: "#4fc7b8", name: "Mining Mastery", blurb: "Extract more from every asteroid" },
  fusion_mastery: { icon: "◇", color: "#6cb8e8", name: "Fusion Mastery", blurb: "More power from every reactor" },
  nano_assembly: { icon: "⊟", color: "#b08bff", name: "Nano-Assembly", blurb: "Faster construction across all printers" },
  quantum_insight: { icon: "◊", color: "#d488ec", name: "Quantum Insight", blurb: "Accelerated research breakthroughs" },
  material_reserves: { icon: "⟑", color: "#ee8cb8", name: "Material Reserves", blurb: "Start each mission with cached materials" },
  swift_start: { icon: "∞", color: "#f0c674", name: "Swift Start", blurb: "Everything runs faster from the beginning" },
};

type UpgradeStatus = "acquired" | "available" | "locked";

function getUpgradeStatus(prestige: PrestigeState, upgradeId: PrestigeUpgradeId, level: number): UpgradeStatus {
  const currentLevel = prestige.upgrades[upgradeId];
  if (level <= currentLevel) return "acquired";
  if (level === currentLevel + 1) return "available";
  return "locked";
}

function formatEffect(upgradeId: PrestigeUpgradeId, effect: number): string {
  if (upgradeId === "material_reserves") {
    return `+${fmt(effect)} tons`;
  }
  return `×${effect}`;
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{
        fontFamily: FONT_MONO, fontSize: 9, color: "#6b87a3",
        letterSpacing: "0.18em", marginBottom: 2,
      }}>{label}</div>
      <div style={{
        fontFamily: FONT_MONO, fontSize: 18, color: "#d6e8f5",
        fontWeight: 600,
      }}>{value}</div>
    </div>
  );
}

function MissionBanner({
  cycles,
  systems,
  structures,
  techs,
  coresEarned,
  availableCores,
  totalCores,
  acquiredCount,
  totalUpgradeCount,
}: {
  cycles: number;
  systems: number;
  structures: number;
  techs: number;
  coresEarned: number;
  availableCores: number;
  totalCores: number;
  acquiredCount: number;
  totalUpgradeCount: number;
}) {
  const spent = totalCores - availableCores;
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1.4fr 1fr",
      gap: 16,
      marginBottom: 16,
    }}>
      <div style={{
        position: "relative",
        padding: "18px 22px",
        background: "linear-gradient(90deg, rgba(212,136,236,0.10), rgba(212,136,236,0.02) 70%)",
        border: "1px solid rgba(212,136,236,0.3)",
        borderLeft: `3px solid ${LEGACY}`,
      }}>
        <div style={{
          display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8,
        }}>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 9, color: LEGACY,
            letterSpacing: "0.22em",
          }}>CURRENT MISSION</span>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 9, color: "#6b87a3",
          }}>Black Hole Discovered</span>
        </div>
        <div style={{
          fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 500,
          color: "#d6e8f5", letterSpacing: "-0.01em", marginBottom: 12,
        }}>
          Entering the black hole will earn {fmt(coresEarned)} Quantum Cores.
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
        }}>
          <StatCell label="LIFESPAN" value={`${fmt(cycles)} cycles`} />
          <StatCell label="SYSTEMS" value={systems} />
          <StatCell label="STRUCTURES" value={structures} />
          <StatCell label="TECHS" value={techs} />
        </div>
      </div>

      <div style={{
        position: "relative",
        padding: "18px 22px",
        background: `linear-gradient(135deg, ${CORE_BG}, rgba(240,198,116,0.02) 70%)`,
        border: "1px solid rgba(240,198,116,0.35)",
        display: "flex", alignItems: "center", gap: 18,
      }}>
        <svg width="64" height="64" viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
          <defs>
            <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={CORE} stopOpacity="0.55" />
              <stop offset="60%" stopColor={CORE} stopOpacity="0.10" />
              <stop offset="100%" stopColor={CORE} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="32" cy="32" r="30" fill="url(#coreGlow)" />
          <polygon points="32,8 52,22 52,42 32,56 12,42 12,22"
            fill="none" stroke={CORE} strokeWidth="1.4"
            style={{ filter: `drop-shadow(0 0 4px ${CORE_DIM})` }} />
          <polygon points="32,18 44,26 44,38 32,46 20,38 20,26"
            fill="none" stroke={CORE} strokeOpacity="0.6" strokeWidth="1" />
          <line x1="32" y1="8" x2="32" y2="18" stroke={CORE} strokeOpacity="0.4" />
          <line x1="52" y1="22" x2="44" y2="26" stroke={CORE} strokeOpacity="0.4" />
          <line x1="52" y1="42" x2="44" y2="38" stroke={CORE} strokeOpacity="0.4" />
          <line x1="32" y1="56" x2="32" y2="46" stroke={CORE} strokeOpacity="0.4" />
          <line x1="12" y1="42" x2="20" y2="38" stroke={CORE} strokeOpacity="0.4" />
          <line x1="12" y1="22" x2="20" y2="26" stroke={CORE} strokeOpacity="0.4" />
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 9, color: CORE,
            letterSpacing: "0.22em", marginBottom: 4,
          }}>QUANTUM CORES · AVAILABLE</div>
          <div style={{
            display: "flex", alignItems: "baseline", gap: 10,
          }}>
            <span style={{
              fontFamily: FONT_MONO, fontSize: 44, fontWeight: 600,
              color: CORE, lineHeight: 1,
              textShadow: `0 0 14px ${CORE_DIM}`,
            }}>{fmt(availableCores)}</span>
            <span style={{
              fontFamily: FONT_MONO, fontSize: 12, color: "#6b87a3",
            }}>/ {fmt(totalCores)}&nbsp;earned</span>
          </div>
          <div style={{
            display: "flex", gap: 14, marginTop: 8,
            fontFamily: FONT_MONO, fontSize: 9, color: "#6b87a3",
            letterSpacing: "0.14em",
          }}>
            <span>SPENT&nbsp;<span style={{ color: "#d6e8f5" }}>{fmt(spent)}</span></span>
            <span>UPGRADES&nbsp;<span style={{ color: ACQUIRED }}>{acquiredCount}</span>&nbsp;/ {totalUpgradeCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function UpgradeRow({
  upgradeId,
  level,
  status,
  branchColor,
  cost,
  effect,
  canAfford,
  onAcquire,
}: {
  upgradeId: PrestigeUpgradeId;
  level: number;
  status: UpgradeStatus;
  branchColor: string;
  cost: number;
  effect: number;
  canAfford: boolean;
  onAcquire: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isAcq = status === "acquired";
  const isLocked = status === "locked";
  const isAvail = status === "available";

  const dotColor = isAcq ? ACQUIRED : isAvail ? branchColor : LOCKED;
  const ringColor = isAcq ? "rgba(76,216,168,0.55)"
    : isAvail ? branchColor + "88"
    : "rgba(110,200,255,0.12)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "18px 1fr auto",
        gap: 12,
        alignItems: "center",
        padding: "10px 12px",
        marginLeft: -12, marginRight: -12,
        borderBottom: "1px solid rgba(110,200,255,0.06)",
        background: hovered && !isLocked ? "rgba(110,200,255,0.04)" : "transparent",
        opacity: isLocked ? 0.55 : 1,
        transition: "background .1s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        width: 12, height: 12, borderRadius: "50%",
        background: isAcq ? dotColor : "transparent",
        border: `1.5px solid ${ringColor}`,
        boxShadow: isAcq ? `0 0 6px ${dotColor}80` : "none",
        justifySelf: "center",
      }} />

      <div style={{ minWidth: 0 }}>
        <div style={{
          display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2,
        }}>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 9, color: "#6b87a3",
            letterSpacing: "0.18em",
          }}>L{level}</span>
          <span style={{
            fontFamily: FONT_DISPLAY, fontSize: 14,
            color: isAcq ? ACQUIRED : isLocked ? "#5d7a99" : "#d6e8f5",
            fontWeight: 500,
          }}>{formatEffect(upgradeId, effect)}</span>
          {isAcq && (
            <span style={{
              fontFamily: FONT_MONO, fontSize: 8, color: ACQUIRED,
              letterSpacing: "0.18em", marginLeft: "auto", paddingRight: 8,
            }}>{"✓"} OWNED</span>
          )}
          {isLocked && (
            <span style={{
              fontFamily: FONT_MONO, fontSize: 8, color: LOCKED,
              letterSpacing: "0.18em", marginLeft: "auto", paddingRight: 8,
            }}>{"◌"} LOCKED</span>
          )}
        </div>
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 10, justifySelf: "end",
      }}>
        <div style={{
          display: "flex", alignItems: "baseline", gap: 4,
          fontFamily: FONT_MONO,
          color: isAcq ? "#3d5572" : canAfford && !isLocked ? CORE : "#5d7a99",
        }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>
            {isAcq ? "—" : fmt(cost)}
          </span>
          {!isAcq && (
            <span style={{ fontSize: 9, letterSpacing: "0.16em", opacity: 0.7 }}>QC</span>
          )}
        </div>
        <AcquireButton
          status={status}
          canAfford={canAfford}
          onAcquire={onAcquire}
        />
      </div>
    </div>
  );
}

function AcquireButton({
  status,
  canAfford,
  onAcquire,
}: {
  status: UpgradeStatus;
  canAfford: boolean;
  onAcquire: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isAcq = status === "acquired";
  const isAvail = status === "available";
  const isLocked = status === "locked";
  const affordable = canAfford && isAvail;

  let label: string;
  if (isAcq) label = "—";
  else if (isLocked) label = "LOCKED";
  else if (canAfford) label = "ACQUIRE";
  else label = "INSUFFICIENT";

  return (
    <button
      onClick={(e) => { e.stopPropagation(); if (affordable) onAcquire(); }}
      disabled={!affordable}
      style={{
        background: isAcq ? "transparent"
          : affordable
            ? hovered ? "rgba(240,198,116,0.15)" : CORE_BG
            : "transparent",
        border: `1px solid ${
          isAcq ? "transparent"
          : affordable ? CORE_DIM
          : "rgba(110,200,255,0.12)"
        }`,
        color: isAcq ? "transparent"
          : affordable ? CORE
          : "#3d5572",
        padding: "6px 12px",
        fontFamily: FONT_MONO, fontSize: 9.5,
        letterSpacing: "0.18em", fontWeight: 600,
        cursor: affordable ? "pointer" : "default",
        borderRadius: 2,
        minWidth: 90,
        textAlign: "center",
        transition: "all .12s",
        boxShadow: hovered && affordable ? `0 0 10px ${CORE_DIM}` : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </button>
  );
}

function BranchPanel({
  upgradeId,
  prestige,
  onAcquire,
}: {
  upgradeId: PrestigeUpgradeId;
  prestige: PrestigeState;
  onAcquire: (upgradeId: PrestigeUpgradeId) => void;
}) {
  const meta = BRANCH_META[upgradeId];
  const upgrade = PRESTIGE_UPGRADES[upgradeId];
  const currentLevel = prestige.upgrades[upgradeId];

  return (
    <Panel
      label={upgradeId.toUpperCase().replace(/_/g, " ")}
      right={
        <span style={{
          display: "flex", alignItems: "center", gap: 10,
          fontFamily: FONT_MONO, fontSize: 9, color: "#6b87a3",
          letterSpacing: "0.14em",
        }}>
          <span style={{ color: ACQUIRED }}>{currentLevel}</span>
          <span>/ {upgrade.maxLevel}</span>
        </span>
      }
      style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}
      contentStyle={{ padding: "12px 16px 8px" }}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: 12, paddingBottom: 10,
        borderBottom: "1px solid rgba(110,200,255,0.08)", marginBottom: 4,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "#06090f", border: `1px solid ${meta.color}66`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: meta.color, fontSize: 16,
          textShadow: `0 0 6px ${meta.color}60`,
          flexShrink: 0,
        }}>{meta.icon}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 500,
            color: "#d6e8f5", lineHeight: 1.1,
          }}>{meta.name}</div>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 10, color: "#6b87a3",
            marginTop: 2,
          }}>{meta.blurb}</div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {Array.from({ length: upgrade.maxLevel }, (_, i) => {
          const level = i + 1;
          const cost = upgrade.costs[i]!;
          const effect = upgrade.effects[i]!;
          const status = getUpgradeStatus(prestige, upgradeId, level);
          return (
            <UpgradeRow
              key={level}
              upgradeId={upgradeId}
              level={level}
              status={status}
              branchColor={meta.color}
              cost={cost}
              effect={effect}
              canAfford={prestige.availablePrestigePoints >= cost}
              onAcquire={() => onAcquire(upgradeId)}
            />
          );
        })}
      </div>
    </Panel>
  );
}

function PrestigeFooter({
  availableCores,
  acquiredCount,
  committed,
  onEnterBlackHole,
  onResetChoices,
  onBeginNewMission,
  onClose,
}: {
  availableCores: number;
  acquiredCount: number;
  committed: boolean;
  onEnterBlackHole: () => void;
  onResetChoices: () => void;
  onBeginNewMission: () => void;
  onClose?: () => void;
}) {
  const [enterHovered, setEnterHovered] = useState(false);
  const [resetHovered, setResetHovered] = useState(false);
  const [missionHovered, setMissionHovered] = useState(false);
  const [closeHovered, setCloseHovered] = useState(false);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, paddingTop: 14,
      borderTop: "1px solid rgba(110,200,255,0.10)", marginTop: 14,
      flexShrink: 0,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT_MONO, fontSize: 9, color: "#6b87a3",
          letterSpacing: "0.22em", marginBottom: 4,
        }}>NEXT MISSION</div>
        <div style={{
          fontFamily: FONT_DISPLAY, fontSize: 16, color: "#d6e8f5",
        }}>
          {acquiredCount > 0
            ? <>Carrying <span style={{ color: ACQUIRED }}>{acquiredCount} legacy upgrade{acquiredCount === 1 ? "" : "s"}</span> into the next probe.</>
            : <>No legacies selected — new probe wakes up cold.</>}
          {availableCores > 0 && (
            <span style={{ color: "#6b87a3", fontSize: 13 }}>
              &nbsp;· <span style={{ color: CORE }}>{fmt(availableCores)} QC</span> unspent will roll over.
            </span>
          )}
        </div>
      </div>

      {onClose && (
        <span
          onClick={onClose}
          onMouseEnter={() => setCloseHovered(true)}
          onMouseLeave={() => setCloseHovered(false)}
          style={{
            color: closeHovered ? "#d6e8f5" : "#6b87a3",
            fontFamily: FONT_MONO, fontSize: 11,
            letterSpacing: "0.12em",
            cursor: "pointer",
            textDecoration: closeHovered ? "underline" : "none",
            transition: "color .15s",
          }}
        >Close</span>
      )}

      {committed ? (
        <>
          <button
            onClick={onResetChoices}
            onMouseEnter={() => setResetHovered(true)}
            onMouseLeave={() => setResetHovered(false)}
            style={{
              background: resetHovered ? "rgba(110,200,255,0.12)" : "transparent",
              border: "1px solid rgba(110,200,255,0.25)",
              color: resetHovered ? "#d6e8f5" : "#9ab4cf",
              padding: "14px 24px",
              fontFamily: FONT_MONO, fontSize: 12,
              letterSpacing: "0.18em", fontWeight: 500,
              cursor: "pointer", borderRadius: 2,
              transition: "all .15s",
            }}
          >RESET CHOICES</button>

          <button
            onClick={onBeginNewMission}
            onMouseEnter={() => setMissionHovered(true)}
            onMouseLeave={() => setMissionHovered(false)}
            style={{
              position: "relative",
              background: missionHovered
                ? "linear-gradient(135deg, rgba(240,198,116,0.28), rgba(240,198,116,0.08))"
                : "linear-gradient(135deg, rgba(240,198,116,0.18), rgba(240,198,116,0.04))",
              border: `1px solid ${CORE}`,
              color: CORE,
              padding: "14px 32px",
              fontFamily: FONT_MONO, fontSize: 12,
              letterSpacing: "0.24em", fontWeight: 600,
              cursor: "pointer", borderRadius: 2,
              textShadow: `0 0 6px ${CORE_DIM}`,
              boxShadow: missionHovered
                ? `0 0 28px ${CORE_DIM}, inset 0 0 28px rgba(240,198,116,0.1)`
                : `0 0 18px ${CORE_DIM}, inset 0 0 18px rgba(240,198,116,0.06)`,
              transition: "all .15s",
            }}
          >{"▸"} BEGIN NEW MISSION</button>
        </>
      ) : (
        <button
          onClick={onEnterBlackHole}
          onMouseEnter={() => setEnterHovered(true)}
          onMouseLeave={() => setEnterHovered(false)}
          style={{
            position: "relative",
            background: enterHovered
              ? "linear-gradient(135deg, rgba(240,198,116,0.28), rgba(240,198,116,0.08))"
              : "linear-gradient(135deg, rgba(240,198,116,0.18), rgba(240,198,116,0.04))",
            border: `1px solid ${CORE}`,
            color: CORE,
            padding: "14px 32px",
            fontFamily: FONT_MONO, fontSize: 12,
            letterSpacing: "0.24em", fontWeight: 600,
            cursor: "pointer", borderRadius: 2,
            textShadow: `0 0 6px ${CORE_DIM}`,
            boxShadow: enterHovered
              ? `0 0 28px ${CORE_DIM}, inset 0 0 28px rgba(240,198,116,0.1)`
              : `0 0 18px ${CORE_DIM}, inset 0 0 18px rgba(240,198,116,0.06)`,
            transition: "all .15s",
          }}
        >{"▸"} ENTER BLACK HOLE</button>
      )}
    </div>
  );
}

const UPGRADE_IDS: PrestigeUpgradeId[] = [
  "mining_mastery",
  "fusion_mastery",
  "nano_assembly",
  "quantum_insight",
  "material_reserves",
  "swift_start",
];

export function Prestige({ onBeginNewMission, onClose }: { onBeginNewMission: () => void; onClose?: () => void }) {
  const state = useGameState();
  const dispatch = useDispatch();
  const prestige = state.prestige;
  const committed = state.prestigeTriggered;

  const coresEarned = calculatePrestigePoints(state);

  let systemCount = 0;
  let structureCount = 0;
  let techCount = 0;
  for (const system of Object.values(state.systems)) {
    if (system.mainProbe !== null) systemCount++;
    for (const arr of Object.values(system.structures)) {
      structureCount += arr.length;
    }
    techCount += Object.keys(system.completedResearch).length;
  }

  let acquiredCount = 0;
  for (const id of UPGRADE_IDS) {
    acquiredCount += prestige.upgrades[id];
  }

  const totalUpgradeCount = UPGRADE_IDS.length * 5;

  function handleAcquire(upgradeId: PrestigeUpgradeId) {
    if (!committed) return;
    dispatch({ type: "purchase_prestige_upgrade", upgradeId });
  }

  function handleEnterBlackHole() {
    dispatch({ type: "enter_black_hole" });
  }

  function handleResetChoices() {
    dispatch({ type: "reset_prestige_choices" });
  }

  return (
    <>
      <ScreenHeader
        breadcrumb="MISSION CONTROL · POST-MISSION · PRESTIGE"
        title="Legacy Upgrades"
        actions={
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            fontFamily: FONT_MONO, fontSize: 10,
            color: "#6b87a3", letterSpacing: "0.14em",
          }}>
            <span>RUN #{prestige.timesPrestiged + 1}</span>
            <span style={{ color: LEGACY }}>{"●"} BLACK HOLE FOUND</span>
            <span>{UPGRADE_IDS.length} BRANCHES · {totalUpgradeCount} UPGRADES</span>
          </div>
        }
      />

      <MissionBanner
        cycles={1000 + Math.floor(state.elapsedSeconds)}
        systems={systemCount}
        structures={structureCount}
        techs={techCount}
        coresEarned={coresEarned}
        availableCores={prestige.availablePrestigePoints}
        totalCores={prestige.totalPrestigePoints}
        acquiredCount={acquiredCount}
        totalUpgradeCount={totalUpgradeCount}
      />

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "1fr 1fr",
        gap: 16,
        flex: 1, minHeight: 0,
        overflow: "hidden",
      }}>
        {UPGRADE_IDS.map((id) => (
          <BranchPanel
            key={id}
            upgradeId={id}
            prestige={prestige}
            onAcquire={handleAcquire}
          />
        ))}
      </div>

      <PrestigeFooter
        availableCores={prestige.availablePrestigePoints}
        acquiredCount={acquiredCount}
        committed={committed}
        onEnterBlackHole={handleEnterBlackHole}
        onResetChoices={handleResetChoices}
        onBeginNewMission={onBeginNewMission}
        {...(onClose ? { onClose } : {})}
      />
    </>
  );
}
