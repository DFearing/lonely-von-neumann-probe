import { describe, test, expect } from "bun:test";
import { STRUCTURES } from "../data/structures";
import { calculateRates } from "../rates";
import { getAvailableStructures } from "../queries";
import { tick } from "../tick";
import { createInitialState } from "../state";
import type { GameState, SystemState, StructureInstance, ProbeState } from "../state";
import type { PlayerAction } from "../actions";

const SEED = 42;
const DT = 1;

function makeStructure(
  overrides: Partial<StructureInstance> & Pick<StructureInstance, "type">,
): StructureInstance {
  return {
    id: "s_1",
    tier: 1,
    productionRate: 0,
    operatingCost: 0,
    maintenanceCost: 0,
    computeDemand: 0,
    active: true,
    constructionProgress: 1,
    health: 1,
    ...overrides,
  };
}

function makeProbe(overrides?: Partial<ProbeState>): ProbeState {
  return {
    id: "probe_1",
    name: "Probe",
    mode: "gathering",
    systemId: "test",
    components: { cpu: "cpu_t1", propulsion: "prop_t1", reactor: "rct_t1" },
    miningOutput: 1,
    computingOutput: 1,
    internalPrinterSpeed: 0.5,
    autoReplicating: false,
    health: 1,
    ...overrides,
  };
}

function makeSystem(overrides?: Partial<SystemState>): SystemState {
  return {
    id: "test",
    name: "Test System",
    starType: "yellow",
    distanceFromOrigin: 0,
    resourceRichness: 1.0,
    discovered: true,
    scanned: true,
    mainProbe: makeProbe(),
    structures: { miners: [], reactors: [], printers: [], stations: [] },
    resources: { materials: 0, energy: 0, computingPower: 0 },
    resourceRates: {
      materialsSupply: 0,
      materialsDemand: 0,
      materialsPerSecond: 0,
      energySupply: 0,
      energyDemand: 0,
      energyNet: 0,
      computingPowerPerSecond: 0,
      computeSupply: 0,
      computeDemand: 0,
      computeNet: 0,
      computeEfficiency: 1,
    },
    constructionQueue: [],
    researchQueue: [],
    completedResearch: {},
    discoveredSystems: [],
    availableProbes: [],
    sentProbes: [],
    ...overrides,
  };
}

// ── Basic Station Definition ───────���─────────────────────────────────────────

describe("Basic Station (station_0) definition", () => {
  test("STRUCTURES['station_0'] exists", () => {
    expect(STRUCTURES["station_0"]).toBeDefined();
  });

  test("has type 'station' and tier 0", () => {
    const def = STRUCTURES["station_0"]!;
    expect(def.type).toBe("station");
    expect(def.tier).toBe(0);
  });

  test("has name 'Basic Station'", () => {
    expect(STRUCTURES["station_0"]!.name).toBe("Basic Station");
  });

  test("has no tech gate", () => {
    expect(STRUCTURES["station_0"]!.techGate).toBeNull();
  });

  test("has correct cost: 200 materials, 25 energy", () => {
    const def = STRUCTURES["station_0"]!;
    expect(def.cost.materials).toBe(200);
    expect(def.cost.energy).toBe(25);
  });

  test("has productionRate of 1.0 TFLOPS", () => {
    expect(STRUCTURES["station_0"]!.productionRate).toBe(1.0);
  });

  test("has operatingCost of 2.0 MW", () => {
    expect(STRUCTURES["station_0"]!.operatingCost).toBe(2.0);
  });

  test("has maintenanceCost of 0.15 tons/sec", () => {
    expect(STRUCTURES["station_0"]!.maintenanceCost).toBe(0.15);
  });

  test("has computeDemand of 0", () => {
    expect(STRUCTURES["station_0"]!.computeDemand).toBe(0);
  });
});

// ── Basic Station Availability ────��──────────────────────────────────────────

describe("Basic Station availability", () => {
  test("appears in getAvailableStructures for a fresh game with no research", () => {
    const system = makeSystem({ completedResearch: {} });
    const available = getAvailableStructures(system);
    const station0 = available.find(
      (d) => d.type === "station" && d.tier === 0,
    );
    expect(station0).toBeDefined();
    expect(station0!.name).toBe("Basic Station");
  });

  test("is available alongside other ungated structures", () => {
    const system = makeSystem({ completedResearch: {} });
    const available = getAvailableStructures(system);
    const ungated = Object.values(STRUCTURES).filter((d) => d.techGate === null);
    expect(available).toHaveLength(ungated.length);
  });
});

