import { describe, test, expect, beforeEach } from "bun:test";
import { createInitialState } from "../src/simulation/state";

const SEED = 42;

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

const { saveGameSlot, loadGameSlot, listSaves, deleteSlot } = await import(
  "../src/persistence/save-load"
);

beforeEach(() => {
  localStorage.clear();
});

describe("saveGameSlot + loadGameSlot round-trip", () => {
  test("saved state can be loaded and matches the original", () => {
    const state = createInitialState(SEED);
    saveGameSlot("slot_1", state, "TestProbe");

    const loaded = loadGameSlot("slot_1");
    expect(loaded).not.toBeNull();
    expect(loaded!.state).toEqual(state);
  });

  test("version field is set to 1", () => {
    const state = createInitialState(SEED);
    saveGameSlot("slot_1", state, "TestProbe");

    const loaded = loadGameSlot("slot_1");
    expect(loaded!.version).toBe(1);
  });

  test("timestamp is a recent epoch-ms value", () => {
    const before = Date.now();
    const state = createInitialState(SEED);
    saveGameSlot("slot_1", state, "TestProbe");
    const after = Date.now();

    const loaded = loadGameSlot("slot_1");
    expect(loaded!.timestamp).toBeGreaterThanOrEqual(before);
    expect(loaded!.timestamp).toBeLessThanOrEqual(after);
  });
});

describe("loadGameSlot edge cases", () => {
  test("returns null when no save exists", () => {
    expect(loadGameSlot("slot_missing")).toBeNull();
  });

  test("returns null for corrupted JSON", () => {
    localStorage.setItem("slot_bad", "not valid json {{{");
    expect(loadGameSlot("slot_bad")).toBeNull();
  });

  test("returns null when stored data is a plain string", () => {
    localStorage.setItem("slot_str", JSON.stringify("just a string"));
    expect(loadGameSlot("slot_str")).toBeNull();
  });

  test("returns null when stored data is missing version", () => {
    localStorage.setItem("slot_nover", JSON.stringify({ state: { tickCount: 0 } }));
    expect(loadGameSlot("slot_nover")).toBeNull();
  });

  test("returns null when stored data is missing state", () => {
    localStorage.setItem("slot_nostate", JSON.stringify({ version: 1, timestamp: Date.now() }));
    expect(loadGameSlot("slot_nostate")).toBeNull();
  });
});

describe("listSaves", () => {
  test("returns empty array when no saves exist", () => {
    expect(listSaves()).toEqual([]);
  });

  test("returns saved slots after saving", () => {
    saveGameSlot("slot_1", createInitialState(SEED), "Probe-1");
    const saves = listSaves();
    expect(saves.length).toBe(1);
    expect(saves[0]!.probeName).toBe("Probe-1");
  });
});

describe("deleteSlot", () => {
  test("removes the save so loadGameSlot returns null", () => {
    saveGameSlot("slot_1", createInitialState(SEED), "TestProbe");
    expect(loadGameSlot("slot_1")).not.toBeNull();

    deleteSlot("slot_1");
    expect(loadGameSlot("slot_1")).toBeNull();
  });

  test("removes the slot from the index", () => {
    saveGameSlot("slot_1", createInitialState(SEED), "TestProbe");
    expect(listSaves().length).toBe(1);

    deleteSlot("slot_1");
    expect(listSaves().length).toBe(0);
  });

  test("is a no-op when no save exists", () => {
    expect(() => deleteSlot("slot_missing")).not.toThrow();
  });
});
