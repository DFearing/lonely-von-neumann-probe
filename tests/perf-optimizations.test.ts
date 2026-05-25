import { describe, test, expect } from "bun:test";
import { tick } from "../src/simulation/tick";
import { createInitialState } from "../src/simulation/state";
import {
  TECH_TREE,
  TECH_BRANCHES,
  techsInBranch,
  techAtTier,
} from "../src/simulation/data/tech-tree";
import { MAX_LOG_ENTRIES } from "../src/simulation/constants";

describe("techsInBranch cache", () => {
  test("returns techs sorted by tier for every branch", () => {
    for (const branchId of TECH_BRANCHES) {
      const techs = techsInBranch(branchId);
      expect(techs.length).toBeGreaterThan(0);
      for (let i = 1; i < techs.length; i++) {
        expect(techs[i]!.tier).toBeGreaterThanOrEqual(techs[i - 1]!.tier);
      }
    }
  });

  test("all techs belong to the requested branch", () => {
    for (const branchId of TECH_BRANCHES) {
      const techs = techsInBranch(branchId);
      for (const tech of techs) {
        expect(tech.branchId).toBe(branchId);
      }
    }
  });

  test("returns same results as brute-force filter + sort", () => {
    for (const branchId of TECH_BRANCHES) {
      const cached = techsInBranch(branchId);
      const bruteForce = Object.values(TECH_TREE)
        .filter((t) => t.branchId === branchId)
        .sort((a, b) => a.tier - b.tier);

      expect(cached).toEqual(bruteForce);
    }
  });

  test("returns empty array for unknown branch", () => {
    expect(techsInBranch("nonexistent_branch")).toEqual([]);
  });
});

describe("techAtTier lookup", () => {
  test("returns matching tech for valid branch + tier", () => {
    const tech = techAtTier("mining_efficiency", 1);
    expect(tech).toBeDefined();
    expect(tech!.branchId).toBe("mining_efficiency");
    expect(tech!.tier).toBe(1);
    expect(tech!.id).toBe("mining_efficiency_t1");
  });

  test("returns undefined for nonexistent tier", () => {
    expect(techAtTier("mining_efficiency", 999)).toBeUndefined();
  });

  test("returns undefined for unknown branch", () => {
    expect(techAtTier("nonexistent", 1)).toBeUndefined();
  });

  test("matches brute-force find for all branches and tiers", () => {
    for (const branchId of TECH_BRANCHES) {
      for (let tier = 1; tier <= 20; tier++) {
        const fast = techAtTier(branchId, tier);
        const bruteForce = Object.values(TECH_TREE).find(
          (t) => t.branchId === branchId && t.tier === tier,
        );
        expect(fast).toEqual(bruteForce);
      }
    }
  });
});

describe("log trimming", () => {
  test("log is capped at MAX_LOG_ENTRIES after many ticks", () => {
    let state = createInitialState(42);

    const sol = state.systems["sol"]!;
    state = {
      ...state,
      systems: {
        ...state.systems,
        sol: {
          ...sol,
          mainProbe: sol.mainProbe ? { ...sol.mainProbe, mode: "gathering" } : null,
        },
      },
      log: Array.from({ length: MAX_LOG_ENTRIES + 100 }, (_, i) => ({
        tick: i,
        message: `log entry ${i}`,
        category: "info" as const,
      })),
    };

    const next = tick(state, 1, []);
    expect(next.log.length).toBeLessThanOrEqual(MAX_LOG_ENTRIES);
  });

  test("log retains the most recent entries when trimmed", () => {
    let state = createInitialState(42);

    const totalEntries = MAX_LOG_ENTRIES + 200;
    state = {
      ...state,
      log: Array.from({ length: totalEntries }, (_, i) => ({
        tick: i,
        message: `entry-${i}`,
        category: "info" as const,
      })),
    };

    const next = tick(state, 1, []);
    const lastEntry = next.log[next.log.length - 1]!;
    expect(lastEntry.message).toContain("entry-");
  });

  test("log is not trimmed when under the limit", () => {
    const state = createInitialState(42);
    expect(state.log.length).toBeLessThan(MAX_LOG_ENTRIES);

    const next = tick(state, 1, []);
    expect(next.log.length).toBeGreaterThanOrEqual(state.log.length);
  });

  test("MAX_LOG_ENTRIES is 500", () => {
    expect(MAX_LOG_ENTRIES).toBe(500);
  });
});
