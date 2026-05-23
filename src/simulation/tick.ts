import type {
  ConstructionProject,
  GameState,
  ResearchProject,
  SystemState,
} from "./state";
import type { PlayerAction } from "./actions";
import { createRngFromState } from "./rng";
import { tickResources } from "./systems/resources";
import { tickConstruction } from "./systems/construction";
import { tickResearch } from "./systems/research";
import { tickNavigation } from "./systems/navigation";
import { tickEvents } from "./systems/events";
import { STRUCTURES, structureKey } from "./data/structures";
import { totalProbeCost } from "./data/components";
import { TECH_TREE, techsInBranch } from "./data/tech-tree";

function getSystem(state: GameState, systemId: string): SystemState | undefined {
  return state.systems[systemId];
}

function updateSystem(
  state: GameState,
  systemId: string,
  system: SystemState,
): GameState {
  return {
    ...state,
    systems: { ...state.systems, [systemId]: system },
  };
}

function canAfford(
  system: SystemState,
  cost: { materials: number; energy: number },
): boolean {
  return (
    system.resources.materials >= cost.materials &&
    system.resources.energy >= cost.energy
  );
}

function deductResources(
  system: SystemState,
  cost: { materials: number; energy: number },
): SystemState {
  return {
    ...system,
    resources: {
      ...system.resources,
      materials: system.resources.materials - cost.materials,
      energy: system.resources.energy - cost.energy,
    },
  };
}

function applyBuildStructure(
  state: GameState,
  action: Extract<PlayerAction, { type: "build_structure" }>,
): GameState {
  const system = getSystem(state, action.systemId);
  if (!system) return state;

  const key = structureKey(action.structureType, action.tier);
  const def = STRUCTURES[key];
  if (!def) return state;

  if (!canAfford(system, def.cost)) return state;

  const project: ConstructionProject = {
    id: `proj_${state.tickCount}_${action.structureType}_${action.tier}`,
    targetType: action.structureType,
    targetTier: action.tier,
    targetConfig: null,
    totalCost: { ...def.cost },
    remainingCost: { ...def.cost },
    progress: 0,
    assignedPrinterIds: [],
  };

  const updated = deductResources(system, def.cost);
  return updateSystem(state, action.systemId, {
    ...updated,
    constructionQueue: [...updated.constructionQueue, project],
  });
}

function applyCancelConstruction(
  state: GameState,
  action: Extract<PlayerAction, { type: "cancel_construction" }>,
): GameState {
  const system = getSystem(state, action.systemId);
  if (!system) return state;

  const project = system.constructionQueue.find(
    (p) => p.id === action.projectId,
  );
  if (!project) return state;

  const refunded: SystemState = {
    ...system,
    resources: {
      ...system.resources,
      materials: system.resources.materials + project.remainingCost.materials,
      energy: system.resources.energy + project.remainingCost.energy,
    },
    constructionQueue: system.constructionQueue.filter(
      (p) => p.id !== action.projectId,
    ),
  };

  return updateSystem(state, action.systemId, refunded);
}

function applyBuildProbe(
  state: GameState,
  action: Extract<PlayerAction, { type: "build_probe" }>,
): GameState {
  const system = getSystem(state, action.systemId);
  if (!system) return state;

  const cost = totalProbeCost(action.cpu, action.propulsion, action.reactor);
  if (!canAfford(system, cost)) return state;

  const project: ConstructionProject = {
    id: `proj_${state.tickCount}_probe_${action.targetSystemId}`,
    targetType: "probe",
    targetTier: 0,
    targetConfig: {
      cpu: action.cpu,
      propulsion: action.propulsion,
      reactor: action.reactor,
      targetSystemId: action.targetSystemId,
    },
    totalCost: { ...cost },
    remainingCost: { ...cost },
    progress: 0,
    assignedPrinterIds: [],
  };

  const updated = deductResources(system, cost);
  return updateSystem(state, action.systemId, {
    ...updated,
    constructionQueue: [...updated.constructionQueue, project],
  });
}

function hasPrerequisites(
  system: SystemState,
  techId: string,
): boolean {
  const tech = TECH_TREE[techId];
  if (!tech) return false;

  if (tech.tier <= 1) return true;

  const branchTechs = techsInBranch(tech.branchId);
  for (const t of branchTechs) {
    if (t.tier < tech.tier && !system.completedResearch[t.id]) {
      return false;
    }
  }
  return true;
}

