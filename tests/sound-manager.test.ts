import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { soundManager } from "../src/audio/sound-manager";

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

describe("SoundManager music settings", () => {
  beforeEach(() => {
    ensureLocalStorage();
    localStorage.clear();
    soundManager.setMusicVolume(0.3);
    soundManager.setMusicMuted(false);
    soundManager.setVolume(0.5);
    soundManager.setMuted(false);
  });

  afterEach(() => {
    soundManager.stopMusic();
  });

  test("setMusicVolume updates the settings object", () => {
    const before = soundManager.getSettings();
    soundManager.setMusicVolume(0.7);
    const after = soundManager.getSettings();

    expect(after.musicVolume).toBe(0.7);
    expect(before).not.toBe(after);
  });

  test("setMusicVolume clamps to [0, 1]", () => {
    soundManager.setMusicVolume(-0.5);
    expect(soundManager.getSettings().musicVolume).toBe(0);

    soundManager.setMusicVolume(2.0);
    expect(soundManager.getSettings().musicVolume).toBe(1);
  });

  test("setMusicMuted updates the settings object", () => {
    soundManager.setMusicMuted(true);
    expect(soundManager.getSettings().musicMuted).toBe(true);

    soundManager.setMusicMuted(false);
    expect(soundManager.getSettings().musicMuted).toBe(false);
  });

  test("setMusicVolume persists to localStorage", () => {
    soundManager.setMusicVolume(0.9);

    const raw = localStorage.getItem("lonely-probe-sound-settings");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.musicVolume).toBe(0.9);
  });

  test("setMusicMuted persists to localStorage", () => {
    soundManager.setMusicMuted(true);

    const raw = localStorage.getItem("lonely-probe-sound-settings");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.musicMuted).toBe(true);
  });

  test("setMusicVolume does not affect other settings fields", () => {
    soundManager.setMusicVolume(0.8);

    const s = soundManager.getSettings();
    expect(s.volume).toBe(0.5);
    expect(s.muted).toBe(false);
    expect(s.musicMuted).toBe(false);
  });

  test("setMusicMuted does not affect other settings fields", () => {
    soundManager.setMusicMuted(true);

    const s = soundManager.getSettings();
    expect(s.volume).toBe(0.5);
    expect(s.muted).toBe(false);
    expect(s.musicVolume).toBe(0.3);
  });

  test("subscriber is notified on setMusicVolume", () => {
    let notified = false;
    const unsub = soundManager.subscribe(() => {
      notified = true;
    });

    soundManager.setMusicVolume(0.6);
    expect(notified).toBe(true);

    unsub();
  });

  test("subscriber is notified on each setMusicMuted call", () => {
    let count = 0;
    const unsub = soundManager.subscribe(() => {
      count++;
    });

    soundManager.setMusicMuted(true);
    soundManager.setMusicMuted(false);
    expect(count).toBe(2);

    unsub();
  });

  test("unsubscribed callback is not called", () => {
    let called = false;
    const unsub = soundManager.subscribe(() => {
      called = true;
    });
    unsub();

    soundManager.setMusicVolume(0.5);
    expect(called).toBe(false);
  });

  test("stopMusic does not throw when music was never started", () => {
    expect(() => soundManager.stopMusic()).not.toThrow();
  });

  test("settings object is frozen after music volume change", () => {
    soundManager.setMusicVolume(0.4);
    expect(Object.isFrozen(soundManager.getSettings())).toBe(true);
  });

  test("settings object is frozen after music muted change", () => {
    soundManager.setMusicMuted(true);
    expect(Object.isFrozen(soundManager.getSettings())).toBe(true);
  });

  test("each setter produces a new settings reference", () => {
    const ref1 = soundManager.getSettings();
    soundManager.setMusicVolume(0.1);
    const ref2 = soundManager.getSettings();
    soundManager.setMusicMuted(true);
    const ref3 = soundManager.getSettings();

    expect(ref1).not.toBe(ref2);
    expect(ref2).not.toBe(ref3);
  });
});

describe("SoundManager setMusicMood", () => {
  beforeEach(() => {
    ensureLocalStorage();
    localStorage.clear();
    soundManager.setMusicVolume(0.3);
    soundManager.setMusicMuted(false);
    soundManager.setVolume(0.5);
    soundManager.setMuted(false);
  });

  afterEach(() => {
    soundManager.stopMusic();
  });

  test("setMusicMood updates settings.musicMood", () => {
    soundManager.setMusicMood("nebula");
    expect(soundManager.getSettings().musicMood).toBe("nebula");
  });

  test("setMusicMood with invalid ID does not change settings", () => {
    const before = soundManager.getSettings();
    soundManager.setMusicMood("invalid_id");
    const after = soundManager.getSettings();
    expect(after.musicMood).toBe(before.musicMood);
  });

  test("setMusicMood with empty string does not change settings", () => {
    soundManager.setMusicMood("nebula");
    soundManager.setMusicMood("");
    expect(soundManager.getSettings().musicMood).toBe("nebula");
  });

  test("setMusicMood persists to localStorage", () => {
    soundManager.setMusicMood("drift");

    const raw = localStorage.getItem("lonely-probe-sound-settings");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.musicMood).toBe("drift");
  });

  test("setMusicMood with invalid ID does not persist a change", () => {
    soundManager.setMusicMood("nebula");
    const rawBefore = localStorage.getItem("lonely-probe-sound-settings");

    soundManager.setMusicMood("nonexistent");
    const rawAfter = localStorage.getItem("lonely-probe-sound-settings");

    expect(rawAfter).toBe(rawBefore);
  });

  test("setMusicMood notifies subscribers", () => {
    let notified = false;
    const unsub = soundManager.subscribe(() => {
      notified = true;
    });

    soundManager.setMusicMood("void");
    expect(notified).toBe(true);

    unsub();
  });

  test("setMusicMood with invalid ID does not notify subscribers", () => {
    let notified = false;
    const unsub = soundManager.subscribe(() => {
      notified = true;
    });

    soundManager.setMusicMood("invalid_id");
    expect(notified).toBe(false);

    unsub();
  });

  test("setMusicMood does not affect other settings fields", () => {
    soundManager.setMusicMood("drift");

    const s = soundManager.getSettings();
    expect(s.volume).toBe(0.5);
    expect(s.muted).toBe(false);
    expect(s.musicVolume).toBe(0.3);
    expect(s.musicMuted).toBe(false);
  });

  test("settings object is frozen after setMusicMood", () => {
    soundManager.setMusicMood("nebula");
    expect(Object.isFrozen(soundManager.getSettings())).toBe(true);
  });

  test("setMusicMood produces a new settings reference", () => {
    const ref1 = soundManager.getSettings();
    soundManager.setMusicMood("void");
    const ref2 = soundManager.getSettings();
    expect(ref1).not.toBe(ref2);
  });

  test("can cycle through all valid mood IDs", () => {
    for (const id of ["deep_space", "nebula", "drift", "void"]) {
      soundManager.setMusicMood(id);
      expect(soundManager.getSettings().musicMood).toBe(id);
    }
  });
});
