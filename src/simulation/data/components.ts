import type { CpuType, PropulsionType, ReactorType } from "../state";

export interface CpuDefinition {
  type: CpuType;
  name: string;
  cost: { materials: number; energy: number };
  computingOutput: number;
  miningOutput: number;
  printSpeed: number;
  techGate: string | null;
}

export interface PropulsionDefinition {
  type: PropulsionType;
  name: string;
  cost: { materials: number; energy: number };
  travelSpeed: number;
  autoReplicate: boolean;
  techGate: string | null;
}

export interface ReactorDefinition {
  type: ReactorType;
  name: string;
  cost: { materials: number; energy: number };
  energyMultiplier: number;
  operatingCostMultiplier: number;
  techGate: string | null;
}

export const CPUS: Record<CpuType, CpuDefinition> = {
  basic_cpu: {
    type: "basic_cpu",
    name: "Basic CPU",
    cost: { materials: 10, energy: 2 },
    computingOutput: 1,
    miningOutput: 5,
    printSpeed: 1,
    techGate: null,
  },
  enhanced_cpu: {
    type: "enhanced_cpu",
    name: "Enhanced CPU",
    cost: { materials: 30, energy: 6 },
    computingOutput: 2,
    miningOutput: 6.5,
    printSpeed: 1.3,
    techGate: "efficient_probes",
  },
  advanced_cpu: {
    type: "advanced_cpu",
    name: "Advanced CPU",
    cost: { materials: 80, energy: 16 },
    computingOutput: 5,
    miningOutput: 9,
    printSpeed: 1.8,
    techGate: "advanced_components",
  },
  quantum_cpu: {
    type: "quantum_cpu",
    name: "Quantum CPU",
    cost: { materials: 200, energy: 40 },
    computingOutput: 12,
    miningOutput: 12.5,
    printSpeed: 2.5,
    techGate: "von_neumann_replicators",
  },
} as const satisfies Record<CpuType, CpuDefinition>;

export const PROPULSIONS: Record<PropulsionType, PropulsionDefinition> = {
  basic_ion_drive: {
    type: "basic_ion_drive",
    name: "Basic Ion Drive",
    cost: { materials: 10, energy: 2 },
    travelSpeed: 1,
    autoReplicate: false,
    techGate: null,
  },
  efficient_drive: {
    type: "efficient_drive",
    name: "Efficient Drive",
    cost: { materials: 30, energy: 6 },
    travelSpeed: 1.5,
    autoReplicate: false,
    techGate: "efficient_probes",
  },
  advanced_drive: {
    type: "advanced_drive",
    name: "Advanced Drive",
    cost: { materials: 80, energy: 16 },
    travelSpeed: 2.5,
    autoReplicate: false,
    techGate: "advanced_components",
  },
  von_neumann_drive: {
    type: "von_neumann_drive",
    name: "Von Neumann Drive",
    cost: { materials: 200, energy: 40 },
    travelSpeed: 3,
    autoReplicate: true,
    techGate: "von_neumann_replicators",
  },
} as const satisfies Record<PropulsionType, PropulsionDefinition>;

export const REACTORS: Record<ReactorType, ReactorDefinition> = {
  basic_reactor: {
    type: "basic_reactor",
    name: "Basic Reactor",
    cost: { materials: 10, energy: 2 },
    energyMultiplier: 1,
    operatingCostMultiplier: 1,
    techGate: null,
  },
  fusion_reactor: {
    type: "fusion_reactor",
    name: "Fusion Reactor",
    cost: { materials: 30, energy: 6 },
    energyMultiplier: 1.5,
    operatingCostMultiplier: 0.8,
    techGate: "fusion_efficiency",
  },
  solar_harvester: {
    type: "solar_harvester",
    name: "Solar Harvester",
    cost: { materials: 25, energy: 5 },
    energyMultiplier: 1.2,
    operatingCostMultiplier: 0.5,
    techGate: "solar_harvesters",
  },
  exotic_reactor: {
    type: "exotic_reactor",
    name: "Exotic Reactor",
    cost: { materials: 100, energy: 25 },
    energyMultiplier: 2.5,
    operatingCostMultiplier: 0.6,
    techGate: "exotic_power",
  },
} as const satisfies Record<ReactorType, ReactorDefinition>;

export function totalProbeCost(
  cpu: CpuType,
  propulsion: PropulsionType,
  reactor: ReactorType,
): { materials: number; energy: number } {
  const c = CPUS[cpu];
  const p = PROPULSIONS[propulsion];
  const r = REACTORS[reactor];
  return {
    materials: c.cost.materials + p.cost.materials + r.cost.materials,
    energy: c.cost.energy + p.cost.energy + r.cost.energy,
  };
}
