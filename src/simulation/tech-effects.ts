import { MAX_TIER } from "./state";

export interface TechMultipliers {
  miningMultiplier: number;
  energyMultiplier: number;
  researchSpeedMultiplier: number;
  manufacturingSpeedMultiplier: number;
  maxConcurrentResearch: number;
  printerNetworking: boolean;
  distributedIntelligence: boolean;
  zeroLatencyCommunication: boolean;
}

export function getTechMultipliers(
  completedResearch: Record<string, boolean>,
): TechMultipliers {
  let miningMultiplier = 1.0;
  for (let tier = 1; tier <= MAX_TIER; tier++) {
    if (completedResearch[`mining_efficiency_t${tier}`]) {
      miningMultiplier += 0.10 + 0.005 * (tier - 1);
    }
  }

  let energyMultiplier = 1.0;
  for (let tier = 1; tier <= MAX_TIER; tier++) {
    if (completedResearch[`energy_production_t${tier}`]) {
      energyMultiplier += 0.08 + 0.004 * (tier - 1);
    }
  }

  let researchSpeedMultiplier = 1.0;
  for (let tier = 1; tier <= MAX_TIER; tier++) {
    if (completedResearch[`computing_speed_t${tier}`]) {
      researchSpeedMultiplier += 0.06 + 0.004 * (tier - 1);
    }
  }

  let manufacturingSpeedMultiplier = 1.0;
  for (let tier = 1; tier <= MAX_TIER; tier++) {
    if (completedResearch[`manufacturing_efficiency_t${tier}`]) {
      manufacturingSpeedMultiplier += 0.05 + 0.003 * (tier - 1);
    }
  }

  let maxConcurrentResearch = 1;
  if (completedResearch["computing_architecture_t4"]) maxConcurrentResearch = 2;
  if (completedResearch["computing_architecture_t10"]) maxConcurrentResearch = 3;

  const printerNetworking = completedResearch["manufacturing_efficiency_t8"] === true;
  const distributedIntelligence = completedResearch["computing_architecture_t14"] === true;
  const zeroLatencyCommunication = completedResearch["communication_t18"] === true;

  return {
    miningMultiplier,
    energyMultiplier,
    researchSpeedMultiplier,
    manufacturingSpeedMultiplier,
    maxConcurrentResearch,
    printerNetworking,
    distributedIntelligence,
    zeroLatencyCommunication,
  };
}
