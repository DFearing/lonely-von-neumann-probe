import type {
  GameState,
  SystemState,
} from "../state";
import { TECH_TREE } from "../data/tech-tree";

function tickSystemResearch(
  system: SystemState,
  dt: number,
  tickCount: number,
): { system: SystemState; log: GameState["log"] } {
  if (system.researchQueue.length === 0) {
    return { system, log: [] };
  }

  const activeProject = system.researchQueue.find(
    (p) => !p.completed,
  );
  if (!activeProject) {
    return { system, log: [] };
  }

  const techDef = TECH_TREE[activeProject.techId];
  if (!techDef) {
    return { system, log: [] };
  }

  const requiredComputing = activeProject.continuousCost;
  const availableComputing =
    requiredComputing > 0
      ? Math.min(system.resourceRates.computingPowerPerSecond, requiredComputing)
      : 0;

  const effectiveRate =
    requiredComputing > 0 ? availableComputing / requiredComputing : 1;

  const progressIncrement = (effectiveRate * dt) / techDef.researchTime;
  const newProgress = Math.min(activeProject.progress + progressIncrement, 1);

  if (newProgress >= 1) {
    const remainingQueue = system.researchQueue.filter(
      (p) => p.id !== activeProject.id,
    );

    const log: GameState["log"] = [
      {
        tick: tickCount,
        message: `Research complete: ${activeProject.name}`,
        category: "milestone",
      },
    ];

    return {
      system: {
        ...system,
        researchQueue: remainingQueue,
        completedResearch: {
          ...system.completedResearch,
          [activeProject.techId]: true,
        },
      },
      log,
    };
  }

  const updatedQueue = system.researchQueue.map((p) =>
    p.id === activeProject.id ? { ...p, progress: newProgress } : p,
  );

  return {
    system: { ...system, researchQueue: updatedQueue },
    log: [],
  };
}

export function tickResearch(state: GameState, dt: number): GameState {
  let newLog = state.log;
  const newSystems: Record<string, SystemState> = {};
  let changed = false;

  for (const [id, system] of Object.entries(state.systems)) {
    const result = tickSystemResearch(system, dt, state.tickCount);
    newSystems[id] = result.system;
    if (result.log.length > 0) {
      newLog = [...newLog, ...result.log];
      changed = true;
    }
    if (result.system !== system) {
      changed = true;
    }
  }

  if (!changed) return state;

  return {
    ...state,
    systems: newSystems,
    log: newLog,
  };
}
