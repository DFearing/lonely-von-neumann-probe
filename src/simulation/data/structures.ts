import type { StructureType } from "../state";

export interface StructureDefinition {
  type: StructureType;
  tier: number;
  name: string;
  cost: { materials: number; energy: number };
  productionRate: number;
  operatingCost: number;
  techGate: string | null;
}

export const STRUCTURES: Record<string, StructureDefinition> = {
  miner_1: {
    type: "miner",
    tier: 1,
    name: "Miner",
    cost: { materials: 30, energy: 10 },
    productionRate: 20,
    operatingCost: 0,
    techGate: null,
  },

  reactor_1: {
    type: "reactor",
    tier: 1,
    name: "Basic Reactor",
    cost: { materials: 10, energy: 2 },
    productionRate: 10,
    operatingCost: 1,
    techGate: null,
  },
  reactor_2: {
    type: "reactor",
    tier: 2,
    name: "Fusion Reactor",
    cost: { materials: 30, energy: 6 },
    productionRate: 15,
    operatingCost: 0.8,
    techGate: "fusion_efficiency",
  },
  reactor_3: {
    type: "reactor",
    tier: 3,
    name: "Solar Harvester",
    cost: { materials: 25, energy: 5 },
    productionRate: 12,
    operatingCost: 0.5,
    techGate: "solar_harvesters",
  },
  reactor_4: {
    type: "reactor",
    tier: 4,
    name: "Exotic Reactor",
    cost: { materials: 100, energy: 25 },
    productionRate: 25,
    operatingCost: 0.6,
    techGate: "exotic_power",
  },

  printer_1: {
    type: "printer",
    tier: 1,
    name: "Basic 3D Printer",
    cost: { materials: 30, energy: 10 },
    productionRate: 1,
    operatingCost: 0,
    techGate: null,
  },
  printer_2: {
    type: "printer",
    tier: 2,
    name: "Enhanced Printer",
    cost: { materials: 80, energy: 25 },
    productionRate: 1.5,
    operatingCost: 0,
    techGate: "faster_printing",
  },
  printer_3: {
    type: "printer",
    tier: 3,
    name: "Advanced Printer",
    cost: { materials: 200, energy: 60 },
    productionRate: 2.5,
    operatingCost: 0,
    techGate: "complex_objects",
  },
  printer_4: {
    type: "printer",
    tier: 4,
    name: "Automated Assembly",
    cost: { materials: 500, energy: 150 },
    productionRate: 4,
    operatingCost: 0,
    techGate: "automated_assembly",
  },
} as const satisfies Record<string, StructureDefinition>;

export function structureKey(type: StructureType, tier: number): string {
  return `${type}_${tier}`;
}
