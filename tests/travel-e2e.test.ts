import { describe, test, expect } from "bun:test";
import { tick } from "../src/simulation/tick";
import { createInitialState } from "../src/simulation/state";
import type {
  GameState,
  ProbeInTransit,
} from "../src/simulation/state";
import type { PlayerAction } from "../src/simulation/actions";
import { totalProbeCost, PROPULSIONS, CPUS } from "../src/simulation/data/components";
import { TRAVEL_TIME_SCALE } from "../src/simulation/constants";

const SEED = 42;
const DT = 1;

function stateWithResources(
  materials: number,
  energy: number,
  systemId = "sol",
): GameState {
  const state = createInitialState(SEED);
  const system = state.systems[systemId]!;
  return {
    ...state,
    systems: {
      ...state.systems,
      [systemId]: {
        ...system,
        resources: { ...system.resources, materials, energy },
      },
    },
  };
}

function tickN(
  state: GameState,
  n: number,
  dt = DT,
  actions: readonly PlayerAction[] = [],
): GameState {
  let s = state;
  for (let i = 0; i < n; i++) {
    s = tick(s, dt, i === 0 ? actions : []);
  }
  return s;
}

function tickUntil(
  state: GameState,
  predicate: (s: GameState) => boolean,
  maxTicks: number,
  dt = DT,
): GameState {
  let s = state;
  for (let i = 0; i < maxTicks; i++) {
    if (predicate(s)) return s;
    s = tick(s, dt, []);
  }
  return s;
}

function stateWithProbeInTransit(
  overrides: Partial<ProbeInTransit> = {},
  originId = "sol",
): GameState {
  const state = createInitialState(SEED);
  const origin = state.systems[originId]!;

  const probe: ProbeInTransit = {
    id: "transit_probe_1",
    name: "Transit Probe",
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
        sentProbes: [...origin.sentProbes, probe],
      },
    },
  };
}

