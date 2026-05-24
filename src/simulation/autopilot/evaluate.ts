import type { GameState, SystemState, StructureType } from "../state";
import { STRUCTURES, structureKey } from "../data/structures";
import { techsInBranch } from "../data/tech-tree";
import { getTechStatus } from "../queries";
import { getTechMultipliers } from "../tech-effects";

export function bestAvailableTier(system: SystemState, structureType: StructureType): number {
  let best = 0;
  for (let tier = 1; tier <= 6; tier++) {
    const def = STRUCTURES[structureKey(structureType, tier)];
    if (!def) break;
    if (!def.techGate || system.completedResearch[def.techGate]) best = tier;
  }
  return best;
}

export function canSafelyAfford(
  system: SystemState,
  cost: { materials: number; energy: number },
  materialMargin: number,
): boolean {
  return system.resources.materials >= cost.materials + materialMargin;
}

export function nextResearchableInBranch(system: SystemState, branchId: string): string | null {
  const techs = techsInBranch(branchId);
  for (const tech of techs) {
    const status = getTechStatus(system, tech.id);
    if (status === "available") return tech.id;
    if (status === "locked" || status === "in_progress") continue;
  }
  return null;
}

export function isComputeBottleneck(system: SystemState): boolean {
  return system.resourceRates.computeEfficiency < 0.95;
}

export function isEnergyBottleneck(system: SystemState): boolean {
  return system.resourceRates.energyNet < 0;
}

export function structureCount(system: SystemState, type: StructureType): number {
  return system.structures[`${type}s` as keyof typeof system.structures].length;
}

export function hasActiveConstruction(system: SystemState): boolean {
  return system.constructionQueue.length > 0;
}

export function canStartMoreResearch(system: SystemState): boolean {
  const multipliers = getTechMultipliers(system.completedResearch);
  const activeCount = system.researchQueue.filter((p) => !p.completed && !p.paused).length;
  return activeCount < multipliers.maxConcurrentResearch;
}

export function getUncolonizedSystems(state: GameState, fromSystemId: string): string[] {
  const fromSystem = state.systems[fromSystemId];
  if (!fromSystem) return [];
  return fromSystem.discoveredSystems.filter((id) => {
    const sys = state.systems[id];
    return sys && sys.mainProbe === null;
  });
}

export function bestAvailableComponent(
  system: SystemState,
  type: "cpu" | "propulsion" | "reactor",
): string {
  const prefix = type === "cpu" ? "cpu_t" : type === "propulsion" ? "prop_t" : "rct_t";
  const gatePrefix = type === "cpu" ? "computing_architecture" : type === "propulsion" ? "probe_propulsion" : "probe_reactors";
  let best = 1;
  for (let tier = 2; tier <= 6; tier++) {
    const gate = `${gatePrefix}_t${(tier - 1) * 4}`;
    if (system.completedResearch[gate]) best = tier;
  }
  return `${prefix}${best}`;
}
