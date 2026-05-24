import { MAX_TIER } from "../state";

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
  operatingCostMultiplier: number;
  solarScaling: boolean;
  techGate: string | null;
}

export const CPU_NAMES = [
  "Basic CPU",
  "Enhanced CPU",
  "Advanced CPU",
  "Neural Processor",
  "Quantum Core",
  "Adaptive Processor",
  "Photonic CPU",
  "Neuromorphic Core",
  "Probabilistic Engine",
  "Quantum Supreme CPU",
  "Hyperdimensional Core",
  "Temporal Logic Unit",
  "Consciousness Emulator",
  "Distributed Mind",
  "Omniscient Core",
  "Reality Engine",
  "Planck Processor",
  "Entropic Computer",
  "Dimensional Reasoner",
  "Universal Mind",
];

export const PROPULSION_NAMES = [
  "Basic Ion Drive",
  "Efficient Drive",
  "Advanced Drive",
  "Plasma Thruster",
  "Fusion Torch",
  "Antimatter Drive",
  "Solar Sail Array",
  "Magnetoplasma Rocket",
  "Bussard Ramjet",
  "Alcubierre Bubble",
  "Graviton Thruster",
  "Warp Field Drive",
  "Subspace Engine",
  "Dimensional Shifter",
  "Temporal Drive",
  "Von Neumann Drive",
  "Singularity Thruster",
  "Reality Anchor Drive",
  "Omniscient Navigator",
  "Transcendent Drive",
];

export const PROBE_REACTOR_NAMES = [
  "Basic Reactor",
  "Fusion Reactor",
  "Solar Harvester",
  "Plasma Cell",
  "Antimatter Core",
  "Zero-Point Module",
  "Stellar Collector",
  "Solar Dynamo",
  "MHD Generator",
  "Neutrino Cell",
  "Hawking Cell",
  "Dyson Fragment",
  "Quark Reactor",
  "Solar Siphon",
  "Vacuum Cell",
  "Dark Energy Core",
  "Cosmic String Tap",
  "Entropic Core",
  "Brane Tap",
  "Omnipotent Core",
];

const SOLAR_REACTOR_TIERS = new Set([3, 8, 14]);

function generateCpus(): Record<string, CpuDefinition> {
  const cpus: Record<string, CpuDefinition> = {};
  for (let tier = 1; tier <= MAX_TIER; tier++) {
    const id = `cpu_t${tier}`;
    cpus[id] = {
      type: id,
      name: CPU_NAMES[tier - 1]!,
      cost: {
        materials: Math.round(10 * 1.20 ** (tier - 1)),
        energy: Math.round(2 * 1.20 ** (tier - 1)),
      },
      computingOutput: +(1 * 1.15 ** (tier - 1)).toFixed(2),
      miningOutput: +(5 * (1 + 0.08 * (tier - 1))).toFixed(2),
      printSpeed: +(1 * (1 + 0.06 * (tier - 1))).toFixed(2),
      techGate: tier === 1 ? null : `probe_cpu_t${tier}`,
    };
  }
  return cpus;
}

function generatePropulsions(): Record<string, PropulsionDefinition> {
  const propulsions: Record<string, PropulsionDefinition> = {};
  for (let tier = 1; tier <= MAX_TIER; tier++) {
    const id = `prop_t${tier}`;
    propulsions[id] = {
      type: id,
      name: PROPULSION_NAMES[tier - 1]!,
      cost: {
        materials: Math.round(10 * 1.20 ** (tier - 1)),
        energy: Math.round(2 * 1.20 ** (tier - 1)),
      },
      travelSpeed: +(1 * (1 + 0.10 * (tier - 1))).toFixed(2),
      autoReplicate: tier >= 16,
      techGate: tier === 1 ? null : `probe_propulsion_t${tier}`,
    };
  }
  return propulsions;
}

function generateReactors(): Record<string, ReactorDefinition> {
  const reactors: Record<string, ReactorDefinition> = {};
  for (let tier = 1; tier <= MAX_TIER; tier++) {
    const id = `rct_t${tier}`;
    reactors[id] = {
      type: id,
      name: PROBE_REACTOR_NAMES[tier - 1]!,
      cost: {
        materials: Math.round(10 * 1.20 ** (tier - 1)),
        energy: Math.round(2 * 1.20 ** (tier - 1)),
      },
      energyMultiplier: +(1 * (1 + 0.08 * (tier - 1))).toFixed(2),
      operatingCostMultiplier: +(1 * 0.98 ** (tier - 1)).toFixed(2),
      solarScaling: SOLAR_REACTOR_TIERS.has(tier),
      techGate: tier === 1 ? null : `probe_reactors_t${tier}`,
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
