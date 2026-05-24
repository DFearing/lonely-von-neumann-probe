import { MAX_STRUCTURE_TIER } from "../state";

export interface CpuDefinition {
  type: string;
  name: string;
  cost: { materials: number; energy: number };
  computingOutput: number;
  miningOutput: number;
  printSpeed: number;
  techGate: string | null;
}

export interface PropulsionDefinition {
  type: string;
  name: string;
  cost: { materials: number; energy: number };
  travelSpeed: number;
  autoReplicate: boolean;
  techGate: string | null;
}

export interface ReactorDefinition {
  type: string;
  name: string;
  cost: { materials: number; energy: number };
  energyMultiplier: number;
  solarScaling: boolean;
  techGate: string | null;
}

export const CPU_NAMES = [
  "Basic CPU",
  "Neural Processor",
  "Quantum Core",
  "Photonic CPU",
  "Quantum Supreme CPU",
  "Universal Mind",
];

export const PROPULSION_NAMES = [
  "Basic Ion Drive",
  "Plasma Thruster",
  "Fusion Torch",
  "Antimatter Drive",
  "Warp Field Drive",
  "Transcendent Drive",
];

export const PROBE_REACTOR_NAMES = [
  "Basic Reactor",
  "Fusion Reactor",
  "Antimatter Core",
  "Zero-Point Module",
  "Dark Energy Core",
  "Omnipotent Core",
];

const SOLAR_REACTOR_TIERS = new Set([3]);

function componentTechGate(branchPrefix: string, tier: number): string | null {
  if (tier === 1) return null;
  return `${branchPrefix}_t${(tier - 1) * 4}`;
}

function generateCpus(): Record<string, CpuDefinition> {
  const cpus: Record<string, CpuDefinition> = {};
  for (let tier = 1; tier <= MAX_STRUCTURE_TIER; tier++) {
    const id = `cpu_t${tier}`;
    cpus[id] = {
      type: id,
      name: CPU_NAMES[tier - 1]!,
      cost: {
        materials: Math.round(15 * 2.2 ** (tier - 1)),
        energy: Math.round(3 * 2.2 ** (tier - 1)),
      },
      computingOutput: +(1 * 1.15 ** (tier - 1)).toFixed(2),
      miningOutput: +(5 * (1 + 0.30 * (tier - 1))).toFixed(2),
      printSpeed: +(1 * (1 + 0.12 * (tier - 1))).toFixed(2),
      techGate: componentTechGate("probe_cpu", tier),
    };
  }
  return cpus;
}

function generatePropulsions(): Record<string, PropulsionDefinition> {
  const propulsions: Record<string, PropulsionDefinition> = {};
  for (let tier = 1; tier <= MAX_STRUCTURE_TIER; tier++) {
    const id = `prop_t${tier}`;
    propulsions[id] = {
      type: id,
      name: PROPULSION_NAMES[tier - 1]!,
      cost: {
        materials: Math.round(15 * 2.2 ** (tier - 1)),
        energy: Math.round(3 * 2.2 ** (tier - 1)),
      },
      travelSpeed: +(1 * (1 + 0.30 * (tier - 1))).toFixed(2),
      autoReplicate: tier >= 5,
      techGate: componentTechGate("probe_propulsion", tier),
    };
  }
  return propulsions;
}

function generateReactors(): Record<string, ReactorDefinition> {
  const reactors: Record<string, ReactorDefinition> = {};
  for (let tier = 1; tier <= MAX_STRUCTURE_TIER; tier++) {
    const id = `rct_t${tier}`;
    reactors[id] = {
      type: id,
      name: PROBE_REACTOR_NAMES[tier - 1]!,
      cost: {
        materials: Math.round(15 * 2.2 ** (tier - 1)),
        energy: Math.round(3 * 2.2 ** (tier - 1)),
      },
      energyMultiplier: +(1 * (1 + 0.30 * (tier - 1))).toFixed(2),
      solarScaling: SOLAR_REACTOR_TIERS.has(tier),
      techGate: componentTechGate("probe_reactors", tier),
    };
  }
  return reactors;
}

export const CPUS: Record<string, CpuDefinition> = generateCpus();
export const PROPULSIONS: Record<string, PropulsionDefinition> = generatePropulsions();
export const REACTORS: Record<string, ReactorDefinition> = generateReactors();

export function totalProbeCost(
  cpu: string,
  propulsion: string,
  reactor: string,
): { materials: number; energy: number } {
  const c = CPUS[cpu];
  const p = PROPULSIONS[propulsion];
  const r = REACTORS[reactor];
  return {
    materials: (c?.cost.materials ?? 0) + (p?.cost.materials ?? 0) + (r?.cost.materials ?? 0),
    energy: (c?.cost.energy ?? 0) + (p?.cost.energy ?? 0) + (r?.cost.energy ?? 0),
  };
}
