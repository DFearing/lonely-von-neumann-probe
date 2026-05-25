import { useCallback, useEffect, useMemo, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import type { SystemState } from "../../../simulation/state";
import { MAX_TIER } from "../../../simulation/state";
import {
  BRANCH_GROUPS,
  TECH_TREE,
} from "../../../simulation/data/tech-tree";
import { getTechStatus, type TechStatus } from "../../../simulation/queries";
import { Panel } from "../../components/Panel";
import { FONT_MONO } from "../../tokens";
import { BRANCH_META } from "../../data/branch-meta";
import { soundManager } from "../../../audio/sound-manager";

const TIER_W = 168;
const ROW_H = 102;
const HEADER_H = 56;
const GROUP_W = 72;
const ROW_LABEL_W = 86;
const NODE_SIZE = 44;
const LEFT_PAD = GROUP_W + ROW_LABEL_W;

const GROUP_COLORS: Record<string, string> = {
  mining: "#4fc7b8",
  energy: "#5d8aff",
  manufacturing: "#6cb8e8",
  stations: "#8a85f0",
  probes: "#b08bff",
  computing: "#d488ec",
  communication: "#ee8cb8",
};


const STATUS_BG: Record<TechStatus, string> = {
  completed: "rgba(76,216,168,0.40)",
  in_progress: "rgba(176,139,255,0.18)",
  available: "rgba(77,219,255,0.12)",
  locked: "rgba(13,24,46,0.6)",
};

const STATUS_RING: Record<TechStatus, string> = {
  completed: "#4cd8a8",
  in_progress: "rgba(176,139,255,0.75)",
  available: "rgba(77,219,255,0.60)",
  locked: "rgba(110,200,255,0.25)",
};

interface Edge {
  fromId: string;
  toId: string;
  fromRow: number;
  fromTier: number;
  toRow: number;
  toTier: number;
  linear: boolean;
  branchId: string;
}

function buildRowMap(): Map<string, number> {
  const map = new Map<string, number>();
  let row = 0;
  for (const group of BRANCH_GROUPS) {
    for (const branchId of group.branches) {
      map.set(branchId, row);
      row++;
    }
  }
  return map;
}

function buildEdges(rowMap: Map<string, number>): Edge[] {
  const edges: Edge[] = [];
  for (const tech of Object.values(TECH_TREE)) {
    const toRow = rowMap.get(tech.branchId);
    if (toRow === undefined) continue;

    if (tech.tier > 1) {
      const predId = `${tech.branchId}_t${tech.tier - 1}`;
      edges.push({
        fromId: predId,
        toId: tech.id,
        fromRow: toRow,
        fromTier: tech.tier - 1,
        toRow,
        toTier: tech.tier,
        linear: true,
        branchId: tech.branchId,
      });
    }

    for (const prereqId of tech.prerequisites) {
      const prereq = TECH_TREE[prereqId];
      if (!prereq) continue;
      const fromRow = rowMap.get(prereq.branchId);
      if (fromRow === undefined) continue;
      edges.push({
        fromId: prereqId,
        toId: tech.id,
        fromRow,
        fromTier: prereq.tier,
        toRow,
        toTier: tech.tier,
        linear: false,
        branchId: tech.branchId,
      });
    }
  }
  return edges;
}

function nodeCenter(row: number, tier: number): { x: number; y: number } {
  return {
    x: LEFT_PAD + TIER_W * (tier - 0.5),
    y: HEADER_H + row * ROW_H + 14 + NODE_SIZE / 2,
  };
}

function edgePath(e: Edge): string {
  const from = nodeCenter(e.fromRow, e.fromTier);
  const to = nodeCenter(e.toRow, e.toTier);
  const r = NODE_SIZE / 2 + 2;
  if (e.fromRow === e.toRow) {
    return `M${from.x + r},${from.y} L${to.x - r},${to.y}`;
  }
  const sx = from.x + r;
  const ex = to.x - r;
  const dx = ex - sx;
  return `M${sx},${from.y} C${sx + dx * 0.4},${from.y} ${ex - dx * 0.4},${to.y} ${ex},${to.y}`;
}

function directPrereqs(techId: string): Set<string> {
  const result = new Set<string>();
  const tech = TECH_TREE[techId];
  if (!tech) return result;
  if (tech.tier > 1) result.add(`${tech.branchId}_t${tech.tier - 1}`);
  for (const prereqId of tech.prerequisites) result.add(prereqId);
  return result;
}


function collectUnresearchedPrereqs(
  techId: string,
  system: SystemState,
): string[] {
  const visited = new Set<string>();
  const order: string[] = [];

  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);

    const tech = TECH_TREE[id];
    if (!tech) return;

    for (let t = 1; t < tech.tier; t++) {
      visit(`${tech.branchId}_t${t}`);
    }

    for (const prereqId of tech.prerequisites) {
      visit(prereqId);
    }

    const status = getTechStatus(system, id);
    if (status !== "completed" && status !== "in_progress") {
      order.push(id);
    }
  }

  visit(techId);
  return order;
}

