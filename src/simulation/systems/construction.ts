import type {
  GameState,
  SystemState,
  StructureInstance,
  ConstructionProject,
  ProbeInTransit,
} from "../state";
import { STRUCTURES, structureKey } from "../data/structures";
import { PROPULSIONS } from "../data/components";

const STRUCTURE_BUILD_TIME = 8;
const PROBE_BUILD_TIME = 20;

function buildTimeForProject(project: ConstructionProject): number {
  return project.targetConfig === null ? STRUCTURE_BUILD_TIME : PROBE_BUILD_TIME;
}

function totalPrintSpeed(
  printerIds: readonly string[],
  printers: readonly StructureInstance[],
): number {
  let speed = 0;
  for (const id of printerIds) {
    const printer = printers.find(
      (p) => p.id === id && p.active && p.constructionProgress >= 1,
    );
    if (printer) {
      speed += printer.productionRate;
    }
  }
  return speed;
}

function idlePrinterIds(
  printers: readonly StructureInstance[],
  queue: readonly ConstructionProject[],
): string[] {
  const assignedIds = new Set<string>();
  for (const project of queue) {
    for (const id of project.assignedPrinterIds) {
      assignedIds.add(id);
    }
  }
  return printers
    .filter(
      (p) =>
        p.active &&
        p.constructionProgress >= 1 &&
        !assignedIds.has(p.id),
    )
    .map((p) => p.id);
}

function completeStructure(
  system: SystemState,
  project: ConstructionProject,
  tickCount: number,
): SystemState {
  const key = structureKey(
    project.targetType as StructureInstance["type"],
    project.targetTier,
  );
  const def = STRUCTURES[key];
  if (!def) return system;

  const instance: StructureInstance = {
    id: `${system.id}_${project.targetType}_${tickCount}`,
    type: def.type,
    tier: def.tier,
    productionRate: def.productionRate,
    operatingCost: def.operatingCost,
    active: true,
    constructionProgress: 1,
  };

  const arrayKey =
    def.type === "miner"
      ? "miners"
      : def.type === "reactor"
        ? "reactors"
        : "printers";

  return {
    ...system,
    structures: {
      ...system.structures,
      [arrayKey]: [...system.structures[arrayKey], instance],
    },
  };
}

function completeProbe(
  system: SystemState,
  project: ConstructionProject,
  tickCount: number,
): SystemState {
  const config = project.targetConfig;
  if (!config) return system;

  const propulsion = PROPULSIONS[config.propulsion];
  const destinationSystem = config.targetSystemId;
  const distance = 10;
  const travelTimeSeconds = distance / propulsion.travelSpeed;

  const probe: ProbeInTransit = {
    id: `${system.id}_probe_${tickCount}`,
    components: {
      cpu: config.cpu,
      propulsion: config.propulsion,
      reactor: config.reactor,
    },
    originSystemId: system.id,
    destinationSystemId: destinationSystem,
    travelTimeSeconds,
    elapsedSeconds: 0,
  };

  return {
    ...system,
    sentProbes: [...system.sentProbes, probe],
  };
}

function autoAssignPrinters(
  queue: readonly ConstructionProject[],
  printers: readonly StructureInstance[],
): ConstructionProject[] {
  const idle = idlePrinterIds(printers, queue);
  if (idle.length === 0) return queue as ConstructionProject[];

  let idleIndex = 0;
  return queue.map((project) => {
    if (idleIndex >= idle.length) return project;
    if (project.assignedPrinterIds.length > 0) return project;

    const nextIdle = idle[idleIndex];
    if (!nextIdle) return project;
    idleIndex++;
    return {
      ...project,
      assignedPrinterIds: [...project.assignedPrinterIds, nextIdle],
    };
  });
}

function tickSystemConstruction(
  system: SystemState,
  dt: number,
  tickCount: number,
): { system: SystemState; log: GameState["log"] } {
  if (system.constructionQueue.length === 0) {
    return { system, log: [] };
  }

  const log: GameState["log"] = [];
  let updatedSystem = system;
  const updatedQueue: ConstructionProject[] = [];

  for (const project of updatedSystem.constructionQueue) {
    const speed = totalPrintSpeed(
      project.assignedPrinterIds,
      updatedSystem.structures.printers,
    );

    if (speed <= 0) {
      updatedQueue.push(project);
      continue;
    }

    const buildTime = buildTimeForProject(project);
    const progressIncrement = (speed / buildTime) * dt;
    const newProgress = Math.min(project.progress + progressIncrement, 1);

    if (newProgress >= 1) {
      if (project.targetConfig === null) {
        updatedSystem = completeStructure(updatedSystem, project, tickCount);
        const key = structureKey(
          project.targetType as StructureInstance["type"],
          project.targetTier,
        );
        const def = STRUCTURES[key];
        const name = def?.name ?? project.targetType;
        log.push({
          tick: tickCount,
          message: `Construction complete: ${name}`,
          category: "milestone",
        });
      } else {
        updatedSystem = completeProbe(updatedSystem, project, tickCount);
        log.push({
          tick: tickCount,
          message: `Probe constructed and launched toward ${project.targetConfig.targetSystemId}`,
          category: "milestone",
        });
      }
    } else {
      updatedQueue.push({ ...project, progress: newProgress });
    }
  }

  const finalQueue = autoAssignPrinters(
    updatedQueue,
    updatedSystem.structures.printers,
  );

  return {
    system: { ...updatedSystem, constructionQueue: finalQueue },
    log,
  };
}

export function tickConstruction(state: GameState, dt: number): GameState {
  let newLog = state.log;
  const newSystems: Record<string, SystemState> = {};
  let changed = false;

  for (const [id, system] of Object.entries(state.systems)) {
    const result = tickSystemConstruction(system, dt, state.tickCount);
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
