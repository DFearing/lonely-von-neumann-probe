import type { StructureInstance, SystemState } from "./state";
import { getTechMultipliers } from "./tech-effects";
import { REACTORS } from "./data/components";

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

  const { miningMultiplier } = getTechMultipliers(system.completedResearch);

  const probeMining = mainProbe ? mainProbe.miningOutput : 0;
  const minerOutput = sumProductionRates(structures.miners);
  const materialsPerSecond = (probeMining + minerOutput) * miningMultiplier * resourceRichness;

  let probeEnergy = 0;
  if (mainProbe) {
    const reactorDef = REACTORS[mainProbe.components.reactor];
    const baseOutput = 10 * reactorDef.energyMultiplier;
    const operatingCost = 1 * reactorDef.operatingCostMultiplier;
    const solarMultiplier =
      mainProbe.components.reactor === "solar_harvester" ? resourceRichness : 1;
    probeEnergy = baseOutput * solarMultiplier - operatingCost;
  }

  let structureReactorOutput = 0;
  for (const reactor of structures.reactors) {
    if (isActiveAndComplete(reactor)) {
      const multiplier = reactor.tier === 3 ? resourceRichness : 1;
      structureReactorOutput += reactor.productionRate * multiplier;
    }
  }
  const totalOperatingCost =
    sumOperatingCosts(structures.miners) +
    sumOperatingCosts(structures.reactors) +
    sumOperatingCosts(structures.printers);
  const energyPerSecond = probeEnergy + structureReactorOutput - totalOperatingCost;

  const computingPowerPerSecond = mainProbe ? mainProbe.computingOutput : 0;

  return { materialsPerSecond, energyPerSecond, computingPowerPerSecond };
}
