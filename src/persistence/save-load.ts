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
  year: number;
  systemCount: number;
  structureCount: number;
}

function isValidSaveData(data: unknown): data is SaveData {
  if (typeof data !== "object" || data === null) return false;
  const record = data as Record<string, unknown>;
  return (
    typeof record["version"] === "number" &&
    typeof record["state"] === "object" &&
    record["state"] !== null
  );
}

function getSaveIndex(): SaveSlotInfo[] {
  const raw = localStorage.getItem(SAVE_INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SaveSlotInfo[];
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
  year: number;
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
  const year = Math.floor(state.elapsedSeconds);
  return { year, systemCount, structureCount };
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
    existing.year = stats.year;
    existing.systemCount = stats.systemCount;
    existing.structureCount = stats.structureCount;
  } else {
    index.push({
      key: slotKey,
      name: probeName ?? `Mission ${index.length + 1}`,
      tickCount: state.tickCount,
      timestamp: data.timestamp,
      probeName: probeName ?? `Probe-${index.length + 1}`,
      year: stats.year,
      systemCount: stats.systemCount,
      structureCount: stats.structureCount,
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
