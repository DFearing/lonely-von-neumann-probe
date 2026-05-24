import { describe, it, expect } from "bun:test";
import { createInitialState } from "../src/simulation/state";
import type { GameState, SystemState } from "../src/simulation/state";
import { tick } from "../src/simulation/tick";
import {
  calculatePrestigePoints,
  purchaseUpgrade,
  performPrestige,
  getPrestigeMultipliers,
  createPrestigeState,
  PRESTIGE_UPGRADES,
} from "../src/simulation/prestige";
import type { PrestigeState } from "../src/simulation/prestige";
import { calculateRates } from "../src/simulation/rates";
import { tickResearch } from "../src/simulation/systems/research";
import { tickConstruction } from "../src/simulation/systems/construction";
import { tickNavigation } from "../src/simulation/systems/navigation";
import { STRUCTURES, structureKey } from "../src/simulation/data/structures";
import { createRngFromState } from "../src/simulation/rng";
import type { PlayerAction } from "../src/simulation/actions";

const SEED = 42;
const DT = 1;

function stateWithResources(
  materials: number,
  energy: number,
  systemId = "sol",
): GameState {
  const state = createInitialState(SEED);
  const system = state.systems[systemId]!;
  return {
    ...state,
    systems: {
      ...state.systems,
      [systemId]: {
        ...system,
        resources: { ...system.resources, materials, energy },
      },
    },
  };
}

function makePrestige(overrides?: Partial<PrestigeState>): PrestigeState {
  return {
    ...createPrestigeState(),
    ...overrides,
  };
}

