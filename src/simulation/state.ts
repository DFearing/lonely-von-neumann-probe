import type { RngState } from "./rng";
import type { GameSpeed } from "./actions";
import { createRng } from "./rng";

export const MAX_TIER = 20;
export const MAX_STRUCTURE_TIER = 6;

export type StructureType = "miner" | "reactor" | "printer" | "station";
export type CpuType = string;
export type PropulsionType = string;
export type ReactorType = string;

export interface GameState {
  seed: number;
  tickCount: number;
  elapsedSeconds: number;
  rngState: RngState;
  currentSystemId: string;
  systems: Record<string, SystemState>;
  speed: GameSpeed;
  log: LogEntry[];
  paused: boolean;
}

export interface SystemState {
  id: string;
  name: string;
  starType: string;
  distanceFromOrigin: number;
  resourceRichness: number;
  discovered: boolean;
  scanned: boolean;
  mainProbe: ProbeState | null;
  structures: {
    miners: StructureInstance[];
    reactors: StructureInstance[];
    printers: StructureInstance[];
    stations: StructureInstance[];
  };
  resources: {
    materials: number;
    energy: number;
    computingPower: number;
  };
  resourceRates: {
    materialsSupply: number;
    materialsDemand: number;
    materialsPerSecond: number;
    energySupply: number;
    energyDemand: number;
    energyNet: number;
    computingPowerPerSecond: number;
    computeSupply: number;
    computeDemand: number;
    computeNet: number;
    computeEfficiency: number;
  };
  constructionQueue: ConstructionProject[];
  researchQueue: ResearchProject[];
  completedResearch: Record<string, boolean>;
  discoveredSystems: string[];
  sentProbes: ProbeInTransit[];
}

export type ProbeMode = "idle" | "gathering" | "printing";

export interface ProbeState {
  id: string;
  name: string;
  mode: ProbeMode;
  systemId: string;
  components: {
    cpu: CpuType;
    propulsion: PropulsionType;
    reactor: ReactorType;
  };
  miningOutput: number;
  computingOutput: number;
  internalPrinterSpeed: number;
  autoReplicating: boolean;
}

export interface StructureInstance {
  id: string;
  type: StructureType;
  tier: number;
  productionRate: number;
  operatingCost: number;
  maintenanceCost: number;
  computeDemand: number;
  active: boolean;
  constructionProgress: number;
  health: number;
}

export interface ConstructionProject {
  id: string;
  targetType: string;
  targetTier: number;
  targetConfig: {
    cpu: CpuType;
    propulsion: PropulsionType;
    reactor: ReactorType;
    targetSystemId: string;
  } | null;
  totalCost: { materials: number; energy: number };
  remainingCost: { materials: number; energy: number };
  progress: number;
  assignedPrinterIds: string[];
}

export interface ResearchProject {
  id: string;
  techId: string;
  branchId: string;
  tier: number;
  name: string;
  initialCost: { materials: number; energy: number };
  continuousCost: number;
  progress: number;
  completed: boolean;
  paused: boolean;
}

export interface ProbeInTransit {
  id: string;
  name: string;
  components: {
    cpu: CpuType;
    propulsion: PropulsionType;
    reactor: ReactorType;
  };
  originSystemId: string;
  destinationSystemId: string;
  travelTimeSeconds: number;
  elapsedSeconds: number;
}

export interface LogEntry {
  tick: number;
  message: string;
  category: "info" | "discovery" | "warning" | "milestone";
}

function emptySystemState(
  id: string,
  name: string,
  starType: string,
  distanceFromOrigin: number,
  resourceRichness: number,
  discovered: boolean,
  scanned: boolean,
): SystemState {
  return {
    id,
    name,
    starType,
    distanceFromOrigin,
    resourceRichness,
    discovered,
    scanned,
    mainProbe: null,
    structures: { miners: [], reactors: [], printers: [], stations: [] },
    resources: { materials: 0, energy: 0, computingPower: 0 },
    resourceRates: {
      materialsSupply: 0,
      materialsDemand: 0,
      materialsPerSecond: 0,
      energySupply: 0,
      energyDemand: 0,
      energyNet: 0,
      computingPowerPerSecond: 0,
      computeSupply: 0,
      computeDemand: 0,
      computeNet: 0,
      computeEfficiency: 1,
    },
    constructionQueue: [],
    researchQueue: [],
    completedResearch: {},
    discoveredSystems: [],
    sentProbes: [],
  };
}

function randomRichness(rngFloat: number): number {
  return Math.round((0.5 + rngFloat * 1.5) * 100) / 100;
}

export function createInitialState(seed: number, probeName = "Probe"): GameState {
  const rng = createRng(seed);

  const sol = emptySystemState("sol", "Sol", "yellow", 0, 1.0, true, true);
  sol.mainProbe = {
    id: "probe_sol_0",
    name: probeName,
    mode: "idle",
    systemId: "sol",
    components: {
      cpu: "cpu_t1",
      propulsion: "prop_t1",
      reactor: "rct_t1",
    },
    miningOutput: 1,
    computingOutput: 1,
    internalPrinterSpeed: 0.5,
    autoReplicating: false,
  };

  const alphaCentauri = emptySystemState(
    "alpha_centauri",
    "Alpha Centauri",
    "yellow",
    4.37,
    1.2,
    true,
    false,
  );

  const siriusRichness = randomRichness(rng.nextFloat());
  const sirius = emptySystemState(
    "sirius",
    "Sirius",
    "blue",
    8.6,
    siriusRichness,
    true,
    false,
  );

  const barnardsRichness = randomRichness(rng.nextFloat());
  const barnardsStar = emptySystemState(
    "barnards_star",
    "Barnard's Star",
    "red",
    5.96,
    barnardsRichness,
    true,
    false,
  );

  const wolfRichness = randomRichness(rng.nextFloat());
  const wolf359 = emptySystemState(
    "wolf_359",
    "Wolf 359",
    "red",
    7.86,
    wolfRichness,
    true,
    false,
  );

  sol.discoveredSystems = [
    "alpha_centauri",
    "sirius",
    "barnards_star",
    "wolf_359",
  ];

  const systems: Record<string, SystemState> = {
    sol,
    alpha_centauri: alphaCentauri,
    sirius,
    barnards_star: barnardsStar,
    wolf_359: wolf359,
  };

  return {
    seed,
    tickCount: 0,
    elapsedSeconds: 0,
    rngState: rng.snapshot(),
    currentSystemId: "sol",
    systems,
    speed: 1,
    log: [
      {
        tick: 0,
        message: `${probeName} activated in Sol system. Beginning resource survey.`,
        category: "milestone",
      },
    ],
    paused: false,
  };
}
