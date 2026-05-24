import type {
  GameState,
  SystemState,
} from "../state";
import { TECH_TREE } from "../data/tech-tree";
import { getTechMultipliers, type TechMultipliers } from "../tech-effects";
import { getPrestigeMultipliers } from "../prestige";

function tickSystemResearch(
  system: SystemState,
  dt: number,
  tickCount: number,
  perProjectComputing: number | null,
  multipliers: TechMultipliers,
  prestigeResearchMultiplier: number,
): { system: SystemState; log: GameState["log"] } {
  if (system.researchQueue.length === 0) {
    return { system, log: [] };
  }

  const incompleteProjects = system.researchQueue.filter((p) => !p.completed && !p.paused);
  const activeProjects = incompleteProjects.slice(
    0,
    multipliers.maxConcurrentResearch,
  );

  if (activeProjects.length === 0) {
    return { system, log: [] };
  }

  const computingPerProject =
    perProjectComputing ??
    system.resourceRates.computingPowerPerSecond / activeProjects.length;

  const log: GameState["log"] = [];
  const completedIds = new Set<string>();
  const newlyCompleted: Record<string, boolean> = {};
  const updatedProgressMap = new Map<string, number>();

  for (const project of activeProjects) {
    const techDef = TECH_TREE[project.techId];
    if (!techDef) continue;

    const requiredComputing = project.continuousCost;
    const availableComputing =
      requiredComputing > 0
        ? Math.min(computingPerProject, requiredComputing)
        : 0;

    const effectiveRate =
      requiredComputing > 0 ? availableComputing / requiredComputing : 1;

    const progressIncrement = (effectiveRate * dt * prestigeResearchMultiplier) / techDef.researchTime;
    const newProgress = Math.min(project.progress + progressIncrement, 1);

    if (newProgress >= 1) {
      completedIds.add(project.id);
      newlyCompleted[project.techId] = true;
      log.push({
        tick: tickCount,
        message: `Research complete: ${project.name}`,
        category: "milestone",
        soundEvent: "research_complete",
      });
    } else {
      updatedProgressMap.set(project.id, newProgress);
    }
  }

  if (completedIds.size === 0 && updatedProgressMap.size === 0) {
    return { system, log: [] };
  }

  const updatedQueue = system.researchQueue
    .filter((p) => !completedIds.has(p.id))
    .map((p) => {
      const newProgress = updatedProgressMap.get(p.id);
      if (newProgress !== undefined) {
        return { ...p, progress: newProgress };
      }
      return p;
    });

  const shouldDiscoverBlackHole =
    newlyCompleted["computing_architecture_t4"] === true &&
    !system.discoveredSystems.includes("cygnus_x1");

  return {
    system: {
      ...system,
      researchQueue: updatedQueue,
      completedResearch: {
        ...system.completedResearch,
        ...newlyCompleted,
      },
      discoveredSystems: shouldDiscoverBlackHole
        ? [...system.discoveredSystems, "cygnus_x1"]
        : system.discoveredSystems,
    },
    log,
  };
}

function countActiveProjects(
  systems: Record<string, SystemState>,
  multipliersMap: Map<string, TechMultipliers>,
): number {
  let total = 0;
  for (const [id, system] of Object.entries(systems)) {
    const multipliers = multipliersMap.get(id)!;
    const incomplete = system.researchQueue.filter((p) => !p.completed && !p.paused);
    total += Math.min(incomplete.length, multipliers.maxConcurrentResearch);
  }
  return total;
}

export function tickResearch(state: GameState, dt: number): GameState {
  const prestigeResearchMultiplier = getPrestigeMultipliers(state.prestige).researchSpeedMultiplier;
  const multipliersMap = new Map<string, TechMultipliers>();
  for (const [id, system] of Object.entries(state.systems)) {
    multipliersMap.set(id, getTechMultipliers(system.completedResearch));
  }

  const anyDistributed = Object.values(state.systems).some(
    (sys) => sys.completedResearch["computing_architecture_t14"],
  );

  let pooledComputing: number | null = null;
  if (anyDistributed) {
    pooledComputing = 0;
    for (const sys of Object.values(state.systems)) {
      pooledComputing += sys.resourceRates.computingPowerPerSecond;
    }

    const totalActiveProjects = countActiveProjects(state.systems, multipliersMap);
    if (totalActiveProjects > 0) {
      pooledComputing = pooledComputing / totalActiveProjects;
    }
  }

  let newLog = state.log;
  const newSystems: Record<string, SystemState> = {};
  let changed = false;

  for (const [id, system] of Object.entries(state.systems)) {
    const result = tickSystemResearch(system, dt, state.tickCount, pooledComputing, multipliersMap.get(id)!, prestigeResearchMultiplier);
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
