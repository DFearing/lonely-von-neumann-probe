import { describe, it, expect } from "bun:test";
import { createInitialState } from "../src/simulation/state";
import { simulateWithProfile, simulateToCycle, yearsToTicks } from "../src/simulation/autopilot/runner";
import { PROFILES, getProfileById } from "../src/simulation/autopilot/profiles";

const SEED = 42;

describe("autopilot runner", () => {
  it("advances tickCount by the requested number of ticks", () => {
    const state = createInitialState(SEED);
    const profile = PROFILES[0]!;
    const result = simulateWithProfile(state, profile, 100);
    expect(result.ticksRun).toBe(100);
    expect(result.finalState.tickCount).toBe(100);
  });

  it("is deterministic — same seed and profile produce identical results", () => {
    const profile = PROFILES[0]!;
    const a = simulateWithProfile(createInitialState(SEED), profile, 200);
    const b = simulateWithProfile(createInitialState(SEED), profile, 200);
    expect(a.finalState.tickCount).toBe(b.finalState.tickCount);
    expect(a.finalState.elapsedSeconds).toBe(b.finalState.elapsedSeconds);
    expect(a.finalState.systems["sol"]!.resources.materials)
      .toBe(b.finalState.systems["sol"]!.resources.materials);
  });

  it("simulateToCycle calculates correct ticks", () => {
    const state = createInitialState(SEED);
    const profile = PROFILES[0]!;
    const result = simulateToCycle(state, profile, 1100);
    expect(result.ticksRun).toBe(yearsToTicks(100));
    expect(result.finalState.elapsedSeconds).toBeCloseTo(100, 0);
  });

  it("returns unchanged state when target cycle is in the past", () => {
    const state = createInitialState(SEED);
    const profile = PROFILES[0]!;
    const result = simulateToCycle(state, profile, 900);
    expect(result.ticksRun).toBe(0);
    expect(result.finalState.tickCount).toBe(0);
  });
});

describe("autopilot profiles", () => {
  it("exports 4 profiles", () => {
    expect(PROFILES).toHaveLength(4);
  });

  it("getProfileById returns the correct profile", () => {
    expect(getProfileById("balanced")?.name).toBe("Balanced");
    expect(getProfileById("research_rush")?.name).toBe("Research Rush");
    expect(getProfileById("mining_heavy")?.name).toBe("Mining Heavy");
    expect(getProfileById("expansion")?.name).toBe("Expansion");
    expect(getProfileById("nonexistent")).toBeUndefined();
  });

  for (const profile of PROFILES) {
    describe(profile.name, () => {
      it("produces valid actions on a fresh state", () => {
        const state = createInitialState(SEED);
        const actions = profile.decide(state);
        expect(Array.isArray(actions)).toBe(true);
        for (const action of actions) {
          expect(action).toHaveProperty("type");
        }
      });

      it("produces no actions for systems without a probe", () => {
        const state = createInitialState(SEED);
        const actions = profile.decide(state);
        for (const action of actions) {
          if ("systemId" in action) {
            const system = state.systems[action.systemId];
            expect(system?.mainProbe).not.toBeNull();
          }
        }
      });

      it("builds structures when run for 1000 ticks", () => {
        const result = simulateWithProfile(createInitialState(SEED), profile, 1000);
        const sol = result.finalState.systems["sol"]!;
        const totalStructures =
          sol.structures.miners.length +
          sol.structures.reactors.length +
          sol.structures.printers.length +
          sol.structures.stations.length;
        expect(totalStructures).toBeGreaterThan(0);
      });

      it("does not crash over 2000 ticks", () => {
        const result = simulateWithProfile(createInitialState(SEED), profile, 2000);
        expect(result.finalState.tickCount).toBe(2000);
      });
    });
  }
});

describe("yearsToTicks", () => {
  it("converts years to ticks correctly", () => {
    expect(yearsToTicks(1)).toBe(10);
    expect(yearsToTicks(100)).toBe(1000);
    expect(yearsToTicks(0)).toBe(0);
  });
});
