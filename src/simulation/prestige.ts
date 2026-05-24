import type { GameState } from "./state";
import { createInitialState } from "./state";
import { STRUCTURES, structureKey } from "./data/structures";

export type PrestigeUpgradeId =
  | "mining_mastery"
  | "fusion_mastery"
  | "nano_assembly"
  | "quantum_insight"
  | "material_reserves"
  | "swift_start";

export interface PrestigeUpgrade {
  id: PrestigeUpgradeId;
  name: string;
  maxLevel: number;
  costs: readonly number[];
  effects: readonly number[];
}

export interface PrestigeState {
  totalPrestigePoints: number;
  availablePrestigePoints: number;
  upgrades: Record<PrestigeUpgradeId, number>;
  timesPrestiged: number;
  blackHoleDiscovered: boolean;
}

export const PRESTIGE_UPGRADES: Record<PrestigeUpgradeId, PrestigeUpgrade> = {
  mining_mastery: {
    id: "mining_mastery",
    name: "Mining Mastery",
    maxLevel: 5,
    costs: [100, 500, 2500, 12500, 62500],
    effects: [2, 4, 8, 16, 32],
  },
  fusion_mastery: {
    id: "fusion_mastery",
    name: "Fusion Mastery",
    maxLevel: 5,
    costs: [100, 500, 2500, 12500, 62500],
    effects: [2, 4, 8, 16, 32],
  },
  nano_assembly: {
    id: "nano_assembly",
    name: "Nano-Assembly",
    maxLevel: 5,
    costs: [150, 750, 3750, 18750, 93750],
    effects: [1.5, 2.5, 4, 7, 12],
  },
  quantum_insight: {
    id: "quantum_insight",
    name: "Quantum Insight",
    maxLevel: 5,
    costs: [150, 750, 3750, 18750, 93750],
    effects: [1.5, 2.5, 4, 7, 12],
  },
  material_reserves: {
    id: "material_reserves",
    name: "Material Reserves",
    maxLevel: 5,
    costs: [50, 250, 1250, 6250, 31250],
    effects: [50, 200, 800, 3200, 12800],
  },
  swift_start: {
    id: "swift_start",
    name: "Swift Start",
    maxLevel: 5,
    costs: [75, 375, 1875, 9375, 46875],
    effects: [1.5, 2.5, 4, 7, 12],
  },
};

export function createPrestigeState(): PrestigeState {
  return {
    totalPrestigePoints: 0,
    availablePrestigePoints: 0,
    upgrades: {
      mining_mastery: 0,
      fusion_mastery: 0,
      nano_assembly: 0,
      quantum_insight: 0,
      material_reserves: 0,
      swift_start: 0,
    },
    timesPrestiged: 0,
    blackHoleDiscovered: false,
  };
}

export interface PrestigeMultipliers {
  miningMultiplier: number;
  energyMultiplier: number;
  printSpeedMultiplier: number;
  researchSpeedMultiplier: number;
  startingMaterials: number;
  gameSpeedMultiplier: number;
}

export function getPrestigeMultipliers(prestige: PrestigeState): PrestigeMultipliers {
  const getEffect = (id: PrestigeUpgradeId): number => {
    const level = prestige.upgrades[id];
    if (level === 0) return id === "material_reserves" ? 0 : 1;
    const upgrade = PRESTIGE_UPGRADES[id];
    return upgrade.effects[level - 1] ?? (id === "material_reserves" ? 0 : 1);
  };

  return {
    miningMultiplier: getEffect("mining_mastery"),
    energyMultiplier: getEffect("fusion_mastery"),
    printSpeedMultiplier: getEffect("nano_assembly"),
    researchSpeedMultiplier: getEffect("quantum_insight"),
    startingMaterials: getEffect("material_reserves"),
    gameSpeedMultiplier: getEffect("swift_start"),
  };
}

export function calculatePrestigePoints(state: GameState): number {
  let points = 0;
  for (const system of Object.values(state.systems)) {
    points += Math.floor(system.resources.materials);
    for (const arrayKey of ["miners", "reactors", "printers", "stations"] as const) {
      for (const structure of system.structures[arrayKey]) {
        if (structure.constructionProgress >= 1) {
          const key = structureKey(structure.type, structure.tier);
          const def = STRUCTURES[key];
          if (def) {
            points += def.cost.materials;
          }
        }
      }
    }
  }
  return points;
}

export function purchaseUpgrade(
  prestige: PrestigeState,
  upgradeId: PrestigeUpgradeId,
): PrestigeState | null {
  const upgrade = PRESTIGE_UPGRADES[upgradeId];
  const currentLevel = prestige.upgrades[upgradeId];
  if (currentLevel >= upgrade.maxLevel) return null;

  const cost = upgrade.costs[currentLevel];
  if (cost === undefined) return null;
  if (prestige.availablePrestigePoints < cost) return null;

  return {
    ...prestige,
    availablePrestigePoints: prestige.availablePrestigePoints - cost,
    upgrades: {
      ...prestige.upgrades,
      [upgradeId]: currentLevel + 1,
    },
  };
}

export function performPrestige(
  currentState: GameState,
  seed: number,
  probeName: string,
): GameState {
  const pointsEarned = calculatePrestigePoints(currentState);
  const updatedPrestige: PrestigeState = {
    ...currentState.prestige,
    totalPrestigePoints: currentState.prestige.totalPrestigePoints + pointsEarned,
    availablePrestigePoints: currentState.prestige.availablePrestigePoints + pointsEarned,
    timesPrestiged: currentState.prestige.timesPrestiged + 1,
    blackHoleDiscovered: false,
  };

  const newState = createInitialState(seed, probeName);
  const prestigeMultipliers = getPrestigeMultipliers(updatedPrestige);

  const solSystem = newState.systems["sol"];
  if (solSystem) {
    return {
      ...newState,
      prestige: updatedPrestige,
      systems: {
        ...newState.systems,
        sol: {
          ...solSystem,
          resources: {
            ...solSystem.resources,
            materials: solSystem.resources.materials + prestigeMultipliers.startingMaterials,
          },
        },
      },
    };
  }

  return { ...newState, prestige: updatedPrestige };
}
