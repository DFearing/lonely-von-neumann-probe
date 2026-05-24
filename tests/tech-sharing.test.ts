import { describe, test, expect } from "bun:test";
import { tickNavigation } from "../src/simulation/systems/navigation";
import { createInitialState } from "../src/simulation/state";
import type { GameState, ProbeInTransit } from "../src/simulation/state";
import { createRngFromState } from "../src/simulation/rng";

const SEED = 77;
const DT = 1;

function stateWithProbeAndResearch(
  overrides: {
    originResearch?: Record<string, boolean>;
    destResearch?: Record<string, boolean>;
    probe?: Partial<ProbeInTransit>;
    destId?: string;
  } = {},
): GameState {
  const state = createInitialState(SEED);
  const destId = overrides.destId ?? "alpha_centauri";
  const sol = state.systems["sol"]!;
  const dest = state.systems[destId]!;

  const probe: ProbeInTransit = {
    id: "test_probe_1",
    name: "Test Probe",
    components: {
      cpu: "cpu_t1",
      propulsion: "prop_t1",
      reactor: "rct_t1",
    },
    originSystemId: "sol",
    destinationSystemId: destId,
    travelTimeSeconds: 10,
    elapsedSeconds: 9,
    ...overrides.probe,
  };

  return {
    ...state,
    systems: {
      ...state.systems,
      sol: {
        ...sol,
        completedResearch: overrides.originResearch ?? {},
        sentProbes: [probe],
      },
      [destId]: {
        ...dest,
        completedResearch: overrides.destResearch ?? {},
      },
    },
  };
}

describe("cross-system tech sharing", () => {
  describe("tech sharing on probe arrival", () => {
    test("destination gets origin completedResearch", () => {
      const state = stateWithProbeAndResearch({
        originResearch: { mining_efficiency_t1: true, computing_speed_t1: true },
        destResearch: {},
      });
      const rng = createRngFromState(state.rngState);

      const next = tickNavigation(state, DT, rng);
      const dest = next.systems["alpha_centauri"]!;

      expect(dest.completedResearch["mining_efficiency_t1"]).toBe(true);
      expect(dest.completedResearch["computing_speed_t1"]).toBe(true);
    });

    test("existing destination research is merged (union)", () => {
      const state = stateWithProbeAndResearch({
        originResearch: { mining_efficiency_t1: true },
        destResearch: { energy_production_t1: true },
      });
      const rng = createRngFromState(state.rngState);

      const next = tickNavigation(state, DT, rng);
      const dest = next.systems["alpha_centauri"]!;

      expect(dest.completedResearch["mining_efficiency_t1"]).toBe(true);
      expect(dest.completedResearch["energy_production_t1"]).toBe(true);
    });
  });

  describe("communication_speed_t20", () => {
    test("without tech: no automatic sync between systems", () => {
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;
      const ac = state.systems["alpha_centauri"]!;

      const modified: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: { ...sol, completedResearch: { mining_efficiency_t1: true } },
          alpha_centauri: { ...ac, completedResearch: { energy_production_t1: true } },
        },
      };

      const rng = createRngFromState(modified.rngState);
      const next = tickNavigation(modified, DT, rng);

      expect(next.systems["sol"]!.completedResearch["energy_production_t1"]).toBeUndefined();
      expect(next.systems["alpha_centauri"]!.completedResearch["mining_efficiency_t1"]).toBeUndefined();
    });

    test("with tech on any system: all systems get the union of all completedResearch", () => {
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;
      const ac = state.systems["alpha_centauri"]!;
      const barnards = state.systems["barnards_star"]!;

      const modified: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: {
            ...sol,
            completedResearch: {
              mining_efficiency_t1: true,
              communication_speed_t20: true,
            },
          },
          alpha_centauri: {
            ...ac,
            completedResearch: { energy_production_t1: true },
          },
          barnards_star: {
            ...barnards,
            completedResearch: { manufacturing_efficiency_t1: true },
          },
        },
      };

      const rng = createRngFromState(modified.rngState);
      const next = tickNavigation(modified, DT, rng);

      for (const systemId of ["sol", "alpha_centauri", "barnards_star"]) {
        const sys = next.systems[systemId]!;
        expect(sys.completedResearch["mining_efficiency_t1"]).toBe(true);
        expect(sys.completedResearch["energy_production_t1"]).toBe(true);
        expect(sys.completedResearch["manufacturing_efficiency_t1"]).toBe(true);
        expect(sys.completedResearch["communication_speed_t20"]).toBe(true);
      }
    });
  });
});
