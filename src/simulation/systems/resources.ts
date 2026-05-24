import type { GameState, SystemState, StructureInstance } from "../state";
import { calculateRates } from "../rates";

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

function tickSystem(system: SystemState, dt: number): SystemState {
  const rates = calculateRates(system);
  const clampedMaterials = Math.max(0, system.resources.materials + rates.materialsPerSecond * dt);
  const shouldDrain = clampedMaterials <= 0 && rates.materialsPerSecond < 0;
  const shouldRecover = clampedMaterials > 0;

  let structures = system.structures;
  if (shouldDrain || shouldRecover) {
    const totalMaintenance = sumMaintenance(structures.miners)
      + sumMaintenance(structures.reactors)
      + sumMaintenance(structures.printers)
      + sumMaintenance(structures.stations);

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
  }

  return {
    ...system,
    structures,
    resources: {
      materials: clampedMaterials,
      energy: rates.energyNet,
      computingPower: rates.computingPowerPerSecond,
    },
    resourceRates: rates,
  };
}

export function tickResources(state: GameState, dt: number): GameState {
  const updatedSystems: Record<string, SystemState> = {};
  for (const [id, system] of Object.entries(state.systems)) {
    updatedSystems[id] = tickSystem(system, dt);
  }

  return {
    ...state,
    systems: updatedSystems,
  };
}
