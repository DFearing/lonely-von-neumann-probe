import type { GameState, LogEntry, SystemState } from "../state";
import type { Rng } from "../rng";

type EventType = "resource_cache" | "energy_surge" | "signal_detected" | "asteroid_impact";

const EVENT_TYPES: readonly EventType[] = [
  "resource_cache",
  "energy_surge",
  "signal_detected",
  "asteroid_impact",
];

const EVENT_CHANCE = 0.001;

function applyEvent(
  system: SystemState,
  eventType: EventType,
  rng: Rng,
  tickCount: number,
): { system: SystemState; log: LogEntry } {
  switch (eventType) {
    case "resource_cache": {
      const bonus = rng.nextInt(10, 50);
      return {
        system: {
          ...system,
          resources: {
            ...system.resources,
            materials: system.resources.materials + bonus,
          },
        },
        log: {
          tick: tickCount,
          message: `Resource cache discovered in ${system.name}: +${bonus} materials`,
          category: "info",
        },
      };
    }
    case "energy_surge": {
      const bonus = rng.nextInt(5, 25);
      return {
        system: {
          ...system,
          resources: {
            ...system.resources,
            energy: system.resources.energy + bonus,
          },
        },
        log: {
          tick: tickCount,
          message: `Energy surge detected in ${system.name}: +${bonus} energy`,
          category: "info",
        },
      };
    }
    case "signal_detected":
      return {
        system,
        log: {
          tick: tickCount,
          message: `Anomalous signal detected in ${system.name}`,
          category: "discovery",
        },
      };
    case "asteroid_impact": {
      const damage = rng.nextInt(5, 20);
      return {
        system: {
          ...system,
          resources: {
            ...system.resources,
            materials: Math.max(0, system.resources.materials - damage),
          },
        },
        log: {
          tick: tickCount,
          message: `Asteroid impact in ${system.name}: -${damage} materials`,
          category: "warning",
        },
      };
    }
  }
}

export function tickEvents(
  state: GameState,
  _dt: number,
  rng: Rng,
): GameState {
  const updatedSystems: Record<string, SystemState> = {};
  let newLog = state.log;
  let changed = false;

  for (const [id, system] of Object.entries(state.systems)) {
    if (!system.mainProbe) {
      updatedSystems[id] = system;
      continue;
    }

    if (rng.chance(EVENT_CHANCE)) {
      const eventType = rng.pick(EVENT_TYPES);
      const result = applyEvent(system, eventType, rng, state.tickCount);
      updatedSystems[id] = result.system;
      newLog = [...newLog, result.log];
      changed = true;
    } else {
      updatedSystems[id] = system;
    }
  }

  if (!changed) return state;

  return { ...state, systems: updatedSystems, log: newLog };
}
