import { describe, test, expect } from "bun:test";
import { calculateRates } from "../src/simulation/rates";
import type { SystemState, StructureInstance, ProbeState } from "../src/simulation/state";

function makeStructure(overrides: Partial<StructureInstance> & Pick<StructureInstance, "type">): StructureInstance {
  return {
    id: "s_1",
    tier: 1,
    productionRate: 10,
    operatingCost: 0,
    active: true,
    constructionProgress: 1,
    ...overrides,
  };
}

function makeProbe(overrides?: Partial<ProbeState>): ProbeState {
  return {
    id: "probe_1",
    systemId: "test",
    components: { cpu: "basic_cpu", propulsion: "basic_ion_drive", reactor: "basic_reactor" },
    miningOutput: 5,
    computingOutput: 1,
    internalPrinterSpeed: 1,
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
    structures: { miners: [], reactors: [], printers: [] },
    resources: { materials: 0, energy: 0, computingPower: 0 },
    resourceRates: { materialsPerSecond: 0, energyPerSecond: 0, computingPowerPerSecond: 0 },
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
      expect(rates.materialsPerSecond).toBe(5);
    });

    test("probe mining scaled by resource richness", () => {
      const system = makeSystem({ resourceRichness: 1.5 });
      const rates = calculateRates(system);
      expect(rates.materialsPerSecond).toBe(7.5);
    });

    test("miners add to probe output before richness multiplier", () => {
      const system = makeSystem({
        resourceRichness: 2.0,
        structures: {
          miners: [makeStructure({ type: "miner", productionRate: 20 })],
          reactors: [],
          printers: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.materialsPerSecond).toBe((5 + 20) * 2.0);
    });

    test("inactive miners do not contribute", () => {
      const system = makeSystem({
        structures: {
          miners: [makeStructure({ type: "miner", productionRate: 20, active: false })],
          reactors: [],
          printers: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.materialsPerSecond).toBe(5);
    });

    test("under-construction miners do not contribute", () => {
      const system = makeSystem({
        structures: {
          miners: [makeStructure({ type: "miner", productionRate: 20, constructionProgress: 0.5 })],
          reactors: [],
          printers: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.materialsPerSecond).toBe(5);
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
        },
      });
      const rates = calculateRates(system);
      expect(rates.materialsPerSecond).toBe(5 + 10 + 15);
    });
  });

  // ── Energy ──────────────────────────────────────────────────────

  describe("energy per second", () => {
    const PROBE_ENERGY = 9;

    test("probe-only energy with basic reactor", () => {
      const system = makeSystem();
      const rates = calculateRates(system);
      expect(rates.energyPerSecond).toBe(PROBE_ENERGY);
    });

    test("single reactor adds to probe energy", () => {
      const system = makeSystem({
        structures: {
          miners: [],
          reactors: [makeStructure({ type: "reactor", tier: 1, productionRate: 10, operatingCost: 1 })],
          printers: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.energyPerSecond).toBe(PROBE_ENERGY + 10 - 1);
    });

    test("solar harvester (tier 3) output scaled by resource richness", () => {
      const system = makeSystem({
        resourceRichness: 1.5,
        structures: {
          miners: [],
          reactors: [makeStructure({ type: "reactor", tier: 3, productionRate: 12, operatingCost: 0.5 })],
          printers: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.energyPerSecond).toBe(PROBE_ENERGY + 12 * 1.5 - 0.5);
    });

    test("non-solar reactors unaffected by richness", () => {
      const system = makeSystem({
        resourceRichness: 2.0,
        structures: {
          miners: [],
          reactors: [makeStructure({ type: "reactor", tier: 1, productionRate: 10, operatingCost: 1 })],
          printers: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.energyPerSecond).toBe(PROBE_ENERGY + 10 - 1);
    });

    test("operating costs include all active structure types", () => {
      const system = makeSystem({
        structures: {
          miners: [makeStructure({ type: "miner", operatingCost: 2 })],
          reactors: [makeStructure({ type: "reactor", tier: 1, productionRate: 20, operatingCost: 3 })],
          printers: [makeStructure({ type: "printer", operatingCost: 1 })],
        },
      });
      const rates = calculateRates(system);
      expect(rates.energyPerSecond).toBe(PROBE_ENERGY + 20 - (2 + 3 + 1));
    });

    test("inactive structure reactors produce no energy and incur no operating cost", () => {
      const system = makeSystem({
        structures: {
          miners: [],
          reactors: [makeStructure({ type: "reactor", tier: 1, productionRate: 10, active: false, operatingCost: 1 })],
          printers: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.energyPerSecond).toBe(PROBE_ENERGY);
    });

    test("under-construction reactors do not produce energy", () => {
      const system = makeSystem({
        structures: {
          miners: [],
          reactors: [makeStructure({ type: "reactor", tier: 1, productionRate: 10, constructionProgress: 0.9, operatingCost: 1 })],
          printers: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.energyPerSecond).toBe(PROBE_ENERGY - 1);
    });

    test("energy can go negative when operating costs exceed production", () => {
      const system = makeSystem({
        structures: {
          miners: [makeStructure({ type: "miner", operatingCost: 15 })],
          reactors: [makeStructure({ type: "reactor", tier: 1, productionRate: 5, operatingCost: 3 })],
          printers: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.energyPerSecond).toBe(PROBE_ENERGY + 5 - (15 + 3));
    });

    test("no probe means no probe energy contribution", () => {
      const system = makeSystem({
        mainProbe: null,
        structures: {
          miners: [],
          reactors: [makeStructure({ type: "reactor", tier: 1, productionRate: 10, operatingCost: 1 })],
          printers: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.energyPerSecond).toBe(10 - 1);
    });
  });

  // ── Computing ───────────────────────────────────────────────────

  describe("computing power per second", () => {
    test("equals probe computing output", () => {
      const system = makeSystem({ mainProbe: makeProbe({ computingOutput: 5 }) });
      const rates = calculateRates(system);
      expect(rates.computingPowerPerSecond).toBe(5);
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
          reactors: [makeStructure({ type: "reactor", tier: 1, productionRate: 10, operatingCost: 1 })],
          printers: [],
        },
      });
      const rates = calculateRates(system);
      expect(rates.materialsPerSecond).toBe(20);
      expect(rates.energyPerSecond).toBe(10 - 1);
      expect(rates.computingPowerPerSecond).toBe(0);
    });
  });

  // ── Empty system ────────────────────────────────────────────────

  describe("empty system with probe", () => {
    test("all rates reflect only probe output", () => {
      const system = makeSystem();
      const rates = calculateRates(system);
      expect(rates.materialsPerSecond).toBe(5);
      expect(rates.energyPerSecond).toBe(9);
      expect(rates.computingPowerPerSecond).toBe(1);
    });
  });
});
