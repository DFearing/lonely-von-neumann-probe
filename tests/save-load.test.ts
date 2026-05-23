import { describe, test, expect, beforeEach } from "bun:test";
import { createInitialState } from "../src/simulation/state";

const SEED = 42;
const SAVE_KEY = "lonely-probe-save";

function createInMemoryLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    key(index: number): string | null {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    setItem(key: string, value: string): void {
      store.set(key, value);
    },
  };
}

(globalThis as any).localStorage = createInMemoryLocalStorage();

const { saveGame, loadGame, hasSave, deleteSave } = await import(
  "../src/persistence/save-load"
);

beforeEach(() => {
  localStorage.clear();
});

describe("saveGame + loadGame round-trip", () => {
  test("saved state can be loaded and matches the original", () => {
    const state = createInitialState(SEED);
    saveGame(state);

    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.state).toEqual(state);
  });

  test("version field is set to 1", () => {
    const state = createInitialState(SEED);
    saveGame(state);

    const loaded = loadGame();
    expect(loaded!.version).toBe(1);
  });

  test("timestamp is a recent epoch-ms value", () => {
    const before = Date.now();
    const state = createInitialState(SEED);
    saveGame(state);
    const after = Date.now();

    const loaded = loadGame();
    expect(loaded!.timestamp).toBeGreaterThanOrEqual(before);
    expect(loaded!.timestamp).toBeLessThanOrEqual(after);
  });
});

describe("loadGame edge cases", () => {
  test("returns null when no save exists", () => {
    expect(loadGame()).toBeNull();
  });

  test("returns null for corrupted JSON", () => {
    localStorage.setItem(SAVE_KEY, "not valid json {{{");
    expect(loadGame()).toBeNull();
  });

  test("returns null when stored data is a plain string", () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify("just a string"));
    expect(loadGame()).toBeNull();
  });

  test("returns null when stored data is missing version", () => {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ state: { tickCount: 0 } }),
    );
    expect(loadGame()).toBeNull();
  });

  test("returns null when stored data is missing state", () => {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ version: 1, timestamp: Date.now() }),
    );
    expect(loadGame()).toBeNull();
  });

  test("returns null when state is null", () => {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ version: 1, timestamp: Date.now(), state: null }),
    );
    expect(loadGame()).toBeNull();
  });
});

describe("hasSave", () => {
  test("returns false when no save exists", () => {
    expect(hasSave()).toBe(false);
  });

  test("returns true after saving", () => {
    saveGame(createInitialState(SEED));
    expect(hasSave()).toBe(true);
  });

  test("returns false after deleteSave", () => {
    saveGame(createInitialState(SEED));
    expect(hasSave()).toBe(true);

    deleteSave();
    expect(hasSave()).toBe(false);
  });
});

describe("deleteSave", () => {
  test("removes the save so loadGame returns null", () => {
    saveGame(createInitialState(SEED));
    expect(loadGame()).not.toBeNull();

    deleteSave();
    expect(loadGame()).toBeNull();
  });

  test("is a no-op when no save exists", () => {
    expect(() => deleteSave()).not.toThrow();
    expect(hasSave()).toBe(false);
  });
});
