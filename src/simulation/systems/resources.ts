import type { GameState, SystemState, StructureInstance, ProbeState, LogEntry } from "../state";
import type { PrestigeState } from "../prestige";
import { calculateRates, isActiveAndComplete, PROBE_MAINTENANCE, IDLE_MAINTENANCE_FRACTION } from "../rates";
import { getTechMultipliers, type TechMultipliers } from "../tech-effects";
import { STRUCTURES, structureKey } from "../data/structures";

const HEALTH_DRAIN_RATE = 0.01;
const HEALTH_RECOVERY_RATE = 0.005;

function sumMaintenance(structures: readonly StructureInstance[]): number {
  let total = 0;
  for (const s of structures) {
    if (s.constructionProgress >= 1 && s.maintenanceCost > 0) {
      total += s.active ? s.maintenanceCost : s.maintenanceCost * IDLE_MAINTENANCE_FRACTION;
    }
  }
  return total;
}

function updateStructureHealth(
  structures: readonly StructureInstance[],
  dt: number,
  shouldDrain: boolean,
  totalSystemMaintenance: number,
): StructureInstance[] | null {
  if (shouldDrain) {
    if (totalSystemMaintenance <= 0) return null;

    let changed = false;
    const result = structures.map((s) => {
      if (s.constructionProgress < 1 || s.maintenanceCost <= 0) return s;
      const effectiveCost = s.active ? s.maintenanceCost : s.maintenanceCost * IDLE_MAINTENANCE_FRACTION;
      if (effectiveCost <= 0) return s;
      const drain = HEALTH_DRAIN_RATE * (effectiveCost / totalSystemMaintenance) * dt;
      const newHealth = Math.max(0, s.health - drain);
      if (newHealth === s.health) return s;
      changed = true;
      return { ...s, health: newHealth };
    });
    return changed ? result : null;
  }

  let changed = false;
  const result = structures.map((s) => {
    if (s.health >= 1) return s;
    const newHealth = Math.min(1, s.health + HEALTH_RECOVERY_RATE * dt);
    if (newHealth === s.health) return s;
    changed = true;
    return { ...s, health: newHealth };
  });
  return changed ? result : null;
}

function updateProbeHealth(
  probe: ProbeState,
  dt: number,
  shouldDrain: boolean,
  totalSystemMaintenance: number,
): ProbeState | null {
  if (shouldDrain) {
    if (totalSystemMaintenance <= 0) return null;
    const drain = HEALTH_DRAIN_RATE * (PROBE_MAINTENANCE / totalSystemMaintenance) * dt;
    const newHealth = Math.max(0, probe.health - drain);
    if (newHealth === probe.health) return null;
    return { ...probe, health: newHealth };
  }

  if (probe.health >= 1) return null;
  const newHealth = Math.min(1, probe.health + HEALTH_RECOVERY_RATE * dt);
  if (newHealth === probe.health) return null;
  return { ...probe, health: newHealth };
}

function tickSystem(system: SystemState, dt: number, prestige: PrestigeState, techMultipliers?: TechMultipliers): SystemState {
  const rates = calculateRates(system, prestige, techMultipliers);
  const clampedMaterials = Math.max(0, system.resources.materials + rates.materialsPerSecond * dt);
  const shouldDrain = clampedMaterials <= 0 && rates.materialsPerSecond < 0;
  const shouldRecover = !shouldDrain && clampedMaterials >= 0;

  let structures = system.structures;
  let mainProbe = system.mainProbe;
  if (shouldDrain || shouldRecover) {
    const totalMaintenance = sumMaintenance(structures.miners)
      + sumMaintenance(structures.reactors)
      + sumMaintenance(structures.printers)
      + sumMaintenance(structures.stations)
      + (mainProbe ? PROBE_MAINTENANCE : 0);

    const minersUpdate = updateStructureHealth(structures.miners, dt, shouldDrain, totalMaintenance);
    const reactorsUpdate = updateStructureHealth(structures.reactors, dt, shouldDrain, totalMaintenance);
    const printersUpdate = updateStructureHealth(structures.printers, dt, shouldDrain, totalMaintenance);
    const stationsUpdate = updateStructureHealth(structures.stations, dt, shouldDrain, totalMaintenance);

    if (minersUpdate || reactorsUpdate || printersUpdate || stationsUpdate) {
      structures = {
        miners: minersUpdate ?? structures.miners,
        reactors: reactorsUpdate ?? structures.reactors,
        printers: printersUpdate ?? structures.printers,
        stations: stationsUpdate ?? structures.stations,
      };
    }

    if (mainProbe) {
      const probeUpdate = updateProbeHealth(mainProbe, dt, shouldDrain, totalMaintenance);
      if (probeUpdate) {
        mainProbe = probeUpdate;
      }
    }
  }

  return {
    ...system,
    mainProbe,
    structures,
    resources: {
      materials: clampedMaterials,
      energy: rates.energyNet,
      computingPower: rates.computingPowerPerSecond,
    },
    resourceRates: rates,
  };
}

const HEALTH_THRESHOLDS = [0.75, 0.5, 0.25] as const;

