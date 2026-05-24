import type { GameState, SystemState, StructureInstance, ProbeState, LogEntry } from "../state";
import type { PrestigeState } from "../prestige";
import { calculateRates, PROBE_MAINTENANCE } from "../rates";

const HEALTH_DRAIN_RATE = 0.01;
const HEALTH_RECOVERY_RATE = 0.005;

function sumMaintenance(structures: readonly StructureInstance[]): number {
  let total = 0;
  for (const s of structures) {
    if (s.active && s.constructionProgress >= 1 && s.maintenanceCost > 0) {
      total += s.maintenanceCost;
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
      if (!s.active || s.constructionProgress < 1 || s.maintenanceCost <= 0) return s;
      const drain = HEALTH_DRAIN_RATE * (s.maintenanceCost / totalSystemMaintenance) * dt;
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

function tickSystem(system: SystemState, dt: number, prestige: PrestigeState): SystemState {
  const rates = calculateRates(system, prestige);
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

export function tickResources(state: GameState, dt: number): GameState {
  const updatedSystems: Record<string, SystemState> = {};
  let newLog = state.log;
  let logChanged = false;

  for (const [id, system] of Object.entries(state.systems)) {
    const updated = tickSystem(system, dt, state.prestige);
    updatedSystems[id] = updated;

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
