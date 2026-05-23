import type { GameState, SystemState } from "../state";
import { calculateRates } from "../rates";

function tickSystem(system: SystemState, dt: number): SystemState {
  const rates = calculateRates(system);

  return {
    ...system,
    resources: {
      materials: Math.max(0, system.resources.materials + rates.materialsPerSecond * dt),
      energy: Math.max(0, system.resources.energy + rates.energyPerSecond * dt),
      computingPower: Math.max(0, system.resources.computingPower + rates.computingPowerPerSecond * dt),
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