function applyStartResearch(
  state: GameState,
  action: Extract<PlayerAction, { type: "start_research" }>,
): GameState {
  const system = getSystem(state, action.systemId);
  if (!system) return state;

  const tech = TECH_TREE[action.techId];
  if (!tech) return state;

  if (!hasPrerequisites(system, action.techId)) return state;
  if (!canAfford(system, tech.initialCost)) return state;

  const alreadyResearching = system.researchQueue.some(
    (p) => p.techId === action.techId,
  );
  if (alreadyResearching) return state;

  if (system.completedResearch[action.techId]) return state;

  const project: ResearchProject = {
    id: `research_${state.tickCount}_${action.techId}`,
    techId: action.techId,
    branchId: tech.branchId,
    tier: tech.tier,
    name: tech.name,
    initialCost: { ...tech.initialCost },
    continuousCost: tech.continuousCost,
    progress: 0,
    completed: false,
  };

  const updated = deductResources(system, tech.initialCost);
  return updateSystem(state, action.systemId, {
    ...updated,
    researchQueue: [...updated.researchQueue, project],
  });
}

function applyPauseResearch(
  state: GameState,
  action: Extract<PlayerAction, { type: "pause_research" }>,
): GameState {
  const system = getSystem(state, action.systemId);
  if (!system) return state;

  const project = system.researchQueue.find(
    (p) => p.id === action.projectId,
  );
  if (!project) return state;

  return updateSystem(state, action.systemId, {
    ...system,
    researchQueue: system.researchQueue.filter(
      (p) => p.id !== action.projectId,
    ),
  });
}

function applyCancelResearch(
  state: GameState,
  action: Extract<PlayerAction, { type: "cancel_research" }>,
): GameState {
  const system = getSystem(state, action.systemId);
  if (!system) return state;

  const project = system.researchQueue.find(
    (p) => p.id === action.projectId,
  );
  if (!project) return state;

  let refundedSystem = system;
  if (project.progress === 0) {
    refundedSystem = {
      ...system,
      resources: {
        ...system.resources,
        materials:
          system.resources.materials + project.initialCost.materials,
        energy: system.resources.energy + project.initialCost.energy,
      },
    };
  }

  return updateSystem(state, action.systemId, {
    ...refundedSystem,
    researchQueue: refundedSystem.researchQueue.filter(
      (p) => p.id !== action.projectId,
    ),
  });
}

function applyReorderResearch(
  state: GameState,
  action: Extract<PlayerAction, { type: "reorder_research" }>,
): GameState {
  const system = getSystem(state, action.systemId);
  if (!system) return state;

  const projectIndex = system.researchQueue.findIndex(
    (p) => p.id === action.projectId,
  );
  if (projectIndex === -1) return state;

  const queue = [...system.researchQueue];
  const [project] = queue.splice(projectIndex, 1);
  if (!project) return state;

  const targetIndex = Math.max(0, Math.min(action.newIndex, queue.length));
  queue.splice(targetIndex, 0, project);

  return updateSystem(state, action.systemId, {
    ...system,
    researchQueue: queue,
  });
}

function applyAction(state: GameState, action: PlayerAction): GameState {
  switch (action.type) {
    case "build_structure":
      return applyBuildStructure(state, action);
    case "cancel_construction":
      return applyCancelConstruction(state, action);
    case "build_probe":
      return applyBuildProbe(state, action);
    case "start_research":
      return applyStartResearch(state, action);
    case "pause_research":
      return applyPauseResearch(state, action);
    case "cancel_research":
      return applyCancelResearch(state, action);
    case "reorder_research":
      return applyReorderResearch(state, action);
    case "switch_system":
      return { ...state, currentSystemId: action.systemId };
    case "pause":
      return { ...state, paused: true };
    case "unpause":
      return { ...state, paused: false };
    case "set_speed":
      return state;
  }
}

export function tick(
  state: GameState,
  dt: number,
  actions: readonly PlayerAction[],
): GameState {
  const rng = createRngFromState(state.rngState);

  let current: GameState = {
    ...state,
    tickCount: state.tickCount + 1,
    elapsedSeconds: state.elapsedSeconds + dt,
  };

  for (const action of actions) {
    current = applyAction(current, action);
  }

  current = tickResources(current, dt);
  current = tickConstruction(current, dt);
  current = tickResearch(current, dt);
  current = tickNavigation(current, dt, rng);
  current = tickEvents(current, dt, rng);

  return { ...current, rngState: rng.snapshot() };
}
