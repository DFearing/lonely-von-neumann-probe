import type { GameState } from "../simulation/state";
import type { PlayerAction, GameSpeed } from "../simulation/actions";
import { tick } from "../simulation/tick";
import { getPrestigeMultipliers } from "../simulation/prestige";

export const TICK_MS = 100;
const MAX_TICKS_PER_FRAME = 200;

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
 * speed multiplier applied to the real-time delta.
 */
export function createGameLoop(initialState: GameState): GameLoop {
  let state = initialState;
  let running = false;
  let rafId = 0;
  let lastTime = 0;
  let accumulator = 0;
  const actionQueue: PlayerAction[] = [];
  const subscribers = new Set<(state: GameState) => void>();

  function notifySubscribers(): void {
    for (const callback of subscribers) {
      callback(state);
    }
  }

  function runTick(): void {
    const actions: PlayerAction[] =
      actionQueue.length > 0 ? [actionQueue.shift()!] : [];
    state = tick(state, TICK_MS / 1000, actions);
  }

  function frame(now: number): void {
    if (!running) return;

    if (lastTime === 0) {
      lastTime = now;
    }

    if (state.paused) {
      if (actionQueue.length > 0) {
        runTick();
        notifySubscribers();
      }
    } else {
      const delta = now - lastTime;
      const prestigeSpeed = getPrestigeMultipliers(state.prestige).gameSpeedMultiplier;
      accumulator += delta * state.speed * prestigeSpeed;

      let ticked = false;
      let ticksThisFrame = 0;
      while (accumulator >= TICK_MS) {
        runTick();
        accumulator -= TICK_MS;
        ticked = true;
        if (++ticksThisFrame >= MAX_TICKS_PER_FRAME) {
          accumulator = 0;
          break;
        }
      }

      if (ticked) {
        notifySubscribers();
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
