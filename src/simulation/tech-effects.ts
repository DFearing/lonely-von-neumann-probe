export interface TechMultipliers {
  miningMultiplier: number;
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
  if (completedResearch["basic_mining_techniques"]) miningMultiplier += 0.2;
  if (completedResearch["mineral_separation"]) miningMultiplier += 0.4;
  if (completedResearch["advanced_extraction"]) miningMultiplier += 0.6;
  if (completedResearch["automated_deep_mining"]) miningMultiplier += 1.0;

  let researchSpeedMultiplier = 1.0;
  if (completedResearch["basic_computing"]) researchSpeedMultiplier += 0.25;
  if (completedResearch["quantum_computing"]) researchSpeedMultiplier += 1.0;

  let manufacturingSpeedMultiplier = 1.0;
  if (completedResearch["faster_printing"]) manufacturingSpeedMultiplier += 0.25;

  const maxConcurrentResearch = completedResearch["parallel_processing"] ? 2 : 1;
  const printerNetworking = completedResearch["printer_networking"] === true;
  const distributedIntelligence = completedResearch["distributed_intelligence"] === true;
  const zeroLatencyCommunication = completedResearch["zero_latency_communication"] === true;

  return {
    miningMultiplier,
    researchSpeedMultiplier,
    manufacturingSpeedMultiplier,
    maxConcurrentResearch,
    printerNetworking,
    distributedIntelligence,
    zeroLatencyCommunication,
  };
}
