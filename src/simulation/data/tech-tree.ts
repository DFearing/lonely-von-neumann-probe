import { MAX_TIER } from "../state";
import { MINER_NAMES, STRUCTURE_REACTOR_NAMES, PRINTER_NAMES } from "./structures";
import { CPU_NAMES, PROPULSION_NAMES, PROBE_REACTOR_NAMES } from "./components";

export interface TechDefinition {
  id: string;
  branchId: string;
  tier: number;
  name: string;
  initialCost: { materials: number; energy: number };
  continuousCost: number;
  researchTime: number;
  effects: string[];
  unlocks: string[];
  prerequisites: string[];
}

export const TECH_BRANCHES = [
  "mining_efficiency",
  "mining_types",
  "energy_production",
  "energy_types",
  "manufacturing_efficiency",
  "manufacturing_types",
  "probe_cpu",
  "probe_propulsion",
  "probe_reactors",
  "computing_speed",
  "computing_architecture",
  "communication",
] as const;

export type TechBranchId = (typeof TECH_BRANCHES)[number];

export const BRANCH_GROUPS = [
  { id: "mining", label: "Mining", branches: ["mining_efficiency", "mining_types"] },
  { id: "energy", label: "Energy", branches: ["energy_production", "energy_types"] },
  { id: "manufacturing", label: "Manufacturing", branches: ["manufacturing_efficiency", "manufacturing_types"] },
  { id: "probes", label: "Probes", branches: ["probe_cpu", "probe_propulsion", "probe_reactors"] },
  { id: "computing", label: "Computing", branches: ["computing_speed", "computing_architecture"] },
  { id: "communication", label: "Communication", branches: ["communication"] },
] as const;

function generateStructurePathNames(structureNames: readonly string[]): string[] {
  const names: string[] = [];
  for (let tier = 1; tier <= MAX_TIER; tier++) {
    if (tier % 4 === 0) {
      const structureTier = tier / 4 + 1;
      names.push(structureNames[structureTier - 1] ?? `Tier ${structureTier}`);
    } else {
      const nextUnlockTier = Math.ceil(tier / 4) * 4;
      const nextStructureTier = nextUnlockTier / 4 + 1;
      const nextName = structureNames[nextStructureTier - 1] ?? `Tier ${nextStructureTier}`;
      const phase = ((tier - 1) % 4) + 1;
      names.push(`Research Phase ${phase}/4 for ${nextName}`);
    }
  }
  return names;
}

