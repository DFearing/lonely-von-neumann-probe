import type {
  GameState,
  SystemState,
  StructureInstance,
  ConstructionProject,
  ProbeInTransit,
  SoundEventType,
  StructureType,
} from "../state";
import { STRUCTURES, structureKey } from "../data/structures";
import { PROPULSIONS } from "../data/components";
import { KNOWN_SYSTEMS } from "../data/star-systems";
import { getTechMultipliers } from "../tech-effects";
import { getPrestigeMultipliers } from "../prestige";

const STRUCTURE_SOUND_MAP: Record<StructureType, SoundEventType> = {
  miner: "miner_constructed",
  reactor: "reactor_constructed",
  printer: "printer_constructed",
  station: "station_constructed",
};

function buildTimeForProject(project: ConstructionProject): number {
  return project.totalCost.materials;
}

function totalPrintSpeed(
  printerIds: readonly string[],
  printers: readonly StructureInstance[],
  manufacturingSpeedMultiplier: number,
): number {
  let speed = 0;
  for (const id of printerIds) {
    const printer = printers.find(
      (p) => p.id === id && p.active && p.constructionProgress >= 1,
    );
    if (printer) {
      speed += printer.productionRate * printer.health;
    }
  }
  return speed * manufacturingSpeedMultiplier;
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
    maintenanceCost: def.maintenanceCost,
    computeDemand: def.computeDemand,
    active: true,
    constructionProgress: 1,
    health: 1,
  };

  const arrayKey =
    def.type === "miner"
      ? "miners"
      : def.type === "reactor"
        ? "reactors"
        : def.type === "station"
          ? "stations"
          : "printers";

  return {
    ...system,
    structures: {
      ...system.structures,
      [arrayKey]: [...system.structures[arrayKey], instance],
    },
  };
}

function resolveDistance(
  originSystem: SystemState,
  targetSystemId: string,
  allSystems: Record<string, SystemState>,
): number {
  const target = allSystems[targetSystemId];
  if (target) {
    return Math.abs(target.distanceFromOrigin - originSystem.distanceFromOrigin);
  }

  const knownTarget = KNOWN_SYSTEMS.find((s) => s.id === targetSystemId);
  if (knownTarget) {
    return Math.abs(
      knownTarget.distanceFromOrigin - originSystem.distanceFromOrigin,
    );
  }

  return 10;
}

function completeProbe(
  system: SystemState,
  project: ConstructionProject,
  tickCount: number,
  allSystems: Record<string, SystemState>,
): SystemState {
  const config = project.targetConfig;
  if (!config) return system;

  const propulsion = PROPULSIONS[config.propulsion];
  if (!propulsion) return system;
  const distance = resolveDistance(system, config.targetSystemId, allSystems);
  const travelTimeSeconds = distance / propulsion.travelSpeed;

  const probe: ProbeInTransit = {
    id: `${system.id}_probe_${tickCount}`,
    name: `Probe-${tickCount}`,
    components: {
      cpu: config.cpu,
      propulsion: config.propulsion,
      reactor: config.reactor,
    },
    originSystemId: system.id,
    destinationSystemId: config.targetSystemId,
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
  printerNetworking: boolean,
): ConstructionProject[] {
  const idle = idlePrinterIds(printers, queue);
  if (idle.length === 0) return queue as ConstructionProject[];

  if (printerNetworking) {
    const firstUnassigned = queue.findIndex(
      (p) => p.assignedPrinterIds.length === 0,
    );
    const firstWithPrinters = queue.findIndex(
      (p) => p.assignedPrinterIds.length > 0,
    );
    const targetIndex =
      firstWithPrinters >= 0 ? firstWithPrinters : firstUnassigned;

    if (targetIndex < 0) return queue as ConstructionProject[];

    return queue.map((project, i) => {
      if (i !== targetIndex) return project;
      return {
        ...project,
        assignedPrinterIds: [...project.assignedPrinterIds, ...idle],
      };
    });
  }

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
  allSystems: Record<string, SystemState>,
  prestigePrintSpeedMultiplier: number,
): { system: SystemState; log: GameState["log"] } {
  if (system.constructionQueue.length === 0) {
    return { system, log: [] };
  }

  const multipliers = getTechMultipliers(system.completedResearch);
  const log: GameState["log"] = [];
  let updatedSystem = system;
  const updatedQueue: ConstructionProject[] = [];

  const computeEfficiency = updatedSystem.resourceRates.computeEfficiency;

  const probePrintSpeed = updatedSystem.mainProbe?.mode === "printing"
    ? updatedSystem.mainProbe.internalPrinterSpeed * updatedSystem.mainProbe.health
    : 0;

  let probeAssigned = false;
  for (const project of updatedSystem.constructionQueue) {
    const structurePrintSpeed = totalPrintSpeed(
      project.assignedPrinterIds,
      updatedSystem.structures.printers,
      multipliers.manufacturingSpeedMultiplier,
    );
    const effectiveProbePrint = probeAssigned ? 0 : probePrintSpeed;
    const speed = (effectiveProbePrint + structurePrintSpeed) * computeEfficiency * prestigePrintSpeedMultiplier;
    if (speed > 0) probeAssigned = true;

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
        const soundEvent = project.targetType in STRUCTURE_SOUND_MAP
          ? STRUCTURE_SOUND_MAP[project.targetType as StructureType]
          : undefined;
        log.push({
          tick: tickCount,
          message: `Construction complete: ${name}`,
          category: "milestone",
          ...(soundEvent !== undefined && { soundEvent }),
        });
      } else {
        updatedSystem = completeProbe(
          updatedSystem,
          project,
          tickCount,
          allSystems,
        );
        log.push({
          tick: tickCount,
          message: `Probe constructed and launched toward ${project.targetConfig.targetSystemId}`,
          category: "milestone",
          soundEvent: "probe_constructed",
        });
      }
    } else {
      updatedQueue.push({
        ...project,
        progress: newProgress,
        remainingCost: {
          materials: project.totalCost.materials * (1 - newProgress),
          energy: project.totalCost.energy * (1 - newProgress),
        },
      });
    }
  }

  const finalQueue = autoAssignPrinters(
    updatedQueue,
    updatedSystem.structures.printers,
    multipliers.printerNetworking,
  );

  let finishedSystem: SystemState = { ...updatedSystem, constructionQueue: finalQueue };

  if (finalQueue.length === 0 && finishedSystem.mainProbe?.mode === "printing") {
    const probe = finishedSystem.mainProbe;
    finishedSystem = {
      ...finishedSystem,
      mainProbe: { ...probe, mode: "idle" },
    };
    log.push({
      tick: tickCount,
      message: `${probe.name} finished printing — queue empty`,
      category: "info",
    });
  }

  return { system: finishedSystem, log };
}

export function tickConstruction(state: GameState, dt: number): GameState {
  const prestigePrintSpeedMultiplier = getPrestigeMultipliers(state.prestige).printSpeedMultiplier;
  let newLog = state.log;
  const newSystems: Record<string, SystemState> = {};
  let changed = false;

  for (const [id, system] of Object.entries(state.systems)) {
    const result = tickSystemConstruction(
      system,
      dt,
      state.tickCount,
      state.systems,
      prestigePrintSpeedMultiplier,
    );
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
