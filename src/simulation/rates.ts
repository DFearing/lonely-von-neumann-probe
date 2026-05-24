import type { StructureInstance, SystemState } from "./state";
import { getTechMultipliers } from "./tech-effects";
import { REACTORS } from "./data/components";
import { STRUCTURES, structureKey } from "./data/structures";

export interface ResourceRates {
  materialsSupply: number;
  materialsDemand: number;
  materialsPerSecond: number;
  energySupply: number;
  energyDemand: number;
  energyNet: number;
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

function sumMaintenanceCosts(structures: readonly StructureInstance[]): number {
  let total = 0;
  for (const s of structures) {
    if (isActiveAndComplete(s)) {
      total += s.maintenanceCost;
    }
  }
  return total;
}

const PROBE_MAINTENANCE = 0.1;

export function calculateRates(system: SystemState): ResourceRates {
  const { structures, resourceRichness, mainProbe } = system;

  const multipliers = getTechMultipliers(system.completedResearch);

  const probeMining = mainProbe?.mode === "gathering" ? mainProbe.miningOutput : 0;
  const minerOutput = sumProductionRates(structures.miners);
  const materialsPerSecond = (probeMining + minerOutput) * multipliers.miningMultiplier * resourceRichness;

  let probeEnergySupply = 0;
  if (mainProbe) {
    const reactorDef = REACTORS[mainProbe.components.reactor];
    const baseOutput = 3 * (reactorDef?.energyMultiplier ?? 1);
    const solarMultiplier =
      REACTORS[mainProbe.components.reactor]?.solarScaling === true ? resourceRichness : 1;
    probeEnergySupply = baseOutput * solarMultiplier;
  }

  let structureReactorOutput = 0;
  for (const reactor of structures.reactors) {
    if (isActiveAndComplete(reactor)) {
      const def = STRUCTURES[structureKey("reactor", reactor.tier)];
      const solarMultiplier = def?.solarScaling ? resourceRichness : 1;
      structureReactorOutput += reactor.productionRate * solarMultiplier;
    }
  }
  structureReactorOutput *= multipliers.energyMultiplier;

  const energySupply = probeEnergySupply + structureReactorOutput;

  const energyDemand =
    sumOperatingCosts(structures.miners) +
    sumOperatingCosts(structures.printers);

  const computingPowerPerSecond = mainProbe ? mainProbe.computingOutput : 0;

  const materialsDemand =
    sumMaintenanceCosts(structures.miners) +
    sumMaintenanceCosts(structures.reactors) +
    sumMaintenanceCosts(structures.printers) +
    (mainProbe ? PROBE_MAINTENANCE : 0);

  return {
    materialsSupply: materialsPerSecond,
    materialsDemand,
    materialsPerSecond: materialsPerSecond - materialsDemand,
    energySupply,
    energyDemand,
    energyNet: energySupply - energyDemand,
    computingPowerPerSecond,
  };
}
