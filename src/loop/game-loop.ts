import type { GameState } from "../simulation/state";
import type { PlayerAction, GameSpeed } from "../simulation/actions";
import { tick } from "../simulation/tick";
import { saveGame } from "../persistence/save-load";

export const TICK_MS = 100;
const AUTO_SAVE_INTERVAL_MS = 10_000;

const SPEED_MULTIPLIERS: Record<GameSpeed, number> = {
  1: 1,
  2: 2,
  5: 5,
  10: 10,
};

export interface GameLoop {
  start(): void;
  stop(): void;
  setSpeed(speed: GameSpeed): void;
  pause(): void;
  unpause(): void;
  isPaused(): boolean;
  getSpeed(): GameSpeed;
  dispatchAction(action: PlayerAction): void;
  stepOnce(): void;
  getState(): GameState;
  onStateChange(callback: (state: GameState) => void): () => void;
}

/**
 * Creates a browser game loop driven by requestAnimationFrame.
 *
 * Uses a fixed-timestep accumulator (100ms ticks, 10 ticks/sec) with a
 * speed multiplier applied to the real-time delta. Auto-saves every 10
 * seconds and on stop.
 */
export function createGameLoop(initialState: GameState): GameLoop {
  let state = initialState;
  let running = false;
  let rafId = 0;
  let lastTime = 0;
  let accumulator = 0;
  let lastSaveTime = 0;

  const actionQueue: PlayerAction[] = [];
  const subscribers = new Set<(state: GameState) => void>();

  function notifySubscribers(): void {
    for (const callback of subscribers) {
      callback(state);
    }
  }

  function runTick(): void {
    const actions = actionQueue.splice(0);
    state = tick(state, TICK_MS / 1000, actions);
  }

  function checkAutoSave(now: number): void {
    if (now - lastSaveTime >= AUTO_SAVE_INTERVAL_MS) {
      saveGame(state);
      lastSaveTime = now;
    }
  }

  function frame(now: number): void {
    if (!running) return;

    if (lastTime === 0) {
      lastTime = now;
      lastSaveTime = now;
    }

    if (!state.paused) {
      const delta = now - lastTime;
      accumulator += delta * SPEED_MULTIPLIERS[state.speed];

      let ticked = false;
      while (accumulator >= TICK_MS) {
        runTick();
        accumulator -= TICK_MS;
        ticked = true;
      }

      if (ticked) {
        notifySubscribers();
        checkAutoSave(now);
      }
    }

    lastTime = now;
    rafId = requestAnimationFrame(frame);
  }

  return {
    start(): void {
      if (running) return;
      running = true;
      lastTime = 0;
      accumulator = 0;
      rafId = requestAnimationFrame(frame);
    },

    stop(): void {
      running = false;
      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      saveGame(state);
    },

    setSpeed(newSpeed: GameSpeed): void {
      actionQueue.push({ type: "set_speed", speed: newSpeed });
    },

    pause(): void {
      actionQueue.push({ type: "pause" });
    },

    unpause(): void {
      actionQueue.push({ type: "unpause" });
    },

    isPaused(): boolean {
      return state.paused;
    },

    getSpeed(): GameSpeed {
      return state.speed;
    },

    dispatchAction(action: PlayerAction): void {
      actionQueue.push(action);
    },

    stepOnce(): void {
      runTick();
      notifySubscribers();
    },

    getState(): GameState {
      return state;
    },

    onStateChange(callback: (state: GameState) => void): () => void {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
  };
}

/**
 * Fast-forward a saved state through elapsed offline time.
 *
 * Offline catch-up is the caller's responsibility (typically main.ts):
 * load save, compute elapsed ticks, call catchUp(), then create the game loop
 * with the caught-up state. The game loop itself only handles real-time ticking.
 */
export function catchUp(
  state: GameState,
  elapsedMs: number,
  maxSeconds: number = 86400,
): GameState {
  const maxTicks = (maxSeconds * 1000) / TICK_MS;
  const ticksToRun = Math.min(Math.floor(elapsedMs / TICK_MS), maxTicks);

  let current = state;
  for (let i = 0; i < ticksToRun; i++) {
    current = tick(current, TICK_MS / 1000, []);
  }
  return current;
}
