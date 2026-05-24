import { describe, test, expect } from "bun:test";
import { calculateRates } from "../src/simulation/rates";
import type { SystemState, StructureInstance, ProbeState } from "../src/simulation/state";

function makeStructure(
  overrides: Partial<StructureInstance> & Pick<StructureInstance, "type">,
): StructureInstance {
  return {
    id: "s_1",
    tier: 1,
    productionRate: 10,
    operatingCost: 0,
    maintenanceCost: 0,
    active: true,
    constructionProgress: 1,
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
    structures: { miners: [], reactors: [], printers: [] },
    resources: { materials: 0, energy: 0, computingPower: 0 },
    resourceRates: { materialsPerSecond: 0, materialsSupply: 0, materialsDemand: 0, energySupply: 0, energyDemand: 0, energyNet: 0, computingPowerPerSecond: 0 },
    constructionQueue: [],
    researchQueue: [],
    completedResearch: {},
    discoveredSystems: [],
    sentProbes: [],
    ...overrides,
  };
}

describe("tech effects on resource rates", () => {
  describe("mining tech multiplier", () => {
    test("base mining rate with no tech and 1 miner", () => {
      const system = makeSystem({
        structures: {
          miners: [makeStructure({ type: "miner", productionRate: 20 })],
          reactors: [],
          printers: [],
        },
      });

      const rates = calculateRates(system);
      expect(rates.materialsPerSecond).toBeCloseTo((1 + 20) * 1.0 - 0.1);
    });

    test("mining_efficiency_t1 gives 1.1x mining rate", () => {
      const system = makeSystem({
        completedResearch: { mining_efficiency_t1: true },
        structures: {
          miners: [makeStructure({ type: "miner", productionRate: 20 })],
          reactors: [],
          printers: [],
        },
      });

      const rates = calculateRates(system);
      expect(rates.materialsPerSecond).toBeCloseTo((1 + 20) * 1.1 - 0.1);
    });

    test("mining_efficiency t1-t4 stack to correct multiplier", () => {
      const system = makeSystem({
        completedResearch: {
          mining_efficiency_t1: true,
          mining_efficiency_t2: true,
          mining_efficiency_t3: true,
          mining_efficiency_t4: true,
        },
        structures: {
          miners: [makeStructure({ type: "miner", productionRate: 20 })],
          reactors: [],
          printers: [],
        },
      });

      const rates = calculateRates(system);
      const expectedMultiplier = 1.0 + 0.100 + 0.105 + 0.110 + 0.115;
      expect(rates.materialsPerSecond).toBeCloseTo((1 + 20) * expectedMultiplier - 0.1);
    });

    test("mining multiplier stacks with system richness", () => {
      const system = makeSystem({
        resourceRichness: 1.5,
        completedResearch: { mining_efficiency_t1: true },
        structures: {
          miners: [makeStructure({ type: "miner", productionRate: 20 })],
          reactors: [],
          printers: [],
        },
      });

      const rates = calculateRates(system);
      expect(rates.materialsPerSecond).toBeCloseTo((1 + 20) * 1.1 * 1.5 - 0.1);
    });
  });

  describe("energy tech multiplier", () => {
    test("energy_production_t1 gives 1.08x reactor output", () => {
      const system = makeSystem({
        completedResearch: { energy_production_t1: true },
        structures: {
          miners: [],
          reactors: [makeStructure({ type: "reactor", tier: 1, productionRate: 10 })],
          printers: [],
        },
      });

      const rates = calculateRates(system);
      const probeEnergy = 3;
      expect(rates.energyNet).toBeCloseTo(probeEnergy + 10 * 1.08);
    });
  });

  describe("types paths", () => {
    test("mining_types tiers do not affect operating costs", () => {
      const system = makeSystem({
        completedResearch: { mining_types_t1: true },
        structures: {
          miners: [makeStructure({ type: "miner", productionRate: 20, operatingCost: 10 })],
          reactors: [],
          printers: [],
        },
      });

      const rates = calculateRates(system);
      const probeEnergy = 3;
      expect(rates.energyNet).toBeCloseTo(probeEnergy - 10);
    });
  });
});
