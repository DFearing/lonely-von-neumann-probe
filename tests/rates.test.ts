import { describe, test, expect } from "bun:test";
import { calculateRates } from "../src/simulation/rates";
import type { SystemState, StructureInstance, ProbeState } from "../src/simulation/state";

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
    resourceRates: { materialsSupply: 0, materialsDemand: 0, materialsPerSecond: 0, energySupply: 0, energyDemand: 0, energyNet: 0, computingPowerPerSecond: 0, computeSupply: 0, computeDemand: 0, computeNet: 0, computeEfficiency: 1 },
    constructionQueue: [],
    researchQueue: [],
    completedResearch: {},
    discoveredSystems: [],
    sentProbes: [],
    ...overrides,
  };
}

describe("calculateRates", () => {
  // ── Materials ───────────────────────────────────────────────────

  describe("materials per second", () => {
    test("probe-only mining with richness 1.0", () => {
      const system = makeSystem();
      const rates = calculateRates(system);
      expect(rates.materialsPerSecond).toBeCloseTo(0.9);
    });

    test("probe mining scaled by resource richness", () => {
      const system = makeSystem({ resourceRichness: 1.5 });
      const rates = calculateRates(system);
      expect(rates.materialsPerSecond).toBeCloseTo(1.4);
    });

    test("miners add to probe output before richness multiplier", () => {
      const system = makeSystem({
        resourceRichness: 2.0,
        structures: {
          miners: [makeStructure({ type: "miner", productionRate: 20 })],
          reactors: [],
          printers: [],
          stations: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.materialsPerSecond).toBeCloseTo((1 + 20) * 2.0 - 0.1);
    });

    test("inactive miners do not contribute", () => {
      const system = makeSystem({
        structures: {
          miners: [makeStructure({ type: "miner", productionRate: 20, active: false })],
          reactors: [],
          printers: [],
          stations: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.materialsPerSecond).toBeCloseTo(0.9);
    });

    test("under-construction miners do not contribute", () => {
      const system = makeSystem({
        structures: {
          miners: [makeStructure({ type: "miner", productionRate: 20, constructionProgress: 0.5 })],
          reactors: [],
          printers: [],
          stations: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.materialsPerSecond).toBeCloseTo(0.9);
    });

    test("multiple miners sum correctly", () => {
      const system = makeSystem({
        resourceRichness: 1.0,
        structures: {
          miners: [
            makeStructure({ id: "m1", type: "miner", productionRate: 10 }),
            makeStructure({ id: "m2", type: "miner", productionRate: 15 }),
          ],
          reactors: [],
          printers: [],
          stations: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.materialsPerSecond).toBeCloseTo(1 + 10 + 15 - 0.1);
    });
  });

  // ── Energy ──────────────────────────────────────────────────────

  describe("energy per second", () => {
    const PROBE_ENERGY = 3;

    test("probe-only energy with basic reactor", () => {
      const system = makeSystem();
      const rates = calculateRates(system);
      expect(rates.energyNet).toBe(PROBE_ENERGY);
    });

    test("single reactor adds to probe energy", () => {
      const system = makeSystem({
        structures: {
          miners: [],
          reactors: [makeStructure({ type: "reactor", tier: 1, productionRate: 10 })],
          printers: [],
          stations: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.energyNet).toBe(PROBE_ENERGY + 10);
    });

    test("solar reactor (tier 5) output scaled by resource richness", () => {
      const system = makeSystem({
        resourceRichness: 1.5,
        structures: {
          miners: [],
          reactors: [makeStructure({ type: "reactor", tier: 5, productionRate: 12 })],
          printers: [],
          stations: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.energyNet).toBe(PROBE_ENERGY + 12 * 1.5);
    });

    test("non-solar reactors unaffected by richness", () => {
      const system = makeSystem({
        resourceRichness: 2.0,
        structures: {
          miners: [],
          reactors: [makeStructure({ type: "reactor", tier: 1, productionRate: 10 })],
          printers: [],
          stations: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.energyNet).toBe(PROBE_ENERGY + 10);
    });

    test("operating costs include miners and printers only", () => {
      const system = makeSystem({
        structures: {
          miners: [makeStructure({ type: "miner", operatingCost: 2 })],
          reactors: [makeStructure({ type: "reactor", tier: 1, productionRate: 20 })],
          printers: [makeStructure({ type: "printer", operatingCost: 1 })],
          stations: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.energyNet).toBe(PROBE_ENERGY + 20 - (2 + 1));
    });

    test("inactive structure reactors produce no energy", () => {
      const system = makeSystem({
        structures: {
          miners: [],
          reactors: [makeStructure({ type: "reactor", tier: 1, productionRate: 10, active: false })],
          printers: [],
          stations: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.energyNet).toBe(PROBE_ENERGY);
    });

    test("under-construction reactors do not produce energy", () => {
      const system = makeSystem({
        structures: {
          miners: [],
          reactors: [makeStructure({ type: "reactor", tier: 1, productionRate: 10, constructionProgress: 0.9 })],
          printers: [],
          stations: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.energyNet).toBe(PROBE_ENERGY);
    });

    test("energy can go negative when operating costs exceed production", () => {
      const system = makeSystem({
        structures: {
          miners: [makeStructure({ type: "miner", operatingCost: 15 })],
          reactors: [makeStructure({ type: "reactor", tier: 1, productionRate: 5 })],
          printers: [],
          stations: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.energyNet).toBe(PROBE_ENERGY + 5 - 15);
    });

    test("no probe means no probe energy contribution", () => {
      const system = makeSystem({
        mainProbe: null,
        structures: {
          miners: [],
          reactors: [makeStructure({ type: "reactor", tier: 1, productionRate: 10 })],
          printers: [],
          stations: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.energyNet).toBe(10);
    });
  });

  // ── Computing ───────────────────────────────────────────────────

  describe("computing power per second", () => {
    test("equals probe computing output", () => {
      const system = makeSystem({ mainProbe: makeProbe({ computingOutput: 5 }) });
      const rates = calculateRates(system);
      expect(rates.computingPowerPerSecond).toBe(5);
    });

    test("station efficiency multiplies station compute output", () => {
      const system = makeSystem({
        mainProbe: makeProbe({ computingOutput: 10 }),
        completedResearch: { station_efficiency_t1: true },
        structures: {
          miners: [],
          reactors: [],
          printers: [],
          stations: [makeStructure({ type: "station", productionRate: 20 })],
        },
      });
      const rates = calculateRates(system);
      expect(rates.computeSupply).toBeCloseTo(10 + 20 * 1.04);
    });
  });

  // ── Station cost reduction ──────────────────────────────────────

  describe("station cost reduction", () => {
    test("computing_speed_t1 reduces station operating costs", () => {
      const system = makeSystem({
        completedResearch: { computing_speed_t1: true },
        structures: {
          miners: [],
          reactors: [],
          printers: [],
          stations: [makeStructure({ type: "station", operatingCost: 2, maintenanceCost: 0 })],
        },
      });
      const rates = calculateRates(system);
      expect(rates.energyDemand).toBeCloseTo(2 / 1.05);
    });

    test("computing_speed_t1 reduces station maintenance costs", () => {
      const system = makeSystem({
        mainProbe: null,
        completedResearch: { computing_speed_t1: true },
        structures: {
          miners: [],
          reactors: [],
          printers: [],
          stations: [makeStructure({ type: "station", maintenanceCost: 1, operatingCost: 0 })],
        },
      });
      const rates = calculateRates(system);
      expect(rates.materialsDemand).toBeCloseTo(1 / 1.05);
    });
  });

  // ── Null probe ──────────────────────────────────────────────────

  describe("system with no probe", () => {
    test("probe contributions are zero", () => {
      const system = makeSystem({ mainProbe: null });
      const rates = calculateRates(system);
      expect(rates.materialsPerSecond).toBe(0);
      expect(rates.computingPowerPerSecond).toBe(0);
    });

    test("structures still produce without a probe", () => {
      const system = makeSystem({
        mainProbe: null,
        resourceRichness: 1.0,
        structures: {
          miners: [makeStructure({ type: "miner", productionRate: 20 })],
          reactors: [makeStructure({ type: "reactor", tier: 1, productionRate: 10 })],
          printers: [],
          stations: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.materialsPerSecond).toBe(20);
      expect(rates.energyNet).toBe(10);
      expect(rates.computingPowerPerSecond).toBe(0);
    });
  });

  // ── Empty system ────────────────────────────────────────────────

  describe("empty system with probe", () => {
    test("all rates reflect only probe output", () => {
      const system = makeSystem();
      const rates = calculateRates(system);
      expect(rates.materialsPerSecond).toBeCloseTo(0.9);
      expect(rates.energyNet).toBe(3);
      expect(rates.computingPowerPerSecond).toBe(1);
    });
  });
});
