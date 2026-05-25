import { describe, test, expect } from "bun:test";
import { tickResources, autoPauseForShortfall } from "../../src/simulation/systems/resources";
import { createInitialState } from "../../src/simulation/state";
import { createPrestigeState } from "../../src/simulation/prestige";
import type { GameState, SystemState, StructureInstance } from "../../src/simulation/state";

function makeStructure(overrides: Partial<StructureInstance> & Pick<StructureInstance, "type">): StructureInstance {
  return {
    id: "s_1",
    tier: 1,
    productionRate: 10,
    operatingCost: 0,
    maintenanceCost: 0,
    computeDemand: 0,
    active: true,
    constructionProgress: 1,
    health: 1,
    ...overrides,
  };
}

function stateWithSystem(systemOverrides?: Partial<SystemState>): GameState {
  const base = createInitialState(42);
  const sol = base.systems["sol"]!;
  return {
    ...base,
    systems: {
      ...base.systems,
      sol: { ...sol, ...systemOverrides },
    },
  };
}

describe("tickResources", () => {
  test("returns a new state object (immutability)", () => {
    const state = createInitialState(42);
    const next = tickResources(state, 1);
    expect(next).not.toBe(state);
    expect(next.systems).not.toBe(state.systems);
    expect(next.systems["sol"]).not.toBe(state.systems["sol"]);
  });

  test("does not mutate the original state", () => {
    const state = createInitialState(42);
    const originalMaterials = state.systems["sol"]!.resources.materials;
    tickResources(state, 1);
    expect(state.systems["sol"]!.resources.materials).toBe(originalMaterials);
  });

  test("accumulates materials over time using dt", () => {
    const base = createInitialState(42);
    const sol = base.systems["sol"]!;
    const state = stateWithSystem({
      resources: { materials: 100, energy: 0, computingPower: 0 },
      mainProbe: { ...sol.mainProbe!, mode: "gathering" },
    });
    const next = tickResources(state, 2);
    const nextSol = next.systems["sol"]!;
    expect(nextSol.resources.materials).toBeCloseTo(100 + 0.9 * 2);
  });

  test("materials never go below 0", () => {
    const state = stateWithSystem({
      resources: { materials: 0, energy: 0, computingPower: 0 },
      mainProbe: null,
      structures: { miners: [], reactors: [], printers: [], stations: [] },
    });
    const next = tickResources(state, 10);
    const sol = next.systems["sol"]!;
    expect(sol.resources.materials).toBe(0);
  });

  test("auto-pauses largest energy consumer when demand exceeds supply", () => {
    const state = stateWithSystem({
      structures: {
        miners: [makeStructure({ type: "miner", operatingCost: 100 })],
        reactors: [],
        printers: [],
        stations: [],
      },
    });
    const next = tickResources(state, 1);
    const sol = next.systems["sol"]!;
    expect(sol.structures.miners[0]!.active).toBe(false);
    expect(sol.resources.energy).toBeGreaterThanOrEqual(0);
  });

  test("updates resourceRates on the system", () => {
    const base = createInitialState(42);
    const sol = base.systems["sol"]!;
    const state = stateWithSystem({
      mainProbe: { ...sol.mainProbe!, mode: "gathering" },
    });
    const next = tickResources(state, 1);
    const nextSol = next.systems["sol"]!;
    expect(nextSol.resourceRates.materialsPerSecond).toBeCloseTo(0.9);
    expect(nextSol.resourceRates.computingPowerPerSecond).toBe(0.5);
  });

  test("ticks all systems independently", () => {
    const state = createInitialState(42);
    const next = tickResources(state, 1);
    for (const id of Object.keys(state.systems)) {
      expect(next.systems[id]).toBeDefined();
    }
  });

  test("preserves non-resource fields of the state", () => {
    const state = createInitialState(42);
    const next = tickResources(state, 1);
    expect(next.seed).toBe(state.seed);
    expect(next.tickCount).toBe(state.tickCount);
    expect(next.currentSystemId).toBe(state.currentSystemId);
    expect(next.log).toBe(state.log);
    expect(next.paused).toBe(state.paused);
  });

  test("dt of 0 produces no change in materials", () => {
    const state = createInitialState(42);
    const next = tickResources(state, 0);
    const sol = next.systems["sol"]!;
    expect(sol.resources.materials).toBe(state.systems["sol"]!.resources.materials);
  });
});

function systemWithStructures(overrides?: Partial<SystemState>): SystemState {
  const base = createInitialState(42);
  const sol = base.systems["sol"]!;
  return { ...sol, ...overrides };
}

