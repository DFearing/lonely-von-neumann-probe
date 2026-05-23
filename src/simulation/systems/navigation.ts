import type { GameState, ProbeInTransit, ProbeState, SystemState } from "../state";
import type { Rng } from "../rng";
import { KNOWN_SYSTEMS } from "../data/star-systems";
import { CPUS } from "../data/components";

function createArrivingProbe(
  probe: ProbeInTransit,
  systemId: string,
): ProbeState {
  const cpuDef = CPUS[probe.components.cpu];
  return {
    id: probe.id,
    systemId,
    components: probe.components,
    miningOutput: cpuDef.miningOutput,
    computingOutput: cpuDef.computingOutput,
    internalPrinterSpeed: cpuDef.printSpeed,
    autoReplicating: false,
  };
}

function generateNewSystem(
  systemId: string,
  rng: Rng,
): { name: string; starType: string; distance: number; richness: number } {
  const known = KNOWN_SYSTEMS.find((s) => s.id === systemId);
  if (known) {
    const richness =
      known.knownRichness ??
      Math.round((0.5 + rng.nextFloat() * 1.5) * 100) / 100;
    return {
      name: known.name,
      starType: known.starType,
      distance: known.distanceFromOrigin,
      richness,
    };
  }

  const richness = Math.round((0.5 + rng.nextFloat() * 1.5) * 100) / 100;
  return {
    name: systemId,
    starType: "unknown",
    distance: 0,
    richness,
  };
}

function tickSystemNavigation(
  originSystem: SystemState,
  allSystems: Record<string, SystemState>,
  dt: number,
  rng: Rng,
  tickCount: number,
): {
  originSystem: SystemState;
  newSystems: Record<string, SystemState>;
  updatedSystems: Record<string, SystemState>;
  log: GameState["log"];
} {
  if (originSystem.sentProbes.length === 0) {
    return { originSystem, newSystems: {}, updatedSystems: {}, log: [] };
  }

  const remaining: ProbeInTransit[] = [];
  const newSystems: Record<string, SystemState> = {};
  const updatedSystems: Record<string, SystemState> = {};
  const log: GameState["log"] = [];

  for (const probe of originSystem.sentProbes) {
    const elapsed = probe.elapsedSeconds + dt;

    if (elapsed >= probe.travelTimeSeconds) {
      const destId = probe.destinationSystemId;
      const arrivingProbe = createArrivingProbe(probe, destId);

      const existingDest =
        updatedSystems[destId] ??
        newSystems[destId] ??
        allSystems[destId];

      if (existingDest) {
        const updated: SystemState = {
          ...existingDest,
          discovered: true,
          scanned: true,
          mainProbe: existingDest.mainProbe ?? arrivingProbe,
        };
        if (allSystems[destId]) {
          updatedSystems[destId] = updated;
        } else {
          newSystems[destId] = updated;
        }
      } else {
        const generated = generateNewSystem(destId, rng);
        const system: SystemState = {
          id: destId,
          name: generated.name,
          starType: generated.starType,
          distanceFromOrigin: generated.distance,
          resourceRichness: generated.richness,
          discovered: true,
          scanned: true,
          mainProbe: arrivingProbe,
          structures: { miners: [], reactors: [], printers: [] },
          resources: { materials: 0, energy: 0, computingPower: 0 },
          resourceRates: {
            materialsPerSecond: 0,
            energyPerSecond: 0,
            computingPowerPerSecond: 0,
          },
          constructionQueue: [],
          researchQueue: [],
          completedResearch: {},
          discoveredSystems: [],
          sentProbes: [],
        };
        newSystems[destId] = system;
      }

      log.push({
        tick: tickCount,
        message: `Probe arrived at ${existingDest?.name ?? newSystems[destId]?.name ?? destId}`,
        category: "discovery",
      });
    } else {
      remaining.push({ ...probe, elapsedSeconds: elapsed });
    }
  }

  return {
    originSystem: { ...originSystem, sentProbes: remaining },
    newSystems,
    updatedSystems,
    log,
  };
}

export function tickNavigation(
  state: GameState,
  dt: number,
  rng: Rng,
): GameState {
  let allNewSystems: Record<string, SystemState> = {};
  let allUpdatedSystems: Record<string, SystemState> = {};
  let newLog = state.log;
  const processedOrigins: Record<string, SystemState> = {};
  let changed = false;

  for (const [id, system] of Object.entries(state.systems)) {
    const result = tickSystemNavigation(
      system,
      state.systems,
      dt,
      rng,
      state.tickCount,
    );

    processedOrigins[id] = result.originSystem;

    if (result.originSystem !== system) {
      changed = true;
    }

    if (Object.keys(result.newSystems).length > 0) {
      allNewSystems = { ...allNewSystems, ...result.newSystems };
      changed = true;
    }

    if (Object.keys(result.updatedSystems).length > 0) {
      allUpdatedSystems = { ...allUpdatedSystems, ...result.updatedSystems };
      changed = true;
    }

    if (result.log.length > 0) {
      newLog = [...newLog, ...result.log];
      changed = true;
    }
  }

  if (!changed) return state;

  const mergedSystems: Record<string, SystemState> = {};
  for (const [id, system] of Object.entries(processedOrigins)) {
    mergedSystems[id] = allUpdatedSystems[id] ?? system;
  }
  for (const [id, system] of Object.entries(allNewSystems)) {
    if (!mergedSystems[id]) {
      mergedSystems[id] = system;
    }
  }

  return { ...state, systems: mergedSystems, log: newLog };
}
