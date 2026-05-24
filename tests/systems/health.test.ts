import { describe, test, expect } from "bun:test";
import { tickResources } from "../../src/simulation/systems/resources";
import { calculateRates } from "../../src/simulation/rates";
import { tickConstruction } from "../../src/simulation/systems/construction";
import { createInitialState } from "../../src/simulation/state";
import type {
  GameState,
  SystemState,
  StructureInstance,
  ProbeState,
} from "../../src/simulation/state";

// ── Factories ────────────────────────────────────────────────────────

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
  };
}

function getSystem(state: GameState, id = "test"): SystemState {
  const sys = state.systems[id];
  if (!sys) throw new Error(`System ${id} not found`);
  return sys;
}

// ── Constants matching the source ────────────────────────────────────

const HEALTH_DRAIN_RATE = 0.01;
const HEALTH_RECOVERY_RATE = 0.005;

// ── Tests ────────────────────────────────────────────────────────────

describe("structure health system", () => {
  // ── Drain conditions ─────────────────────────────────────────────

  describe("drain conditions", () => {
    test("no health drain when materials are positive", () => {
      const system = makeSystem({
        resources: { materials: 100, energy: 0, computingPower: 0 },
        structures: {
          miners: [
            makeStructure({
              id: "m1",
              type: "miner",
              productionRate: 5,
              maintenanceCost: 0.1,
            }),
          ],
          reactors: [],
          printers: [],
          stations: [],
        },
      });

      const state = wrapSystem(system);
      const next = tickResources(state, 1);
      const nextSys = getSystem(next);

      expect(nextSys.structures.miners[0]!.health).toBe(1);
    });

    test("no health drain when materials = 0 but net rate >= 0", () => {
      const system = makeSystem({
        mainProbe: null,
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
      const nextSys = getSystem(next);

      expect(nextSys.resources.materials).toBe(0);
    });

    test("health drains when materials = 0 and net rate is negative", () => {
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
            }),
          ],
          reactors: [],
          printers: [],
          stations: [],
        },
      });

      const state = wrapSystem(system);
      const next = tickResources(state, 1);
      const nextSys = getSystem(next);

      expect(nextSys.structures.miners[0]!.health).toBeLessThan(1);
    });
  });

  // ── Proportional drain ───────────────────────────────────────────

  describe("drain proportionality", () => {
    test("drain is proportional to maintenance cost share", () => {
      const system = makeSystem({
        mainProbe: null,
        resources: { materials: 0, energy: 0, computingPower: 0 },
        structures: {
          miners: [
            makeStructure({
              id: "m1",
              type: "miner",
              productionRate: 0,
              maintenanceCost: 0.1,
            }),
            makeStructure({
              id: "m2",
              type: "miner",
              productionRate: 0,
              maintenanceCost: 0.3,
            }),
          ],
          reactors: [],
          printers: [],
          stations: [],
        },
      });

      const state = wrapSystem(system);
      const next = tickResources(state, 1);
      const nextSys = getSystem(next);

      const totalMaintenance = 0.1 + 0.3;
      const expectedDrain1 = HEALTH_DRAIN_RATE * (0.1 / totalMaintenance);
      const expectedDrain2 = HEALTH_DRAIN_RATE * (0.3 / totalMaintenance);

      const health1 = nextSys.structures.miners[0]!.health;
      const health2 = nextSys.structures.miners[1]!.health;

      expect(health1).toBeCloseTo(1 - expectedDrain1);
      expect(health2).toBeCloseTo(1 - expectedDrain2);

      const loss1 = 1 - health1;
      const loss2 = 1 - health2;
      expect(loss2 / loss1).toBeCloseTo(0.3 / 0.1);
    });

    test("drain is proportional across different structure categories", () => {
      const system = makeSystem({
        mainProbe: null,
        resources: { materials: 0, energy: 0, computingPower: 0 },
        structures: {
          miners: [
            makeStructure({
              id: "m1",
              type: "miner",
              productionRate: 0,
              maintenanceCost: 0.1,
            }),
          ],
          reactors: [
            makeStructure({
              id: "r1",
              type: "reactor",
              productionRate: 0,
              maintenanceCost: 0.3,
            }),
          ],
          printers: [],
          stations: [],
        },
      });

      const state = wrapSystem(system);
      const next = tickResources(state, 1);
      const nextSys = getSystem(next);

      const totalMaintenance = 0.1 + 0.3;
      const expectedDrainMiner = HEALTH_DRAIN_RATE * (0.1 / totalMaintenance);
      const expectedDrainReactor = HEALTH_DRAIN_RATE * (0.3 / totalMaintenance);

      const minerHealth = nextSys.structures.miners[0]!.health;
      const reactorHealth = nextSys.structures.reactors[0]!.health;

      expect(minerHealth).toBeCloseTo(1 - expectedDrainMiner);
      expect(reactorHealth).toBeCloseTo(1 - expectedDrainReactor);

      const minerLoss = 1 - minerHealth;
      const reactorLoss = 1 - reactorHealth;
      expect(reactorLoss / minerLoss).toBeCloseTo(0.3 / 0.1);
    });
  });

  // ── Structures that should be exempt from drain ──────────────────

  describe("drain exemptions", () => {
    test("inactive structures don't drain", () => {
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
            }),
            makeStructure({
              id: "m_inactive",
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
      const nextSys = getSystem(next);

      const inactiveStructure = nextSys.structures.miners.find(
        (m) => m.id === "m_inactive",
      )!;
      expect(inactiveStructure.health).toBe(1);

      const activeStructure = nextSys.structures.miners.find(
        (m) => m.id === "m_active",
      )!;
      expect(activeStructure.health).toBeLessThan(1);
    });

    test("under-construction structures don't drain", () => {
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
            }),
            makeStructure({
              id: "m_building",
              type: "miner",
              productionRate: 0,
              maintenanceCost: 0.2,
              constructionProgress: 0.5,
            }),
          ],
          reactors: [],
          printers: [],
          stations: [],
        },
      });

      const state = wrapSystem(system);
      const next = tickResources(state, 1);
      const nextSys = getSystem(next);

      const buildingStructure = nextSys.structures.miners.find(
        (m) => m.id === "m_building",
      )!;
      expect(buildingStructure.health).toBe(1);

      const completeStructure = nextSys.structures.miners.find(
        (m) => m.id === "m_complete",
      )!;
      expect(completeStructure.health).toBeLessThan(1);
    });
  });

  // ── Recovery ─────────────────────────────────────────────────────

  describe("health recovery", () => {
    test("health recovers when materials are positive", () => {
      const system = makeSystem({
        resources: { materials: 100, energy: 0, computingPower: 0 },
        structures: {
          miners: [
            makeStructure({
              id: "m1",
              type: "miner",
              productionRate: 5,
              maintenanceCost: 0,
              health: 0.5,
            }),
          ],
          reactors: [],
          printers: [],
          stations: [],
        },
      });

      const state = wrapSystem(system);
      const next = tickResources(state, 1);
      const nextSys = getSystem(next);

      expect(nextSys.structures.miners[0]!.health).toBeCloseTo(
        0.5 + HEALTH_RECOVERY_RATE * 1,
      );
    });

    test("recovery caps at 1.0", () => {
      const system = makeSystem({
        resources: { materials: 100, energy: 0, computingPower: 0 },
        structures: {
          miners: [
            makeStructure({
              id: "m1",
              type: "miner",
              productionRate: 5,
              maintenanceCost: 0,
              health: 0.999,
            }),
          ],
          reactors: [],
          printers: [],
          stations: [],
        },
      });

      const state = wrapSystem(system);
      const next = tickResources(state, 1);
      const nextSys = getSystem(next);

      expect(nextSys.structures.miners[0]!.health).toBe(1);
    });
  });

  // ── Production scaling ───────────────────────────────────────────

  describe("production scaling by health", () => {
    test("health at 0 means zero production in rates", () => {
      const system = makeSystem({
        mainProbe: null,
        structures: {
          miners: [
            makeStructure({
              id: "m1",
              type: "miner",
              productionRate: 20,
              health: 0,
            }),
          ],
          reactors: [],
          printers: [],
          stations: [],
        },
      });

      const rates = calculateRates(system);
      expect(rates.materialsSupply).toBe(0);
    });

    test("health 0.5 means 50% production", () => {
      const fullHealthSystem = makeSystem({
        mainProbe: null,
        structures: {
          miners: [
            makeStructure({
              id: "m1",
              type: "miner",
              productionRate: 20,
              health: 1,
            }),
          ],
          reactors: [],
          printers: [],
          stations: [],
        },
      });

      const halfHealthSystem = makeSystem({
        mainProbe: null,
        structures: {
          miners: [
            makeStructure({
              id: "m1",
              type: "miner",
              productionRate: 20,
              health: 0.5,
            }),
          ],
          reactors: [],
          printers: [],
          stations: [],
        },
      });

      const fullRates = calculateRates(fullHealthSystem);
      const halfRates = calculateRates(halfHealthSystem);

      expect(halfRates.materialsSupply).toBeCloseTo(
        fullRates.materialsSupply * 0.5,
      );
    });

    test("reactor health 0.5 means 50% energy output", () => {
      const fullHealthSystem = makeSystem({
        mainProbe: null,
        structures: {
          miners: [],
          reactors: [
            makeStructure({
              id: "r1",
              type: "reactor",
              productionRate: 10,
              health: 1,
            }),
          ],
          printers: [],
          stations: [],
        },
      });

      const halfHealthSystem = makeSystem({
        mainProbe: null,
        structures: {
          miners: [],
          reactors: [
            makeStructure({
              id: "r1",
              type: "reactor",
              productionRate: 10,
              health: 0.5,
            }),
          ],
          printers: [],
          stations: [],
        },
      });

      const fullRates = calculateRates(fullHealthSystem);
      const halfRates = calculateRates(halfHealthSystem);

      expect(fullRates.energySupply).toBeGreaterThan(0);
      expect(halfRates.energySupply).toBeCloseTo(fullRates.energySupply * 0.5);
    });

    test("maintenance cost unchanged at low health", () => {
      const fullHealthSystem = makeSystem({
        mainProbe: null,
        structures: {
          miners: [
            makeStructure({
              id: "m1",
              type: "miner",
              productionRate: 20,
              maintenanceCost: 0.15,
              health: 1,
            }),
          ],
          reactors: [],
          printers: [],
          stations: [],
        },
      });

      const halfHealthSystem = makeSystem({
        mainProbe: null,
        structures: {
          miners: [
            makeStructure({
              id: "m1",
              type: "miner",
              productionRate: 20,
              maintenanceCost: 0.15,
              health: 0.5,
            }),
          ],
          reactors: [],
          printers: [],
          stations: [],
        },
      });

      const fullRates = calculateRates(fullHealthSystem);
      const halfRates = calculateRates(halfHealthSystem);

      expect(halfRates.materialsDemand).toBe(fullRates.materialsDemand);
    });
  });

  // ── Printer speed scaling ────────────────────────────────────────

  describe("printer speed scaling", () => {
    test("damaged printer is slower", () => {
      const base = createInitialState(42);
      const sol = base.systems["sol"]!;

      const fullHealthPrinter = makeStructure({
        id: "printer_1",
        type: "printer",
        productionRate: 1,
        health: 1,
      });
      const halfHealthPrinter = makeStructure({
        id: "printer_1",
        type: "printer",
        productionRate: 1,
        health: 0.5,
      });

      const project = {
        id: "build_miner",
        targetType: "miner",
        targetTier: 1,
        targetConfig: null,
        totalCost: { materials: 100, energy: 20 },
        remainingCost: { materials: 50, energy: 10 },
        progress: 0.5,
        assignedPrinterIds: ["printer_1"],
      };

      const makeState = (printer: StructureInstance): GameState => ({
        ...base,
        systems: {
          ...base.systems,
          sol: {
            ...sol,
            mainProbe: { ...sol.mainProbe!, mode: "idle" },
            structures: { ...sol.structures, printers: [printer] },
            constructionQueue: [project],
          },
        },
      });

      const fullResult = tickConstruction(makeState(fullHealthPrinter), 1);
      const halfResult = tickConstruction(makeState(halfHealthPrinter), 1);

      const fullProgress =
        fullResult.systems["sol"]!.constructionQueue[0]!.progress;
      const halfProgress =
        halfResult.systems["sol"]!.constructionQueue[0]!.progress;

      const fullDelta = fullProgress - 0.5;
      const halfDelta = halfProgress - 0.5;

      expect(halfDelta).toBeCloseTo(fullDelta * 0.5);
    });
  });

  // ── Multi-tick behavior ──────────────────────────────────────────

  describe("multi-tick behavior", () => {
    test("multi-tick drain eventually reaches 0", () => {
      let system = makeSystem({
        mainProbe: null,
        resources: { materials: 0, energy: 0, computingPower: 0 },
        structures: {
          miners: [
            makeStructure({
              id: "m1",
              type: "miner",
              productionRate: 0,
              maintenanceCost: 0.2,
            }),
          ],
          reactors: [],
          printers: [],
          stations: [],
        },
      });

      let state = wrapSystem(system);

      for (let i = 0; i < 200; i++) {
        state = tickResources(state, 1);
      }

      const finalSys = getSystem(state);
      expect(finalSys.structures.miners[0]!.health).toBe(0);
    });

    test("death spiral effect", () => {
      // Economy where net materials is barely negative at full health.
      // Health drains each tick, reducing miner production (supply goes down)
      // while maintenance stays constant, making net even more negative --
      // a self-reinforcing feedback loop.
      const system = makeSystem({
        mainProbe: null,
        resources: { materials: 0, energy: 0, computingPower: 0 },
        structures: {
          miners: [
            makeStructure({
              id: "m1",
              type: "miner",
              productionRate: 0.3,
              maintenanceCost: 0.32,
            }),
            makeStructure({
              id: "m2",
              type: "miner",
              productionRate: 0.3,
              maintenanceCost: 0.32,
            }),
          ],
          reactors: [],
          printers: [],
          stations: [],
        },
      });

      const initialRates = calculateRates(system);
      expect(initialRates.materialsPerSecond).toBeLessThan(0);

      let state = wrapSystem(system);

      // Run a few ticks and capture early health
      for (let i = 0; i < 10; i++) {
        state = tickResources(state, 1);
      }
      const earlySys = getSystem(state);
      const earlyHealth = earlySys.structures.miners[0]!.health;
      expect(earlyHealth).toBeLessThan(1);

      // Run many more ticks
      for (let i = 0; i < 100; i++) {
        state = tickResources(state, 1);
      }

      const finalSys = getSystem(state);
      const finalRates = calculateRates(finalSys);
      const finalHealth = finalSys.structures.miners[0]!.health;

      // Health continued to decline
      expect(finalHealth).toBeLessThan(earlyHealth);

      // Net rate got worse because production dropped but maintenance didn't
      expect(finalRates.materialsPerSecond).toBeLessThan(
        initialRates.materialsPerSecond,
      );
    });
  });
});
