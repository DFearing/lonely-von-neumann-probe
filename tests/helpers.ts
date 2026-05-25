import type {
  GameState,
  SystemState,
  StructureInstance,
  ProbeState,
} from "../src/simulation/state";

export function makeStructure(
  overrides: Partial<StructureInstance> & Pick<StructureInstance, "type">,
): StructureInstance {
  return {
    id: "s_1",
    tier: 1,
    productionRate: 10,
    operatingCost: 0,
    maintenanceCost: 0,
    computeDemand: 0,
    active: true,
    constructionProgress: 1,
    health: 1,
    ...overrides,
  };
}

export function makeProbe(overrides?: Partial<ProbeState>): ProbeState {
  return {
    id: "probe_1",
    name: "Probe",
    mode: "gathering",
    systemId: "test",
    components: { cpu: "cpu_t1", propulsion: "prop_t1", reactor: "rct_t1" },
    miningOutput: 1,
    computingOutput: 1,
    internalPrinterSpeed: 0.5,
    autoReplicating: false,
    health: 1,
    ...overrides,
  };
}

export function makeSystem(overrides?: Partial<SystemState>): SystemState {
  return {
    id: "test",
    name: "Test System",
    starType: "yellow",
    distanceFromOrigin: 0,
    resourceRichness: 1.0,
    discovered: true,
    scanned: true,
    mainProbe: makeProbe(),
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
    availableProbes: [],
    sentProbes: [],
    ...overrides,
  };
}

export function wrapSystem(system: SystemState): GameState {
  return {
    seed: 42,
    tickCount: 0,
    elapsedSeconds: 0,
    rngState: [0, 0, 0, 0],
    currentSystemId: system.id,
    systems: { [system.id]: system },
    speed: 1,
    log: [],
    paused: false,
    prestige: {
      totalPrestigePoints: 0,
      availablePrestigePoints: 0,
      upgrades: {
        mining_mastery: 0,
        fusion_mastery: 0,
        nano_assembly: 0,
        quantum_insight: 0,
        material_reserves: 0,
        swift_start: 0,
      },
      timesPrestiged: 0,
      blackHoleDiscovered: false,
    },
    prestigeSnapshot: null,
    prestigeTriggered: false,
    nextProbeNumber: 2,
    probeName: "Probe",
    gameOver: false,
  };
}
