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
      expect(rates.materialsPerSecond).toBe((5 + 20) * 1.0);
    });

    test("basic_mining_techniques gives 1.2x mining rate", () => {
      const system = makeSystem({
        completedResearch: { basic_mining_techniques: true },
        structures: {
          miners: [makeStructure({ type: "miner", productionRate: 20 })],
          reactors: [],
          printers: [],
        },
      });

      const rates = calculateRates(system);
      expect(rates.materialsPerSecond).toBeCloseTo((5 + 20) * 1.2);
    });

    test("all 4 mining techs give 3.2x mining rate", () => {
      const system = makeSystem({
        completedResearch: {
          basic_mining_techniques: true,
          mineral_separation: true,
          advanced_extraction: true,
          automated_deep_mining: true,
        },
        structures: {
          miners: [makeStructure({ type: "miner", productionRate: 20 })],
          reactors: [],
          printers: [],
        },
      });

      const rates = calculateRates(system);
      expect(rates.materialsPerSecond).toBeCloseTo((5 + 20) * 3.2);
    });

    test("mining multiplier stacks with system richness", () => {
      const system = makeSystem({
        resourceRichness: 1.5,
        completedResearch: { basic_mining_techniques: true },
        structures: {
          miners: [makeStructure({ type: "miner", productionRate: 20 })],
          reactors: [],
          printers: [],
        },
      });

      const rates = calculateRates(system);
      expect(rates.materialsPerSecond).toBeCloseTo((5 + 20) * 1.2 * 1.5);
    });
  });
});
