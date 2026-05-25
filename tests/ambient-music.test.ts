import { describe, test, expect } from "bun:test";
import {
  AmbientMusic,
  MUSIC_MOODS,
  DEFAULT_MOOD_ID,
} from "../src/audio/ambient-music";

describe("AmbientMusic", () => {
  test("can be instantiated", () => {
    const music = new AmbientMusic();
    expect(music).toBeDefined();
  });

  test("stop does not throw when called before start", () => {
    const music = new AmbientMusic();
    expect(() => music.stop()).not.toThrow();
  });

  test("stop can be called multiple times without error", () => {
    const music = new AmbientMusic();
    expect(() => {
      music.stop();
      music.stop();
      music.stop();
    }).not.toThrow();
  });
});

describe("MUSIC_MOODS data validation", () => {
  test("contains exactly 4 moods", () => {
    expect(MUSIC_MOODS).toHaveLength(4);
  });

  test("all mood IDs are unique", () => {
    const ids = MUSIC_MOODS.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("all mood IDs are non-empty strings", () => {
    for (const mood of MUSIC_MOODS) {
      expect(typeof mood.id).toBe("string");
      expect(mood.id.length).toBeGreaterThan(0);
    }
  });

  test("expected mood IDs are present", () => {
    const ids = MUSIC_MOODS.map(m => m.id);
    expect(ids).toContain("deep_space");
    expect(ids).toContain("nebula");
    expect(ids).toContain("drift");
    expect(ids).toContain("void");
  });

  test("DEFAULT_MOOD_ID exists in MUSIC_MOODS", () => {
    const ids = MUSIC_MOODS.map(m => m.id);
    expect(ids).toContain(DEFAULT_MOOD_ID);
  });

  test("DEFAULT_MOOD_ID is deep_space", () => {
    expect(DEFAULT_MOOD_ID).toBe("deep_space");
  });

  test.each(MUSIC_MOODS.map(m => [m.id, m] as const))(
    "%s: scale has at least 10 entries",
    (_id, mood) => {
      expect(mood.scale.length).toBeGreaterThanOrEqual(10);
    },
  );

  test.each(MUSIC_MOODS.map(m => [m.id, m] as const))(
    "%s: all droneRoots indices are within scale bounds",
    (_id, mood) => {
      for (const idx of mood.droneRoots) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(mood.scale.length);
      }
    },
  );

  test.each(MUSIC_MOODS.map(m => [m.id, m] as const))(
    "%s: all chord indices are within scale bounds",
    (_id, mood) => {
      for (const chord of mood.chords) {
        for (const idx of chord) {
          expect(idx).toBeGreaterThanOrEqual(0);
          expect(idx).toBeLessThan(mood.scale.length);
        }
      }
    },
  );

  test.each(MUSIC_MOODS.map(m => [m.id, m] as const))(
    "%s: melodyRange [low, high] is within scale bounds and low < high",
    (_id, mood) => {
      const [low, high] = mood.melodyRange;
      expect(low).toBeGreaterThanOrEqual(0);
      expect(high).toBeLessThan(mood.scale.length);
      expect(low).toBeLessThan(high);
    },
  );

  test.each(MUSIC_MOODS.map(m => [m.id, m] as const))(
    "%s: has at least 6 chord shapes",
    (_id, mood) => {
      expect(mood.chords.length).toBeGreaterThanOrEqual(6);
    },
  );

  test.each(MUSIC_MOODS.map(m => [m.id, m] as const))(
    "%s: has a label and description",
    (_id, mood) => {
      expect(mood.label.length).toBeGreaterThan(0);
      expect(mood.description.length).toBeGreaterThan(0);
    },
  );

  test.each(MUSIC_MOODS.map(m => [m.id, m] as const))(
    "%s: timing values are positive",
    (_id, mood) => {
      const { timing } = mood;
      expect(timing.droneFade).toBeGreaterThan(0);
      expect(timing.padAttack).toBeGreaterThan(0);
      expect(timing.padRelease).toBeGreaterThan(0);
      expect(timing.droneHold[0]).toBeGreaterThan(0);
      expect(timing.droneHold[1]).toBeGreaterThan(timing.droneHold[0]);
      expect(timing.padInterval[0]).toBeGreaterThan(0);
      expect(timing.padInterval[1]).toBeGreaterThan(timing.padInterval[0]);
      expect(timing.melodyPhraseGap[0]).toBeGreaterThan(0);
      expect(timing.melodyPhraseGap[1]).toBeGreaterThan(timing.melodyPhraseGap[0]);
      expect(timing.melodyNoteCount[0]).toBeGreaterThanOrEqual(1);
      expect(timing.melodyNoteCount[1]).toBeGreaterThanOrEqual(timing.melodyNoteCount[0]);
    },
  );
});

describe("AmbientMusic.setMood", () => {
  test("does not throw when called before start", () => {
    const music = new AmbientMusic();
    const mood = MUSIC_MOODS.find(m => m.id === "nebula")!;
    expect(() => music.setMood(mood)).not.toThrow();
  });

  test.each(MUSIC_MOODS.map(m => [m.id, m] as const))(
    "can call setMood with %s mood",
    (_id, mood) => {
      const music = new AmbientMusic();
      expect(() => music.setMood(mood)).not.toThrow();
    },
  );

  test("can switch moods multiple times without error", () => {
    const music = new AmbientMusic();
    for (const mood of MUSIC_MOODS) {
      expect(() => music.setMood(mood)).not.toThrow();
    }
  });
});
