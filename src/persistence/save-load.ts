import type { GameState } from "../simulation/state";

const SAVE_KEY = "lonely-probe-save";
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

export function saveGame(state: GameState): void {
  const data: SaveData = {
    version: CURRENT_VERSION,
    timestamp: Date.now(),
    state,
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadGame(): SaveData | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw === null) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidSaveData(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
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
  const index = getSaveIndex();

  if (index.length === 0) {
    const legacy = loadGame();
    if (legacy) {
      const stats = deriveSlotStats(legacy.state);
      const slot: SaveSlotInfo = {
        key: SAVE_KEY,
        name: "Legacy Save",
        tickCount: legacy.state.tickCount,
        timestamp: legacy.timestamp,
        probeName: "Legacy Probe",
        year: stats.year,
        systemCount: stats.systemCount,
        structureCount: stats.structureCount,
      };
      writeSaveIndex([slot]);
      return [slot];
    }
  }

  return index;
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
      s.structures.printers.length,
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
