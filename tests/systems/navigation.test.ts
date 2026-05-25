import { describe, test, expect } from "bun:test";
import { tickNavigation } from "../../src/simulation/systems/navigation";
import { createInitialState } from "../../src/simulation/state";
import type { GameState, ProbeInTransit, SystemState } from "../../src/simulation/state";
import { createRngFromState } from "../../src/simulation/rng";
import { KNOWN_SYSTEMS } from "../../src/simulation/data/star-systems";

const SEED = 77;
const DT = 1;

function stateWithProbeInTransit(
  overrides: Partial<ProbeInTransit> & { originSystemId?: string } = {},
): GameState {
  const state = createInitialState(SEED);
  const originId = overrides.originSystemId ?? "sol";
  const origin = state.systems[originId]!;

  const probe: ProbeInTransit = {
    id: "test_probe_1",
    name: "Test Probe",
    components: {
      cpu: "cpu_t1",
      propulsion: "prop_t1",
      reactor: "rct_t1",
    },
    originSystemId: originId,
    destinationSystemId: "alpha_centauri",
    travelTimeSeconds: 100,
    elapsedSeconds: 0,
    ...overrides,
  };

  return {
    ...state,
    systems: {
      ...state.systems,
      [originId]: {
        ...origin,
        sentProbes: [probe],
      },
    },
  };
}