function rowLabel(branchId: string): string {
  const meta = BRANCH_META[branchId];
  if (!meta) return branchId;
  const parts = meta.label.split(" · ");
  return parts[1] ?? parts[0] ?? branchId;
}

function collectQueuedPrereqs(
  techId: string,
  queuedTechIds: Set<string>,
): string[] {
  const result: string[] = [];
  const visited = new Set<string>();

  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    if (!queuedTechIds.has(id)) return;

    result.push(id);
    const tech = TECH_TREE[id];
    if (!tech) return;

    if (tech.tier > 1) visit(`${tech.branchId}_t${tech.tier - 1}`);
    for (const prereqId of tech.prerequisites) visit(prereqId);
  }

  visit(techId);
  return result;
}

export function DepMap({
  system,
  selectedTech,
  onSelect,
  onQueue,
  onDequeue,
}: {
  system: SystemState;
  selectedTech: string | null;
  onSelect: (techId: string | null) => void;
  onQueue: (techId: string) => void;
  onDequeue: (projectIds: string[]) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const rowMap = useMemo(() => buildRowMap(), []);

  let highestCompleted = 0;
  for (const [key, val] of Object.entries(system.completedResearch)) {
    if (!val) continue;
    const tierMatch = key.match(/_t(\d+)$/);
    if (tierMatch) {
      const t = parseInt(tierMatch[1]!, 10);
      if (t > highestCompleted) highestCompleted = t;
    }
  }
  const visibleTiers = Math.min(MAX_TIER, 4 * (1 + Math.floor(highestCompleted / 4)));

  const allEdges = useMemo(
    () => buildEdges(rowMap).filter((e) => e.fromTier <= visibleTiers && e.toTier <= visibleTiers),
    [rowMap, visibleTiers],
  );
  const totalRows = BRANCH_GROUPS.reduce((n, g) => n + g.branches.length, 0);
  const gridW = LEFT_PAD + TIER_W * visibleTiers;
  const gridH = HEADER_H + totalRows * ROW_H;

  const queueMap = useMemo(() => {
    const m = new Map<string, number>();
    system.researchQueue.forEach((project, idx) => {
      m.set(project.techId, idx + 1);
    });
    return m;
  }, [system.researchQueue]);

  const ancestors = useMemo(
    () => (selectedTech ? directPrereqs(selectedTech) : new Set<string>()),
    [selectedTech],
  );
  const relatedNodes = useMemo(() => {
    if (!selectedTech) return null;
    const s = new Set<string>();
    s.add(selectedTech);
    for (const id of ancestors) s.add(id);
    return s;
  }, [selectedTech, ancestors]);

  const projectByTechId = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of system.researchQueue) {
      m.set(p.techId, p.id);
    }
    return m;
  }, [system.researchQueue]);

  const handleNodeClick = useCallback(
    (e: React.MouseEvent, techId: string, isSelected: boolean) => {
      e.stopPropagation();
      soundManager.playUI("ui_click");
      if (e.detail >= 2) {
        if (queueMap.has(techId)) {
          const queuedIds = new Set(projectByTechId.keys());
          const toRemove = collectQueuedPrereqs(techId, queuedIds);
          const projectIds = toRemove
            .map((id) => projectByTechId.get(id))
            .filter((id): id is string => id !== undefined);
          if (projectIds.length > 0) onDequeue(projectIds);
        } else {
          const toQueue = collectUnresearchedPrereqs(techId, system);
          for (const id of toQueue) {
            onQueue(id);
          }
        }
      } else {
        onSelect(isSelected ? null : techId);
      }
    },
    [system, onQueue, onDequeue, onSelect, queueMap, projectByTechId],
  );

  useEffect(() => {
    if (!selectedTech || !scrollRef.current) return;
    const tech = TECH_TREE[selectedTech];
    if (!tech) return;
    const center = nodeCenter(rowMap.get(tech.branchId) ?? 0, tech.tier);
    const container = scrollRef.current;
    const scrollLeft = Math.max(0, center.x - container.clientWidth / 2);
    container.scrollTo({ left: scrollLeft, behavior: "smooth" });
  }, [selectedTech, rowMap]);

  const groupBands = useMemo(() => {
    const bands: { y: number; h: number; groupId: string }[] = [];
    let row = 0;
    for (const group of BRANCH_GROUPS) {
      const y = HEADER_H + row * ROW_H;
      const h = group.branches.length * ROW_H;
      bands.push({ y, h, groupId: group.id });
      row += group.branches.length;
    }
    return bands;
  }, []);

  function edgeColor(e: Edge): string {
    const branchColor = BRANCH_META[e.branchId]?.color ?? "rgba(110,200,255,1)";

    if (!selectedTech) {
      if (e.linear) return branchColor;
      return "rgba(110,200,255,0.10)";
    }

    const fromRelated = ancestors.has(e.fromId) || e.fromId === selectedTech;
    const toRelated = ancestors.has(e.toId) || e.toId === selectedTech;
    if (fromRelated && toRelated) return "#4cd8a8";

    if (e.linear) return branchColor;
    return "rgba(110,200,255,0.06)";
  }

  function edgeGlow(e: Edge): boolean {
    if (!selectedTech) return false;
    const fromAnc = ancestors.has(e.fromId) || e.fromId === selectedTech;
    const toAnc = ancestors.has(e.toId) || e.toId === selectedTech;
    return fromAnc && toAnc;
  }

  const visibleEdges = useMemo(() => allEdges, [allEdges]);

  return (
    <Panel
      label="TECHNOLOGY MAP"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <div
        ref={scrollRef}
        onClick={() => onSelect(null)}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          userSelect: "none",
        }}
      >
        <div style={{ position: "relative", width: gridW, height: gridH }}>
          {groupBands.map((band, i) => (
            <div
              key={band.groupId}
              style={{
                position: "absolute",
                top: band.y,
                left: 0,
                width: gridW,
                height: band.h,
                background: i % 2 === 0 ? "rgba(110,200,255,0.02)" : "transparent",
                pointerEvents: "none",
              }}
            />
          ))}

          {Array.from({ length: visibleTiers }, (_, i) => i + 1).map((tier) => (
            <div
              key={tier}
              style={{
                position: "absolute",
                top: 0,
                left: LEFT_PAD + TIER_W * (tier - 1),
                width: TIER_W,
                height: HEADER_H,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT_MONO,
                fontSize: 11,
                fontWeight: 600,
                color: "#6b87a3",
                letterSpacing: "0.18em",
              }}
            >
              Tier {tier}
            </div>
          ))}

          {(() => {
            let row = 0;
            return BRANCH_GROUPS.map((group) => {
              const startRow = row;
              const groupY = HEADER_H + startRow * ROW_H;
              const groupH = group.branches.length * ROW_H;
              row += group.branches.length;
              return (
                <div
                  key={group.id}
                  style={{
                    position: "absolute",
                    top: groupY,
                    left: 0,
                    width: GROUP_W,
                    height: groupH,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                    transform: "rotate(180deg)",
                    fontFamily: FONT_MONO,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.22em",
                    color: GROUP_COLORS[group.id] ?? "#5d7a99",
                    textTransform: "uppercase",
                  }}
                >
                  {group.label}
                </div>
              );
            });
          })()}

          {(() => {
            let row = 0;
            return BRANCH_GROUPS.flatMap((group) =>
              group.branches.map((branchId) => {
                const r = row++;
                const y = HEADER_H + r * ROW_H;
                return (
                  <div
                    key={branchId}
                    style={{
                      position: "absolute",
                      top: y,
                      left: GROUP_W,
                      width: ROW_LABEL_W,
                      height: ROW_H,
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "flex-end",
                      paddingTop: 14 + NODE_SIZE / 2 - 6,
                      paddingRight: 10,
                      fontFamily: FONT_MONO,
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: "0.12em",
                      color: "#6b87a3",
                      textTransform: "uppercase",
                      textAlign: "right",
                      opacity: 0.7,
                    }}
                  >
                    {rowLabel(branchId)}
                  </div>
                );
              }),
            );
          })()}

          <svg
            width={gridW}
            height={gridH}
            style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 5 }}
          >
            <defs>
              <filter id="dep-glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {visibleEdges.filter((e) => !e.linear).map((e) => {
              const color = edgeColor(e);
              if (color === "transparent") return null;
              const glow = edgeGlow(e);
              return (
                <path
                  key={`${e.fromId}-${e.toId}`}
                  d={edgePath(e)}
                  fill="none"
                  stroke={color}
                  strokeWidth={glow ? 2.5 : 1}
                  opacity={1}
                  filter={glow ? "url(#dep-glow)" : undefined}
                />
              );
            })}
          </svg>

          {visibleEdges.filter((e) => e.linear).map((e) => {
            const from = nodeCenter(e.fromRow, e.fromTier);
            const to = nodeCenter(e.toRow, e.toTier);
            const r = NODE_SIZE / 2 + 4;
            const left = from.x + r;
            const width = to.x - r - left;
            const color = edgeColor(e);
            const glow = edgeGlow(e);
            return (
              <div
                key={`${e.fromId}-${e.toId}`}
                style={{
                  position: "absolute",
                  left,
                  top: from.y,
                  width: Math.max(0, width),
                  height: glow ? 2 : 1,
                  background: color,
                  opacity: glow ? 1 : 0.35,
                  zIndex: glow ? 8 : 4,
                  boxShadow: glow ? `0 0 6px ${color}` : "none",
                  pointerEvents: "none",
                }}
              />
            );
          })}

          {Object.values(TECH_TREE).filter((t) => t.tier <= visibleTiers).map((tech) => {
            const r = rowMap.get(tech.branchId);
            if (r === undefined) return null;
            const center = nodeCenter(r, tech.tier);
            const status = getTechStatus(system, tech.id);
            const isSelected = selectedTech === tech.id;
            const meta = BRANCH_META[tech.branchId];
            if (!meta) return null;

            const dimmed = relatedNodes !== null && !relatedNodes.has(tech.id);
            const isCompleted = status === "completed";
            const queuePos = queueMap.get(tech.id) ?? null;

            const isAncestor = ancestors.has(tech.id);

            let borderColor = STATUS_RING[status];
            if (isSelected) borderColor = "#4ddbff";
            else if (isAncestor) borderColor = "rgba(76,216,168,0.7)";

            let shadow = "none";
            if (isSelected)
              shadow = "0 0 0 3px rgba(77,219,255,0.18), 0 0 18px rgba(77,219,255,0.4)";
            else if (isAncestor)
              shadow = "0 0 10px rgba(76,216,168,0.4)";
            else if (isCompleted)
              shadow = "0 0 8px rgba(76,216,168,0.4)";
            else if (status === "in_progress")
              shadow = `0 0 12px ${STATUS_RING.in_progress}`;

            return (
              <div
                key={tech.id}
                onClick={(e) => handleNodeClick(e, tech.id, isSelected)}
                style={{
                  position: "absolute",
                  left: center.x - TIER_W / 2,
                  top: center.y - NODE_SIZE / 2 - 14,
                  width: TIER_W,
                  height: ROW_H,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  paddingTop: 14,
                  cursor: "pointer",
                  opacity: dimmed ? 0.55 : 1,
                  transition: "opacity .15s",
                  zIndex: isSelected ? 20 : dimmed ? 6 : 7,
                }}
              >
                <div
                  style={{
                    width: NODE_SIZE,
                    height: NODE_SIZE,
                    borderRadius: "50%",
                    background: isCompleted ? STATUS_BG.completed : STATUS_BG[status],
                    border: `1.5px solid ${borderColor}`,
                    boxShadow: shadow,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    transition: "box-shadow .15s, border-color .15s, transform .15s",
                    transform: isSelected ? "scale(1.15)" : "scale(1)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 16,
                      color: isCompleted ? "#4cd8a8" : meta.color,
                      opacity: status === "locked" ? 0.5 : 1,
                    }}
                  >
                    {isCompleted ? (
                      <FontAwesomeIcon icon={faCheck} />
                    ) : (
                      <FontAwesomeIcon icon={meta.icon} />
                    )}
                  </span>

                {queuePos !== null && (
                  <span
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -6,
                      fontFamily: FONT_MONO,
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#0a1929",
                      background: "#b08bff",
                      borderRadius: "50%",
                      width: 18,
                      height: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1,
                    }}
                  >
                    {queuePos}
                  </span>
                )}

                {status === "in_progress" && (
                  <div
                    style={{
                      position: "absolute",
                      inset: -4,
                      borderRadius: "50%",
                      border: "1.5px solid rgba(176,139,255,0.35)",
                      animation: "depmap-pulse 2s ease-in-out infinite",
                    }}
                  />
                )}
                </div>
                <span
                  style={{
                    marginTop: 6,
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    color: isSelected ? "#d6e8f5" : status === "locked" ? "#5d7a99" : "#9ab4cf",
                    textAlign: "center",
                    lineHeight: 1.15,
                    maxWidth: TIER_W - 16,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    wordBreak: "break-word",
                  }}
                >
                  {tech.name}
                </span>
              </div>
            );
          })}

          <style>{`
            @keyframes depmap-pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.2); opacity: 0; }
            }
          `}</style>
        </div>
      </div>
    </Panel>
  );
}
