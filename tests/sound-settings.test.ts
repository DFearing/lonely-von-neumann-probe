import { describe, test, expect, beforeEach } from "bun:test";
import { loadSoundSettings, saveSoundSettings } from "../src/audio/sound-settings";

// Bun test runner provides a global localStorage via happy-dom/jsdom,
// but if unavailable we create a minimal stub.
function ensureLocalStorage(): void {
  if (typeof globalThis.localStorage !== "undefined") return;

  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    },
    writable: true,
    configurable: true,
  });
}

const STORAGE_KEY = "lonely-probe-sound-settings";

describe("sound settings persistence", () => {
  beforeEach(() => {
    ensureLocalStorage();
    localStorage.clear();
  });

  // ── Defaults ─────────────────────────────────────────────────────

  test("returns defaults when no localStorage entry exists", () => {
    const settings = loadSoundSettings();
    expect(settings.volume).toBe(0.5);
    expect(settings.muted).toBe(false);
  });

  // ── Round-trip ───────────────────────────────────────────────────

  test("saved settings round-trip correctly", () => {
    saveSoundSettings({ volume: 0.8, muted: true });
    const loaded = loadSoundSettings();
    expect(loaded.volume).toBe(0.8);
    expect(loaded.muted).toBe(true);
  });

  test("volume 0 round-trips correctly", () => {
    saveSoundSettings({ volume: 0, muted: false });
    const loaded = loadSoundSettings();
    expect(loaded.volume).toBe(0);
    expect(loaded.muted).toBe(false);
  });

  test("volume 1 round-trips correctly", () => {
    saveSoundSettings({ volume: 1, muted: false });
    const loaded = loadSoundSettings();
    expect(loaded.volume).toBe(1);
  });

  // ── Corrupt data fallback ────────────────────────────────────────

  test("invalid JSON falls back to defaults", () => {
    localStorage.setItem(STORAGE_KEY, "not valid json {{{");
    const settings = loadSoundSettings();
    expect(settings.volume).toBe(0.5);
    expect(settings.muted).toBe(false);
  });

  test("non-object JSON value falls back to defaults", () => {
    localStorage.setItem(STORAGE_KEY, '"just a string"');
    const settings = loadSoundSettings();
    expect(settings.volume).toBe(0.5);
    expect(settings.muted).toBe(false);
  });

  test("null JSON value falls back to defaults", () => {
    localStorage.setItem(STORAGE_KEY, "null");
    const settings = loadSoundSettings();
    expect(settings.volume).toBe(0.5);
    expect(settings.muted).toBe(false);
  });

  test("object with wrong types falls back to defaults for those fields", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ volume: "loud", muted: 42 }),
    );
    const settings = loadSoundSettings();
    expect(settings.volume).toBe(0.5);
    expect(settings.muted).toBe(false);
  });

  test("object missing fields uses defaults for missing ones", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume: 0.3 }));
    const settings = loadSoundSettings();
    expect(settings.volume).toBe(0.3);
    expect(settings.muted).toBe(false);
  });

  // ── Volume clamping ──────────────────────────────────────────────

  test("volume above 1 is clamped to 1", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ volume: 5.0, muted: false }),
    );
    const settings = loadSoundSettings();
    expect(settings.volume).toBe(1);
  });

  test("negative volume is clamped to 0", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ volume: -0.5, muted: false }),
    );
    const settings = loadSoundSettings();
    expect(settings.volume).toBe(0);
  });

  // ── Isolation ────────────────────────────────────────────────────

  test("returned defaults object is a fresh copy each call", () => {
    const a = loadSoundSettings();
    const b = loadSoundSettings();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});
