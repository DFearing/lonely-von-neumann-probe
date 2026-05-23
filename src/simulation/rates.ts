import type { StructureInstance, SystemState } from "./state";

export interface ResourceRates {
  materialsPerSecond: number;
  energyPerSecond: number;
  computingPowerPerSecond: number;
}

function isActiveAndComplete(s: StructureInstance): boolean {
  return s.active && s.constructionProgress >= 1;
}

function sumProductionRates(structures: readonly StructureInstance[]): number {
  let total = 0;
  for (const s of structures) {
    if (isActiveAndComplete(s)) {
      total += s.productionRate;
    }
  }
  return total;
}

function sumOperatingCosts(structures: readonly StructureInstance[]): number {
  let total = 0;
  for (const s of structures) {
    if (s.active) {
      total += s.operatingCost;
    }
  }
  return total;
}

export function calculateRates(system: SystemState): ResourceRates {
  const { structures, resourceRichness, mainProbe } = system;

  const probeMining = mainProbe ? mainProbe.miningOutput : 0;
  const minerOutput = sumProductionRates(structures.miners);
  const materialsPerSecond = (probeMining + minerOutput) * resourceRichness;

  let reactorOutput = 0;
  for (const reactor of structures.reactors) {
    if (isActiveAndComplete(reactor)) {
      const multiplier = reactor.tier === 3 ? resourceRichness : 1;
      reactorOutput += reactor.productionRate * multiplier;
    }
  }
  const totalOperatingCost =
    sumOperatingCosts(structures.miners) +
    sumOperatingCosts(structures.reactors) +
    sumOperatingCosts(structures.printers);
  const energyPerSecond = reactorOutput - totalOperatingCost;

  const computingPowerPerSecond = mainProbe ? mainProbe.computingOutput : 0;

  return { materialsPerSecond, energyPerSecond, computingPowerPerSecond };
}
