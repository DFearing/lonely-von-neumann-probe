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
import { totalProbeCost, CPUS, PROPULSIONS, REACTORS } from "./data/components";
import { TECH_TREE } from "./data/tech-tree";
import { hasPrerequisites } from "./queries";

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
  cost: { materials: number },
): boolean {
  return system.resources.materials >= cost.materials;
}

function deductResources(
  system: SystemState,
  cost: { materials: number },
): SystemState {
  return {
    ...system,
    resources: {
      ...system.resources,
      materials: system.resources.materials - cost.materials,
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

  if (def.techGate && !system.completedResearch[def.techGate]) return state;

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
    mainProbe: updated.mainProbe ? { ...updated.mainProbe, mode: "printing" } : null,
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

  const cpuDef = CPUS[action.cpu];
  const propDef = PROPULSIONS[action.propulsion];
  const reactorDef = REACTORS[action.reactor];
  if (!cpuDef || !propDef || !reactorDef) return state;

  if (cpuDef.techGate && !system.completedResearch[cpuDef.techGate]) return state;
  if (propDef.techGate && !system.completedResearch[propDef.techGate]) return state;
  if (reactorDef.techGate && !system.completedResearch[reactorDef.techGate]) return state;

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

function applyStartResearch(
  state: GameState,
  action: Extract<PlayerAction, { type: "start_research" }>,
): GameState {
  const system = getSystem(state, action.systemId);
  if (!system) return state;

  const tech = TECH_TREE[action.techId];
  if (!tech) return state;

  if (!hasPrerequisites(system, action.techId)) return state;

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
    continuousCost: tech.continuousCost,
    progress: 0,
    completed: false,
    paused: false,
  };

  const newQueue = action.priority
    ? [project, ...system.researchQueue]
    : [...system.researchQueue, project];
  return updateSystem(state, action.systemId, {
    ...system,
    researchQueue: newQueue,
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
    researchQueue: system.researchQueue.map((p) =>
      p.id === action.projectId ? { ...p, paused: !p.paused } : p,
    ),
  });
}

function applyCancelResearch(
  state: GameState,
  action: Extract<PlayerAction, { type: "cancel_research" }>,
): GameState {
  const system = getSystem(state, action.systemId);
  if (!system) return state;

  return updateSystem(state, action.systemId, {
    ...system,
    researchQueue: system.researchQueue.filter(
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

function applySetProbeMode(
  state: GameState,
  action: Extract<PlayerAction, { type: "set_probe_mode" }>,
): GameState {
  const system = getSystem(state, action.systemId);
  if (!system?.mainProbe) return state;

  return updateSystem(state, action.systemId, {
    ...system,
    mainProbe: { ...system.mainProbe, mode: action.mode },
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
    case "toggle_structure": {
      const sys = state.systems[action.systemId];
      if (!sys) return state;
      const toggle = (list: readonly import("./state").StructureInstance[]) =>
        list.map((s) => s.id === action.structureId ? { ...s, active: !s.active } : s);
      return {
        ...state,
        systems: {
          ...state.systems,
          [action.systemId]: {
            ...sys,
            structures: {
              miners: toggle(sys.structures.miners),
              reactors: toggle(sys.structures.reactors),
              printers: toggle(sys.structures.printers),
              stations: toggle(sys.structures.stations),
            },
          },
        },
      };
    }
    case "set_probe_mode":
      return applySetProbeMode(state, action);
    case "switch_system": {
      const sys = state.systems[action.systemId];
      return sys ? { ...state, currentSystemId: action.systemId } : state;
    }
    case "pause":
      return { ...state, paused: true };
    case "unpause":
      return { ...state, paused: false };
    case "set_speed":
      return { ...state, speed: action.speed };
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
