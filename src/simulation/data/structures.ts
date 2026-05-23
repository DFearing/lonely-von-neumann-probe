import type { StructureType } from "../state";
import { MAX_TIER } from "../state";

export interface StructureDefinition {
  type: StructureType;
  tier: number;
  name: string;
  cost: { materials: number; energy: number };
  productionRate: number;
  operatingCost: number;
  techGate: string | null;
  solarScaling: boolean;
}

const MINER_NAMES = [
  "Miner",
  "Auger Drill",
  "Subsurface Borer",
  "Plasma Cutter",
  "Seismic Extractor",
  "Deep Core Drill",
  "Molecular Sieve",
  "Plasma Excavator",
  "Gravitometric Miner",
  "Nanoscale Harvester",
  "Asteroid Cracker",
  "Tidal Extractor",
  "Dark Matter Dredge",
  "Quantum Tunneler",
  "Stellar Sampler",
  "Neutronium Drill",
  "Singularity Miner",
  "Dimensional Borer",
  "Void Collector",
  "Omniscient Extractor",
];

const REACTOR_NAMES = [
  "Basic Reactor",
  "Fusion Reactor",
  "Solar Harvester",
  "Plasma Containment Cell",
  "Antimatter Reactor",
  "Zero-Point Generator",
  "Stellar Wind Turbine",
  "Solar Dynamo Array",
  "Magnetohydrodynamic Plant",
  "Neutrino Collector",
  "Hawking Radiator",
  "Dyson Filament Node",
  "Quark-Gluon Reactor",
  "Solar Corona Tap",
  "Vacuum Energy Cell",
  "Dark Energy Condenser",
  "Cosmic String Generator",
  "Entropic Engine",
  "Brane Power Tap",
  "Omnipotent Reactor",
];

const PRINTER_NAMES = [
  "Basic 3D Printer",
  "Enhanced Printer",
  "Molecular Assembler",
  "Nanoscale Printer",
  "Swarm Fabricator",
  "Atomic Assembler",
  "Self-Healing Printer",
  "Networked Fabricator",
  "Quantum Lithographer",
  "Programmable Matter Forge",
  "Von Neumann Assembler",
  "Femtoscale Printer",
  "Phase-Shift Fabricator",
  "Dimensional Printer",
  "Reality Sculptor",
  "Subspace Fabricator",
  "Temporal Assembler",
  "Planck-Scale Printer",
  "Probability Forge",
  "Omnifabricator",
];

const SOLAR_REACTOR_TIERS = new Set([3, 8, 14]);

function generateStructures(): Record<string, StructureDefinition> {
  const structures: Record<string, StructureDefinition> = {};

  for (let tier = 1; tier <= MAX_TIER; tier++) {
    structures[`miner_${tier}`] = {
      type: "miner",
      tier,
      name: MINER_NAMES[tier - 1]!,
      cost: {
        materials: Math.round(30 * 1.18 ** (tier - 1)),
        energy: Math.round(10 * 1.18 ** (tier - 1)),
      },
      productionRate: +(20 * (1 + 0.15 * (tier - 1))).toFixed(2),
      operatingCost: +(1 * (1 + 0.12 * (tier - 1))).toFixed(2),
      techGate: tier === 1 ? null : `mining_t${tier}`,
      solarScaling: false,
    };
  }

  for (let tier = 1; tier <= MAX_TIER; tier++) {
    structures[`reactor_${tier}`] = {
      type: "reactor",
      tier,
      name: REACTOR_NAMES[tier - 1]!,
      cost: {
        materials: Math.round(10 * 1.18 ** (tier - 1)),
        energy: Math.round(2 * 1.18 ** (tier - 1)),
      },
      productionRate: +(10 * (1 + 0.15 * (tier - 1))).toFixed(2),
      operatingCost: +(1 * (1 + 0.08 * (tier - 1))).toFixed(2),
      techGate: tier === 1 ? null : `energy_t${tier}`,
      solarScaling: SOLAR_REACTOR_TIERS.has(tier),
    };
  }

  for (let tier = 1; tier <= MAX_TIER; tier++) {
    structures[`printer_${tier}`] = {
      type: "printer",
      tier,
      name: PRINTER_NAMES[tier - 1]!,
      cost: {
        materials: Math.round(30 * 1.18 ** (tier - 1)),
        energy: Math.round(10 * 1.18 ** (tier - 1)),
      },
      productionRate: +(1 * (1 + 0.12 * (tier - 1))).toFixed(2),
      operatingCost: +(0.5 * (1 + 0.10 * (tier - 1))).toFixed(2),
      techGate: tier === 1 ? null : `manufacturing_t${tier}`,
      solarScaling: false,
    };
  }

  return structures;
}

export const STRUCTURES: Record<string, StructureDefinition> = generateStructures();

export function structureKey(type: StructureType, tier: number): string {
  return `${type}_${tier}`;
}