// ── Basic Station in Rates Calculation ───────────��───────────────────────────

describe("Basic Station in rates calculation", () => {
  test("contributes 1.0 to compute supply when active and complete", () => {
    const system = makeSystem({
      mainProbe: makeProbe({ computingOutput: 0, mode: "idle" }),
      structures: {
        miners: [],
        reactors: [],
        printers: [],
        stations: [
          makeStructure({
            type: "station",
            tier: 0,
            productionRate: 1.0,
            operatingCost: 2.0,
            maintenanceCost: 0.15,
          }),
        ],
      },
    });
    const rates = calculateRates(system);
    expect(rates.computeSupply).toBeCloseTo(1.0);
  });

  test("consumes 2.0 MW energy as operating cost", () => {
    const system = makeSystem({
      structures: {
        miners: [],
        reactors: [],
        printers: [],
        stations: [
          makeStructure({
            type: "station",
            tier: 0,
            productionRate: 1.0,
            operatingCost: 2.0,
            maintenanceCost: 0.15,
          }),
        ],
      },
    });
    const rates = calculateRates(system);
    expect(rates.energyDemand).toBe(2.0);
  });

  test("drains 0.15 tons/sec maintenance when active", () => {
    const system = makeSystem({
      mainProbe: null,
      structures: {
        miners: [],
        reactors: [],
        printers: [],
        stations: [
          makeStructure({
            type: "station",
            tier: 0,
            productionRate: 1.0,
            operatingCost: 2.0,
            maintenanceCost: 0.15,
          }),
        ],
      },
    });
    const rates = calculateRates(system);
    expect(rates.materialsDemand).toBeCloseTo(0.15);
  });

  test("does not contribute to compute supply when inactive", () => {
    const system = makeSystem({
      mainProbe: makeProbe({ computingOutput: 0, mode: "idle" }),
      structures: {
        miners: [],
        reactors: [],
        printers: [],
        stations: [
          makeStructure({
            type: "station",
            tier: 0,
            productionRate: 1.0,
            operatingCost: 2.0,
            maintenanceCost: 0.15,
            active: false,
          }),
        ],
      },
    });
    const rates = calculateRates(system);
    expect(rates.computeSupply).toBe(0);
  });
});

// ── Deep Research Mode - Rates ────���──────────────────────────────────────────

describe("Deep Research mode - rates", () => {
  test("computeEfficiency is 0 when probe is in deep_research mode", () => {
    const system = makeSystem({
      mainProbe: makeProbe({ mode: "deep_research", computingOutput: 5 }),
    });
    const rates = calculateRates(system);
    expect(rates.computeEfficiency).toBe(0);
  });

  test("computingPowerPerSecond equals computeSupply * 1.25 in deep_research mode", () => {
    const system = makeSystem({
      mainProbe: makeProbe({ mode: "deep_research", computingOutput: 4 }),
      structures: {
        miners: [],
        reactors: [],
        printers: [],
        stations: [
          makeStructure({ type: "station", productionRate: 6 }),
        ],
      },
    });
    const rates = calculateRates(system);
    const expectedSupply = 4 + 6;
    expect(rates.computeSupply).toBeCloseTo(expectedSupply);
    expect(rates.computingPowerPerSecond).toBeCloseTo(expectedSupply * 1.25);
  });

  test("materials supply is throttled to 0 due to computeEfficiency=0", () => {
    const system = makeSystem({
      mainProbe: makeProbe({ mode: "deep_research", miningOutput: 5 }),
      structures: {
        miners: [makeStructure({ type: "miner", productionRate: 10 })],
        reactors: [],
        printers: [],
        stations: [],
      },
    });
    const rates = calculateRates(system);
    expect(rates.materialsSupply).toBe(0);
  });

  test("reactor energy output is throttled due to computeEfficiency=0", () => {
    const system = makeSystem({
      mainProbe: makeProbe({ mode: "deep_research", computingOutput: 1 }),
      structures: {
        miners: [],
        reactors: [makeStructure({ type: "reactor", tier: 1, productionRate: 20 })],
        printers: [],
        stations: [],
      },
    });
    const rates = calculateRates(system);
    expect(rates.energySupply).toBe(3);
  });

  test("normal mode computes net computing = supply - demand", () => {
    const system = makeSystem({
      mainProbe: makeProbe({ mode: "gathering", computingOutput: 5 }),
      structures: {
        miners: [makeStructure({ type: "miner", computeDemand: 2 })],
        reactors: [],
        printers: [],
        stations: [],
      },
    });
    const rates = calculateRates(system);
    expect(rates.computingPowerPerSecond).toBe(5 - 2);
  });
});