describe("interstellar travel end-to-end", () => {
  describe("full pipeline: build, launch, travel, arrive", () => {
    test("probe construction through tick creates construction project with correct config", () => {
      const probeCost = totalProbeCost("cpu_t1", "prop_t1", "rct_t1");
      const state = stateWithResources(probeCost.materials + 100, 100);

      const buildAction: PlayerAction = {
        type: "build_probe",
        systemId: "sol",
        cpu: "cpu_t1",
        propulsion: "prop_t1",
        reactor: "rct_t1",
      };

      const afterBuild = tick(state, DT, [buildAction]);
      const sol = afterBuild.systems["sol"]!;

      expect(sol.constructionQueue).toHaveLength(1);
      const project = sol.constructionQueue[0]!;
      expect(project.targetType).toBe("probe");
      expect(project.targetConfig).not.toBeNull();
      expect(project.targetConfig!.cpu).toBe("cpu_t1");
      expect(project.targetConfig!.propulsion).toBe("prop_t1");
      expect(project.targetConfig!.reactor).toBe("rct_t1");
    });

    test("build_probe deducts materials from the system", () => {
      const probeCost = totalProbeCost("cpu_t1", "prop_t1", "rct_t1");
      const startingMaterials = probeCost.materials + 100;
      const state = stateWithResources(startingMaterials, 100);

      const buildAction: PlayerAction = {
        type: "build_probe",
        systemId: "sol",
        cpu: "cpu_t1",
        propulsion: "prop_t1",
        reactor: "rct_t1",
      };

      const afterBuild = tick(state, DT, [buildAction]);
      const sol = afterBuild.systems["sol"]!;

      expect(sol.resources.materials).toBeLessThan(startingMaterials);
    });

    test("probe construction requires printing mode to progress", () => {
      const probeCost = totalProbeCost("cpu_t1", "prop_t1", "rct_t1");
      const state = stateWithResources(probeCost.materials + 100, 100);

      const buildAction: PlayerAction = {
        type: "build_probe",
        systemId: "sol",
        cpu: "cpu_t1",
        propulsion: "prop_t1",
        reactor: "rct_t1",
      };

      const afterBuild = tick(state, DT, [buildAction]);
      const sol = afterBuild.systems["sol"]!;
      expect(sol.mainProbe!.mode).toBe("idle");

      const afterIdleTicks = tickN(afterBuild, 10);
      const project = afterIdleTicks.systems["sol"]!.constructionQueue[0];
      expect(project).toBeDefined();
      expect(project!.progress).toBe(0);
    });

    test("full pipeline: build probe, set printing, complete, launch, travel, arrive", () => {
      const probeCost = totalProbeCost("cpu_t1", "prop_t1", "rct_t1");
      const state = stateWithResources(probeCost.materials + 500, 500);

      const buildAction: PlayerAction = {
        type: "build_probe",
        systemId: "sol",
        cpu: "cpu_t1",
        propulsion: "prop_t1",
        reactor: "rct_t1",
      };
      const printAction: PlayerAction = {
        type: "set_probe_mode",
        systemId: "sol",
        mode: "printing",
      };

      let current = tick(state, DT, [buildAction, printAction]);

      expect(current.systems["sol"]!.constructionQueue).toHaveLength(1);
      expect(current.systems["sol"]!.mainProbe!.mode).toBe("printing");

      current = tickUntil(
        current,
        (s) => s.systems["sol"]!.availableProbes.length > 0,
        200,
      );

      const solAfterConstruction = current.systems["sol"]!;
      expect(solAfterConstruction.availableProbes).toHaveLength(1);
      expect(solAfterConstruction.constructionQueue).toHaveLength(0);
      expect(solAfterConstruction.sentProbes).toHaveLength(0);

      const builtProbe = solAfterConstruction.availableProbes[0]!;

      const launchAction: PlayerAction = {
        type: "launch_probe",
        systemId: "sol",
        probeId: builtProbe.id,
        targetSystemId: "alpha_centauri",
      };
      current = tick(current, DT, [launchAction]);

      const solAfterLaunch = current.systems["sol"]!;
      expect(solAfterLaunch.availableProbes).toHaveLength(0);
      expect(solAfterLaunch.sentProbes).toHaveLength(1);

      const probeInTransit = solAfterLaunch.sentProbes[0]!;
      expect(probeInTransit.destinationSystemId).toBe("alpha_centauri");
      expect(probeInTransit.originSystemId).toBe("sol");

      const propulsion = PROPULSIONS["prop_t1"]!;
      const expectedTravelTime = (4.37 * TRAVEL_TIME_SCALE) / propulsion.travelSpeed;
      expect(probeInTransit.travelTimeSeconds).toBeCloseTo(expectedTravelTime);

      current = tickUntil(
        current,
        (s) => s.systems["alpha_centauri"]!.mainProbe !== null,
        Math.ceil(expectedTravelTime / DT) + 100,
      );

      const ac = current.systems["alpha_centauri"]!;
      expect(ac.mainProbe).not.toBeNull();
      expect(ac.mainProbe!.components.cpu).toBe("cpu_t1");
      expect(ac.mainProbe!.components.propulsion).toBe("prop_t1");
      expect(ac.mainProbe!.components.reactor).toBe("rct_t1");

      expect(current.systems["sol"]!.sentProbes).toHaveLength(0);

      const arrivalLog = current.log.find(
        (entry) =>
          entry.category === "discovery" &&
          entry.message.includes("Alpha Centauri"),
      );
      expect(arrivalLog).toBeDefined();

      const constructionLog = current.log.find(
        (entry) =>
          entry.category === "milestone" &&
          entry.message.includes("construction complete"),
      );
      expect(constructionLog).toBeDefined();
    });
  });

  describe("ProbeInTransit correctness", () => {
    test("launched probe has matching components in ProbeInTransit", () => {
      const probeCost = totalProbeCost("cpu_t1", "prop_t1", "rct_t1");
      const state = stateWithResources(probeCost.materials + 500, 500);

      const buildAction: PlayerAction = {
        type: "build_probe",
        systemId: "sol",
        cpu: "cpu_t1",
        propulsion: "prop_t1",
        reactor: "rct_t1",
      };
      const printAction: PlayerAction = {
        type: "set_probe_mode",
        systemId: "sol",
        mode: "printing",
      };

      let current = tick(state, DT, [buildAction, printAction]);

      current = tickUntil(
        current,
        (s) => s.systems["sol"]!.availableProbes.length > 0,
        200,
      );

      const builtProbe = current.systems["sol"]!.availableProbes[0]!;
      const launchAction: PlayerAction = {
        type: "launch_probe",
        systemId: "sol",
        probeId: builtProbe.id,
        targetSystemId: "sirius",
      };
      current = tick(current, DT, [launchAction]);

      const probe = current.systems["sol"]!.sentProbes[0]!;
      expect(probe.components.cpu).toBe("cpu_t1");
      expect(probe.components.propulsion).toBe("prop_t1");
      expect(probe.components.reactor).toBe("rct_t1");
      expect(probe.originSystemId).toBe("sol");
      expect(probe.destinationSystemId).toBe("sirius");
    });

    test("travel time equals distance divided by propulsion travelSpeed", () => {
      const probeCost = totalProbeCost("cpu_t1", "prop_t1", "rct_t1");
      const state = stateWithResources(probeCost.materials + 500, 500);

      const buildAction: PlayerAction = {
        type: "build_probe",
        systemId: "sol",
        cpu: "cpu_t1",
        propulsion: "prop_t1",
        reactor: "rct_t1",
      };
      const printAction: PlayerAction = {
        type: "set_probe_mode",
        systemId: "sol",
        mode: "printing",
      };

      let current = tick(state, DT, [buildAction, printAction]);
      current = tickUntil(
        current,
        (s) => s.systems["sol"]!.availableProbes.length > 0,
        200,
      );

      const builtProbe = current.systems["sol"]!.availableProbes[0]!;
      const launchAction: PlayerAction = {
        type: "launch_probe",
        systemId: "sol",
        probeId: builtProbe.id,
        targetSystemId: "alpha_centauri",
      };
      current = tick(current, DT, [launchAction]);

      const probe = current.systems["sol"]!.sentProbes[0]!;
      const propulsion = PROPULSIONS["prop_t1"]!;
      const expectedTime = (4.37 * TRAVEL_TIME_SCALE) / propulsion.travelSpeed;
      expect(probe.travelTimeSeconds).toBeCloseTo(expectedTime);
    });
  });

  describe("navigation advances elapsed time", () => {
    test("elapsedSeconds increases by dt each tick", () => {
      const state = stateWithProbeInTransit({ elapsedSeconds: 0 });

      const after1 = tick(state, DT, []);
      const probe1 = after1.systems["sol"]!.sentProbes[0]!;
      expect(probe1.elapsedSeconds).toBe(1);

      const after2 = tick(after1, DT, []);
      const probe2 = after2.systems["sol"]!.sentProbes[0]!;
      expect(probe2.elapsedSeconds).toBe(2);
    });

    test("elapsed time advances with fractional dt", () => {
      const state = stateWithProbeInTransit({ elapsedSeconds: 0 });

      const after = tick(state, 0.1, []);
      const probe = after.systems["sol"]!.sentProbes[0]!;
      expect(probe.elapsedSeconds).toBeCloseTo(0.1);
    });

    test("probe remains in sentProbes while elapsedSeconds < travelTimeSeconds", () => {
      const state = stateWithProbeInTransit({
        travelTimeSeconds: 100,
        elapsedSeconds: 50,
      });

      const after = tickN(state, 10);
      const sol = after.systems["sol"]!;
      expect(sol.sentProbes).toHaveLength(1);
      expect(sol.sentProbes[0]!.elapsedSeconds).toBe(60);
    });
  });

  describe("probe arrival creates or updates system", () => {
    test("arrival at known system sets mainProbe with correct properties", () => {
      const state = stateWithProbeInTransit({
        destinationSystemId: "alpha_centauri",
        travelTimeSeconds: 10,
        elapsedSeconds: 9,
      });

      const after = tick(state, DT, []);
      const dest = after.systems["alpha_centauri"]!;

      expect(dest.mainProbe).not.toBeNull();
      expect(dest.mainProbe!.id).toBe("transit_probe_1");
      expect(dest.mainProbe!.systemId).toBe("alpha_centauri");
      expect(dest.mainProbe!.mode).toBe("idle");
      expect(dest.mainProbe!.components.cpu).toBe("cpu_t1");
      expect(dest.mainProbe!.components.propulsion).toBe("prop_t1");
      expect(dest.mainProbe!.components.reactor).toBe("rct_t1");

      const cpuDef = CPUS["cpu_t1"]!;
      expect(dest.mainProbe!.miningOutput).toBe(cpuDef.miningOutput);
      expect(dest.mainProbe!.computingOutput).toBe(cpuDef.computingOutput);
      expect(dest.mainProbe!.internalPrinterSpeed).toBe(cpuDef.printSpeed);
      expect(dest.mainProbe!.health).toBe(1);
    });

    test("arrival at unknown system creates new SystemState", () => {
      const unknownId = "unknown_star_test";
      const state = stateWithProbeInTransit({
        destinationSystemId: unknownId,
        travelTimeSeconds: 10,
        elapsedSeconds: 9,
      });

      expect(state.systems[unknownId]).toBeUndefined();

      const after = tick(state, DT, []);
      const newSystem = after.systems[unknownId];

      expect(newSystem).toBeDefined();
      expect(newSystem!.id).toBe(unknownId);
      expect(newSystem!.discovered).toBe(true);
      expect(newSystem!.scanned).toBe(true);
      expect(newSystem!.mainProbe).not.toBeNull();
      expect(newSystem!.mainProbe!.systemId).toBe(unknownId);
    });

    test("arrival marks destination as discovered and scanned", () => {
      const state = stateWithProbeInTransit({
        destinationSystemId: "alpha_centauri",
        travelTimeSeconds: 5,
        elapsedSeconds: 4,
      });

      const after = tick(state, DT, []);
      const dest = after.systems["alpha_centauri"]!;

      expect(dest.discovered).toBe(true);
      expect(dest.scanned).toBe(true);
    });

    test("probe is removed from sentProbes upon arrival", () => {
      const state = stateWithProbeInTransit({
        travelTimeSeconds: 5,
        elapsedSeconds: 4,
      });

      const after = tick(state, DT, []);
      expect(after.systems["sol"]!.sentProbes).toHaveLength(0);
    });

    test("arrival log entry has discovery category and destination name", () => {
      const state = stateWithProbeInTransit({
        destinationSystemId: "alpha_centauri",
        travelTimeSeconds: 5,
        elapsedSeconds: 4,
      });
      const logBefore = state.log.length;

      const after = tick(state, DT, []);
      const newEntries = after.log.slice(logBefore);

      const arrivalEntry = newEntries.find(
        (e) => e.category === "discovery",
      );
      expect(arrivalEntry).toBeDefined();
      expect(arrivalEntry!.message).toContain("Alpha Centauri");
    });
  });

  describe("research merging on arrival", () => {
    test("destination receives origin completed research on probe arrival", () => {
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;

      const modified: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: {
            ...sol,
            completedResearch: {
              mining_efficiency_t1: true,
              energy_production_t1: true,
            },
            sentProbes: [
              {
                id: "research_probe",
                name: "Research Probe",
                components: {
                  cpu: "cpu_t1",
                  propulsion: "prop_t1",
                  reactor: "rct_t1",
                },
                originSystemId: "sol",
                destinationSystemId: "alpha_centauri",
                travelTimeSeconds: 5,
                elapsedSeconds: 4,
              },
            ],
          },
        },
      };

      const after = tick(modified, DT, []);
      const dest = after.systems["alpha_centauri"]!;

      expect(dest.completedResearch["mining_efficiency_t1"]).toBe(true);
      expect(dest.completedResearch["energy_production_t1"]).toBe(true);
    });

    test("destination keeps its own research and merges origin research (union)", () => {
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;
      const ac = state.systems["alpha_centauri"]!;

      const modified: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: {
            ...sol,
            completedResearch: { mining_efficiency_t1: true },
            sentProbes: [
              {
                id: "merge_probe",
                name: "Merge Probe",
                components: {
                  cpu: "cpu_t1",
                  propulsion: "prop_t1",
                  reactor: "rct_t1",
                },
                originSystemId: "sol",
                destinationSystemId: "alpha_centauri",
                travelTimeSeconds: 5,
                elapsedSeconds: 4,
              },
            ],
          },
          alpha_centauri: {
            ...ac,
            completedResearch: { computing_speed_t1: true },
          },
        },
      };

      const after = tick(modified, DT, []);
      const dest = after.systems["alpha_centauri"]!;

      expect(dest.completedResearch["mining_efficiency_t1"]).toBe(true);
      expect(dest.completedResearch["computing_speed_t1"]).toBe(true);
    });

    test("new system created on arrival inherits all origin research", () => {
      const unknownId = "research_destination";
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;

      const modified: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: {
            ...sol,
            completedResearch: {
              mining_efficiency_t1: true,
              energy_production_t1: true,
              computing_speed_t1: true,
            },
            sentProbes: [
              {
                id: "colonize_probe",
                name: "Colonize Probe",
                components: {
                  cpu: "cpu_t1",
                  propulsion: "prop_t1",
                  reactor: "rct_t1",
                },
                originSystemId: "sol",
                destinationSystemId: unknownId,
                travelTimeSeconds: 5,
                elapsedSeconds: 4,
              },
            ],
          },
        },
      };

      const after = tick(modified, DT, []);
      const newSystem = after.systems[unknownId]!;

      expect(newSystem.completedResearch["mining_efficiency_t1"]).toBe(true);
      expect(newSystem.completedResearch["energy_production_t1"]).toBe(true);
      expect(newSystem.completedResearch["computing_speed_t1"]).toBe(true);
    });
  });

  describe("probe arriving at occupied system", () => {
    test("second probe added to availableProbes when destination already has mainProbe", () => {
      const state = createInitialState(SEED);
      const ac = state.systems["alpha_centauri"]!;

      const existingProbe = {
        id: "existing_probe",
        name: "Existing Probe",
        mode: "idle" as const,
        systemId: "alpha_centauri",
        components: {
          cpu: "cpu_t1",
          propulsion: "prop_t1",
          reactor: "rct_t1",
        },
        miningOutput: 1,
        computingOutput: 0.5,
        internalPrinterSpeed: 0.5,
        autoReplicating: false,
        health: 1,
      };

      const modified: GameState = {
        ...state,
        systems: {
          ...state.systems,
          alpha_centauri: {
            ...ac,
            mainProbe: existingProbe,
          },
          sol: {
            ...state.systems["sol"]!,
            sentProbes: [
              {
                id: "arriving_probe",
                name: "Arriving Probe",
                components: {
                  cpu: "cpu_t1",
                  propulsion: "prop_t1",
                  reactor: "rct_t1",
                },
                originSystemId: "sol",
                destinationSystemId: "alpha_centauri",
                travelTimeSeconds: 5,
                elapsedSeconds: 4,
              },
            ],
          },
        },
      };

      const after = tick(modified, DT, []);

      expect(after.systems["alpha_centauri"]!.mainProbe!.id).toBe("existing_probe");
      expect(after.systems["alpha_centauri"]!.availableProbes).toHaveLength(1);
      expect(after.systems["alpha_centauri"]!.availableProbes[0]!.id).toBe("arriving_probe");
      expect(after.systems["sol"]!.sentProbes).toHaveLength(0);
    });

    test("research is still merged when arriving probe goes to availableProbes", () => {
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;
      const ac = state.systems["alpha_centauri"]!;

      const existingProbe = {
        id: "existing_probe",
        name: "Existing",
        mode: "idle" as const,
        systemId: "alpha_centauri",
        components: {
          cpu: "cpu_t1",
          propulsion: "prop_t1",
          reactor: "rct_t1",
        },
        miningOutput: 1,
        computingOutput: 0.5,
        internalPrinterSpeed: 0.5,
        autoReplicating: false,
        health: 1,
      };

      const modified: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: {
            ...sol,
            completedResearch: { mining_efficiency_t1: true },
            sentProbes: [
              {
                id: "discarded_probe",
                name: "Discarded",
                components: {
                  cpu: "cpu_t1",
                  propulsion: "prop_t1",
                  reactor: "rct_t1",
                },
                originSystemId: "sol",
                destinationSystemId: "alpha_centauri",
                travelTimeSeconds: 5,
                elapsedSeconds: 4,
              },
            ],
          },
          alpha_centauri: {
            ...ac,
            mainProbe: existingProbe,
            completedResearch: { energy_production_t1: true },
          },
        },
      };

      const after = tick(modified, DT, []);
      const dest = after.systems["alpha_centauri"]!;

      expect(dest.mainProbe!.id).toBe("existing_probe");
      expect(dest.completedResearch["mining_efficiency_t1"]).toBe(true);
      expect(dest.completedResearch["energy_production_t1"]).toBe(true);
    });
  });

  describe("multiple probes in transit", () => {
    test("probes to different destinations advance independently", () => {
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;

      const probeToAC: ProbeInTransit = {
        id: "probe_ac",
        name: "Probe AC",
        components: { cpu: "cpu_t1", propulsion: "prop_t1", reactor: "rct_t1" },
        originSystemId: "sol",
        destinationSystemId: "alpha_centauri",
        travelTimeSeconds: 100,
        elapsedSeconds: 0,
      };
      const probeToSirius: ProbeInTransit = {
        id: "probe_sirius",
        name: "Probe Sirius",
        components: { cpu: "cpu_t1", propulsion: "prop_t1", reactor: "rct_t1" },
        originSystemId: "sol",
        destinationSystemId: "sirius",
        travelTimeSeconds: 200,
        elapsedSeconds: 0,
      };

      const modified: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: { ...sol, sentProbes: [probeToAC, probeToSirius] },
        },
      };

      const after10 = tickN(modified, 10);
      const probes = after10.systems["sol"]!.sentProbes;

      expect(probes).toHaveLength(2);
      expect(probes[0]!.elapsedSeconds).toBe(10);
      expect(probes[1]!.elapsedSeconds).toBe(10);
    });

    test("faster probe arrives first while slower one continues", () => {
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;

      const fastProbe: ProbeInTransit = {
        id: "fast_probe",
        name: "Fast Probe",
        components: { cpu: "cpu_t1", propulsion: "prop_t1", reactor: "rct_t1" },
        originSystemId: "sol",
        destinationSystemId: "alpha_centauri",
        travelTimeSeconds: 5,
        elapsedSeconds: 0,
      };
      const slowProbe: ProbeInTransit = {
        id: "slow_probe",
        name: "Slow Probe",
        components: { cpu: "cpu_t1", propulsion: "prop_t1", reactor: "rct_t1" },
        originSystemId: "sol",
        destinationSystemId: "sirius",
        travelTimeSeconds: 50,
        elapsedSeconds: 0,
      };

      const modified: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: { ...sol, sentProbes: [fastProbe, slowProbe] },
        },
      };

      const afterFastArrives = tickN(modified, 6);
      const solAfter = afterFastArrives.systems["sol"]!;

      expect(solAfter.sentProbes).toHaveLength(1);
      expect(solAfter.sentProbes[0]!.id).toBe("slow_probe");
      expect(solAfter.sentProbes[0]!.elapsedSeconds).toBe(6);
      expect(afterFastArrives.systems["alpha_centauri"]!.mainProbe).not.toBeNull();
    });

    test("both probes arrive at their correct destinations", () => {
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;

      const probeToAC: ProbeInTransit = {
        id: "probe_to_ac",
        name: "Probe AC",
        components: { cpu: "cpu_t1", propulsion: "prop_t1", reactor: "rct_t1" },
        originSystemId: "sol",
        destinationSystemId: "alpha_centauri",
        travelTimeSeconds: 5,
        elapsedSeconds: 4,
      };
      const probeToBarnards: ProbeInTransit = {
        id: "probe_to_barnards",
        name: "Probe Barnards",
        components: { cpu: "cpu_t1", propulsion: "prop_t1", reactor: "rct_t1" },
        originSystemId: "sol",
        destinationSystemId: "barnards_star",
        travelTimeSeconds: 5,
        elapsedSeconds: 4,
      };

      const modified: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: { ...sol, sentProbes: [probeToAC, probeToBarnards] },
        },
      };

      const after = tick(modified, DT, []);

      expect(after.systems["sol"]!.sentProbes).toHaveLength(0);
      expect(after.systems["alpha_centauri"]!.mainProbe).not.toBeNull();
      expect(after.systems["alpha_centauri"]!.mainProbe!.id).toBe("probe_to_ac");
      expect(after.systems["barnards_star"]!.mainProbe).not.toBeNull();
      expect(after.systems["barnards_star"]!.mainProbe!.id).toBe("probe_to_barnards");
    });
  });

  describe("travel time calculation", () => {
    test("T1 propulsion (travelSpeed 1.0) travel time to Alpha Centauri", () => {
      const propulsion = PROPULSIONS["prop_t1"]!;
      expect(propulsion.travelSpeed).toBe(1);

      const state = stateWithProbeInTransit({
        destinationSystemId: "alpha_centauri",
        travelTimeSeconds: 4.37,
        elapsedSeconds: 0,
      });

      const after4 = tickN(state, 4);
      expect(after4.systems["sol"]!.sentProbes).toHaveLength(1);

      const after5 = tick(after4, DT, []);
      expect(after5.systems["sol"]!.sentProbes).toHaveLength(0);
      expect(after5.systems["alpha_centauri"]!.mainProbe).not.toBeNull();
    });

    test("higher tier propulsion produces proportionally shorter travel time", () => {
      const propT1 = PROPULSIONS["prop_t1"]!;
      const propT2 = PROPULSIONS["prop_t2"]!;

      expect(propT2.travelSpeed).toBeGreaterThan(propT1.travelSpeed);

      const distanceToAC = 4.37;
      const travelTimeT1 = distanceToAC / propT1.travelSpeed;
      const travelTimeT2 = distanceToAC / propT2.travelSpeed;

      expect(travelTimeT2).toBeLessThan(travelTimeT1);
      expect(travelTimeT2).toBeCloseTo(distanceToAC / propT2.travelSpeed);
    });

    test("travel time via launch_probe uses actual system distances", () => {
      const probeCost = totalProbeCost("cpu_t1", "prop_t1", "rct_t1");
      const state = stateWithResources(probeCost.materials * 2 + 500, 500);

      const buildAC: PlayerAction = {
        type: "build_probe",
        systemId: "sol",
        cpu: "cpu_t1",
        propulsion: "prop_t1",
        reactor: "rct_t1",
      };
      const printAction: PlayerAction = {
        type: "set_probe_mode",
        systemId: "sol",
        mode: "printing",
      };

      let current = tick(state, DT, [buildAC, printAction]);

      current = tickUntil(
        current,
        (s) => s.systems["sol"]!.availableProbes.length > 0,
        200,
      );

      const probe1 = current.systems["sol"]!.availableProbes[0]!;
      const launchAC: PlayerAction = {
        type: "launch_probe",
        systemId: "sol",
        probeId: probe1.id,
        targetSystemId: "alpha_centauri",
      };
      current = tick(current, DT, [launchAC]);

      const probeAC = current.systems["sol"]!.sentProbes[0]!;
      const propulsion = PROPULSIONS["prop_t1"]!;
      expect(probeAC.travelTimeSeconds).toBeCloseTo((4.37 * TRAVEL_TIME_SCALE) / propulsion.travelSpeed);

      const buildSirius: PlayerAction = {
        type: "build_probe",
        systemId: "sol",
        cpu: "cpu_t1",
        propulsion: "prop_t1",
        reactor: "rct_t1",
      };
      const printAgain: PlayerAction = {
        type: "set_probe_mode",
        systemId: "sol",
        mode: "printing",
      };

      current = tick(current, DT, [buildSirius, printAgain]);

      current = tickUntil(
        current,
        (s) => s.systems["sol"]!.availableProbes.length > 0,
        200,
      );

      const probe2 = current.systems["sol"]!.availableProbes[0]!;
      const launchSirius: PlayerAction = {
        type: "launch_probe",
        systemId: "sol",
        probeId: probe2.id,
        targetSystemId: "sirius",
      };
      current = tick(current, DT, [launchSirius]);

      const probeSirius = current.systems["sol"]!.sentProbes.find(
        (p) => p.destinationSystemId === "sirius",
      )!;
      expect(probeSirius.travelTimeSeconds).toBeCloseTo((8.6 * TRAVEL_TIME_SCALE) / propulsion.travelSpeed);
      expect(probeSirius.travelTimeSeconds).toBeGreaterThan((4.37 * TRAVEL_TIME_SCALE) / propulsion.travelSpeed);
    });
  });

  describe("destination system discovery tracking", () => {
    test("origin system adds destination to discoveredSystems on arrival", () => {
      const unknownId = "new_discovery_target";
      const state = stateWithProbeInTransit({
        destinationSystemId: unknownId,
        travelTimeSeconds: 5,
        elapsedSeconds: 4,
      });

      const sol = state.systems["sol"]!;
      expect(sol.discoveredSystems).not.toContain(unknownId);

      const after = tick(state, DT, []);
      expect(after.systems["sol"]!.discoveredSystems).toContain(unknownId);
    });

    test("destination system records origin in its discoveredSystems", () => {
      const unknownId = "reverse_discovery";
      const state = stateWithProbeInTransit({
        destinationSystemId: unknownId,
        travelTimeSeconds: 5,
        elapsedSeconds: 4,
      });

      const after = tick(state, DT, []);
      const newSystem = after.systems[unknownId]!;
      expect(newSystem.discoveredSystems).toContain("sol");
    });
  });

  describe("determinism", () => {
    test("identical travel scenarios produce identical results", () => {
      const stateA = stateWithProbeInTransit({
        travelTimeSeconds: 10,
        elapsedSeconds: 8,
      });
      const stateB = stateWithProbeInTransit({
        travelTimeSeconds: 10,
        elapsedSeconds: 8,
      });

      const afterA = tickN(stateA, 5);
      const afterB = tickN(stateB, 5);

      expect(afterA.systems["sol"]!.sentProbes).toEqual(
        afterB.systems["sol"]!.sentProbes,
      );
      expect(afterA.systems["alpha_centauri"]!.mainProbe).toEqual(
        afterB.systems["alpha_centauri"]!.mainProbe,
      );
    });

    test("full pipeline is deterministic across identical runs", () => {
      function runPipeline(): GameState {
        const probeCost = totalProbeCost("cpu_t1", "prop_t1", "rct_t1");
        const state = stateWithResources(probeCost.materials + 500, 500);

        const actions: PlayerAction[] = [
          {
            type: "build_probe",
            systemId: "sol",
            cpu: "cpu_t1",
            propulsion: "prop_t1",
            reactor: "rct_t1",
          },
          { type: "set_probe_mode", systemId: "sol", mode: "printing" },
        ];

        let current = tick(state, DT, actions);
        current = tickUntil(
          current,
          (s) => s.systems["sol"]!.availableProbes.length > 0,
          200,
        );

        const builtProbe = current.systems["sol"]!.availableProbes[0]!;
        current = tick(current, DT, [{
          type: "launch_probe",
          systemId: "sol",
          probeId: builtProbe.id,
          targetSystemId: "alpha_centauri",
        }]);

        return tickN(current, 200);
      }

      const runA = runPipeline();
      const runB = runPipeline();

      expect(runA.systems["sol"]!.sentProbes).toEqual(
        runB.systems["sol"]!.sentProbes,
      );
      expect(runA.systems["alpha_centauri"]!.mainProbe).toEqual(
        runB.systems["alpha_centauri"]!.mainProbe,
      );
      expect(runA.tickCount).toBe(runB.tickCount);
    });
  });

  describe("launch_probe action", () => {
    test("launch_probe moves probe from availableProbes to sentProbes", () => {
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;
      const cpuDef = CPUS["cpu_t1"]!;

      const availableProbe = {
        id: "ready_probe_1",
        name: "Ready Probe",
        mode: "idle" as const,
        systemId: "sol",
        components: { cpu: "cpu_t1", propulsion: "prop_t1", reactor: "rct_t1" },
        miningOutput: cpuDef.miningOutput,
        computingOutput: cpuDef.computingOutput,
        internalPrinterSpeed: cpuDef.printSpeed,
        autoReplicating: false,
        health: 1,
      };

      const modified: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: { ...sol, availableProbes: [availableProbe] },
        },
      };

      const launchAction: PlayerAction = {
        type: "launch_probe",
        systemId: "sol",
        probeId: "ready_probe_1",
        targetSystemId: "alpha_centauri",
      };
      const after = tick(modified, DT, [launchAction]);
      const solAfter = after.systems["sol"]!;

      expect(solAfter.availableProbes).toHaveLength(0);
      expect(solAfter.sentProbes).toHaveLength(1);
      expect(solAfter.sentProbes[0]!.id).toBe("ready_probe_1");
      expect(solAfter.sentProbes[0]!.destinationSystemId).toBe("alpha_centauri");
    });

    test("launch_probe with invalid probeId does nothing", () => {
      const state = createInitialState(SEED);

      const launchAction: PlayerAction = {
        type: "launch_probe",
        systemId: "sol",
        probeId: "nonexistent",
        targetSystemId: "alpha_centauri",
      };
      const after = tick(state, DT, [launchAction]);

      expect(after.systems["sol"]!.sentProbes).toHaveLength(0);
    });

    test("launch_probe calculates correct travel time based on distance", () => {
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;
      const cpuDef = CPUS["cpu_t1"]!;

      const availableProbe = {
        id: "distance_probe",
        name: "Distance Probe",
        mode: "idle" as const,
        systemId: "sol",
        components: { cpu: "cpu_t1", propulsion: "prop_t1", reactor: "rct_t1" },
        miningOutput: cpuDef.miningOutput,
        computingOutput: cpuDef.computingOutput,
        internalPrinterSpeed: cpuDef.printSpeed,
        autoReplicating: false,
        health: 1,
      };

      const modified: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: { ...sol, availableProbes: [availableProbe] },
        },
      };

      const launchAction: PlayerAction = {
        type: "launch_probe",
        systemId: "sol",
        probeId: "distance_probe",
        targetSystemId: "sirius",
      };
      const after = tick(modified, DT, [launchAction]);
      const probe = after.systems["sol"]!.sentProbes[0]!;

      const propulsion = PROPULSIONS["prop_t1"]!;
      expect(probe.travelTimeSeconds).toBeCloseTo((8.6 * TRAVEL_TIME_SCALE) / propulsion.travelSpeed);
    });

    test("launch_probe logs launch message", () => {
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;
      const cpuDef = CPUS["cpu_t1"]!;

      const availableProbe = {
        id: "log_probe",
        name: "Log Probe",
        mode: "idle" as const,
        systemId: "sol",
        components: { cpu: "cpu_t1", propulsion: "prop_t1", reactor: "rct_t1" },
        miningOutput: cpuDef.miningOutput,
        computingOutput: cpuDef.computingOutput,
        internalPrinterSpeed: cpuDef.printSpeed,
        autoReplicating: false,
        health: 1,
      };

      const modified: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: { ...sol, availableProbes: [availableProbe] },
        },
      };

      const logBefore = modified.log.length;
      const launchAction: PlayerAction = {
        type: "launch_probe",
        systemId: "sol",
        probeId: "log_probe",
        targetSystemId: "alpha_centauri",
      };
      const after = tick(modified, DT, [launchAction]);
      const newEntries = after.log.slice(logBefore);

      const launchEntry = newEntries.find((e) => e.message.includes("launched toward"));
      expect(launchEntry).toBeDefined();
      expect(launchEntry!.message).toContain("Alpha Centauri");
      expect(launchEntry!.message).toContain("ETA");
    });
  });

  describe("edge cases", () => {
    test("build_probe with insufficient materials does nothing", () => {
      const state = stateWithResources(1, 0);

      const buildAction: PlayerAction = {
        type: "build_probe",
        systemId: "sol",
        cpu: "cpu_t1",
        propulsion: "prop_t1",
        reactor: "rct_t1",
      };

      const after = tick(state, DT, [buildAction]);
      expect(after.systems["sol"]!.constructionQueue).toHaveLength(0);
    });

    test("probe arriving exactly at travelTimeSeconds boundary", () => {
      const state = stateWithProbeInTransit({
        travelTimeSeconds: 10,
        elapsedSeconds: 9,
      });

      const after = tick(state, DT, []);
      expect(after.systems["sol"]!.sentProbes).toHaveLength(0);
      expect(after.systems["alpha_centauri"]!.mainProbe).not.toBeNull();
    });

    test("probe mode reverts to idle when construction queue empties", () => {
      const probeCost = totalProbeCost("cpu_t1", "prop_t1", "rct_t1");
      const state = stateWithResources(probeCost.materials + 500, 500);

      const buildAction: PlayerAction = {
        type: "build_probe",
        systemId: "sol",
        cpu: "cpu_t1",
        propulsion: "prop_t1",
        reactor: "rct_t1",
      };
      const printAction: PlayerAction = {
        type: "set_probe_mode",
        systemId: "sol",
        mode: "printing",
      };

      let current = tick(state, DT, [buildAction, printAction]);
      current = tickUntil(
        current,
        (s) => s.systems["sol"]!.availableProbes.length > 0,
        200,
      );

      expect(current.systems["sol"]!.mainProbe!.mode).toBe("idle");
    });

    test("probe construction log entry includes sound event", () => {
      const probeCost = totalProbeCost("cpu_t1", "prop_t1", "rct_t1");
      const state = stateWithResources(probeCost.materials + 500, 500);
      const logBefore = state.log.length;

      const buildAction: PlayerAction = {
        type: "build_probe",
        systemId: "sol",
        cpu: "cpu_t1",
        propulsion: "prop_t1",
        reactor: "rct_t1",
      };
      const printAction: PlayerAction = {
        type: "set_probe_mode",
        systemId: "sol",
        mode: "printing",
      };

      let current = tick(state, DT, [buildAction, printAction]);
      current = tickUntil(
        current,
        (s) => s.systems["sol"]!.availableProbes.length > 0,
        200,
      );

      const constructionEntry = current.log
        .slice(logBefore)
        .find((e) => e.message.includes("construction complete"));
      expect(constructionEntry).toBeDefined();
      expect(constructionEntry!.soundEvent).toBe("probe_constructed");
    });
  });
});
