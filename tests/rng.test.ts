import { describe, test, expect } from "bun:test";
import { createRng, createRngFromState } from "../src/simulation/rng";

describe("rng", () => {
  // ── Determinism ──────────────────────────────────────────────────

  describe("determinism", () => {
    test("same seed produces identical sequence of 10,000 nextFloat values", () => {
      const rng1 = createRng(42);
      const rng2 = createRng(42);

      for (let i = 0; i < 10_000; i++) {
        expect(rng1.nextFloat()).toBe(rng2.nextFloat());
      }
    });

    test("same seed produces identical sequence of nextInt values", () => {
      const rng1 = createRng(99);
      const rng2 = createRng(99);

      for (let i = 0; i < 10_000; i++) {
        expect(rng1.nextInt(0, 100)).toBe(rng2.nextInt(0, 100));
      }
    });

    test("two different seeds produce different sequences", () => {
      const rng1 = createRng(1);
      const rng2 = createRng(2);

      let differences = 0;
      for (let i = 0; i < 100; i++) {
        if (rng1.nextFloat() !== rng2.nextFloat()) {
          differences++;
        }
      }
      expect(differences).toBeGreaterThan(0);
    });
  });

  // ── Snapshot / restore round-trip ────────────────────────────────

  describe("snapshot and restore", () => {
    test("snapshot then createRngFromState produces matching subsequent values", () => {
      const rng = createRng(123);
      for (let i = 0; i < 50; i++) rng.nextFloat();

      const saved = rng.snapshot();
      const restored = createRngFromState(saved);

      for (let i = 0; i < 1_000; i++) {
        expect(rng.nextFloat()).toBe(restored.nextFloat());
      }
    });

    test("restore resets the RNG to the snapshot point", () => {
      const rng = createRng(456);
      for (let i = 0; i < 50; i++) rng.nextFloat();

      const saved = rng.snapshot();
      const valuesAfterSnapshot: number[] = [];
      for (let i = 0; i < 100; i++) {
        valuesAfterSnapshot.push(rng.nextFloat());
      }

      rng.restore(saved);
      for (let i = 0; i < 100; i++) {
        expect(rng.nextFloat()).toBe(valuesAfterSnapshot[i]!);
      }
    });

    test("snapshot returns a copy that is not affected by further draws", () => {
      const rng = createRng(789);
      const saved = rng.snapshot();
      for (let i = 0; i < 100; i++) rng.nextFloat();

      const rng2 = createRngFromState(saved);
      rng.restore(saved);

      for (let i = 0; i < 100; i++) {
        expect(rng.nextFloat()).toBe(rng2.nextFloat());
      }
    });
  });

  // ── nextFloat range ──────────────────────────────────────────────

  describe("nextFloat", () => {
    test("all values in [0, 1) over 10,000 draws", () => {
      const rng = createRng(7);
      for (let i = 0; i < 10_000; i++) {
        const v = rng.nextFloat();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });

    test("never returns exactly 1.0", () => {
      const rng = createRng(31415);
      for (let i = 0; i < 10_000; i++) {
        expect(rng.nextFloat()).not.toBe(1.0);
      }
    });
  });

  // ── nextInt bounds ───────────────────────────────────────────────

  describe("nextInt", () => {
    test("nextInt(0, 10) always in [0, 10] over 10,000 draws", () => {
      const rng = createRng(100);
      for (let i = 0; i < 10_000; i++) {
        const v = rng.nextInt(0, 10);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(10);
      }
    });

    test("nextInt(5, 5) always returns 5", () => {
      const rng = createRng(200);
      for (let i = 0; i < 1_000; i++) {
        expect(rng.nextInt(5, 5)).toBe(5);
      }
    });

    test("nextInt(-10, 10) always in [-10, 10]", () => {
      const rng = createRng(300);
      for (let i = 0; i < 10_000; i++) {
        const v = rng.nextInt(-10, 10);
        expect(v).toBeGreaterThanOrEqual(-10);
        expect(v).toBeLessThanOrEqual(10);
      }
    });

    test("nextInt returns integers", () => {
      const rng = createRng(400);
      for (let i = 0; i < 1_000; i++) {
        const v = rng.nextInt(0, 100);
        expect(v).toBe(Math.floor(v));
      }
    });
  });

  // ── chance ───────────────────────────────────────────────────────

  describe("chance", () => {
    test("chance(0) is always false over 1,000 draws", () => {
      const rng = createRng(10);
      for (let i = 0; i < 1_000; i++) {
        expect(rng.chance(0)).toBe(false);
      }
    });

    test("chance(1) is always true over 1,000 draws", () => {
      const rng = createRng(20);
      for (let i = 0; i < 1_000; i++) {
        expect(rng.chance(1)).toBe(true);
      }
    });

    test("chance(0.5) returns a mix over 1,000 draws", () => {
      const rng = createRng(30);
      let trueCount = 0;
      for (let i = 0; i < 1_000; i++) {
        if (rng.chance(0.5)) trueCount++;
      }
      expect(trueCount).toBeGreaterThan(0);
      expect(trueCount).toBeLessThan(1_000);
    });

    test("default probability is 0.5", () => {
      const rngA = createRng(40);
      const rngB = createRng(40);
      for (let i = 0; i < 100; i++) {
        expect(rngA.chance()).toBe(rngB.chance(0.5));
      }
    });
  });

  // ── pick ─────────────────────────────────────────────────────────

  describe("pick", () => {
    test("returns an element from the array", () => {
      const rng = createRng(50);
      const items = ["a", "b", "c", "d"];
      for (let i = 0; i < 100; i++) {
        expect(items).toContain(rng.pick(items));
      }
    });

    test("throws on empty array", () => {
      const rng = createRng(51);
      expect(() => rng.pick([])).toThrow("Cannot pick from an empty array");
    });

    test("covers all elements over enough draws", () => {
      const rng = createRng(52);
      const items = [1, 2, 3];
      const seen = new Set<number>();
      for (let i = 0; i < 100; i++) {
        seen.add(rng.pick(items));
      }
      expect(seen.size).toBe(3);
    });
  });

  // ── shuffle ──────────────────────────────────────────────────────

  describe("shuffle", () => {
    test("returns the same array reference (in-place)", () => {
      const rng = createRng(60);
      const arr = [1, 2, 3, 4, 5];
      const result = rng.shuffle(arr);
      expect(result).toBe(arr);
    });

    test("contains all original elements", () => {
      const rng = createRng(61);
      const arr = [10, 20, 30, 40, 50];
      rng.shuffle(arr);
      expect(arr.sort((a, b) => a - b)).toEqual([10, 20, 30, 40, 50]);
    });

    test("same seed produces same shuffle order", () => {
      const arr1 = [1, 2, 3, 4, 5, 6, 7, 8];
      const arr2 = [1, 2, 3, 4, 5, 6, 7, 8];
      createRng(62).shuffle(arr1);
      createRng(62).shuffle(arr2);
      expect(arr1).toEqual(arr2);
    });

    test("modifies the array for arrays with more than 1 element", () => {
      const rng = createRng(63);
      const original = Array.from({ length: 20 }, (_, i) => i);
      const copy = [...original];
      rng.shuffle(original);
      expect(original).not.toEqual(copy);
    });

    test("single-element array is unchanged", () => {
      const rng = createRng(64);
      const arr = [42];
      rng.shuffle(arr);
      expect(arr).toEqual([42]);
    });
  });

  // ── weightedPick ─────────────────────────────────────────────────

  describe("weightedPick", () => {
    test("throws on empty options", () => {
      const rng = createRng(70);
      expect(() => rng.weightedPick([])).toThrow("Cannot pick from empty options");
    });

    test("single option with weight 1 always returns that option", () => {
      const rng = createRng(71);
      for (let i = 0; i < 100; i++) {
        expect(rng.weightedPick([{ value: "only", weight: 1 }])).toBe("only");
      }
    });

    test("two options of equal weight returns both over many draws", () => {
      const rng = createRng(72);
      const options = [
        { value: "a", weight: 1 },
        { value: "b", weight: 1 },
      ] as const;
      const seen = new Set<string>();
      for (let i = 0; i < 200; i++) {
        seen.add(rng.weightedPick(options));
      }
      expect(seen.size).toBe(2);
    });

    test("very skewed weights (1000:1) heavily favor the high-weight option", () => {
      const rng = createRng(73);
      const options = [
        { value: "heavy", weight: 1000 },
        { value: "light", weight: 1 },
      ] as const;

      let heavyCount = 0;
      const draws = 10_000;
      for (let i = 0; i < draws; i++) {
        if (rng.weightedPick(options) === "heavy") heavyCount++;
      }

      expect(heavyCount / draws).toBeGreaterThan(0.99);
    });
  });
});