const TECH_NAMES: Record<TechBranchId, string[]> = {
  mining_efficiency: [
    "Basic Yield Analysis",
    "Ore Grade Optimization",
    "Vein Tracking Algorithms",
    "Geological Resonance Mapping",
    "Selective Extraction Protocols",
    "Subsurface Density Profiling",
    "Molecular Separation Tuning",
    "Deep Strata Harmonics",
    "Gravitometric Yield Enhancement",
    "Nanoscale Ore Processing",
    "Asteroid Composition Analysis",
    "Tidal Extraction Efficiency",
    "Dark Matter Trace Filtering",
    "Quantum Yield Amplification",
    "Stellar Core Yield Maximization",
    "Neutronium Grade Optimization",
    "Singularity Extraction Efficiency",
    "Dimensional Yield Compounding",
    "Void Matter Purification",
    "Omniscient Resource Optimization",
  ],
  mining_types: generateStructurePathNames(MINER_NAMES),
  energy_production: [
    "Power Grid Tuning",
    "Thermal Coupling",
    "Plasma Containment Optimization",
    "Antimatter Yield Enhancement",
    "Zero-Point Field Tuning",
    "Stellar Wind Focusing",
    "Solar Dynamo Calibration",
    "Magnetohydrodynamic Efficiency",
    "Neutrino Capture Enhancement",
    "Hawking Radiation Focusing",
    "Dyson Filament Optimization",
    "Quark-Gluon Yield Enhancement",
    "Corona Siphon Calibration",
    "Vacuum Energy Amplification",
    "Dark Energy Condensation Tuning",
    "Cosmic String Resonance",
    "Entropic Reversal Efficiency",
    "Brane Energy Coupling",
    "Omnipotent Field Harmonics",
    "Universal Power Optimization",
  ],
  energy_types: generateStructurePathNames(STRUCTURE_REACTOR_NAMES),
  manufacturing_efficiency: [
    "Print Head Calibration",
    "Layer Optimization",
    "Molecular Bonding Enhancement",
    "Nanoscale Print Precision",
    "Swarm Coordination Protocols",
    "Atomic Placement Accuracy",
    "Self-Healing Print Matrices",
    "Printer Networking",
    "Quantum Print Alignment",
    "Programmable Matter Tuning",
    "Von Neumann Assembly Efficiency",
    "Femtoscale Precision Control",
    "Phase-Shift Print Optimization",
    "Dimensional Print Calibration",
    "Reality Sculpting Precision",
    "Subspace Fabrication Tuning",
    "Temporal Assembly Alignment",
    "Planck-Scale Precision",
    "Probability Forge Calibration",
    "Omnifabrication Efficiency",
  ],
  manufacturing_types: generateStructurePathNames(PRINTER_NAMES),
  probe_cpu: [
    "Enhanced Processors",
    "Multi-Core Architecture",
    "Neural Coprocessors",
    "Quantum Logic Units",
    "Adaptive Processing Cores",
    "Photonic CPU Arrays",
    "Neuromorphic Processors",
    "Probabilistic Engines",
    "Quantum Supreme Cores",
    "Hyperdimensional Processors",
    "Temporal Logic Units",
    "Consciousness Emulators",
    "Distributed Mind Cores",
    "Omniscient Processors",
    "Reality Computation Engines",
    "Planck-Time Processors",
    "Entropic Computing Cores",
    "Dimensional Reasoning Units",
    "Universal Mind Processors",
    "Transcendent CPU Arrays",
  ],
  probe_propulsion: [
    "Improved Ion Drives",
    "Plasma Thrusters",
    "Fusion Drives",
    "Antimatter Engines",
    "Solar Sail Arrays",
    "Magnetoplasma Rockets",
    "Bussard Ramjets",
    "Alcubierre Field Generators",
    "Graviton Thruster Arrays",
    "Warp Field Drives",
    "Subspace Engines",
    "Dimensional Shifters",
    "Temporal Drives",
    "Von Neumann Propulsion",
    "Singularity Thrusters",
    "Reality Anchor Drives",
    "Omniscient Navigation Cores",
    "Transcendent Drive Arrays",
    "Universal Propulsion Nexus",
    "Cosmic Translocation Engines",
  ],
  probe_reactors: [
    "Compact Reactors",
    "Miniature Fusion Cells",
    "Micro-Stellarators",
    "Antimatter Micro-Cores",
    "Zero-Point Modules",
    "Stellar Collector Cells",
    "Solar Dynamo Cores",
    "MHD Micro-Generators",
    "Neutrino Micro-Cells",
    "Hawking Radiation Cells",
    "Dyson Fragment Cores",
    "Quark Micro-Reactors",
    "Solar Siphon Modules",
    "Vacuum Energy Cells",
    "Dark Energy Micro-Cores",
    "Cosmic String Taps",
    "Entropic Micro-Cores",
    "Brane Tap Modules",
    "Omnipotent Micro-Cores",
    "Universal Power Cells",
  ],
  computing_speed: [
    "Clock Rate Optimization",
    "Pipeline Deepening",
    "Speculative Execution",
    "Branch Prediction Enhancement",
    "Cache Hierarchy Optimization",
    "Vector Processing Units",
    "Superscalar Execution",
    "Out-of-Order Processing",
    "Quantum Clock Synchronization",
    "Photonic Processing Speed",
    "Hyperdimensional Clock Rates",
    "Temporal Cycle Compression",
    "Consciousness-Speed Computing",
    "Distributed Clock Harmonics",
    "Omniscient Processing Speed",
    "Reality-Speed Computation",
    "Planck-Time Clock Cycles",
    "Entropic Processing Speed",
    "Dimensional Cycle Optimization",
    "Universal Clock Mastery",
  ],
  computing_architecture: [
    "Multi-Threaded Design",
    "Cluster Computing",
    "Neural Networks",
    "Parallel Processing",
    "Quantum Error Correction",
    "Topological Qubits",
    "Photonic Architecture",
    "Neuromorphic Networks",
    "Probabilistic Architecture",
    "Concurrent Research Systems",
    "Hyperdimensional Architecture",
    "Temporal Logic Architecture",
    "Consciousness Emulation Architecture",
    "Distributed Intelligence",
    "Omniscient Architecture",
    "Reality Simulation Architecture",
    "Planck-Scale Architecture",
    "Entropic Architecture",
    "Dimensional Architecture",
    "Universal Architecture",
  ],
  communication: [
    "Basic Transmission",
    "Enhanced Scanning",
    "Tightbeam Protocols",
    "Quantum Key Distribution",
    "Entangled Particle Relay",
    "Neutrino Messaging",
    "Gravitational Wave Comm",
    "Subspace Beacons",
    "Tachyon Burst Transmitters",
    "Dark Matter Resonance",
    "Dimensional Echo Relay",
    "Temporal Signal Routing",
    "Wormhole Bandwidth",
    "Consciousness Transfer",
    "Reality Wave Modulation",
    "Planck-Scale Signaling",
    "Brane Resonance Comm",
    "Zero Latency Communication",
    "Universal Translation",
    "Omniscient Awareness",
  ],
};

