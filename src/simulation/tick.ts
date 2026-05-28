import type {
  ConstructionProject,
  GameState,
  ProbeInTransit,
  ResearchProject,
  SystemState,
} from "./state";
import type { PlayerAction } from "./actions";
import { createRngFromState } from "./rng";
import { DEV_MODE } from "./dev";
import { tickResources } from "./systems/resources";
import { tickConstruction } from "./systems/construction";
import { tickResearch } from "./systems/research";
import { tickNavigation } from "./systems/navigation";
import { tickEvents } from "./systems/events";
import { STRUCTURES, structureKey } from "./data/structures";
import { totalProbeCost, CPUS, PROPULSIONS, REACTORS } from "./data/components";
import { TECH_TREE } from "./data/tech-tree";
import { KNOWN_SYSTEMS } from "./data/star-systems";
import { resolveDistance } from "./queries";
import { TRAVEL_TIME_SCALE, MAX_LOG_ENTRIES } from "./constants";
import { purchaseUpgrade, calculatePrestigePoints } from "./prestige";
import type { PrestigeUpgradeId } from "./prestige";

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
    id: `proj_${state.tickCount}_probe`,
    targetType: "probe",
    targetTier: 0,
    targetConfig: {
      cpu: action.cpu,
      propulsion: action.propulsion,
      reactor: action.reactor,
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

function applyLaunchProbe(
  state: GameState,
  action: Extract<PlayerAction, { type: "launch_probe" }>,
): GameState {
  const system = getSystem(state, action.systemId);
  if (!system) return state;

  const probeIndex = system.availableProbes.findIndex(p => p.id === action.probeId);
  if (probeIndex === -1) return state;
  const probe = system.availableProbes[probeIndex]!;

  const distance = resolveDistance(system, action.targetSystemId, state.systems);

  const propulsion = PROPULSIONS[probe.components.propulsion];
  if (!propulsion) return state;
  const travelTimeSeconds = (distance * TRAVEL_TIME_SCALE) / propulsion.travelSpeed;

  const transitProbe: ProbeInTransit = {
    id: probe.id,
    name: probe.name,
    components: probe.components,
    originSystemId: system.id,
    destinationSystemId: action.targetSystemId,
    travelTimeSeconds,
    elapsedSeconds: 0,
  };

  const updatedAvailable = system.availableProbes.filter((_, i) => i !== probeIndex);

  const targetName = state.systems[action.targetSystemId]?.name
    ?? KNOWN_SYSTEMS.find(s => s.id === action.targetSystemId)?.name
    ?? action.targetSystemId;
  const etaSeconds = Math.ceil(travelTimeSeconds);
  const logMessage = `${probe.name} launched toward ${targetName} — ETA ${etaSeconds} cycles`;

  return {
    ...updateSystem(state, action.systemId, {
      ...system,
      availableProbes: updatedAvailable,
      sentProbes: [...system.sentProbes, transitProbe],
    }),
    log: [...state.log, { tick: state.tickCount, message: logMessage, category: "info" as const }],
  };
}

function applyStartResearch(
  state: GameState,
  action: Extract<PlayerAction, { type: "start_research" }>,
): GameState {
  const system = getSystem(state, action.systemId);
  if (!system) return state;

  const tech = TECH_TREE[action.techId];
  if (!tech) return state;

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

  const ids = Array.isArray(action.projectId) ? new Set(action.projectId) : new Set([action.projectId]);
  return updateSystem(state, action.systemId, {
    ...system,
    researchQueue: system.researchQueue.filter(
      (p) => !ids.has(p.id),
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

function applyDestroyStructure(
  state: GameState,
  action: Extract<PlayerAction, { type: "destroy_structure" }>,
): GameState {
  const system = getSystem(state, action.systemId);
  if (!system) return state;

  const arrays = ["miners", "reactors", "printers", "stations"] as const;
  for (const arrayKey of arrays) {
    const idx = system.structures[arrayKey].findIndex(
      (s) => s.id === action.structureId,
    );
    if (idx === -1) continue;

    const structure = system.structures[arrayKey][idx]!;
    const key = structureKey(structure.type, structure.tier);
    const def = STRUCTURES[key];
    const refund = def ? Math.floor(def.cost.materials * 0.5) : 0;

    const updatedArray = system.structures[arrayKey].filter(
      (s) => s.id !== action.structureId,
    );

    let updatedQueue = system.constructionQueue;
    if (arrayKey === "printers") {
      updatedQueue = updatedQueue.map((project) =>
        project.assignedPrinterIds.includes(action.structureId)
          ? {
              ...project,
              assignedPrinterIds: project.assignedPrinterIds.filter(
                (id) => id !== action.structureId,
              ),
            }
          : project,
      );
    }

    return updateSystem(state, action.systemId, {
      ...system,
      resources: {
        ...system.resources,
        materials: system.resources.materials + refund,
      },
      structures: {
        ...system.structures,
        [arrayKey]: updatedArray,
      },
      constructionQueue: updatedQueue,
    });
  }

  return state;
}

function applySetProbeMode(
  state: GameState,
  action: Extract<PlayerAction, { type: "set_probe_mode" }>,
): GameState {
  const system = getSystem(state, action.systemId);
  if (!system?.mainProbe) return state;

  const probe = system.mainProbe;
  if (probe.mode === action.mode) return state;

  let message: string;
  let updatedProbe = { ...probe, mode: action.mode };

  // Exit effects: determine message and clean up state from the mode we're leaving
  if (probe.mode === "gathering") {
    const gathered = system.resources.materials - (probe.gatheringStartMaterials ?? 0);
    const { gatheringStartMaterials: _, ...probeWithoutGathering } = updatedProbe;
    updatedProbe = probeWithoutGathering as typeof updatedProbe;
    message = gathered > 0
      ? `${probe.name} stopped gathering (${(Math.round(gathered * 10) / 10).toFixed(1)} tons collected)`
      : `${probe.name} stopped gathering`;
  } else if (probe.mode === "deep_research") {
    message = `Exiting deep research mode — resuming normal operations`;
  } else if (action.mode === "gathering") {
    message = `${probe.name} began gathering`;
  } else if (action.mode === "deep_research") {
    message = system.constructionQueue.length > 0
      ? `Entering deep research mode — all computing dedicated to research (construction halted)`
      : `Entering deep research mode — all computing dedicated to research`;
  } else if (action.mode === "printing") {
    message = `${probe.name} began printing`;
  } else if (action.mode === "idle") {
    message = `${probe.name} is now idle`;
  } else {
    message = `${probe.name} mode: ${action.mode}`;
  }

  // Entry effects: apply state changes for the mode we're entering
  if (action.mode === "gathering") {
    updatedProbe = { ...updatedProbe, gatheringStartMaterials: system.resources.materials };
  }

  return {
    ...updateSystem(state, action.systemId, {
      ...system,
      mainProbe: updatedProbe,
    }),
    log: [...state.log, { tick: state.tickCount, message, category: "info" as const }],
  };
}

function applyAction(state: GameState, action: PlayerAction): GameState {
  switch (action.type) {
    case "build_structure":
      return applyBuildStructure(state, action);
    case "cancel_construction":
      return applyCancelConstruction(state, action);
    case "build_probe":
      return applyBuildProbe(state, action);
    case "launch_probe":
      return applyLaunchProbe(state, action);
    case "start_research":
      return applyStartResearch(state, action);
    case "pause_research":
      return applyPauseResearch(state, action);
    case "cancel_research":
      return applyCancelResearch(state, action);
    case "reorder_research":
      return applyReorderResearch(state, action);
    case "destroy_structure":
      return applyDestroyStructure(state, action);
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
    case "purchase_prestige_upgrade": {
      const result = purchaseUpgrade(state.prestige, action.upgradeId as PrestigeUpgradeId);
      return result ? { ...state, prestige: result } : state;
    }
    case "enter_black_hole": {
      if (!DEV_MODE && !state.prestige.blackHoleDiscovered) return state;
      const pointsEarned = calculatePrestigePoints(state);
      const awardedPrestige = {
        ...state.prestige,
        totalPrestigePoints: state.prestige.totalPrestigePoints + pointsEarned,
        availablePrestigePoints: state.prestige.availablePrestigePoints + pointsEarned,
      };
      return { ...state, prestigeTriggered: true, prestige: awardedPrestige, prestigeSnapshot: awardedPrestige };
    }
    case "reset_prestige_choices":
      return state.prestigeSnapshot ? { ...state, prestige: state.prestigeSnapshot } : state;
  }
}

function isAllProbesDead(state: GameState): boolean {
  for (const sys of Object.values(state.systems)) {
    if (sys.mainProbe && sys.mainProbe.health > 0) return false;
    if (sys.sentProbes.length > 0) return false;
  }
  return true;
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

  if (!current.gameOver && isAllProbesDead(current)) {
    return {
      ...current,
      gameOver: true,
      paused: true,
      log: [
        ...current.log,
        {
          tick: current.tickCount,
          message: "All probe systems have gone offline. Mission failed.",
          category: "error" as const,
          soundEvent: "game_over" as const,
        },
      ],
      rngState: rng.snapshot(),
    };
  }

  current = tickConstruction(current, dt);
  current = tickResearch(current, dt);
  current = tickNavigation(current, dt, rng);
  current = tickEvents(current, dt, rng);

  const trimmedLog = current.log.length > MAX_LOG_ENTRIES
    ? current.log.slice(-MAX_LOG_ENTRIES)
    : current.log;

  return { ...current, log: trimmedLog, rngState: rng.snapshot() };
}
