import type { StructureType } from "../state";
import { MAX_STRUCTURE_TIER } from "../constants";

export interface StructureDefinition {
  type: StructureType;
  tier: number;
  name: string;
  cost: { materials: number; energy: number };
  productionRate: number;
  operatingCost: number;
  maintenanceCost: number;
  computeDemand: number;
  techGate: string | null;
  solarScaling: boolean;
}

export const MINER_NAMES = [
  "Basic Miner",
  "Auger Drill",
  "Plasma Cutter",
  "Deep Core Drill",
  "Gravitometric Miner",
  "Asteroid Cracker",
];

export const STRUCTURE_REACTOR_NAMES = [
  "Basic Reactor",
  "Fusion Reactor",
  "Antimatter Reactor",
  "Zero-Point Generator",
  "Solar Dynamo Array",
  "Hawking Radiator",
];

export const PRINTER_NAMES = [
  "Basic Printer",
  "Enhanced Printer",
  "Nanoscale Printer",
  "Atomic Assembler",
  "Quantum Lithographer",
  "Von Neumann Assembler",
];

export const STATION_NAMES = [
  "Relay Hub",
  "Compute Cluster",
  "Neural Nexus",
  "Quantum Mainframe",
  "Dyson Brain",
  "Matrioshka Core",
];

const SOLAR_REACTOR_TIERS = new Set([5]);

function structureTechGate(typesPrefix: string, tier: number): string | null {
  if (tier === 1) return null;
  return `${typesPrefix}_t${(tier - 1) * 4}`;
}

function generateStructures(): Record<string, StructureDefinition> {
  const structures: Record<string, StructureDefinition> = {};

  for (let tier = 1; tier <= MAX_STRUCTURE_TIER; tier++) {
    structures[`miner_${tier}`] = {
      type: "miner",
      tier,
      name: MINER_NAMES[tier - 1]!,
      cost: {
        materials: Math.round(50 * 2.2 ** (tier - 1)),
        energy: Math.round(10 * 2.2 ** (tier - 1)),
      },
      productionRate: +(3 * (1 + 0.30 * (tier - 1))).toFixed(2),
      operatingCost: +(0.5 * (1 + 0.12 * (tier - 1))).toFixed(2),
      maintenanceCost: +(0.15 * (1 + 0.15 * (tier - 1))).toFixed(3),
      computeDemand: +(0.10 * Math.pow(1.15, tier - 1)).toFixed(3),
      techGate: structureTechGate("mining_types", tier),
      solarScaling: false,
    };
  }

  for (let tier = 1; tier <= MAX_STRUCTURE_TIER; tier++) {
    structures[`reactor_${tier}`] = {
      type: "reactor",
      tier,
      name: STRUCTURE_REACTOR_NAMES[tier - 1]!,
      cost: {
        materials: Math.round(30 * 2.2 ** (tier - 1)),
        energy: Math.round(5 * 2.2 ** (tier - 1)),
      },
      productionRate: +(3 * (1 + 0.30 * (tier - 1))).toFixed(2),
      operatingCost: 0,
      maintenanceCost: +(0.08 * (1 + 0.15 * (tier - 1))).toFixed(3),
      computeDemand: +(0.05 * Math.pow(1.10, tier - 1)).toFixed(3),
      techGate: structureTechGate("energy_types", tier),
      solarScaling: SOLAR_REACTOR_TIERS.has(tier),
    };
  }

  for (let tier = 1; tier <= MAX_STRUCTURE_TIER; tier++) {
    structures[`printer_${tier}`] = {
      type: "printer",
      tier,
      name: PRINTER_NAMES[tier - 1]!,
      cost: {
        materials: Math.round(80 * 2.2 ** (tier - 1)),
        energy: Math.round(15 * 2.2 ** (tier - 1)),
      },
      productionRate: +(0.8 * (1 + 0.12 * (tier - 1))).toFixed(2),
      operatingCost: +(0.5 * (1 + 0.10 * (tier - 1))).toFixed(2),
      maintenanceCost: +(0.2 * (1 + 0.15 * (tier - 1))).toFixed(3),
      computeDemand: +(0.15 * Math.pow(1.20, tier - 1)).toFixed(3),
      techGate: structureTechGate("manufacturing_types", tier),
      solarScaling: false,
    };
  }

  for (let tier = 1; tier <= MAX_STRUCTURE_TIER; tier++) {
    structures[`station_${tier}`] = {
      type: "station",
      tier,
      name: STATION_NAMES[tier - 1]!,
      cost: {
        materials: Math.round(60 * 2.2 ** (tier - 1)),
        energy: Math.round(12 * 2.2 ** (tier - 1)),
      },
      productionRate: +(1.5 * Math.pow(1.35, tier - 1)).toFixed(2),
      operatingCost: +(1.0 * Math.pow(1.20, tier - 1)).toFixed(2),
      maintenanceCost: +(0.08 * (1 + 0.15 * (tier - 1))).toFixed(3),
      computeDemand: 0,
      techGate: tier === 1 ? "station_types_t1" : structureTechGate("station_types", tier),
      solarScaling: false,
    };
  }

  return structures;
}

export const STRUCTURES: Record<string, StructureDefinition> = generateStructures();

export function structureKey(type: StructureType, tier: number): string {
  return `${type}_${tier}`;
}
