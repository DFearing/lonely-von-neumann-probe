import type { GameState, SystemState } from "../state";
import type { PlayerAction } from "../actions";
import { STRUCTURES, structureKey } from "../data/structures";
import {
  bestAvailableTier,
  canSafelyAfford,
  nextResearchableInBranch,
  isComputeBottleneck,
  isEnergyBottleneck,
  structureCount,
  hasActiveConstruction,
  canStartMoreResearch,
  getUncolonizedSystems,
  bestAvailableComponent,
} from "./evaluate";

export interface AutopilotProfile {
  readonly name: string;
  readonly id: string;
  readonly evaluateEvery: number;
  decide(state: GameState): PlayerAction[];
}

function bootstrapActions(systemId: string, system: SystemState): PlayerAction[] {
  const actions: PlayerAction[] = [];

  if (system.mainProbe?.mode === "idle" && system.constructionQueue.length === 0) {
    actions.push({ type: "set_probe_mode", systemId, mode: "gathering" });
  }

  if (hasActiveConstruction(system)) return actions;

  if (structureCount(system, "reactor") === 0) {
    const tier = bestAvailableTier(system, "reactor");
    const def = STRUCTURES[structureKey("reactor", tier)];
    if (def && canSafelyAfford(system, def.cost, 10)) {
      actions.push({ type: "build_structure", systemId, structureType: "reactor", tier });
    }
    return actions;
  }

  if (structureCount(system, "miner") === 0) {
    const tier = bestAvailableTier(system, "miner");
    const def = STRUCTURES[structureKey("miner", tier)];
    if (def && canSafelyAfford(system, def.cost, 10)) {
      actions.push({ type: "build_structure", systemId, structureType: "miner", tier });
    }
    return actions;
  }

  return actions;
}

function tryResearch(systemId: string, system: SystemState, branches: string[]): PlayerAction | null {
  if (!canStartMoreResearch(system)) return null;
  for (const branch of branches) {
    const techId = nextResearchableInBranch(system, branch);
    if (techId) return { type: "start_research", systemId, techId };
  }
  return null;
}

const balanced: AutopilotProfile = {
  name: "Balanced",
  id: "balanced",
  evaluateEvery: 20,

  decide(state: GameState): PlayerAction[] {
    const actions: PlayerAction[] = [];

    for (const [systemId, system] of Object.entries(state.systems)) {
      if (!system.mainProbe) continue;
      const rates = system.resourceRates;

      const boot = bootstrapActions(systemId, system);
      actions.push(...boot);
      if (boot.length > 0 && hasActiveConstruction(system)) continue;
      if (hasActiveConstruction(system)) continue;

      if (structureCount(system, "printer") === 0) {
        const def = STRUCTURES[structureKey("printer", 1)];
        if (def && canSafelyAfford(system, def.cost, 20)) {
          actions.push({ type: "build_structure", systemId, structureType: "printer", tier: 1 });
          continue;
        }
      }

      if (isComputeBottleneck(system)) {
        const tier = bestAvailableTier(system, "station");
        if (tier > 0) {
          const def = STRUCTURES[structureKey("station", tier)];
          if (def && canSafelyAfford(system, def.cost, 30)) {
            actions.push({ type: "build_structure", systemId, structureType: "station", tier });
            continue;
          }
        }
      }

      if (isEnergyBottleneck(system)) {
        const tier = bestAvailableTier(system, "reactor");
        const def = STRUCTURES[structureKey("reactor", tier)];
        if (def && canSafelyAfford(system, def.cost, 20)) {
          actions.push({ type: "build_structure", systemId, structureType: "reactor", tier });
          continue;
        }
      }

      if (rates.materialsPerSecond > 0) {
        const tier = bestAvailableTier(system, "miner");
        const def = STRUCTURES[structureKey("miner", tier)];
        if (def && canSafelyAfford(system, def.cost, 50)) {
          actions.push({ type: "build_structure", systemId, structureType: "miner", tier });
          continue;
        }
      }

      const researchBranches = [
        "station_types", "mining_efficiency", "energy_production",
        "manufacturing_efficiency", "station_efficiency", "computing_architecture",
        "mining_types", "energy_types", "manufacturing_types",
      ];
      const research = tryResearch(systemId, system, researchBranches);
      if (research) actions.push(research);

      if (system.resources.materials > 500) {
        const targets = getUncolonizedSystems(state, systemId);
        if (targets.length > 0) {
          actions.push({
            type: "build_probe", systemId,
            cpu: bestAvailableComponent(system, "cpu"),
            propulsion: bestAvailableComponent(system, "propulsion"),
            reactor: bestAvailableComponent(system, "reactor"),
            targetSystemId: targets[0]!,
          });
        }
      }
    }

    return actions;
  },
};

const researchRush: AutopilotProfile = {
  name: "Research Rush",
  id: "research_rush",
  evaluateEvery: 15,

  decide(state: GameState): PlayerAction[] {
    const actions: PlayerAction[] = [];

    for (const [systemId, system] of Object.entries(state.systems)) {
      if (!system.mainProbe) continue;

      const boot = bootstrapActions(systemId, system);
      actions.push(...boot);
      if (hasActiveConstruction(system)) continue;

      if (isComputeBottleneck(system)) {
        const tier = bestAvailableTier(system, "station");
        if (tier > 0) {
          const def = STRUCTURES[structureKey("station", tier)];
          if (def && canSafelyAfford(system, def.cost, 20)) {
            actions.push({ type: "build_structure", systemId, structureType: "station", tier });
            continue;
          }
        }
      }

      if (isEnergyBottleneck(system)) {
        const tier = bestAvailableTier(system, "reactor");
        const def = STRUCTURES[structureKey("reactor", tier)];
        if (def && canSafelyAfford(system, def.cost, 10)) {
          actions.push({ type: "build_structure", systemId, structureType: "reactor", tier });
          continue;
        }
      }

      const researchBranches = [
        "station_types", "computing_architecture", "station_efficiency",
        "computing_speed", "mining_efficiency", "energy_production",
        "manufacturing_efficiency",
      ];
      const research = tryResearch(systemId, system, researchBranches);
      if (research) actions.push(research);
    }

    return actions;
  },
};

