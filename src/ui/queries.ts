import type { SystemState } from "../simulation/state";

export function getMaterialsCap(system: SystemState): number {
  const minerCount = system.structures.miners.filter(
    (s) => s.constructionProgress >= 1,
  ).length;
  return 1000 + 500 * minerCount;
}

export function getEnergyCap(system: SystemState): number {
  const reactorCount = system.structures.reactors.filter(
    (s) => s.constructionProgress >= 1,
  ).length;
  return 500 + 300 * reactorCount;
}
