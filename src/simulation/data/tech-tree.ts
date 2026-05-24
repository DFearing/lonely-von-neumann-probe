import { MAX_TIER } from "../state";
import { STRUCTURES, MINER_NAMES, STRUCTURE_REACTOR_NAMES, PRINTER_NAMES, STATION_NAMES } from "./structures";
import { CPUS, PROPULSIONS, REACTORS, CPU_NAMES, PROPULSION_NAMES, PROBE_REACTOR_NAMES } from "./components";

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
  "station_efficiency",
  "station_types",
  "probe_cpu",
  "probe_propulsion",
  "probe_reactors",
  "computing_speed",
  "computing_architecture",
  "communication",
  "communication_speed",
] as const;

export type TechBranchId = (typeof TECH_BRANCHES)[number];

export const BRANCH_GROUPS = [
  { id: "mining", label: "Mining", branches: ["mining_efficiency", "mining_types"] },
  { id: "energy", label: "Energy", branches: ["energy_production", "energy_types"] },
  { id: "manufacturing", label: "Printing", branches: ["manufacturing_efficiency", "manufacturing_types"] },
  { id: "stations", label: "Stations", branches: ["station_efficiency", "station_types"] },
  { id: "probes", label: "Probes", branches: ["probe_cpu", "probe_propulsion", "probe_reactors"] },
  { id: "computing", label: "Computing", branches: ["computing_speed", "computing_architecture"] },
  { id: "communication", label: "Communication", branches: ["communication", "communication_speed"] },
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
  station_efficiency: [
    "Thermal Load Balancing",
    "Instruction Cache Tuning",
    "Memory Bus Optimization",
    "Core Frequency Scaling",
    "Pipeline Throughput Analysis",
    "Neural Network Accelerators",
    "Predictive Workload Routing",
    "Holographic Memory Alignment",
    "Quantum Register Widening",
    "Cryogenic Superconducting Cores",
    "Gravitometric Clock Synchronization",
    "Dark Matter Computation Layers",
    "Stellar Flux Processing",
    "Dimensional Gate Pipelining",
    "Void Resonance Amplification",
    "Neutronium Logic Density",
    "Singularity Compute Focusing",
    "Brane Topology Optimization",
    "Entropic Cycle Harvesting",
    "Omniscient Processing Matrices",
  ],
  station_types: generateStructurePathNames(STATION_NAMES),
  probe_cpu: generateStructurePathNames(CPU_NAMES),
  probe_propulsion: generateStructurePathNames(PROPULSION_NAMES),
  probe_reactors: generateStructurePathNames(PROBE_REACTOR_NAMES),
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
    "Deep Space Relay Network",
    "Universal Translation",
    "Omniscient Awareness",
  ],
  communication_speed: [
    "Signal Amplification",
    "Carrier Wave Optimization",
    "Error Correction Protocols",
    "Burst Compression",
    "Parallel Channel Encoding",
    "Quantum Entanglement Relay",
    "Superluminal Modulation",
    "Tachyon Pulse Tuning",
    "Phase-Locked Signal Chains",
    "Temporal Pre-Echo Detection",
    "Wormhole Bandwidth Shaping",
    "Dark Energy Signal Boost",
    "Dimensional Shortcut Routing",
    "Acausal Signal Propagation",
    "Consciousness Packet Transfer",
    "Reality Fold Transmission",
    "Planck-Frame Encoding",
    "Entropic Signal Reversal",
    "Universal Frequency Mastery",
    "Instantaneous Omnipresence",
  ],
};

function techIdForBranch(branchId: string, tier: number): string {
  return `${branchId}_t${tier}`;
}

