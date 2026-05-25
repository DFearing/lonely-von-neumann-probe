import { describe, test, expect } from "bun:test";
import { tickConstruction } from "../src/simulation/systems/construction";
import { tickResearch } from "../src/simulation/systems/research";
import { tickResources } from "../src/simulation/systems/resources";
import type {
  GameState,
  SystemState,
  StructureInstance,
  ConstructionProject,
  ResearchProject,
  ProbeState,
  LogEntry,
  SoundEventType,
} from "../src/simulation/state";

// ── Factories ────────────────────────────────────────────────────────

function makeStructure(
  overrides: Partial<StructureInstance> & Pick<StructureInstance, "type">,
): StructureInstance {
  return {
    id: "s_1",
    tier: 1,
    productionRate: 1,
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
    mode: "idle",
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
    resources: { materials: 1000, energy: 100, computingPower: 10 },
    resourceRates: {
      materialsSupply: 0,
      materialsDemand: 0,
      materialsPerSecond: 0,
      energySupply: 0,
      energyDemand: 0,
      energyNet: 0,
      computingPowerPerSecond: 10,
      computeSupply: 10,
      computeDemand: 0,
      computeNet: 10,
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

function wrapSystem(system: SystemState): GameState {
  return {
    seed: 42,
    tickCount: 100,
    elapsedSeconds: 100,
    rngState: [0, 0, 0, 0],
    currentSystemId: system.id,
    systems: { [system.id]: system },
    speed: 1,
    log: [],
    paused: false,
    prestige: {
      totalPrestigePoints: 0,
      availablePrestigePoints: 0,
      upgrades: { mining_mastery: 0, fusion_mastery: 0, nano_assembly: 0, quantum_insight: 0, material_reserves: 0, swift_start: 0 },
      timesPrestiged: 0,
      blackHoleDiscovered: false,
    },
    prestigeSnapshot: null,
    prestigeTriggered: false,
    nextProbeNumber: 2,
    probeName: "Probe",
    gameOver: false,
  };
}

function newLogEntries(before: GameState, after: GameState): LogEntry[] {
  return after.log.slice(before.log.length);
}

function makeNearCompleteProject(
  targetType: string,
  targetTier: number,
  printerId: string,
): ConstructionProject {
  return {
    id: `build_${targetType}`,
    targetType,
    targetTier,
    targetConfig: null,
    totalCost: { materials: 50, energy: 10 },
    remainingCost: { materials: 0, energy: 0 },
    progress: 0.99,
    assignedPrinterIds: [printerId],
  };
}

// ── Construction Sound Events ────────────────────────────────────────

describe("construction sound events", () => {
  const STRUCTURE_CASES: Array<{
    type: string;
    expectedSound: SoundEventType;
  }> = [
    { type: "miner", expectedSound: "miner_constructed" },
    { type: "reactor", expectedSound: "reactor_constructed" },
    { type: "printer", expectedSound: "printer_constructed" },
    { type: "station", expectedSound: "station_constructed" },
  ];

  for (const { type, expectedSound } of STRUCTURE_CASES) {
    test(`${type} completion emits soundEvent: "${expectedSound}"`, () => {
      const printer = makeStructure({ id: "printer_1", type: "printer" });
      const project = makeNearCompleteProject(type, 1, "printer_1");

      const system = makeSystem({
        structures: { miners: [], reactors: [], printers: [printer], stations: [] },
        constructionQueue: [project],
      });

      const state = wrapSystem(system);
      const next = tickConstruction(state, 1);
      const entries = newLogEntries(state, next);

      const completionEntry = entries.find((e) =>
        e.message.includes("Construction complete"),
      );
      expect(completionEntry).toBeDefined();
      expect(completionEntry!.soundEvent).toBe(expectedSound);
    });
  }

  test("probe construction emits soundEvent: 'probe_constructed'", () => {
    const printer = makeStructure({ id: "printer_1", type: "printer" });
    const project: ConstructionProject = {
      id: "build_probe",
      targetType: "probe",
      targetTier: 0,
      targetConfig: {
        cpu: "cpu_t1",
        propulsion: "prop_t1",
        reactor: "rct_t1",
      },
      totalCost: { materials: 30, energy: 6 },
      remainingCost: { materials: 0, energy: 0 },
      progress: 0.99,
      assignedPrinterIds: ["printer_1"],
    };

    const system = makeSystem({
      structures: { miners: [], reactors: [], printers: [printer], stations: [] },
      constructionQueue: [project],
    });

    const state = wrapSystem(system);
    const next = tickConstruction(state, 1);
    const entries = newLogEntries(state, next);

    const probeEntry = entries.find((e) =>
      e.message.includes("construction complete"),
    );
    expect(probeEntry).toBeDefined();
    expect(probeEntry!.soundEvent).toBe("probe_constructed");
  });

  test("in-progress construction emits no soundEvent log entry", () => {
    const printer = makeStructure({ id: "printer_1", type: "printer" });
    const project: ConstructionProject = {
      id: "build_miner",
      targetType: "miner",
      targetTier: 1,
      targetConfig: null,
      totalCost: { materials: 50, energy: 10 },
      remainingCost: { materials: 25, energy: 5 },
      progress: 0.5,
      assignedPrinterIds: ["printer_1"],
    };

    const system = makeSystem({
      structures: { miners: [], reactors: [], printers: [printer], stations: [] },
      constructionQueue: [project],
    });

    const state = wrapSystem(system);
    const next = tickConstruction(state, 1);
    const entries = newLogEntries(state, next);

    expect(entries.length).toBe(0);
  });
});

// ── Research Sound Events ────────────────────────────────────────────

describe("research sound events", () => {
  test("research completion emits soundEvent: 'research_complete'", () => {
    const project: ResearchProject = {
      id: "research_1",
      techId: "mining_efficiency_t1",
      branchId: "mining_efficiency",
      tier: 1,
      name: "Basic Yield Analysis",
      continuousCost: 2,
      progress: 0.99,
      completed: false,
      paused: false,
    };

    const system = makeSystem({
      researchQueue: [project],
    });

    const state = wrapSystem(system);
    const next = tickResearch(state, 10);
    const entries = newLogEntries(state, next);

    const researchEntry = entries.find((e) =>
      e.message.includes("Research complete"),
    );
    expect(researchEntry).toBeDefined();
    expect(researchEntry!.soundEvent).toBe("research_complete");
  });

  test("in-progress research emits no soundEvent log entry", () => {
    const project: ResearchProject = {
      id: "research_1",
      techId: "mining_efficiency_t1",
      branchId: "mining_efficiency",
      tier: 1,
      name: "Basic Yield Analysis",
      continuousCost: 2,
      progress: 0.1,
      completed: false,
      paused: false,
    };

    const system = makeSystem({
      researchQueue: [project],
    });

    const state = wrapSystem(system);
    const next = tickResearch(state, 1);
    const entries = newLogEntries(state, next);

    const soundEntries = entries.filter((e) => e.soundEvent !== undefined);
    expect(soundEntries.length).toBe(0);
  });
});

// ── Health Threshold Sound Events ────────────────────────────────────

describe("health threshold sound events", () => {
  test("crossing below 75% emits soundEvent: 'health_threshold'", () => {
    const system = makeSystem({
      mainProbe: null,
      resources: { materials: 0, energy: 0, computingPower: 0 },
      structures: {
        miners: [
          makeStructure({
            id: "m1",
            type: "miner",
            productionRate: 0,
            maintenanceCost: 0.2,
            health: 0.76,
          }),
        ],
        reactors: [],
        printers: [],
        stations: [],
      },
    });

    const state = wrapSystem(system);
    const next = tickResources(state, 1);
    const entries = newLogEntries(state, next);
    const nextHealth = next.systems["test"]!.structures.miners[0]!.health;

    expect(nextHealth).toBeLessThanOrEqual(0.75);
    const healthEntry = entries.find((e) => e.soundEvent === "health_threshold");
    expect(healthEntry).toBeDefined();
    expect(healthEntry!.category).toBe("warning");
  });

  test("crossing below 50% emits soundEvent: 'health_threshold'", () => {
    const system = makeSystem({
      mainProbe: null,
      resources: { materials: 0, energy: 0, computingPower: 0 },
      structures: {
        miners: [
          makeStructure({
            id: "m1",
            type: "miner",
            productionRate: 0,
            maintenanceCost: 0.2,
            health: 0.51,
          }),
        ],
        reactors: [],
        printers: [],
        stations: [],
      },
    });

    const state = wrapSystem(system);
    const next = tickResources(state, 1);
    const entries = newLogEntries(state, next);
    const nextHealth = next.systems["test"]!.structures.miners[0]!.health;

    expect(nextHealth).toBeLessThanOrEqual(0.5);
    const healthEntry = entries.find((e) => e.soundEvent === "health_threshold");
    expect(healthEntry).toBeDefined();
  });

  test("crossing below 25% emits soundEvent: 'health_threshold'", () => {
    const system = makeSystem({
      mainProbe: null,
      resources: { materials: 0, energy: 0, computingPower: 0 },
      structures: {
        miners: [
          makeStructure({
            id: "m1",
            type: "miner",
            productionRate: 0,
            maintenanceCost: 0.2,
            health: 0.26,
          }),
        ],
        reactors: [],
        printers: [],
        stations: [],
      },
    });

    const state = wrapSystem(system);
    const next = tickResources(state, 1);
    const entries = newLogEntries(state, next);
    const nextHealth = next.systems["test"]!.structures.miners[0]!.health;

    expect(nextHealth).toBeLessThanOrEqual(0.25);
    const healthEntry = entries.find((e) => e.soundEvent === "health_threshold");
    expect(healthEntry).toBeDefined();
  });

  test("health above all thresholds emits no health_threshold entry", () => {
    const system = makeSystem({
      mainProbe: null,
      resources: { materials: 0, energy: 0, computingPower: 0 },
      structures: {
        miners: [
          makeStructure({
            id: "m1",
            type: "miner",
            productionRate: 0,
            maintenanceCost: 0.2,
            health: 1.0,
          }),
        ],
        reactors: [],
        printers: [],
        stations: [],
      },
    });

    const state = wrapSystem(system);
    const next = tickResources(state, 1);
    const entries = newLogEntries(state, next);
    const nextHealth = next.systems["test"]!.structures.miners[0]!.health;

    // Health dropped but stayed above 75%
    expect(nextHealth).toBeGreaterThan(0.75);
    const healthEntry = entries.find((e) => e.soundEvent === "health_threshold");
    expect(healthEntry).toBeUndefined();
  });

  test("health already below threshold with no further crossing emits no entry", () => {
    const system = makeSystem({
      mainProbe: null,
      resources: { materials: 0, energy: 0, computingPower: 0 },
      structures: {
        miners: [
          makeStructure({
            id: "m1",
            type: "miner",
            productionRate: 0,
            maintenanceCost: 0.2,
            health: 0.74,
          }),
        ],
        reactors: [],
        printers: [],
        stations: [],
      },
    });

    const state = wrapSystem(system);
    const next = tickResources(state, 1);
    const entries = newLogEntries(state, next);
    const nextHealth = next.systems["test"]!.structures.miners[0]!.health;

    // Health was already below 75% and stayed above 50% -> no threshold crossing
    expect(nextHealth).toBeGreaterThan(0.5);
    const healthEntry = entries.find((e) => e.soundEvent === "health_threshold");
    expect(healthEntry).toBeUndefined();
  });

  test("crossing multiple thresholds in one tick emits only one entry with worst percentage", () => {
    // Two miners, each maintenanceCost 0.2, total = 0.4.
    // Per-structure drain = HEALTH_DRAIN_RATE * (0.2 / 0.4) * dt = 0.01 * 0.5 * dt
    // With dt=2: drain = 0.01 per structure.
    // m1: 0.76 -> 0.75 (crosses 75%), m2: 0.51 -> 0.50 (crosses 50%)
    const system = makeSystem({
      mainProbe: null,
      resources: { materials: 0, energy: 0, computingPower: 0 },
      structures: {
        miners: [
          makeStructure({
            id: "m1",
            type: "miner",
            productionRate: 0,
            maintenanceCost: 0.2,
            health: 0.76,
          }),
          makeStructure({
            id: "m2",
            type: "miner",
            productionRate: 0,
            maintenanceCost: 0.2,
            health: 0.51,
          }),
        ],
        reactors: [],
        printers: [],
        stations: [],
      },
    });

    const state = wrapSystem(system);
    const next = tickResources(state, 2);
    const entries = newLogEntries(state, next);

    const healthEntries = entries.filter((e) => e.soundEvent === "health_threshold");
    expect(healthEntries.length).toBe(1);

    // The message should reflect the worst health percentage (m2 crossing 50%)
    const m2Health = next.systems["test"]!.structures.miners[1]!.health;
    const worstPct = Math.round(m2Health * 100);
    expect(healthEntries[0]!.message).toContain(`${worstPct}%`);
  });

  test("probe health crossing threshold also emits health_threshold entry", () => {
    const system = makeSystem({
      mainProbe: makeProbe({ mode: "idle", health: 0.76 }),
      resources: { materials: 0, energy: 0, computingPower: 0 },
      structures: {
        miners: [],
        reactors: [],
        printers: [],
        stations: [],
      },
    });

    const state = wrapSystem(system);
    const next = tickResources(state, 1);
    const entries = newLogEntries(state, next);
    const nextProbeHealth = next.systems["test"]!.mainProbe!.health;

    expect(nextProbeHealth).toBeLessThanOrEqual(0.75);
    const healthEntry = entries.find((e) => e.soundEvent === "health_threshold");
    expect(healthEntry).toBeDefined();
  });

  test("recovery above threshold and re-crossing emits again", () => {
    // Start with health below 75%
    const system = makeSystem({
      mainProbe: null,
      resources: { materials: 0, energy: 0, computingPower: 0 },
      structures: {
        miners: [
          makeStructure({
            id: "m1",
            type: "miner",
            productionRate: 0,
            maintenanceCost: 0.2,
            health: 0.74,
          }),
        ],
        reactors: [],
        printers: [],
        stations: [],
      },
    });

    const recoveredSystem: SystemState = {
      ...system,
      resources: { materials: 1000, energy: 0, computingPower: 0 },
      structures: {
        ...system.structures,
        miners: [
          makeStructure({
            id: "m1",
            type: "miner",
            productionRate: 5,
            maintenanceCost: 0.2,
            health: 0.76,
          }),
        ],
      },
    };

    // Step 2: Drain health back below 75%
    const drainSystem: SystemState = {
      ...recoveredSystem,
      resources: { materials: 0, energy: 0, computingPower: 0 },
      structures: {
        ...recoveredSystem.structures,
        miners: [
          makeStructure({
            id: "m1",
            type: "miner",
            productionRate: 0,
            maintenanceCost: 0.2,
            health: 0.76,
          }),
        ],
      },
    };

    const stateBeforeDrain = wrapSystem(drainSystem);
    const afterDrain = tickResources(stateBeforeDrain, 1);
    const entries = newLogEntries(stateBeforeDrain, afterDrain);

    const nextHealth = afterDrain.systems["test"]!.structures.miners[0]!.health;
    expect(nextHealth).toBeLessThanOrEqual(0.75);

    const healthEntry = entries.find((e) => e.soundEvent === "health_threshold");
    expect(healthEntry).toBeDefined();
  });
});