describe("autoPauseForShortfall", () => {
  const prestige = createPrestigeState();

  test("does nothing when energy and compute are sufficient", () => {
    const system = systemWithStructures();
    const result = autoPauseForShortfall(system, prestige, 1);
    expect(result.system).toBe(system);
    expect(result.log).toEqual([]);
  });

  test("pauses the largest energy consumer on energy deficit", () => {
    const smallMiner = makeStructure({ id: "m1", type: "miner", operatingCost: 2 });
    const largeMiner = makeStructure({ id: "m2", type: "miner", operatingCost: 50 });
    const system = systemWithStructures({
      structures: {
        miners: [smallMiner, largeMiner],
        reactors: [],
        printers: [],
        stations: [],
      },
    });

    const result = autoPauseForShortfall(system, prestige, 5);
    const miners = result.system.structures.miners;
    expect(miners[0]!.active).toBe(true);
    expect(miners[1]!.active).toBe(false);
    expect(result.log).toHaveLength(1);
    expect(result.log[0]!.message).toContain("Energy deficit");
    expect(result.log[0]!.message).toContain("Basic Miner");
    expect(result.log[0]!.category).toBe("warning");
    expect(result.log[0]!.tick).toBe(5);
  });

  test("pauses the largest compute consumer on compute deficit", () => {
    const lowCompute = makeStructure({ id: "m1", type: "miner", computeDemand: 0.1 });
    const highCompute = makeStructure({ id: "p1", type: "printer", computeDemand: 10 });
    const system = systemWithStructures({
      structures: {
        miners: [lowCompute],
        reactors: [],
        printers: [highCompute],
        stations: [],
      },
    });

    const result = autoPauseForShortfall(system, prestige, 3);
    expect(result.system.structures.printers[0]!.active).toBe(false);
    expect(result.system.structures.miners[0]!.active).toBe(true);
    expect(result.log).toHaveLength(1);
    expect(result.log[0]!.message).toContain("Compute deficit");
    expect(result.log[0]!.message).toContain("Basic Printer");
  });

  test("pauses one structure per resource type per tick", () => {
    const miner1 = makeStructure({ id: "m1", type: "miner", operatingCost: 50 });
    const miner2 = makeStructure({ id: "m2", type: "miner", operatingCost: 40 });
    const system = systemWithStructures({
      structures: {
        miners: [miner1, miner2],
        reactors: [],
        printers: [],
        stations: [],
      },
    });

    const result = autoPauseForShortfall(system, prestige, 1);
    const activeCount = result.system.structures.miners.filter((m) => m.active).length;
    expect(activeCount).toBe(1);
    expect(result.system.structures.miners[0]!.active).toBe(false);
    expect(result.system.structures.miners[1]!.active).toBe(true);
  });

  test("skips structures under construction", () => {
    const building = makeStructure({
      id: "m1",
      type: "miner",
      operatingCost: 100,
      constructionProgress: 0.5,
    });
    const active = makeStructure({ id: "m2", type: "miner", operatingCost: 5 });
    const system = systemWithStructures({
      structures: {
        miners: [building, active],
        reactors: [],
        printers: [],
        stations: [],
      },
    });

    const result = autoPauseForShortfall(system, prestige, 1);
    expect(result.system.structures.miners[0]!.active).toBe(true);
    if (result.log.length > 0) {
      expect(result.system.structures.miners[1]!.active).toBe(false);
    }
  });

  test("skips already-paused structures", () => {
    const paused = makeStructure({
      id: "m1",
      type: "miner",
      operatingCost: 100,
      active: false,
    });
    const active = makeStructure({ id: "m2", type: "miner", operatingCost: 5 });
    const system = systemWithStructures({
      structures: {
        miners: [paused, active],
        reactors: [],
        printers: [],
        stations: [],
      },
    });

    const result = autoPauseForShortfall(system, prestige, 1);
    expect(result.system.structures.miners[0]!.active).toBe(false);
    if (result.log.length > 0) {
      expect(result.system.structures.miners[1]!.active).toBe(false);
    }
  });

  test("produces only one log entry when same structure is largest for both energy and compute", () => {
    const expensive = makeStructure({
      id: "m1",
      type: "miner",
      operatingCost: 50,
      computeDemand: 10,
    });
    const system = systemWithStructures({
      structures: {
        miners: [expensive],
        reactors: [],
        printers: [],
        stations: [],
      },
    });

    const result = autoPauseForShortfall(system, prestige, 1);
    expect(result.system.structures.miners[0]!.active).toBe(false);
    expect(result.log).toHaveLength(1);
    expect(result.log[0]!.message).toContain("Energy deficit");
  });

  test("produces two log entries when different structures are largest for energy and compute", () => {
    const energyHog = makeStructure({
      id: "m1",
      type: "miner",
      operatingCost: 50,
      computeDemand: 0.1,
    });
    const computeHog = makeStructure({
      id: "p1",
      type: "printer",
      operatingCost: 0.1,
      computeDemand: 10,
    });
    const system = systemWithStructures({
      structures: {
        miners: [energyHog],
        reactors: [],
        printers: [computeHog],
        stations: [],
      },
    });

    const result = autoPauseForShortfall(system, prestige, 1);
    expect(result.system.structures.miners[0]!.active).toBe(false);
    expect(result.system.structures.printers[0]!.active).toBe(false);
    expect(result.log).toHaveLength(2);
    expect(result.log[0]!.message).toContain("Energy deficit");
    expect(result.log[1]!.message).toContain("Compute deficit");
  });

  test("does not mutate the input system", () => {
    const miner = makeStructure({ id: "m1", type: "miner", operatingCost: 50 });
    const system = systemWithStructures({
      structures: {
        miners: [miner],
        reactors: [],
        printers: [],
        stations: [],
      },
    });

    autoPauseForShortfall(system, prestige, 1);
    expect(system.structures.miners[0]!.active).toBe(true);
  });

  test("log entries contain the system name", () => {
    const miner = makeStructure({ id: "m1", type: "miner", operatingCost: 50 });
    const system = systemWithStructures({
      name: "Alpha Centauri",
      structures: {
        miners: [miner],
        reactors: [],
        printers: [],
        stations: [],
      },
    });

    const result = autoPauseForShortfall(system, prestige, 1);
    expect(result.log.length).toBeGreaterThan(0);
    expect(result.log[0]!.message).toContain("Alpha Centauri");
  });

  test("auto-pause log entries appear in tickResources output", () => {
    const state = stateWithSystem({
      structures: {
        miners: [makeStructure({ type: "miner", operatingCost: 100 })],
        reactors: [],
        printers: [],
        stations: [],
      },
    });
    const next = tickResources(state, 1);
    const pauseLog = next.log.find((l) => l.message.includes("auto-paused"));
    expect(pauseLog).toBeDefined();
    expect(pauseLog!.category).toBe("warning");
  });
});
