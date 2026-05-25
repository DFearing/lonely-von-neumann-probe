import { describe, test, expect } from "bun:test";
import { tick } from "../src/simulation/tick";
import { createInitialState } from "../src/simulation/state";
import { tickResources } from "../src/simulation/systems/resources";
import { KNOWN_SYSTEMS } from "../src/simulation/data/star-systems";
import { IDLE_MAINTENANCE_FRACTION } from "../src/simulation/rates";
import type {
  GameState,
  ProbeState,
  SystemState,
  StructureInstance,
} from "../src/simulation/state";

const SEED = 42;
const DT = 1;

const HEALTH_DRAIN_RATE = 0.01;

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

function makeStructure(
  overrides: Partial<StructureInstance> & Pick<StructureInstance, "type">,
): StructureInstance {
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

function wrapSystem(system: SystemState): GameState {
  return {
    seed: 42,
    tickCount: 0,
    elapsedSeconds: 0,
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

// ── Bug 1: Arriving probe at occupied system goes to availableProbes ──

describe("probe arriving at occupied system (#46)", () => {
  test("arriving probe is added to availableProbes when destination has a mainProbe", () => {
    const state = createInitialState(SEED);
    const ac = state.systems["alpha_centauri"]!;

    const existingProbe = makeProbe({
      id: "existing_probe",
      name: "Existing Probe",
      mode: "idle",
      systemId: "alpha_centauri",
    });

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
              components: { cpu: "cpu_t1", propulsion: "prop_t1", reactor: "rct_t1" },
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

    expect(dest.mainProbe!.id).toBe("existing_probe");
    expect(dest.availableProbes).toHaveLength(1);
    expect(dest.availableProbes[0]!.id).toBe("arriving_probe");
    expect(dest.availableProbes[0]!.systemId).toBe("alpha_centauri");
  });

  test("arriving probe at unoccupied system becomes mainProbe, not availableProbe", () => {
    const state = createInitialState(SEED);
    const ac = state.systems["alpha_centauri"]!;

    const modified: GameState = {
      ...state,
      systems: {
        ...state.systems,
        alpha_centauri: { ...ac, mainProbe: null },
        sol: {
          ...state.systems["sol"]!,
          sentProbes: [
            {
              id: "arriving_probe",
              name: "Arriving Probe",
              components: { cpu: "cpu_t1", propulsion: "prop_t1", reactor: "rct_t1" },
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

    expect(dest.mainProbe!.id).toBe("arriving_probe");
    expect(dest.availableProbes).toHaveLength(0);
  });

  test("log entry distinguishes probe standing by at occupied system", () => {
    const state = createInitialState(SEED);
    const ac = state.systems["alpha_centauri"]!;

    const existingProbe = makeProbe({
      id: "existing_probe",
      name: "Existing Probe",
      systemId: "alpha_centauri",
    });

    const modified: GameState = {
      ...state,
      systems: {
        ...state.systems,
        alpha_centauri: { ...ac, mainProbe: existingProbe },
        sol: {
          ...state.systems["sol"]!,
          sentProbes: [
            {
              id: "arriving_probe",
              name: "Arriving Probe",
              components: { cpu: "cpu_t1", propulsion: "prop_t1", reactor: "rct_t1" },
              originSystemId: "sol",
              destinationSystemId: "alpha_centauri",
              travelTimeSeconds: 5,
              elapsedSeconds: 4,
            },
          ],
        },
      },
    };

    const logBefore = modified.log.length;
    const after = tick(modified, DT, []);
    const newEntries = after.log.slice(logBefore);

    const arrivalEntry = newEntries.find((e) => e.category === "discovery");
    expect(arrivalEntry).toBeDefined();
    expect(arrivalEntry!.message).toContain("standing by");
    expect(arrivalEntry!.message).toContain("Alpha Centauri");
  });

  test("multiple probes arriving at same occupied system all go to availableProbes", () => {
    const state = createInitialState(SEED);
    const ac = state.systems["alpha_centauri"]!;

    const existingProbe = makeProbe({
      id: "existing_probe",
      name: "Existing Probe",
      systemId: "alpha_centauri",
    });

    const modified: GameState = {
      ...state,
      systems: {
        ...state.systems,
        alpha_centauri: { ...ac, mainProbe: existingProbe },
        sol: {
          ...state.systems["sol"]!,
          sentProbes: [
            {
              id: "probe_a",
              name: "Probe A",
              components: { cpu: "cpu_t1", propulsion: "prop_t1", reactor: "rct_t1" },
              originSystemId: "sol",
              destinationSystemId: "alpha_centauri",
              travelTimeSeconds: 5,
              elapsedSeconds: 4,
            },
            {
              id: "probe_b",
              name: "Probe B",
              components: { cpu: "cpu_t1", propulsion: "prop_t1", reactor: "rct_t1" },
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

    expect(dest.mainProbe!.id).toBe("existing_probe");
    expect(dest.availableProbes).toHaveLength(2);
    const probeIds = dest.availableProbes.map((p) => p.id);
    expect(probeIds).toContain("probe_a");
    expect(probeIds).toContain("probe_b");
  });
});

// ── Bug 2: Initial state richness matches KNOWN_SYSTEMS ──

describe("initial state richness consistency (#49)", () => {
  test("Sol richness matches KNOWN_SYSTEMS", () => {
    const state = createInitialState(SEED);
    const known = KNOWN_SYSTEMS.find((s) => s.id === "sol")!;
    expect(state.systems["sol"]!.resourceRichness).toBe(known.knownRichness!);
  });

  test("Alpha Centauri richness matches KNOWN_SYSTEMS (1.3, not 1.2)", () => {
    const state = createInitialState(SEED);
    const known = KNOWN_SYSTEMS.find((s) => s.id === "alpha_centauri")!;
    expect(state.systems["alpha_centauri"]!.resourceRichness).toBe(known.knownRichness!);
  });

  test("Sirius richness matches KNOWN_SYSTEMS", () => {
    const state = createInitialState(SEED);
    const known = KNOWN_SYSTEMS.find((s) => s.id === "sirius")!;
    expect(state.systems["sirius"]!.resourceRichness).toBe(known.knownRichness!);
  });

  test("Barnard's Star richness matches KNOWN_SYSTEMS", () => {
    const state = createInitialState(SEED);
    const known = KNOWN_SYSTEMS.find((s) => s.id === "barnards_star")!;
    expect(state.systems["barnards_star"]!.resourceRichness).toBe(known.knownRichness!);
  });

  test("Wolf 359 richness matches KNOWN_SYSTEMS", () => {
    const state = createInitialState(SEED);
    const known = KNOWN_SYSTEMS.find((s) => s.id === "wolf_359")!;
    expect(state.systems["wolf_359"]!.resourceRichness).toBe(known.knownRichness!);
  });

  test("all initial systems use canonical richness, not RNG", () => {
    const stateA = createInitialState(1);
    const stateB = createInitialState(999);

    const systemIds = ["sol", "alpha_centauri", "sirius", "barnards_star", "wolf_359"];
    for (const id of systemIds) {
      expect(stateA.systems[id]!.resourceRichness).toBe(
        stateB.systems[id]!.resourceRichness,
      );
    }
  });

  test("initial state does not mutate sol directly", () => {
    const state = createInitialState(SEED);
    const sol = state.systems["sol"]!;

    expect(sol.mainProbe).not.toBeNull();
    expect(sol.discoveredSystems).toContain("alpha_centauri");
    expect(sol.discoveredSystems).toContain("sirius");
    expect(sol.discoveredSystems).toContain("barnards_star");
    expect(sol.discoveredSystems).toContain("wolf_359");
  });
});

// ── Bug 3: Idle structures take proportional health damage ──

describe("idle structure maintenance drain (#50)", () => {
  test("idle structures take health damage when materials hit zero", () => {
    const system = makeSystem({
      mainProbe: null,
      resources: { materials: 0, energy: 0, computingPower: 0 },
      structures: {
        miners: [
          makeStructure({
            id: "m_active",
            type: "miner",
            productionRate: 0,
            maintenanceCost: 0.2,
            active: true,
          }),
          makeStructure({
            id: "m_idle",
            type: "miner",
            productionRate: 0,
            maintenanceCost: 0.2,
            active: false,
          }),
        ],
        reactors: [],
        printers: [],
        stations: [],
      },
    });

    const state = wrapSystem(system);
    const next = tickResources(state, 1);
    const nextSys = next.systems["test"]!;

    const idleMiner = nextSys.structures.miners.find((m) => m.id === "m_idle")!;
    expect(idleMiner.health).toBeLessThan(1);
  });

  test("idle structures drain at IDLE_MAINTENANCE_FRACTION of active rate", () => {
    const maintenanceCost = 0.4;
    const activeEffective = maintenanceCost;
    const idleEffective = maintenanceCost * IDLE_MAINTENANCE_FRACTION;
    const totalMaintenance = activeEffective + idleEffective;

    const system = makeSystem({
      mainProbe: null,
      resources: { materials: 0, energy: 0, computingPower: 0 },
      structures: {
        miners: [
          makeStructure({
            id: "m_active",
            type: "miner",
            productionRate: 0,
            maintenanceCost,
            active: true,
          }),
          makeStructure({
            id: "m_idle",
            type: "miner",
            productionRate: 0,
            maintenanceCost,
            active: false,
          }),
        ],
        reactors: [],
        printers: [],
        stations: [],
      },
    });

    const state = wrapSystem(system);
    const next = tickResources(state, 1);
    const nextSys = next.systems["test"]!;

    const activeMiner = nextSys.structures.miners.find((m) => m.id === "m_active")!;
    const idleMiner = nextSys.structures.miners.find((m) => m.id === "m_idle")!;

    const activeDrain = 1 - activeMiner.health;
    const idleDrain = 1 - idleMiner.health;

    const expectedActiveDrain = HEALTH_DRAIN_RATE * (activeEffective / totalMaintenance);
    const expectedIdleDrain = HEALTH_DRAIN_RATE * (idleEffective / totalMaintenance);

    expect(activeDrain).toBeCloseTo(expectedActiveDrain);
    expect(idleDrain).toBeCloseTo(expectedIdleDrain);
    expect(idleDrain / activeDrain).toBeCloseTo(IDLE_MAINTENANCE_FRACTION);
  });

  test("under-construction structures still do not drain", () => {
    const system = makeSystem({
      mainProbe: null,
      resources: { materials: 0, energy: 0, computingPower: 0 },
      structures: {
        miners: [
          makeStructure({
            id: "m_complete",
            type: "miner",
            productionRate: 0,
            maintenanceCost: 0.2,
            active: true,
          }),
          makeStructure({
            id: "m_building",
            type: "miner",
            productionRate: 0,
            maintenanceCost: 0.2,
            constructionProgress: 0.5,
            active: false,
          }),
        ],
        reactors: [],
        printers: [],
        stations: [],
      },
    });

    const state = wrapSystem(system);
    const next = tickResources(state, 1);
    const nextSys = next.systems["test"]!;

    const building = nextSys.structures.miners.find((m) => m.id === "m_building")!;
    expect(building.health).toBe(1);
  });
});
