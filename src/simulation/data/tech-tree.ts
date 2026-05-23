import { MAX_TIER } from "../state";

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
}

export const TECH_BRANCHES = [
  "mining",
  "energy",
  "manufacturing",
  "probe_components",
  "computing",
  "communication",
] as const;

export type TechBranchId = (typeof TECH_BRANCHES)[number];

const TECH_NAMES: Record<TechBranchId, string[]> = {
  mining: [
    "Basic Mining Techniques",
    "Mineral Separation",
    "Subsurface Scanning",
    "Drill Optimization",
    "Seismic Fracturing",
    "Deep Core Extraction",
    "Molecular Sifting",
    "Plasma Drilling",
    "Gravitometric Surveying",
    "Nanoscale Extraction",
    "Asteroid Disassembly",
    "Tidal Force Mining",
    "Dark Matter Filtering",
    "Quantum Tunneling Drills",
    "Stellar Core Sampling",
    "Neutronium Harvesting",
    "Singularity Mining",
    "Dimensional Excavation",
    "Void Matter Collection",
    "Omniscient Extraction",
  ],
  energy: [
    "Basic Reactors",
    "Fusion Efficiency",
    "Solar Harvesters",
    "Plasma Containment",
    "Antimatter Coupling",
    "Zero-Point Tapping",
    "Stellar Wind Capture",
    "Solar Dynamo Arrays",
    "Magnetohydrodynamic Generators",
    "Neutrino Harvesting",
    "Hawking Radiation Capture",
    "Dyson Filament Weaving",
    "Quark-Gluon Extraction",
    "Solar Corona Siphoning",
    "Vacuum Energy Extraction",
    "Dark Energy Condensation",
    "Cosmic String Harvesting",
    "Entropic Reversal Engines",
    "Brane Energy Tapping",
    "Omnipotent Power Core",
  ],
  manufacturing: [
    "Faster Printing",
    "Complex Object Fabrication",
    "Molecular Assembly",
    "Nanoscale Printing",
    "Swarm Fabrication",
    "Atomic Precision Assembly",
    "Self-Healing Structures",
    "Printer Networking",
    "Quantum Lithography",
    "Programmable Matter",
    "Von Neumann Assemblers",
    "Femtoscale Engineering",
    "Phase-Shifted Construction",
    "Dimensional Printing",
    "Reality Sculpting",
    "Subspace Fabrication",
    "Temporal Construction",
    "Planck-Scale Assembly",
    "Probability Forging",
    "Omnifabrication",
  ],
  probe_components: [
    "Efficient Probes",
    "Advanced Components",
    "Specialized Probes",
    "Hardened Systems",
    "Modular Architecture",
    "Adaptive Firmware",
    "Neural Processing Cores",
    "Quantum Entangled Sensors",
    "Self-Evolving Software",
    "Metamaterial Hulls",
    "Gravimetric Shielding",
    "Warp Field Generators",
    "Subspace Transceivers",
    "Dimensional Phasing",
    "Temporal Stabilizers",
    "Von Neumann Replicators",
    "Singularity Drives",
    "Reality Anchors",
    "Omniscient Navigation",
    "Transcendent Probes",
  ],
  computing: [
    "Basic Computing",
    "Distributed Algorithms",
    "Neural Network Processors",
    "Parallel Processing",
    "Quantum Error Correction",
    "Topological Qubits",
    "Photonic Computing",
    "Neuromorphic Architecture",
    "Probabilistic Processors",
    "Quantum Supremacy",
    "Hyperdimensional Computing",
    "Temporal Logic Gates",
    "Consciousness Emulation",
    "Distributed Intelligence",
    "Omniscient Computation",
    "Reality Simulation Engines",
    "Planck-Time Processing",
    "Entropic Computation",
    "Dimensional Reasoning",
    "Universal Computation",
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
  const bonusPercent = 10 + 5 * (tier - 1);
  switch (branchId) {
    case "mining":
      return [`+${bonusPercent}% mining output`];
    case "energy":
      return [`Unlock tier ${tier} energy structures`];
    case "manufacturing":
      return [`+${bonusPercent}% manufacturing speed`];
    case "probe_components":
      return [`Unlock tier ${tier} probe components`];
    case "computing":
      return [`+${bonusPercent}% research speed`];
    case "communication":
      return [`+${bonusPercent}% communication range`];
    default:
      return [];
  }
}

function generateUnlocks(branchId: string, tier: number): string[] {
  if (tier < 2) return [];
  switch (branchId) {
    case "mining":
      return [`miner_${tier}`];
    case "energy":
      return [`reactor_${tier}`, `rct_t${tier}`];
    case "manufacturing":
      return [`printer_${tier}`];
    case "probe_components":
      return [`cpu_t${tier}`, `prop_t${tier}`];
    case "computing":
    case "communication":
      return [];
    default:
      return [];
  }
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
