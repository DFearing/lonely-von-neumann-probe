import type { GameState } from "../simulation/state";

const SAVE_KEY = "lonely-probe-save";
const CURRENT_VERSION = 1;

export interface SaveData {
  version: number;
  timestamp: number;
  state: GameState;
}

/** Serializes the current game state to localStorage. */
export function saveGame(state: GameState): void {
  const data: SaveData = {
    version: CURRENT_VERSION,
    timestamp: Date.now(),
    state,
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

/** Loads and validates a saved game from localStorage. Returns null if no save exists or data is corrupt. */
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
