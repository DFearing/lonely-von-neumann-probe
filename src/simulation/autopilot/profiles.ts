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

type Priority =
  | { kind: "build_printer"; margin: number }
  | { kind: "fix_compute"; margin: number }
  | { kind: "fix_energy"; margin: number }
  | { kind: "build_miner"; margin: number; requirePositiveRate: boolean }
  | { kind: "research"; branches: string[] }
  | { kind: "launch_probe" }
  | { kind: "build_probe"; materialThreshold: number; breaksLoop: boolean };

interface ProfileConfig {
  readonly name: string;
  readonly id: string;
  readonly evaluateEvery: number;
  readonly priorities: readonly Priority[];
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

function tryPriority(
  priority: Priority,
  state: GameState,
  systemId: string,
  system: SystemState,
): { action: PlayerAction; breaksLoop: boolean } | null {
  switch (priority.kind) {
    case "build_printer": {
      if (structureCount(system, "printer") === 0) {
        const def = STRUCTURES[structureKey("printer", 1)];
        if (def && canSafelyAfford(system, def.cost, priority.margin)) {
          return {
            action: { type: "build_structure", systemId, structureType: "printer", tier: 1 },
            breaksLoop: true,
          };
        }
      }
      return null;
    }
    case "fix_compute": {
      if (isComputeBottleneck(system)) {
        const tier = bestAvailableTier(system, "station");
        if (tier > 0) {
          const def = STRUCTURES[structureKey("station", tier)];
          if (def && canSafelyAfford(system, def.cost, priority.margin)) {
            return {
              action: { type: "build_structure", systemId, structureType: "station", tier },
              breaksLoop: true,
            };
          }
        }
      }
      return null;
    }
    case "fix_energy": {
      if (isEnergyBottleneck(system)) {
        const tier = bestAvailableTier(system, "reactor");
        const def = STRUCTURES[structureKey("reactor", tier)];
        if (def && canSafelyAfford(system, def.cost, priority.margin)) {
          return {
            action: { type: "build_structure", systemId, structureType: "reactor", tier },
            breaksLoop: true,
          };
        }
      }
      return null;
    }
    case "build_miner": {
      if (priority.requirePositiveRate && system.resourceRates.materialsPerSecond <= 0) {
        return null;
      }
      const tier = bestAvailableTier(system, "miner");
      const def = STRUCTURES[structureKey("miner", tier)];
      if (def && canSafelyAfford(system, def.cost, priority.margin)) {
        return {
          action: { type: "build_structure", systemId, structureType: "miner", tier },
          breaksLoop: true,
        };
      }
      return null;
    }
    case "research": {
      const research = tryResearch(systemId, system, priority.branches);
      if (research) return { action: research, breaksLoop: false };
      return null;
    }
    case "launch_probe": {
      const targets = getUncolonizedSystems(state, systemId);
      if (system.availableProbes.length > 0 && targets.length > 0) {
        const probe = system.availableProbes[0]!;
        return {
          action: { type: "launch_probe", systemId, probeId: probe.id, targetSystemId: targets[0]! },
          breaksLoop: false,
        };
      }
      return null;
    }
    case "build_probe": {
      const targets = getUncolonizedSystems(state, systemId);
      if (system.resources.materials > priority.materialThreshold && targets.length > 0) {
        return {
          action: {
            type: "build_probe", systemId,
            cpu: bestAvailableComponent(system, "cpu"),
            propulsion: bestAvailableComponent(system, "propulsion"),
            reactor: bestAvailableComponent(system, "reactor"),
          },
          breaksLoop: priority.breaksLoop,
        };
      }
      return null;
    }
  }
}

function executeProfile(config: ProfileConfig, state: GameState): PlayerAction[] {
  const actions: PlayerAction[] = [];

  for (const [systemId, system] of Object.entries(state.systems)) {
    if (!system.mainProbe) continue;

    const boot = bootstrapActions(systemId, system);
    actions.push(...boot);
    if (hasActiveConstruction(system)) continue;

    let broke = false;
    for (const priority of config.priorities) {
      const result = tryPriority(priority, state, systemId, system);
      if (result) {
        actions.push(result.action);
        if (result.breaksLoop) {
          broke = true;
          break;
        }
      }
    }
    if (broke) continue;
  }

  return actions;
}

const BALANCED_CONFIG: ProfileConfig = {
  name: "Balanced",
  id: "balanced",
  evaluateEvery: 20,
  priorities: [
    { kind: "build_printer", margin: 20 },
    { kind: "fix_compute", margin: 30 },
    { kind: "fix_energy", margin: 20 },
    { kind: "build_miner", margin: 50, requirePositiveRate: true },
    { kind: "research", branches: [
      "station_types", "mining_efficiency", "energy_production",
      "manufacturing_efficiency", "station_efficiency", "computing_architecture",
      "mining_types", "energy_types", "manufacturing_types",
    ]},
    { kind: "launch_probe" },
    { kind: "build_probe", materialThreshold: 500, breaksLoop: false },
  ],
};

const RESEARCH_RUSH_CONFIG: ProfileConfig = {
  name: "Research Rush",
  id: "research_rush",
  evaluateEvery: 15,
  priorities: [
    { kind: "fix_compute", margin: 20 },
    { kind: "fix_energy", margin: 10 },
    { kind: "research", branches: [
      "station_types", "computing_architecture", "station_efficiency",
      "computing_speed", "mining_efficiency", "energy_production",
      "manufacturing_efficiency",
    ]},
  ],
};

const MINING_HEAVY_CONFIG: ProfileConfig = {
  name: "Mining Heavy",
  id: "mining_heavy",
  evaluateEvery: 25,
  priorities: [
    { kind: "fix_energy", margin: 20 },
    { kind: "fix_compute", margin: 30 },
    { kind: "build_printer", margin: 20 },
    { kind: "build_miner", margin: 30, requirePositiveRate: false },
    { kind: "research", branches: [
      "mining_efficiency", "mining_types", "station_types",
      "energy_production", "energy_types", "manufacturing_efficiency",
    ]},
    { kind: "launch_probe" },
    { kind: "build_probe", materialThreshold: 1000, breaksLoop: false },
  ],
};

const EXPANSION_CONFIG: ProfileConfig = {
  name: "Expansion",
  id: "expansion",
  evaluateEvery: 30,
  priorities: [
    { kind: "build_printer", margin: 20 },
    { kind: "fix_energy", margin: 10 },
    { kind: "fix_compute", margin: 20 },
    { kind: "launch_probe" },
    { kind: "build_probe", materialThreshold: 200, breaksLoop: true },
    { kind: "build_miner", margin: 30, requirePositiveRate: false },
    { kind: "research", branches: [
      "probe_propulsion", "probe_reactors", "station_types",
      "manufacturing_efficiency", "mining_efficiency", "energy_production",
      "communication", "communication_speed",
    ]},
  ],
};

function createProfile(config: ProfileConfig): AutopilotProfile {
  return {
    name: config.name,
    id: config.id,
    evaluateEvery: config.evaluateEvery,
    decide: (state: GameState) => executeProfile(config, state),
  };
}

export const PROFILES: AutopilotProfile[] = [
  createProfile(BALANCED_CONFIG),
  createProfile(RESEARCH_RUSH_CONFIG),
  createProfile(MINING_HEAVY_CONFIG),
  createProfile(EXPANSION_CONFIG),
];

export function getProfileById(id: string): AutopilotProfile | undefined {
  return PROFILES.find((p) => p.id === id);
}