function generateEffects(branchId: string, tier: number): string[] {
  switch (branchId) {
    case "mining_efficiency": {
      const bonus = 10 + 0.5 * (tier - 1);
      return [`+${+bonus.toFixed(1)}% mining output`];
    }
    case "mining_types": {
      if (tier % 4 === 0) {
        const structureTier = tier / 4 + 1;
        const name = MINER_NAMES[structureTier - 1] ?? `Tier ${structureTier} Miner`;
        const def = STRUCTURES[`miner_${structureTier}`];
        const effects = [`Unlock ${name}`];
        if (def) effects.push(`+${def.productionRate} tons/year mining, ${def.operatingCost} MW demand`);
        return effects;
      }
      const nextUnlockTier = Math.ceil(tier / 4) * 4;
      const nextStructureTier = nextUnlockTier / 4 + 1;
      const nextName = MINER_NAMES[nextStructureTier - 1] ?? `Tier ${nextStructureTier} Miner`;
      return [`Research phase toward ${nextName}`];
    }
    case "energy_production": {
      const bonus = 8 + 0.4 * (tier - 1);
      return [`+${+bonus.toFixed(1)}% energy output`];
    }
    case "energy_types": {
      if (tier % 4 === 0) {
        const structureTier = tier / 4 + 1;
        const name = STRUCTURE_REACTOR_NAMES[structureTier - 1] ?? `Tier ${structureTier} Reactor`;
        const def = STRUCTURES[`reactor_${structureTier}`];
        const effects = [`Unlock ${name}`];
        if (def) effects.push(`+${def.productionRate} MW supply`);
        return effects;
      }
      const nextUnlockTier = Math.ceil(tier / 4) * 4;
      const nextStructureTier = nextUnlockTier / 4 + 1;
      const nextName = STRUCTURE_REACTOR_NAMES[nextStructureTier - 1] ?? `Tier ${nextStructureTier} Reactor`;
      return [`Research phase toward ${nextName}`];
    }
    case "manufacturing_efficiency": {
      const bonus = 5 + 0.3 * (tier - 1);
      return [`+${+bonus.toFixed(1)}% manufacturing output`];
    }
    case "manufacturing_types": {
      if (tier % 4 === 0) {
        const structureTier = tier / 4 + 1;
        const name = PRINTER_NAMES[structureTier - 1] ?? `Tier ${structureTier} Printer`;
        const def = STRUCTURES[`printer_${structureTier}`];
        const effects = [`Unlock ${name}`];
        if (def) effects.push(`${def.productionRate} BP, ${def.operatingCost} MW demand`);
        return effects;
      }
      const nextUnlockTier = Math.ceil(tier / 4) * 4;
      const nextStructureTier = nextUnlockTier / 4 + 1;
      const nextName = PRINTER_NAMES[nextStructureTier - 1] ?? `Tier ${nextStructureTier} Printer`;
      return [`Research phase toward ${nextName}`];
    }
    case "probe_cpu": {
      if (tier % 4 === 0) {
        const componentTier = tier / 4 + 1;
        const name = CPU_NAMES[componentTier - 1] ?? `Tier ${componentTier} CPU`;
        const def = CPUS[`cpu_t${componentTier}`];
        const effects = [`Unlock ${name}`];
        if (def) effects.push(`${def.computingOutput} TFLOPS, ${def.miningOutput} tons/year gather, ${def.printSpeed}× print`);
        return effects;
      }
      const nextTier = Math.ceil(tier / 4) * 4;
      const nextComponentTier = nextTier / 4 + 1;
      const nextName = CPU_NAMES[nextComponentTier - 1] ?? `Tier ${nextComponentTier} CPU`;
      return [`Research phase toward ${nextName}`];
    }
    case "probe_propulsion": {
      if (tier % 4 === 0) {
        const componentTier = tier / 4 + 1;
        const name = PROPULSION_NAMES[componentTier - 1] ?? `Tier ${componentTier} propulsion`;
        const def = PROPULSIONS[`prop_t${componentTier}`];
        const effects = [`Unlock ${name}`];
        if (def) effects.push(`${def.travelSpeed} ly/year travel${def.autoReplicate ? ", auto-replicate" : ""}`);
        return effects;
      }
      const nextTier = Math.ceil(tier / 4) * 4;
      const nextComponentTier = nextTier / 4 + 1;
      const nextName = PROPULSION_NAMES[nextComponentTier - 1] ?? `Tier ${nextComponentTier} propulsion`;
      return [`Research phase toward ${nextName}`];
    }
    case "probe_reactors": {
      if (tier % 4 === 0) {
        const componentTier = tier / 4 + 1;
        const name = PROBE_REACTOR_NAMES[componentTier - 1] ?? `Tier ${componentTier} reactor`;
        const def = REACTORS[`rct_t${componentTier}`];
        const effects = [`Unlock ${name}`];
        if (def) effects.push(`${def.energyMultiplier}× MW output`);
        return effects;
      }
      const nextTier = Math.ceil(tier / 4) * 4;
      const nextComponentTier = nextTier / 4 + 1;
      const nextName = PROBE_REACTOR_NAMES[nextComponentTier - 1] ?? `Tier ${nextComponentTier} reactor`;
      return [`Research phase toward ${nextName}`];
    }
    case "computing_speed": {
      const bonus = 6 + 0.4 * (tier - 1);
      return [`+${+bonus.toFixed(1)}% research speed`];
    }
    case "station_efficiency": {
      const bonus = 4 + 0.3 * (tier - 1);
      return [`+${+bonus.toFixed(1)}% station computing output`];
    }
    case "station_types": {
      if (tier % 4 === 0) {
        const structureTier = tier / 4 + 1;
        const name = STATION_NAMES[structureTier - 1] ?? `Tier ${structureTier} Station`;
        const def = STRUCTURES[`station_${structureTier}`];
        const effects = [`Unlock ${name}`];
        if (def) effects.push(`${def.productionRate} TFLOPS`);
        return effects;
      }
      const nextUnlockTier = Math.ceil(tier / 4) * 4;
      const nextStructureTier = nextUnlockTier / 4 + 1;
      const nextName = STATION_NAMES[nextStructureTier - 1] ?? `Tier ${nextStructureTier} Station`;
      return [`Research phase toward ${nextName}`];
    }
    case "computing_architecture": {
      const effects: string[] = [];

      if (tier === 4) effects.push("Unlock parallel processing (2 concurrent research)");
      if (tier === 10) effects.push("Unlock 3 concurrent research projects");
      if (tier === 14) effects.push("Unlock distributed intelligence");

      if (effects.length === 0) {
        const bonus = 2 + 0.2 * (tier - 1);
        effects.push(`+${+bonus.toFixed(1)}% computing efficiency`);
      }

      return effects;
    }
    case "communication": {
      if (tier === 20) return ["Universal range — detect all systems"];
      const bonus = 10 + 5 * (tier - 1);
      return [`+${bonus}% communication range`];
    }
    case "communication_speed": {
      if (tier === 20) return ["Zero latency communication"];
      const bonus = +(tier * 100 / 190).toFixed(1);
      return [`+${bonus}% signal speed`];
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
      if (tier % 4 === 0) return [`cpu_t${tier / 4 + 1}`];
      return [];
    case "probe_propulsion":
      if (tier % 4 === 0) return [`prop_t${tier / 4 + 1}`];
      return [];
    case "probe_reactors":
      if (tier % 4 === 0) return [`rct_t${tier / 4 + 1}`];
      return [];
    case "station_types":
      if (tier % 4 === 0) return [`station_${tier / 4 + 1}`];
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
    station_types: {
      from: "station_efficiency",
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
          materials: Math.round(40 * 1.22 ** (tier - 1)),
          energy: Math.round(10 * 1.25 ** (tier - 1)),
        },
        continuousCost: Math.round(3 * 1.18 ** (tier - 1)),
        researchTime: Math.round(120 * 1.20 ** (tier - 1)),
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
