import type { GameState } from "../simulation/state";

const SAVE_INDEX_KEY = "lonely-probe-saves";
const CURRENT_VERSION = 1;

export interface SaveData {
  version: number;
  timestamp: number;
  state: GameState;
}

export interface SaveSlotInfo {
  key: string;
  name: string;
  tickCount: number;
  timestamp: number;
  probeName: string;
  cycle: number;
  systemCount: number;
  structureCount: number;
  gameOver?: boolean;
}

function isValidSaveData(data: unknown): data is SaveData {
  if (typeof data !== "object" || data === null) return false;
  const record = data as Record<string, unknown>;
  if (typeof record["version"] !== "number") return false;
  if (typeof record["state"] !== "object" || record["state"] === null) return false;
  const state = record["state"] as Record<string, unknown>;
  if (typeof state["systems"] !== "object" || state["systems"] === null) return false;
  if (typeof state["tickCount"] !== "number") return false;
  if (typeof state["rngState"] !== "object" || state["rngState"] === null) return false;
  return true;
}

function isValidSlotInfo(entry: unknown): entry is SaveSlotInfo {
  if (typeof entry !== "object" || entry === null) return false;
  const record = entry as Record<string, unknown>;
  return (
    typeof record["key"] === "string" &&
    typeof record["name"] === "string" &&
    typeof record["tickCount"] === "number" &&
    typeof record["timestamp"] === "number" &&
    typeof record["probeName"] === "string"
  );
}

function getSaveIndex(): SaveSlotInfo[] {
  const raw = localStorage.getItem(SAVE_INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidSlotInfo);
  } catch {
    return [];
  }
}

function writeSaveIndex(index: SaveSlotInfo[]): void {
  localStorage.setItem(SAVE_INDEX_KEY, JSON.stringify(index));
}

export function listSaves(): SaveSlotInfo[] {
  return getSaveIndex();
}

function deriveSlotStats(state: GameState): {
  cycle: number;
  systemCount: number;
  structureCount: number;
} {
  const systems = Object.values(state.systems);
  const systemCount = systems.filter((s) => s.mainProbe !== null).length;
  const structureCount = systems.reduce(
    (sum, s) =>
      sum +
      s.structures.miners.length +
      s.structures.reactors.length +
      s.structures.printers.length +
      s.structures.stations.length,
    0,
  );
  const cycle = 1000 + Math.floor(state.elapsedSeconds);
  return { cycle, systemCount, structureCount };
}

export function saveGameSlot(
  slotKey: string,
  state: GameState,
  probeName?: string,
): void {
  const data: SaveData = {
    version: CURRENT_VERSION,
    timestamp: Date.now(),
    state,
  };
  localStorage.setItem(slotKey, JSON.stringify(data));

  const stats = deriveSlotStats(state);
  const index = getSaveIndex();
  const existing = index.find((s) => s.key === slotKey);
  if (existing) {
    existing.tickCount = state.tickCount;
    existing.timestamp = data.timestamp;
    existing.cycle = stats.cycle;
    existing.systemCount = stats.systemCount;
    existing.structureCount = stats.structureCount;
    existing.gameOver = state.gameOver;
  } else {
    index.push({
      key: slotKey,
      name: probeName ?? `Mission ${index.length + 1}`,
      tickCount: state.tickCount,
      timestamp: data.timestamp,
      probeName: probeName ?? `Probe-${index.length + 1}`,
      cycle: stats.cycle,
      systemCount: stats.systemCount,
      structureCount: stats.structureCount,
      gameOver: state.gameOver,
    });
  }
  writeSaveIndex(index);
}

export function loadGameSlot(slotKey: string): SaveData | null {
  const raw = localStorage.getItem(slotKey);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidSaveData(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function deleteSlot(slotKey: string): void {
  localStorage.removeItem(slotKey);
  const index = getSaveIndex().filter((s) => s.key !== slotKey);
  writeSaveIndex(index);
}