function techIdForBranch(branchId: string, tier: number): string {
  return `${branchId}_t${tier}`;
}

function generateEffects(branchId: string, tier: number): string[] {
  switch (branchId) {
    case "mining_efficiency": {
      const bonus = 10 + 0.5 * (tier - 1);
      return [`+${bonus}% mining output`];
    }
    case "mining_types": {
      if (tier % 4 === 0) {
        const structureTier = tier / 4 + 1;
        const name = MINER_NAMES[structureTier - 1] ?? `Tier ${structureTier} Miner`;
        return [`Unlock ${name}`];
      }
      const nextUnlockTier = Math.ceil(tier / 4) * 4;
      const nextStructureTier = nextUnlockTier / 4 + 1;
      const nextName = MINER_NAMES[nextStructureTier - 1] ?? `Tier ${nextStructureTier} Miner`;
      return [`Research phase toward ${nextName}`];
    }
    case "energy_production": {
      const bonus = 8 + 0.4 * (tier - 1);
      return [`+${bonus}% energy output`];
    }
    case "energy_types": {
      if (tier % 4 === 0) {
        const structureTier = tier / 4 + 1;
        const name = STRUCTURE_REACTOR_NAMES[structureTier - 1] ?? `Tier ${structureTier} Reactor`;
        return [`Unlock ${name}`];
      }
      const nextUnlockTier = Math.ceil(tier / 4) * 4;
      const nextStructureTier = nextUnlockTier / 4 + 1;
      const nextName = STRUCTURE_REACTOR_NAMES[nextStructureTier - 1] ?? `Tier ${nextStructureTier} Reactor`;
      return [`Research phase toward ${nextName}`];
    }
    case "manufacturing_efficiency": {
      const bonus = 5 + 0.3 * (tier - 1);
      return [`+${bonus}% manufacturing output`];
    }
    case "manufacturing_types": {
      if (tier % 4 === 0) {
        const structureTier = tier / 4 + 1;
        const name = PRINTER_NAMES[structureTier - 1] ?? `Tier ${structureTier} Printer`;
        return [`Unlock ${name}`];
      }
      const nextUnlockTier = Math.ceil(tier / 4) * 4;
      const nextStructureTier = nextUnlockTier / 4 + 1;
      const nextName = PRINTER_NAMES[nextStructureTier - 1] ?? `Tier ${nextStructureTier} Printer`;
      return [`Research phase toward ${nextName}`];
    }
    case "probe_cpu": {
      const name = CPU_NAMES[tier - 1] ?? `Tier ${tier} CPU`;
      return [`Unlock ${name}`];
    }
    case "probe_propulsion": {
      const name = PROPULSION_NAMES[tier - 1] ?? `Tier ${tier} propulsion`;
      return [`Unlock ${name}`];
    }
    case "probe_reactors": {
      const name = PROBE_REACTOR_NAMES[tier - 1] ?? `Tier ${tier} probe reactor`;
      return [`Unlock ${name}`];
    }
    case "computing_speed": {
      const bonus = 6 + 0.4 * (tier - 1);
      return [`+${bonus}% research speed`];
    }
    case "computing_architecture": {
      if (tier === 4) return ["Unlock parallel processing (2 concurrent research)"];
      if (tier === 10) return ["Unlock 3 concurrent research projects"];
      if (tier === 14) return ["Unlock distributed intelligence"];
      const bonus = 2 + 0.2 * (tier - 1);
      return [`+${bonus}% computing efficiency`];
    }
    case "communication": {
      const bonus = 10 + 5 * (tier - 1);
      return [`+${bonus}% communication range`];
    }
    default:
      return [];
  }
}

