import type { StructureInstance, SystemState } from "./state";
import type { PrestigeState } from "./prestige";
import { getPrestigeMultipliers } from "./prestige";
import { getTechMultipliers, type TechMultipliers } from "./tech-effects";
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
  computeSupply: number;
  computeDemand: number;
  computeNet: number;
  computeEfficiency: number;
}

export function isActiveAndComplete(s: StructureInstance): boolean {
  return s.active && s.constructionProgress >= 1;
}

function sumProductionRates(structures: readonly StructureInstance[]): number {
  let total = 0;
  for (const s of structures) {
    if (isActiveAndComplete(s)) {
      total += s.productionRate * s.health;
    }
  }
  return total;
}

function sumOperatingCosts(structures: readonly StructureInstance[]): number {
  let total = 0;
  for (const s of structures) {
    if (s.active && s.constructionProgress >= 1) {
      total += s.operatingCost;
    }
  }
  return total;
}

const IDLE_MAINTENANCE_FRACTION = 0.25;

function sumMaintenanceCosts(structures: readonly StructureInstance[]): number {
  let total = 0;
  for (const s of structures) {
    if (s.constructionProgress >= 1) {
      total += s.active ? s.maintenanceCost : s.maintenanceCost * IDLE_MAINTENANCE_FRACTION;
    }
  }
  return total;
}

function sumComputeDemands(structures: readonly StructureInstance[]): number {
  let total = 0;
  for (const s of structures) {
    if (isActiveAndComplete(s)) {
      total += s.computeDemand;
    }
  }
  return total;
}

export const PROBE_MAINTENANCE = 0.1;

export function calculateRates(
  system: SystemState,
  prestige?: PrestigeState,
  techMultipliers?: TechMultipliers,
): ResourceRates {
  const { structures, resourceRichness, mainProbe } = system;

  const multipliers = techMultipliers ?? getTechMultipliers(system.completedResearch);
  const prestigeMult = prestige ? getPrestigeMultipliers(prestige) : undefined;

  const probeMining = mainProbe?.mode === "gathering" ? mainProbe.miningOutput * mainProbe.health : 0;
  const minerOutput = sumProductionRates(structures.miners);
  const materialsPerSecond = (probeMining + minerOutput) * multipliers.miningMultiplier * resourceRichness * (prestigeMult?.miningMultiplier ?? 1);

  let probeEnergySupply = 0;
  if (mainProbe) {
    const reactorDef = REACTORS[mainProbe.components.reactor];
    const baseOutput = 3 * (reactorDef?.energyMultiplier ?? 1);
    const solarMultiplier =
      REACTORS[mainProbe.components.reactor]?.solarScaling === true ? resourceRichness : 1;
    probeEnergySupply = baseOutput * solarMultiplier * (prestigeMult?.energyMultiplier ?? 1);
  }

  let structureReactorOutput = 0;
  for (const reactor of structures.reactors) {
    if (isActiveAndComplete(reactor)) {
      const def = STRUCTURES[structureKey("reactor", reactor.tier)];
      const solarMultiplier = def?.solarScaling ? resourceRichness : 1;
      structureReactorOutput += reactor.productionRate * reactor.health * solarMultiplier;
    }
  }
  structureReactorOutput *= multipliers.energyMultiplier * (prestigeMult?.energyMultiplier ?? 1);

  const energyDemand =
    sumOperatingCosts(structures.miners) +
    sumOperatingCosts(structures.printers) +
    sumOperatingCosts(structures.stations);

  const probeCompute = mainProbe ? mainProbe.computingOutput * mainProbe.health * multipliers.computingMultiplier : 0;
  const stationCompute = sumProductionRates(structures.stations) * multipliers.stationComputingMultiplier * multipliers.computingMultiplier;
  const computeSupply = probeCompute + stationCompute;

  const computeDemand =
    sumComputeDemands(structures.miners) +
    sumComputeDemands(structures.reactors) +
    sumComputeDemands(structures.printers);

  const computeNet = computeSupply - computeDemand;
  const computeEfficiency = computeDemand === 0 ? 1 : Math.min(1, computeSupply / computeDemand);

  const throttledMaterials = materialsPerSecond * computeEfficiency;

  const throttledReactorOutput = structureReactorOutput * computeEfficiency;
  const throttledEnergySupply = probeEnergySupply + throttledReactorOutput;

  const computingPowerPerSecond = Math.max(0, computeSupply - computeDemand);

  const materialsDemand =
    sumMaintenanceCosts(structures.miners) +
    sumMaintenanceCosts(structures.reactors) +
    sumMaintenanceCosts(structures.printers) +
    sumMaintenanceCosts(structures.stations) +
    (mainProbe ? PROBE_MAINTENANCE : 0);

  return {
    materialsSupply: throttledMaterials,
    materialsDemand,
    materialsPerSecond: throttledMaterials - materialsDemand,
    energySupply: throttledEnergySupply,
    energyDemand,
    energyNet: throttledEnergySupply - energyDemand,
    computingPowerPerSecond,
    computeSupply,
    computeDemand,
    computeNet,
    computeEfficiency,
  };
}