function detectHealthThresholdCrossings(
  oldSystem: SystemState,
  newSystem: SystemState,
  tickCount: number,
): LogEntry[] {
  const hasOldStructures =
    oldSystem.structures.miners.length > 0 ||
    oldSystem.structures.reactors.length > 0 ||
    oldSystem.structures.printers.length > 0 ||
    oldSystem.structures.stations.length > 0;

  if (!hasOldStructures && !oldSystem.mainProbe) return [];

  let worstCrossing = Infinity;

  if (hasOldStructures) {
    const oldById = new Map<string, StructureInstance>();
    for (const s of oldSystem.structures.miners) oldById.set(s.id, s);
    for (const s of oldSystem.structures.reactors) oldById.set(s.id, s);
    for (const s of oldSystem.structures.printers) oldById.set(s.id, s);
    for (const s of oldSystem.structures.stations) oldById.set(s.id, s);

    const allNew = [
      ...newSystem.structures.miners,
      ...newSystem.structures.reactors,
      ...newSystem.structures.printers,
      ...newSystem.structures.stations,
    ];

    for (const newStruct of allNew) {
      const oldStruct = oldById.get(newStruct.id);
      if (!oldStruct) continue;
      for (const threshold of HEALTH_THRESHOLDS) {
        if (oldStruct.health > threshold && newStruct.health <= threshold) {
          worstCrossing = Math.min(worstCrossing, newStruct.health);
          break;
        }
      }
    }
  }

  if (oldSystem.mainProbe && newSystem.mainProbe) {
    for (const threshold of HEALTH_THRESHOLDS) {
      if (oldSystem.mainProbe.health > threshold && newSystem.mainProbe.health <= threshold) {
        worstCrossing = Math.min(worstCrossing, newSystem.mainProbe.health);
        break;
      }
    }
  }

  if (worstCrossing < Infinity) {
    const pct = Math.round(worstCrossing * 100);
    return [{
      tick: tickCount,
      message: `Equipment health critical in ${newSystem.name}: ${pct}%`,
      category: "warning",
      soundEvent: "health_threshold",
    }];
  }

  return [];
}

function findLargestConsumer(
  system: SystemState,
  field: "operatingCost" | "computeDemand",
): { structure: StructureInstance; arrayName: keyof SystemState["structures"] } | null {
  let largest: StructureInstance | null = null;
  let largestArray: keyof SystemState["structures"] | null = null;
  let largestValue = 0;

  const arrays: (keyof SystemState["structures"])[] = field === "operatingCost"
    ? ["miners", "reactors", "printers"]
    : ["miners", "reactors", "printers", "stations"];
  for (const arrayName of arrays) {
    for (const s of system.structures[arrayName]) {
      if (isActiveAndComplete(s) && s[field] > largestValue) {
        largest = s;
        largestArray = arrayName;
        largestValue = s[field];
      }
    }
  }

  if (!largest || !largestArray) return null;
  return { structure: largest, arrayName: largestArray };
}

function pauseStructureInSystem(
  system: SystemState,
  target: StructureInstance,
  arrayName: keyof SystemState["structures"],
): SystemState {
  return {
    ...system,
    structures: {
      ...system.structures,
      [arrayName]: system.structures[arrayName].map((s) =>
        s.id === target.id ? { ...s, active: false } : s,
      ),
    },
  };
}

function structureDisplayName(inst: StructureInstance): string {
  const def = STRUCTURES[structureKey(inst.type, inst.tier)];
  return def?.name ?? `${inst.type} T${inst.tier}`;
}

export function autoPauseForShortfall(
  system: SystemState,
  prestige: PrestigeState,
  tickCount: number,
  techMultipliers?: TechMultipliers,
): { system: SystemState; log: LogEntry[] } {
  if (system.mainProbe?.mode === "deep_research") return { system, log: [] };

  const rates = calculateRates(system, prestige, techMultipliers);
  const log: LogEntry[] = [];

  let current = system;
  let energyPausedId: string | undefined;

  if (rates.energyNet < 0) {
    const found = findLargestConsumer(current, "operatingCost");
    if (found) {
      current = pauseStructureInSystem(current, found.structure, found.arrayName);
      energyPausedId = found.structure.id;
      log.push({
        tick: tickCount,
        message: `Energy deficit in ${current.name}: ${structureDisplayName(found.structure)} auto-paused`,
        category: "warning",
      });
    }
  }

  if (rates.computeEfficiency < 1) {
    const found = findLargestConsumer(current, "computeDemand");
    if (found && found.structure.id !== energyPausedId) {
      current = pauseStructureInSystem(current, found.structure, found.arrayName);
      log.push({
        tick: tickCount,
        message: `Compute deficit in ${current.name}: ${structureDisplayName(found.structure)} auto-paused`,
        category: "warning",
      });
    }
  }

  return { system: current, log };
}

export function tickResources(state: GameState, dt: number): GameState {
  const updatedSystems: Record<string, SystemState> = {};
  let newLog = state.log;
  let logChanged = false;

  for (const [id, system] of Object.entries(state.systems)) {
    const multipliers = getTechMultipliers(system.completedResearch);
    const { system: pauseAdjusted, log: pauseLog } = autoPauseForShortfall(system, state.prestige, state.tickCount, multipliers);
    const updated = tickSystem(pauseAdjusted, dt, state.prestige, multipliers);
    updatedSystems[id] = updated;

    if (pauseLog.length > 0) {
      newLog = [...newLog, ...pauseLog];
      logChanged = true;
    }

    const crossings = detectHealthThresholdCrossings(system, updated, state.tickCount);
    if (crossings.length > 0) {
      newLog = [...newLog, ...crossings];
      logChanged = true;
    }
  }

  return {
    ...state,
    systems: updatedSystems,
    log: logChanged ? newLog : state.log,
  };
}