const miningHeavy: AutopilotProfile = {
  name: "Mining Heavy",
  id: "mining_heavy",
  evaluateEvery: 25,

  decide(state: GameState): PlayerAction[] {
    const actions: PlayerAction[] = [];

    for (const [systemId, system] of Object.entries(state.systems)) {
      if (!system.mainProbe) continue;

      const boot = bootstrapActions(systemId, system);
      actions.push(...boot);
      if (hasActiveConstruction(system)) continue;

      if (isEnergyBottleneck(system)) {
        const tier = bestAvailableTier(system, "reactor");
        const def = STRUCTURES[structureKey("reactor", tier)];
        if (def && canSafelyAfford(system, def.cost, 20)) {
          actions.push({ type: "build_structure", systemId, structureType: "reactor", tier });
          continue;
        }
      }

      if (isComputeBottleneck(system)) {
        const tier = bestAvailableTier(system, "station");
        if (tier > 0) {
          const def = STRUCTURES[structureKey("station", tier)];
          if (def && canSafelyAfford(system, def.cost, 30)) {
            actions.push({ type: "build_structure", systemId, structureType: "station", tier });
            continue;
          }
        }
      }

      if (structureCount(system, "printer") === 0) {
        const def = STRUCTURES[structureKey("printer", 1)];
        if (def && canSafelyAfford(system, def.cost, 20)) {
          actions.push({ type: "build_structure", systemId, structureType: "printer", tier: 1 });
          continue;
        }
      }

      const minerTier = bestAvailableTier(system, "miner");
      const minerDef = STRUCTURES[structureKey("miner", minerTier)];
      if (minerDef && canSafelyAfford(system, minerDef.cost, 30)) {
        actions.push({ type: "build_structure", systemId, structureType: "miner", tier: minerTier });
        continue;
      }

      const researchBranches = [
        "mining_efficiency", "mining_types", "station_types",
        "energy_production", "energy_types", "manufacturing_efficiency",
      ];
      const research = tryResearch(systemId, system, researchBranches);
      if (research) actions.push(research);

      if (system.resources.materials > 1000) {
        const targets = getUncolonizedSystems(state, systemId);
        if (targets.length > 0) {
          actions.push({
            type: "build_probe", systemId,
            cpu: bestAvailableComponent(system, "cpu"),
            propulsion: bestAvailableComponent(system, "propulsion"),
            reactor: bestAvailableComponent(system, "reactor"),
            targetSystemId: targets[0]!,
          });
        }
      }
    }

    return actions;
  },
};

const expansion: AutopilotProfile = {
  name: "Expansion",
  id: "expansion",
  evaluateEvery: 30,

  decide(state: GameState): PlayerAction[] {
    const actions: PlayerAction[] = [];

    for (const [systemId, system] of Object.entries(state.systems)) {
      if (!system.mainProbe) continue;

      const boot = bootstrapActions(systemId, system);
      actions.push(...boot);
      if (hasActiveConstruction(system)) continue;

      if (structureCount(system, "printer") === 0) {
        const def = STRUCTURES[structureKey("printer", 1)];
        if (def && canSafelyAfford(system, def.cost, 20)) {
          actions.push({ type: "build_structure", systemId, structureType: "printer", tier: 1 });
          continue;
        }
      }

      if (isEnergyBottleneck(system)) {
        const tier = bestAvailableTier(system, "reactor");
        const def = STRUCTURES[structureKey("reactor", tier)];
        if (def && canSafelyAfford(system, def.cost, 10)) {
          actions.push({ type: "build_structure", systemId, structureType: "reactor", tier });
          continue;
        }
      }

      if (isComputeBottleneck(system)) {
        const tier = bestAvailableTier(system, "station");
        if (tier > 0) {
          const def = STRUCTURES[structureKey("station", tier)];
          if (def && canSafelyAfford(system, def.cost, 20)) {
            actions.push({ type: "build_structure", systemId, structureType: "station", tier });
            continue;
          }
        }
      }

      const targets = getUncolonizedSystems(state, systemId);
      if (targets.length > 0 && system.resources.materials > 200) {
        actions.push({
          type: "build_probe", systemId,
          cpu: bestAvailableComponent(system, "cpu"),
          propulsion: bestAvailableComponent(system, "propulsion"),
          reactor: bestAvailableComponent(system, "reactor"),
          targetSystemId: targets[0]!,
        });
        continue;
      }

      const minerTier = bestAvailableTier(system, "miner");
      const minerDef = STRUCTURES[structureKey("miner", minerTier)];
      if (minerDef && canSafelyAfford(system, minerDef.cost, 30)) {
        actions.push({ type: "build_structure", systemId, structureType: "miner", tier: minerTier });
        continue;
      }

      const researchBranches = [
        "probe_propulsion", "probe_reactors", "station_types",
        "manufacturing_efficiency", "mining_efficiency", "energy_production",
        "communication", "communication_speed",
      ];
      const research = tryResearch(systemId, system, researchBranches);
      if (research) actions.push(research);
    }

    return actions;
  },
};

export const PROFILES: AutopilotProfile[] = [balanced, researchRush, miningHeavy, expansion];

export function getProfileById(id: string): AutopilotProfile | undefined {
  return PROFILES.find((p) => p.id === id);
}
