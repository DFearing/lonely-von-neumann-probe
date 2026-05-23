import type { PlayerAction } from "../simulation/actions";
import type { GameState } from "../simulation/state";
import { createInitialState } from "../simulation/state";
import { tick } from "../simulation/tick";

export interface InputLogEntry {
  tick: number;
  action: PlayerAction;
}

export interface InputRecorder {
  record(tick: number, action: PlayerAction): void;
  getLog(): readonly InputLogEntry[];
  clear(): void;
}

/** Creates an array-backed recorder that logs player actions by tick number. */
export function createInputRecorder(): InputRecorder {
  const log: InputLogEntry[] = [];

  return {
    record(tickNum: number, action: PlayerAction): void {
      log.push({ tick: tickNum, action });
    },
    getLog(): readonly InputLogEntry[] {
      return log;
    },
    clear(): void {
      log.length = 0;
    },
  };
}

export interface ReplayController {
  currentTick: number;
  stepForward(): GameState;
  runToTick(targetTick: number): GameState;
  getState(): GameState;
  isComplete(): boolean;
}

/**
 * Creates a deterministic replay controller that re-simulates a game
 * from scratch using the original seed and a recorded input log.
 */
export function createReplayController(
  seed: number,
  inputLog: readonly InputLogEntry[],
): ReplayController {
  let state = createInitialState(seed);
  let currentTick = 0;

  const maxTick = inputLog.length > 0
    ? Math.max(...inputLog.map((entry) => entry.tick))
    : 0;

  function stepForward(): GameState {
    const actionsForTick = inputLog.filter((entry) => entry.tick === currentTick + 1);
    state = tick(
      state,
      0.1,
      actionsForTick.map((entry) => entry.action),
    );
    currentTick = state.tickCount;
    return state;
  }

  function runToTick(targetTick: number): GameState {
    while (currentTick < targetTick) {
      stepForward();
    }
    return state;
  }

  return {
    get currentTick() {
      return currentTick;
    },
    stepForward,
    runToTick,
    getState(): GameState {
      return state;
    },
    isComplete(): boolean {
      return currentTick > maxTick;
    },
  };
}
