import { describe, test, expect } from "bun:test";
import {
  bestAvailableTier,
  canSafelyAfford,
  isComputeBottleneck,
  isEnergyBottleneck,
  structureCount,
  bestAvailableComponent,
} from "../src/simulation/autopilot/evaluate";
import type { SystemState, StructureInstance } from "../src/simulation/state";

function makeSystem(overrides?: Partial<SystemState>): SystemState {
  return {
    id: "test",
    name: "Test System",
    starType: "yellow",
    distanceFromOrigin: 0,
    resourceRichness: 1.0,
    discovered: true,
    scanned: true,
    mainProbe: null,
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

describe("bestAvailableTier", () => {
  test("returns tier 1 with no research completed", () => {
    const system = makeSystem();
    expect(bestAvailableTier(system, "miner")).toBe(1);
  });

  test("returns highest tier with met prerequisites", () => {
    const system = makeSystem({
      completedResearch: {
        mining_types_t4: true,
        mining_types_t8: true,
      },
    });
    expect(bestAvailableTier(system, "miner")).toBe(3);
  });

  test("returns tier 1 for reactor with no research", () => {
    const system = makeSystem();
    expect(bestAvailableTier(system, "reactor")).toBe(1);
  });

  test("skips tiers with unmet gates", () => {
    const system = makeSystem({
      completedResearch: {
        mining_types_t4: true,
      },
    });
    expect(bestAvailableTier(system, "miner")).toBe(2);
  });
});

describe("canSafelyAfford", () => {
  test("returns true when materials exceed cost plus margin", () => {
    const system = makeSystem({ resources: { materials: 200, energy: 0, computingPower: 0 } });
    expect(canSafelyAfford(system, { materials: 50, energy: 10 }, 100)).toBe(true);
  });

  test("returns false when materials are below cost plus margin", () => {
    const system = makeSystem({ resources: { materials: 100, energy: 0, computingPower: 0 } });
    expect(canSafelyAfford(system, { materials: 50, energy: 10 }, 100)).toBe(false);
  });

  test("returns true when materials exactly equal cost plus margin", () => {
    const system = makeSystem({ resources: { materials: 150, energy: 0, computingPower: 0 } });
    expect(canSafelyAfford(system, { materials: 50, energy: 10 }, 100)).toBe(true);
  });

  test("zero margin means only cost matters", () => {
    const system = makeSystem({ resources: { materials: 50, energy: 0, computingPower: 0 } });
    expect(canSafelyAfford(system, { materials: 50, energy: 10 }, 0)).toBe(true);
  });
});

describe("isComputeBottleneck", () => {
  test("detects bottleneck when efficiency is below 0.95", () => {
    const system = makeSystem({
      resourceRates: {
        materialsSupply: 0, materialsDemand: 0, materialsPerSecond: 0,
        energySupply: 0, energyDemand: 0, energyNet: 0,
        computingPowerPerSecond: 0,
        computeSupply: 5, computeDemand: 10, computeNet: -5, computeEfficiency: 0.5,
      },
    });
    expect(isComputeBottleneck(system)).toBe(true);
  });

  test("no bottleneck when efficiency is at 1.0", () => {
    const system = makeSystem({
      resourceRates: {
        materialsSupply: 0, materialsDemand: 0, materialsPerSecond: 0,
        energySupply: 0, energyDemand: 0, energyNet: 0,
        computingPowerPerSecond: 10,
        computeSupply: 10, computeDemand: 5, computeNet: 5, computeEfficiency: 1.0,
      },
    });
    expect(isComputeBottleneck(system)).toBe(false);
  });

  test("no bottleneck at exactly 0.95", () => {
    const system = makeSystem({
      resourceRates: {
        materialsSupply: 0, materialsDemand: 0, materialsPerSecond: 0,
        energySupply: 0, energyDemand: 0, energyNet: 0,
        computingPowerPerSecond: 0,
        computeSupply: 0, computeDemand: 0, computeNet: 0, computeEfficiency: 0.95,
      },
    });
    expect(isComputeBottleneck(system)).toBe(false);
  });
});

describe("isEnergyBottleneck", () => {
  test("detects bottleneck when energy net is negative", () => {
    const system = makeSystem({
      resourceRates: {
        materialsSupply: 0, materialsDemand: 0, materialsPerSecond: 0,
        energySupply: 5, energyDemand: 10, energyNet: -5,
        computingPowerPerSecond: 0,
        computeSupply: 0, computeDemand: 0, computeNet: 0, computeEfficiency: 1,
      },
    });
    expect(isEnergyBottleneck(system)).toBe(true);
  });

  test("no bottleneck when energy net is zero", () => {
    const system = makeSystem({
      resourceRates: {
        materialsSupply: 0, materialsDemand: 0, materialsPerSecond: 0,
        energySupply: 10, energyDemand: 10, energyNet: 0,
        computingPowerPerSecond: 0,
        computeSupply: 0, computeDemand: 0, computeNet: 0, computeEfficiency: 1,
      },
    });
    expect(isEnergyBottleneck(system)).toBe(false);
  });

  test("no bottleneck when energy net is positive", () => {
    const system = makeSystem({
      resourceRates: {
        materialsSupply: 0, materialsDemand: 0, materialsPerSecond: 0,
        energySupply: 20, energyDemand: 10, energyNet: 10,
        computingPowerPerSecond: 0,
        computeSupply: 0, computeDemand: 0, computeNet: 0, computeEfficiency: 1,
      },
    });
    expect(isEnergyBottleneck(system)).toBe(false);
  });
});

describe("structureCount", () => {
  test("counts miners correctly", () => {
    const system = makeSystem({
      structures: {
        miners: [
          makeStructure({ id: "m1", type: "miner" }),
          makeStructure({ id: "m2", type: "miner" }),
          makeStructure({ id: "m3", type: "miner" }),
        ],
        reactors: [],
        printers: [],
        stations: [],
      },
    });
    expect(structureCount(system, "miner")).toBe(3);
  });

  test("returns 0 when no structures of that type exist", () => {
    const system = makeSystem();
    expect(structureCount(system, "reactor")).toBe(0);
  });

  test("counts across different structure types independently", () => {
    const system = makeSystem({
      structures: {
        miners: [makeStructure({ id: "m1", type: "miner" })],
        reactors: [
          makeStructure({ id: "r1", type: "reactor" }),
          makeStructure({ id: "r2", type: "reactor" }),
        ],
        printers: [],
        stations: [makeStructure({ id: "s1", type: "station" })],
      },
    });
    expect(structureCount(system, "miner")).toBe(1);
    expect(structureCount(system, "reactor")).toBe(2);
    expect(structureCount(system, "printer")).toBe(0);
    expect(structureCount(system, "station")).toBe(1);
  });
});

describe("bestAvailableComponent", () => {
  test("returns tier 1 cpu with no research", () => {
    const system = makeSystem();
    expect(bestAvailableComponent(system, "cpu")).toBe("cpu_t1");
  });

  test("returns tier 1 propulsion with no research", () => {
    const system = makeSystem();
    expect(bestAvailableComponent(system, "propulsion")).toBe("prop_t1");
  });

  test("returns tier 1 reactor with no research", () => {
    const system = makeSystem();
    expect(bestAvailableComponent(system, "reactor")).toBe("rct_t1");
  });

  test("cpu tech-gate formula: computing_architecture_t4 unlocks cpu_t2", () => {
    const system = makeSystem({
      completedResearch: { computing_architecture_t4: true },
    });
    expect(bestAvailableComponent(system, "cpu")).toBe("cpu_t2");
  });

  test("propulsion tech-gate formula: probe_propulsion_t4 unlocks prop_t2", () => {
    const system = makeSystem({
      completedResearch: { probe_propulsion_t4: true },
    });
    expect(bestAvailableComponent(system, "propulsion")).toBe("prop_t2");
  });

  test("reactor tech-gate formula: probe_reactors_t4 unlocks rct_t2", () => {
    const system = makeSystem({
      completedResearch: { probe_reactors_t4: true },
    });
    expect(bestAvailableComponent(system, "reactor")).toBe("rct_t2");
  });

  test("multiple tiers unlocked returns highest available", () => {
    const system = makeSystem({
      completedResearch: {
        computing_architecture_t4: true,
        computing_architecture_t8: true,
        computing_architecture_t12: true,
      },
    });
    expect(bestAvailableComponent(system, "cpu")).toBe("cpu_t4");
  });
});
