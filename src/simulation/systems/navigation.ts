import type { GameState, ProbeInTransit, ProbeState, SystemState } from "../state";
import { emptySystemState } from "../state";
import type { Rng } from "../rng";
import { KNOWN_SYSTEMS } from "../data/star-systems";
import { CPUS, PROPULSIONS } from "../data/components";

function createArrivingProbe(
  probe: ProbeInTransit,
  systemId: string,
): ProbeState {
  const cpuDef = CPUS[probe.components.cpu];
  const propDef = PROPULSIONS[probe.components.propulsion];
  return {
    id: probe.id,
    name: probe.name,
    mode: "idle",
    systemId,
    components: probe.components,
    miningOutput: cpuDef?.miningOutput ?? 1,
    computingOutput: cpuDef?.computingOutput ?? 0.5,
    internalPrinterSpeed: cpuDef?.printSpeed ?? 0.5,
    autoReplicating: propDef?.autoReplicate ?? false,
    health: 1,
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

function mergeResearch(
  destination: Record<string, boolean>,
  source: Record<string, boolean>,
): Record<string, boolean> {
  const merged = { ...destination };
  for (const [techId, completed] of Object.entries(source)) {
    if (completed) {
      merged[techId] = true;
    }
  }
  return merged;
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
  const newlyDiscovered: string[] = [];

  for (const probe of originSystem.sentProbes) {
    const elapsed = probe.elapsedSeconds + dt;

    if (elapsed >= probe.travelTimeSeconds) {
      const destId = probe.destinationSystemId;
      const arrivingProbe = createArrivingProbe(probe, destId);

      if (!originSystem.discoveredSystems.includes(destId)) {
        newlyDiscovered.push(destId);
      }

      const existingDest =
        updatedSystems[destId] ??
        newSystems[destId] ??
        allSystems[destId];

      if (existingDest) {
        const mergedResearch = mergeResearch(
          existingDest.completedResearch,
          originSystem.completedResearch,
        );
        const destDiscovered = existingDest.discoveredSystems.includes(originSystem.id)
          ? existingDest.discoveredSystems
          : [...existingDest.discoveredSystems, originSystem.id];
        const updated: SystemState = {
          ...existingDest,
          discovered: true,
          scanned: true,
          mainProbe: existingDest.mainProbe ?? arrivingProbe,
          availableProbes: existingDest.mainProbe
            ? [...existingDest.availableProbes, arrivingProbe]
            : existingDest.availableProbes,
          completedResearch: mergedResearch,
          discoveredSystems: destDiscovered,
        };
        if (allSystems[destId]) {
          updatedSystems[destId] = updated;
        } else {
          newSystems[destId] = updated;
        }
      } else {
        const generated = generateNewSystem(destId, rng);
        const system: SystemState = {
          ...emptySystemState(
            destId,
            generated.name,
            generated.starType,
            generated.distance,
            generated.richness,
            true,
            true,
          ),
          mainProbe: arrivingProbe,
          resources: { materials: 0, energy: 0, computingPower: 0 },
          completedResearch: { ...originSystem.completedResearch },
          discoveredSystems: [originSystem.id],
        };
        newSystems[destId] = system;
      }

      const destName = existingDest?.name ?? newSystems[destId]?.name ?? destId;
      if (existingDest?.mainProbe) {
        log.push({
          tick: tickCount,
          message: `${probe.name} arrived at ${destName} and is standing by`,
          category: "discovery",
        });
      } else {
        log.push({
          tick: tickCount,
          message: `Probe arrived at ${destName}`,
          category: "discovery",
        });
      }
    } else {
      remaining.push({ ...probe, elapsedSeconds: elapsed });
    }
  }

  const updatedOriginDiscovered =
    newlyDiscovered.length > 0
      ? [...originSystem.discoveredSystems, ...newlyDiscovered]
      : originSystem.discoveredSystems;

  return {
    originSystem: { ...originSystem, sentProbes: remaining, discoveredSystems: updatedOriginDiscovered },
    newSystems,
    updatedSystems,
    log,
  };
}

function unionAllResearch(
  systems: Record<string, SystemState>,
): Record<string, boolean> {
  const unified: Record<string, boolean> = {};
  for (const system of Object.values(systems)) {
    for (const [techId, completed] of Object.entries(system.completedResearch)) {
      if (completed) {
        unified[techId] = true;
      }
    }
  }
  return unified;
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

  const anyZeroLatency = Object.values(state.systems).some(
    (sys) => sys.completedResearch["communication_speed_t20"],
  );

  if (!changed && !anyZeroLatency) return state;

  const mergedSystems: Record<string, SystemState> = {};
  for (const [id, system] of Object.entries(processedOrigins)) {
    const updated = allUpdatedSystems[id];
    if (updated) {
      // `updated` has arriving-probe data (mainProbe, research); `system` has
      // this origin's own sentProbes with elapsed times advanced. Both must survive.
      const combinedDiscovered = [...new Set([...system.discoveredSystems, ...updated.discoveredSystems])];
      mergedSystems[id] = {
        ...updated,
        sentProbes: system.sentProbes,
        discoveredSystems: combinedDiscovered,
      };
    } else {
      mergedSystems[id] = system;
    }
  }
  for (const [id, system] of Object.entries(allNewSystems)) {
    if (!mergedSystems[id]) {
      mergedSystems[id] = system;
    }
  }

  if (anyZeroLatency) {
    const unified = unionAllResearch(mergedSystems);
    const unifiedCount = Object.keys(unified).length;
    const researchChanged = Object.values(mergedSystems).some(
      (system) => Object.keys(system.completedResearch).length !== unifiedCount,
    );
    if (!changed && !researchChanged) return state;
    if (researchChanged) {
      for (const [id, system] of Object.entries(mergedSystems)) {
        mergedSystems[id] = { ...system, completedResearch: { ...unified } };
      }
    }
  }

  let prestige = state.prestige;
  if (!prestige.blackHoleDiscovered) {
    const cygnusSystem = mergedSystems["cygnus_x1"];
    if (cygnusSystem?.discovered) {
      prestige = { ...prestige, blackHoleDiscovered: true };
      newLog = [
        ...newLog,
        {
          tick: state.tickCount,
          message: "Black hole confirmed at Cygnus X-1. Gravitational anomaly detected — prestige pathway unlocked.",
          category: "milestone" as const,
        },
      ];
    }
  }

  return { ...state, systems: mergedSystems, log: newLog, prestige };
}