describe("prestige", () => {
  describe("calculatePrestigePoints", () => {
    it("returns floor of materials in each system", () => {
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;
      const stateWithMaterials: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: {
            ...sol,
            resources: { ...sol.resources, materials: 150.9 },
          },
        },
      };

      const points = calculatePrestigePoints(stateWithMaterials);
      const otherSystemMaterials = 5 * 4;
      expect(points).toBe(150 + otherSystemMaterials);
    });

    it("includes material cost of completed structures", () => {
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;
      const minerDef = STRUCTURES[structureKey("miner", 1)]!;

      const stateWithStructures: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: {
            ...sol,
            resources: { ...sol.resources, materials: 0 },
            structures: {
              ...sol.structures,
              miners: [
                {
                  id: "m1",
                  type: "miner",
                  tier: 1,
                  productionRate: minerDef.productionRate,
                  operatingCost: minerDef.operatingCost,
                  maintenanceCost: minerDef.maintenanceCost,
                  computeDemand: minerDef.computeDemand,
                  active: true,
                  constructionProgress: 1,
                  health: 1,
                },
              ],
            },
          },
        },
      };

      const points = calculatePrestigePoints(stateWithStructures);
      const otherSystemMaterials = 5 * 4;
      expect(points).toBe(minerDef.cost.materials + otherSystemMaterials);
    });

    it("sums across multiple systems", () => {
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;
      const ac = state.systems["alpha_centauri"]!;

      const stateMultiSystem: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: {
            ...sol,
            resources: { ...sol.resources, materials: 100 },
          },
          alpha_centauri: {
            ...ac,
            resources: { ...ac.resources, materials: 50 },
          },
        },
      };

      const points = calculatePrestigePoints(stateMultiSystem);
      const otherSystemMaterials = 5 * 3;
      expect(points).toBe(100 + 50 + otherSystemMaterials);
    });

    it("ignores in-progress structures", () => {
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;
      const minerDef = STRUCTURES[structureKey("miner", 1)]!;

      const stateWithIncomplete: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: {
            ...sol,
            resources: { ...sol.resources, materials: 10 },
            structures: {
              ...sol.structures,
              miners: [
                {
                  id: "m1",
                  type: "miner",
                  tier: 1,
                  productionRate: minerDef.productionRate,
                  operatingCost: minerDef.operatingCost,
                  maintenanceCost: minerDef.maintenanceCost,
                  computeDemand: minerDef.computeDemand,
                  active: true,
                  constructionProgress: 0.5,
                  health: 1,
                },
              ],
            },
          },
        },
      };

      const points = calculatePrestigePoints(stateWithIncomplete);
      const otherSystemMaterials = 5 * 4;
      expect(points).toBe(10 + otherSystemMaterials);
    });
  });

  describe("purchaseUpgrade", () => {
    it("deducts points and increments level on success", () => {
      const prestige = makePrestige({ availablePrestigePoints: 500 });
      const result = purchaseUpgrade(prestige, "mining_mastery");

      expect(result).not.toBeNull();
      expect(result!.availablePrestigePoints).toBe(500 - PRESTIGE_UPGRADES.mining_mastery.costs[0]!);
      expect(result!.upgrades.mining_mastery).toBe(1);
    });

    it("returns null when insufficient points", () => {
      const prestige = makePrestige({ availablePrestigePoints: 10 });
      const result = purchaseUpgrade(prestige, "mining_mastery");

      expect(result).toBeNull();
    });

    it("returns null when already at max level", () => {
      const prestige = makePrestige({
        availablePrestigePoints: 999999,
        upgrades: {
          ...createPrestigeState().upgrades,
          mining_mastery: PRESTIGE_UPGRADES.mining_mastery.maxLevel,
        },
      });
      const result = purchaseUpgrade(prestige, "mining_mastery");

      expect(result).toBeNull();
    });

    it("uses cost for the current level", () => {
      const prestige = makePrestige({
        availablePrestigePoints: 10000,
        upgrades: {
          ...createPrestigeState().upgrades,
          mining_mastery: 1,
        },
      });
      const result = purchaseUpgrade(prestige, "mining_mastery");

      expect(result).not.toBeNull();
      const expectedCost = PRESTIGE_UPGRADES.mining_mastery.costs[1]!;
      expect(result!.availablePrestigePoints).toBe(10000 - expectedCost);
      expect(result!.upgrades.mining_mastery).toBe(2);
    });
  });

  describe("getPrestigeMultipliers", () => {
    it("returns 1x for all multipliers at level 0 (except material_reserves = 0)", () => {
      const prestige = createPrestigeState();
      const mult = getPrestigeMultipliers(prestige);

      expect(mult.miningMultiplier).toBe(1);
      expect(mult.energyMultiplier).toBe(1);
      expect(mult.printSpeedMultiplier).toBe(1);
      expect(mult.researchSpeedMultiplier).toBe(1);
      expect(mult.startingMaterials).toBe(0);
      expect(mult.gameSpeedMultiplier).toBe(1);
    });

    it("returns correct effect for level 1 mining_mastery", () => {
      const prestige = makePrestige({
        upgrades: { ...createPrestigeState().upgrades, mining_mastery: 1 },
      });
      const mult = getPrestigeMultipliers(prestige);

      expect(mult.miningMultiplier).toBe(PRESTIGE_UPGRADES.mining_mastery.effects[0]!);
    });

    it("returns correct effect for higher levels", () => {
      const prestige = makePrestige({
        upgrades: { ...createPrestigeState().upgrades, fusion_mastery: 3 },
      });
      const mult = getPrestigeMultipliers(prestige);

      expect(mult.energyMultiplier).toBe(PRESTIGE_UPGRADES.fusion_mastery.effects[2]!);
    });

    it("material_reserves returns starting material amount at level 1", () => {
      const prestige = makePrestige({
        upgrades: { ...createPrestigeState().upgrades, material_reserves: 1 },
      });
      const mult = getPrestigeMultipliers(prestige);

      expect(mult.startingMaterials).toBe(PRESTIGE_UPGRADES.material_reserves.effects[0]!);
    });
  });

  describe("performPrestige", () => {
    it("awards points calculated from current state", () => {
      const state = stateWithResources(200, 100);
      const pointsBefore = calculatePrestigePoints(state);
      const newState = performPrestige(state, SEED + 1, "Probe");

      expect(newState.prestige.totalPrestigePoints).toBe(
        state.prestige.totalPrestigePoints + pointsBefore,
      );
      expect(newState.prestige.availablePrestigePoints).toBe(
        state.prestige.availablePrestigePoints + pointsBefore,
      );
    });

    it("resets game state to a fresh initial state", () => {
      const state = stateWithResources(9999, 9999);
      const newState = performPrestige(state, SEED + 1, "NewProbe");

      expect(newState.tickCount).toBe(0);
      expect(newState.elapsedSeconds).toBe(0);
      expect(newState.systems["sol"]!.constructionQueue).toHaveLength(0);
      expect(newState.systems["sol"]!.researchQueue).toHaveLength(0);
    });

    it("preserves prestige upgrades through reset", () => {
      const state = createInitialState(SEED);
      const stateWithUpgrade: GameState = {
        ...state,
        prestige: makePrestige({
          availablePrestigePoints: 500,
          upgrades: { ...createPrestigeState().upgrades, mining_mastery: 2 },
        }),
      };
      const newState = performPrestige(stateWithUpgrade, SEED + 1, "Probe");

      expect(newState.prestige.upgrades.mining_mastery).toBe(2);
    });

    it("applies starting materials from material_reserves upgrade", () => {
      const state = createInitialState(SEED);
      const stateWithReserves: GameState = {
        ...state,
        prestige: makePrestige({
          upgrades: { ...createPrestigeState().upgrades, material_reserves: 1 },
        }),
      };
      const newState = performPrestige(stateWithReserves, SEED + 1, "Probe");
      const baseMaterials = createInitialState(SEED + 1).systems["sol"]!.resources.materials;
      const expectedBonus = PRESTIGE_UPGRADES.material_reserves.effects[0]!;

      expect(newState.systems["sol"]!.resources.materials).toBe(
        baseMaterials + expectedBonus,
      );
    });

    it("increments timesPrestiged", () => {
      const state = createInitialState(SEED);
      expect(state.prestige.timesPrestiged).toBe(0);

      const newState = performPrestige(state, SEED + 1, "Probe");
      expect(newState.prestige.timesPrestiged).toBe(1);
    });

    it("resets blackHoleDiscovered to false", () => {
      const state = createInitialState(SEED);
      const stateWithBH: GameState = {
        ...state,
        prestige: makePrestige({ blackHoleDiscovered: true }),
      };
      const newState = performPrestige(stateWithBH, SEED + 1, "Probe");

      expect(newState.prestige.blackHoleDiscovered).toBe(false);
    });
  });

  describe("prestige multipliers in calculateRates", () => {
    it("mining multiplier increases materials supply", () => {
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;
      const solGathering: SystemState = {
        ...sol,
        mainProbe: sol.mainProbe ? { ...sol.mainProbe, mode: "gathering" } : null,
      };

      const baseRates = calculateRates(solGathering);
      const prestigeWithMining = makePrestige({
        upgrades: { ...createPrestigeState().upgrades, mining_mastery: 1 },
      });
      const boostedRates = calculateRates(solGathering, prestigeWithMining);

      expect(boostedRates.materialsSupply).toBeGreaterThan(baseRates.materialsSupply);
      expect(boostedRates.materialsSupply).toBeCloseTo(
        baseRates.materialsSupply * PRESTIGE_UPGRADES.mining_mastery.effects[0]!,
      );
    });

    it("energy multiplier increases energy supply", () => {
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;

      const baseRates = calculateRates(sol);
      const prestigeWithEnergy = makePrestige({
        upgrades: { ...createPrestigeState().upgrades, fusion_mastery: 1 },
      });
      const boostedRates = calculateRates(sol, prestigeWithEnergy);

      expect(boostedRates.energySupply).toBeGreaterThan(baseRates.energySupply);
      expect(boostedRates.energySupply).toBeCloseTo(
        baseRates.energySupply * PRESTIGE_UPGRADES.fusion_mastery.effects[0]!,
      );
    });
  });

  describe("research speed with quantum_insight", () => {
    it("quantum_insight multiplier speeds up research progress", () => {
      const state = stateWithResources(500, 500);
      const sol = state.systems["sol"]!;

      const stateWithResearch: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: {
            ...sol,
            mainProbe: sol.mainProbe
              ? { ...sol.mainProbe, mode: "gathering" }
              : null,
            researchQueue: [
              {
                id: "r1",
                techId: "mining_efficiency_t1",
                branchId: "mining_efficiency",
                tier: 1,
                name: "Efficient Extraction",
                continuousCost: 3,
                progress: 0,
                completed: false,
                paused: false,
              },
            ],
            resourceRates: {
              ...sol.resourceRates,
              computingPowerPerSecond: 10,
            },
          },
        },
      };

      const baseResult = tickResearch(stateWithResearch, DT);
      const baseProgress =
        baseResult.systems["sol"]!.researchQueue[0]?.progress ?? 0;

      const stateWithPrestige: GameState = {
        ...stateWithResearch,
        prestige: makePrestige({
          upgrades: { ...createPrestigeState().upgrades, quantum_insight: 1 },
        }),
      };
      const boostedResult = tickResearch(stateWithPrestige, DT);
      const boostedProgress =
        boostedResult.systems["sol"]!.researchQueue[0]?.progress ?? 0;

      expect(boostedProgress).toBeGreaterThan(baseProgress);
      expect(boostedProgress).toBeCloseTo(
        baseProgress * PRESTIGE_UPGRADES.quantum_insight.effects[0]!,
      );
    });
  });

  describe("construction speed with nano_assembly", () => {
    it("nano_assembly multiplier speeds up printing", () => {
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;
      const minerDef = STRUCTURES[structureKey("miner", 1)]!;

      const stateWithProject: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: {
            ...sol,
            resources: { ...sol.resources, materials: 1000, energy: 1000 },
            mainProbe: sol.mainProbe
              ? { ...sol.mainProbe, mode: "printing" }
              : null,
            constructionQueue: [
              {
                id: "proj_1",
                targetType: "miner",
                targetTier: 1,
                targetConfig: null,
                totalCost: { ...minerDef.cost },
                remainingCost: { ...minerDef.cost },
                progress: 0,
                assignedPrinterIds: [],
              },
            ],
          },
        },
      };

      const baseResult = tickConstruction(stateWithProject, DT);
      const baseProgress =
        baseResult.systems["sol"]!.constructionQueue[0]?.progress ?? 1;

      const stateWithPrestige: GameState = {
        ...stateWithProject,
        prestige: makePrestige({
          upgrades: { ...createPrestigeState().upgrades, nano_assembly: 1 },
        }),
      };
      const boostedResult = tickConstruction(stateWithPrestige, DT);
      const boostedProgress =
        boostedResult.systems["sol"]!.constructionQueue[0]?.progress ?? 1;

      expect(boostedProgress).toBeGreaterThan(baseProgress);
      expect(boostedProgress).toBeCloseTo(
        baseProgress * PRESTIGE_UPGRADES.nano_assembly.effects[0]!,
      );
    });
  });

  describe("Cygnus X-1 discovery", () => {
    it("completing computing_architecture_t4 adds cygnus_x1 to discoveredSystems", () => {
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;

      const stateWithResearch: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: {
            ...sol,
            resourceRates: {
              ...sol.resourceRates,
              computingPowerPerSecond: 100,
            },
            researchQueue: [
              {
                id: "r_arch_4",
                techId: "computing_architecture_t4",
                branchId: "computing_architecture",
                tier: 4,
                name: "Parallel Processing",
                continuousCost: 3,
                progress: 0.999,
                completed: false,
                paused: false,
              },
            ],
          },
        },
      };

      const result = tickResearch(stateWithResearch, DT);
      const solAfter = result.systems["sol"]!;

      expect(solAfter.discoveredSystems).toContain("cygnus_x1");
      expect(solAfter.completedResearch["computing_architecture_t4"]).toBe(true);
    });
  });

  describe("navigation black hole", () => {
    it("probe arriving at cygnus_x1 sets prestige.blackHoleDiscovered", () => {
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;

      const stateWithProbeInTransit: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: {
            ...sol,
            sentProbes: [
              {
                id: "probe_bh_1",
                name: "Probe-BH",
                components: { cpu: "cpu_t1", propulsion: "prop_t1", reactor: "rct_t1" },
                originSystemId: "sol",
                destinationSystemId: "cygnus_x1",
                travelTimeSeconds: 100,
                elapsedSeconds: 99.5,
              },
            ],
          },
        },
      };

      const rng = createRngFromState(stateWithProbeInTransit.rngState);
      const result = tickNavigation(stateWithProbeInTransit, DT, rng);

      expect(result.prestige.blackHoleDiscovered).toBe(true);
    });

    it("does not set blackHoleDiscovered when probe has not arrived", () => {
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;

      const stateWithProbeInTransit: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: {
            ...sol,
            sentProbes: [
              {
                id: "probe_bh_2",
                name: "Probe-BH",
                components: { cpu: "cpu_t1", propulsion: "prop_t1", reactor: "rct_t1" },
                originSystemId: "sol",
                destinationSystemId: "cygnus_x1",
                travelTimeSeconds: 100,
                elapsedSeconds: 50,
              },
            ],
          },
        },
      };

      const rng = createRngFromState(stateWithProbeInTransit.rngState);
      const result = tickNavigation(stateWithProbeInTransit, DT, rng);

      expect(result.prestige.blackHoleDiscovered).toBe(false);
    });
  });

  describe("prestige actions via tick", () => {
    it("purchase_prestige_upgrade works via tick", () => {
      const state = createInitialState(SEED);
      const stateWithPoints: GameState = {
        ...state,
        prestige: makePrestige({ availablePrestigePoints: 500 }),
      };

      const action: PlayerAction = {
        type: "purchase_prestige_upgrade",
        upgradeId: "mining_mastery",
      };
      const result = tick(stateWithPoints, DT, [action]);

      expect(result.prestige.upgrades.mining_mastery).toBe(1);
      expect(result.prestige.availablePrestigePoints).toBe(
        500 - PRESTIGE_UPGRADES.mining_mastery.costs[0]!,
      );
    });

    it("purchase_prestige_upgrade fails silently with insufficient points", () => {
      const state = createInitialState(SEED);
      const stateWithNoPoints: GameState = {
        ...state,
        prestige: makePrestige({ availablePrestigePoints: 0 }),
      };

      const action: PlayerAction = {
        type: "purchase_prestige_upgrade",
        upgradeId: "mining_mastery",
      };
      const result = tick(stateWithNoPoints, DT, [action]);

      expect(result.prestige.upgrades.mining_mastery).toBe(0);
    });

    it("enter_black_hole sets prestigeTriggered when blackHoleDiscovered", () => {
      const state = createInitialState(SEED);
      const stateWithBH: GameState = {
        ...state,
        prestige: makePrestige({ blackHoleDiscovered: true }),
      };

      const action: PlayerAction = { type: "enter_black_hole" };
      const result = tick(stateWithBH, DT, [action]);

      expect(result.prestigeTriggered).toBe(true);
    });

    it("enter_black_hole does nothing when blackHoleDiscovered is false", () => {
      const state = createInitialState(SEED);

      const action: PlayerAction = { type: "enter_black_hole" };
      const result = tick(state, DT, [action]);

      expect(result.prestigeTriggered).toBe(false);
    });
  });
});