// ── Deep Research Mode - Action Handling ────────────────���────────────────────

describe("Deep Research mode - action handling", () => {
  function stateWithMode(mode: "idle" | "gathering" | "printing" | "deep_research"): GameState {
    const state = createInitialState(SEED);
    const sol = state.systems["sol"]!;
    return {
      ...state,
      systems: {
        ...state.systems,
        sol: {
          ...sol,
          resources: { ...sol.resources, materials: 500 },
          mainProbe: sol.mainProbe ? { ...sol.mainProbe, mode } : null,
        },
      },
    };
  }

  test("setting probe mode to 'deep_research' updates the mode", () => {
    const state = stateWithMode("idle");
    const action: PlayerAction = {
      type: "set_probe_mode",
      systemId: "sol",
      mode: "deep_research",
    };
    const next = tick(state, DT, [action]);
    expect(next.systems["sol"]!.mainProbe!.mode).toBe("deep_research");
  });

  test("entering deep_research logs correct message", () => {
    const state = stateWithMode("idle");
    const logLengthBefore = state.log.length;
    const action: PlayerAction = {
      type: "set_probe_mode",
      systemId: "sol",
      mode: "deep_research",
    };
    const next = tick(state, DT, [action]);
    const newEntries = next.log.slice(logLengthBefore);
    const entry = newEntries.find((e) =>
      e.message.includes("Entering deep research mode"),
    );
    expect(entry).toBeDefined();
    expect(entry!.message).toContain("all computing dedicated to research");
  });

  test("leaving deep_research logs correct message", () => {
    const state = stateWithMode("deep_research");
    const logLengthBefore = state.log.length;
    const action: PlayerAction = {
      type: "set_probe_mode",
      systemId: "sol",
      mode: "idle",
    };
    const next = tick(state, DT, [action]);
    const newEntries = next.log.slice(logLengthBefore);
    const entry = newEntries.find((e) =>
      e.message.includes("Exiting deep research mode"),
    );
    expect(entry).toBeDefined();
    expect(entry!.message).toContain("resuming normal operations");
  });

  test("switching from deep_research to gathering logs exit message", () => {
    const state = stateWithMode("deep_research");
    const logLengthBefore = state.log.length;
    const action: PlayerAction = {
      type: "set_probe_mode",
      systemId: "sol",
      mode: "gathering",
    };
    const next = tick(state, DT, [action]);
    const newEntries = next.log.slice(logLengthBefore);
    const exitEntry = newEntries.find((e) =>
      e.message.includes("Exiting deep research mode"),
    );
    expect(exitEntry).toBeDefined();
  });

  test("switching from deep_research to gathering sets gatheringStartMaterials", () => {
    const state = stateWithMode("deep_research");
    const materialsBefore = state.systems["sol"]!.resources.materials;
    const action: PlayerAction = {
      type: "set_probe_mode",
      systemId: "sol",
      mode: "gathering",
    };
    const next = tick(state, DT, [action]);
    const probe = next.systems["sol"]!.mainProbe!;
    expect(probe.mode).toBe("gathering");
    expect(probe.gatheringStartMaterials).toBeDefined();
    expect(probe.gatheringStartMaterials).toBe(materialsBefore);
  });

  test("entering deep_research with construction queue logs halted warning", () => {
    const state = createInitialState(SEED);
    const sol = state.systems["sol"]!;
    const stateWithQueue: GameState = {
      ...state,
      systems: {
        ...state.systems,
        sol: {
          ...sol,
          resources: { ...sol.resources, materials: 500 },
          mainProbe: sol.mainProbe ? { ...sol.mainProbe, mode: "idle" } : null,
          constructionQueue: [
            {
              id: "proj_test",
              targetType: "miner",
              targetTier: 1,
              targetConfig: null,
              totalCost: { materials: 100, energy: 10 },
              remainingCost: { materials: 50, energy: 5 },
              progress: 0.5,
              assignedPrinterIds: [],
            },
          ],
        },
      },
    };
    const logLengthBefore = stateWithQueue.log.length;
    const action: PlayerAction = {
      type: "set_probe_mode",
      systemId: "sol",
      mode: "deep_research",
    };
    const next = tick(stateWithQueue, DT, [action]);
    const newEntries = next.log.slice(logLengthBefore);
    const entry = newEntries.find((e) =>
      e.message.includes("construction halted"),
    );
    expect(entry).toBeDefined();
    expect(entry!.message).toContain("Entering deep research mode");
  });
});