describe("tickNavigation", () => {
  describe("probe in transit", () => {
    test("elapsedSeconds advances by dt each tick", () => {
      const state = stateWithProbeInTransit({ elapsedSeconds: 10 });
      const rng = createRngFromState(state.rngState);

      const next = tickNavigation(state, DT, rng);
      const probe = next.systems["sol"]!.sentProbes[0]!;

      expect(probe.elapsedSeconds).toBe(11);
    });

    test("probe stays in sentProbes while traveling", () => {
      const state = stateWithProbeInTransit({
        travelTimeSeconds: 100,
        elapsedSeconds: 50,
      });
      const rng = createRngFromState(state.rngState);

      const next = tickNavigation(state, DT, rng);

      expect(next.systems["sol"]!.sentProbes.length).toBe(1);
      expect(next.systems["alpha_centauri"]!.mainProbe).toBeNull();
    });
  });

  describe("probe arrival", () => {
    test("probe removed from sentProbes when travel time reached", () => {
      const state = stateWithProbeInTransit({
        travelTimeSeconds: 100,
        elapsedSeconds: 99,
      });
      const rng = createRngFromState(state.rngState);

      const next = tickNavigation(state, DT, rng);

      expect(next.systems["sol"]!.sentProbes.length).toBe(0);
    });

    test("destination system gets a mainProbe on arrival", () => {
      const state = stateWithProbeInTransit({
        destinationSystemId: "alpha_centauri",
        travelTimeSeconds: 100,
        elapsedSeconds: 99,
      });
      const rng = createRngFromState(state.rngState);

      const next = tickNavigation(state, DT, rng);
      const dest = next.systems["alpha_centauri"]!;

      expect(dest.mainProbe).not.toBeNull();
      expect(dest.mainProbe!.id).toBe("test_probe_1");
      expect(dest.mainProbe!.systemId).toBe("alpha_centauri");
    });

    test("log entry with category discovery added on arrival", () => {
      const state = stateWithProbeInTransit({
        destinationSystemId: "alpha_centauri",
        travelTimeSeconds: 100,
        elapsedSeconds: 99,
      });
      const rng = createRngFromState(state.rngState);

      const logBefore = state.log.length;
      const next = tickNavigation(state, DT, rng);

      const newEntries = next.log.slice(logBefore);
      expect(newEntries.length).toBe(1);
      expect(newEntries[0]!.category).toBe("discovery");
      expect(newEntries[0]!.message).toContain("Alpha Centauri");
    });
  });

  describe("new system generation", () => {
    test("arriving at unknown system creates new SystemState", () => {
      const unknownDestId = "unknown_system_xyz";
      const state = stateWithProbeInTransit({
        destinationSystemId: unknownDestId,
        travelTimeSeconds: 10,
        elapsedSeconds: 9,
      });
      expect(state.systems[unknownDestId]).toBeUndefined();

      const rng = createRngFromState(state.rngState);
      const next = tickNavigation(state, DT, rng);

      const newSystem = next.systems[unknownDestId];
      expect(newSystem).toBeDefined();
      expect(newSystem!.id).toBe(unknownDestId);
      expect(newSystem!.discovered).toBe(true);
      expect(newSystem!.scanned).toBe(true);
      expect(newSystem!.mainProbe).not.toBeNull();
      expect(newSystem!.starType).toBe("unknown");
    });

    test("unknown system gets RNG-generated richness between 0.5 and 2.0", () => {
      const unknownDestId = "mystery_star";
      const state = stateWithProbeInTransit({
        destinationSystemId: unknownDestId,
        travelTimeSeconds: 10,
        elapsedSeconds: 9,
      });

      const rng = createRngFromState(state.rngState);
      const next = tickNavigation(state, DT, rng);

      const richness = next.systems[unknownDestId]!.resourceRichness;
      expect(richness).toBeGreaterThanOrEqual(0.5);
      expect(richness).toBeLessThanOrEqual(2.0);
    });

    test("arriving at KNOWN_SYSTEMS entry uses correct name and starType", () => {
      const lalande = KNOWN_SYSTEMS.find((s) => s.id === "lalande_21185")!;
      const state = stateWithProbeInTransit({
        destinationSystemId: "lalande_21185",
        travelTimeSeconds: 10,
        elapsedSeconds: 9,
      });

      delete (state.systems as Record<string, SystemState | undefined>)["lalande_21185"];

      const rng = createRngFromState(state.rngState);
      const next = tickNavigation(state, DT, rng);

      const sys = next.systems["lalande_21185"]!;
      expect(sys.name).toBe(lalande.name);
      expect(sys.starType).toBe(lalande.starType);
      expect(sys.distanceFromOrigin).toBe(lalande.distanceFromOrigin);
    });
  });

  describe("probe arrival at occupied system", () => {
    test("arriving probe is added to availableProbes when destination already has a mainProbe", () => {
      const state = stateWithProbeInTransit({
        id: "arriving_probe",
        destinationSystemId: "sol",
        travelTimeSeconds: 10,
        elapsedSeconds: 9,
        originSystemId: "alpha_centauri",
      });

      const sol = state.systems["sol"]!;
      expect(sol.mainProbe).not.toBeNull();
      const originalProbeId = sol.mainProbe!.id;

      const ac = state.systems["alpha_centauri"]!;
      const stateWithTransit = {
        ...state,
        systems: {
          ...state.systems,
          alpha_centauri: {
            ...ac,
            sentProbes: [
              {
                id: "arriving_probe",
                name: "Arriving Probe",
                components: {
                  cpu: "cpu_t1" as const,
                  propulsion: "prop_t1" as const,
                  reactor: "rct_t1" as const,
                },
                originSystemId: "alpha_centauri",
                destinationSystemId: "sol",
                travelTimeSeconds: 10,
                elapsedSeconds: 9,
              },
            ],
          },
        },
      };

      const rng = createRngFromState(stateWithTransit.rngState);
      const next = tickNavigation(stateWithTransit, DT, rng);

      expect(next.systems["sol"]!.mainProbe!.id).toBe(originalProbeId);
      expect(next.systems["sol"]!.availableProbes).toHaveLength(1);
      expect(next.systems["sol"]!.availableProbes[0]!.id).toBe("arriving_probe");
      expect(next.systems["alpha_centauri"]!.sentProbes).toHaveLength(0);
    });
  });

  describe("no-op when no probes in transit", () => {
    test("systems without sentProbes are unchanged", () => {
      const state = createInitialState(SEED);
      const rng = createRngFromState(state.rngState);

      const next = tickNavigation(state, DT, rng);

      expect(next).toBe(state);
    });
  });
});
