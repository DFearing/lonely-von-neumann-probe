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
    components: {
      cpu: "basic_cpu",
      propulsion: "basic_ion_drive",
      reactor: "basic_reactor",
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
        originResearch: { basic_mining_techniques: true, basic_computing: true },
        destResearch: {},
      });
      const rng = createRngFromState(state.rngState);

      const next = tickNavigation(state, DT, rng);
      const dest = next.systems["alpha_centauri"]!;

      expect(dest.completedResearch["basic_mining_techniques"]).toBe(true);
      expect(dest.completedResearch["basic_computing"]).toBe(true);
    });

    test("existing destination research is merged (union)", () => {
      const state = stateWithProbeAndResearch({
        originResearch: { basic_mining_techniques: true },
        destResearch: { basic_reactors: true },
      });
      const rng = createRngFromState(state.rngState);

      const next = tickNavigation(state, DT, rng);
      const dest = next.systems["alpha_centauri"]!;

      expect(dest.completedResearch["basic_mining_techniques"]).toBe(true);
      expect(dest.completedResearch["basic_reactors"]).toBe(true);
    });
  });

  describe("zero_latency_communication", () => {
    test("without tech: no automatic sync between systems", () => {
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;
      const ac = state.systems["alpha_centauri"]!;

      const modified: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: { ...sol, completedResearch: { basic_mining_techniques: true } },
          alpha_centauri: { ...ac, completedResearch: { basic_reactors: true } },
        },
      };

      const rng = createRngFromState(modified.rngState);
      const next = tickNavigation(modified, DT, rng);

      expect(next.systems["sol"]!.completedResearch["basic_reactors"]).toBeUndefined();
      expect(next.systems["alpha_centauri"]!.completedResearch["basic_mining_techniques"]).toBeUndefined();
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
              basic_mining_techniques: true,
              zero_latency_communication: true,
            },
          },
          alpha_centauri: {
            ...ac,
            completedResearch: { basic_reactors: true },
          },
          barnards_star: {
            ...barnards,
            completedResearch: { faster_printing: true },
          },
        },
      };

      const rng = createRngFromState(modified.rngState);
      const next = tickNavigation(modified, DT, rng);

      for (const systemId of ["sol", "alpha_centauri", "barnards_star"]) {
        const sys = next.systems[systemId]!;
        expect(sys.completedResearch["basic_mining_techniques"]).toBe(true);
        expect(sys.completedResearch["basic_reactors"]).toBe(true);
        expect(sys.completedResearch["faster_printing"]).toBe(true);
        expect(sys.completedResearch["zero_latency_communication"]).toBe(true);
      }
    });
  });
});