function generateUnlocks(branchId: string, tier: number): string[] {
  switch (branchId) {
    case "mining_types":
      if (tier % 4 === 0) return [`miner_${tier / 4 + 1}`];
      return [];
    case "energy_types":
      if (tier % 4 === 0) return [`reactor_${tier / 4 + 1}`];
      return [];
    case "manufacturing_types":
      if (tier % 4 === 0) return [`printer_${tier / 4 + 1}`];
      return [];
    case "probe_cpu":
      if (tier >= 2) return [`cpu_t${tier}`];
      return [];
    case "probe_propulsion":
      if (tier >= 2) return [`prop_t${tier}`];
      return [];
    case "probe_reactors":
      if (tier >= 2) return [`rct_t${tier}`];
      return [];
    default:
      return [];
  }
}

function generatePrerequisites(branchId: string, tier: number): string[] {
  const crossGates: Record<string, { from: string; gates: [number, number][] }> = {
    mining_types: {
      from: "mining_efficiency",
      gates: [[4, 2], [8, 5], [12, 8], [16, 12], [20, 16]],
    },
    energy_types: {
      from: "energy_production",
      gates: [[4, 2], [8, 5], [12, 8], [16, 12], [20, 16]],
    },
    manufacturing_types: {
      from: "manufacturing_efficiency",
      gates: [[4, 2], [8, 5], [12, 8], [16, 12], [20, 16]],
    },
  };

  const config = crossGates[branchId];
  if (!config) return [];

  const prereqs: string[] = [];
  for (const [gateTier, reqTier] of config.gates) {
    if (tier >= gateTier) {
      prereqs.push(`${config.from}_t${reqTier}`);
    }
  }
  return prereqs;
}

function generateTechTree(): Record<string, TechDefinition> {
  const tree: Record<string, TechDefinition> = {};

  for (const branchId of TECH_BRANCHES) {
    const names = TECH_NAMES[branchId];
    for (let tier = 1; tier <= MAX_TIER; tier++) {
      const id = techIdForBranch(branchId, tier);
      tree[id] = {
        id,
        branchId,
        tier,
        name: names[tier - 1]!,
        initialCost: {
          materials: Math.round(25 * 1.22 ** (tier - 1)),
          energy: Math.round(5 * 1.25 ** (tier - 1)),
        },
        continuousCost: Math.round(5 * 1.18 ** (tier - 1)),
        researchTime: Math.round(60 * 1.20 ** (tier - 1)),
        effects: generateEffects(branchId, tier),
        unlocks: generateUnlocks(branchId, tier),
        prerequisites: generatePrerequisites(branchId, tier),
      };
    }
  }

  return tree;
}

export const TECH_TREE: Record<string, TechDefinition> = generateTechTree();

export function techsInBranch(branchId: string): TechDefinition[] {
  return Object.values(TECH_TREE)
    .filter((t) => t.branchId === branchId)
    .sort((a, b) => a.tier - b.tier);
}

export function techAtTier(
  branchId: string,
  tier: number,
): TechDefinition | undefined {
  return Object.values(TECH_TREE).find(
    (t) => t.branchId === branchId && t.tier === tier,
  );
}
