import { describe, test, expect } from "bun:test";
import { createGameLoop } from "../src/loop/game-loop";
import { createInitialState } from "../src/simulation/state";
import type { GameState } from "../src/simulation/state";
import { tick } from "../src/simulation/tick";
import {
  getPrestigeMultipliers,
  purchaseUpgrade,
  PRESTIGE_UPGRADES,
} from "../src/simulation/prestige";
import type { PrestigeState } from "../src/simulation/prestige";

const SEED = 42;

describe("one action per tick (replay determinism)", () => {
  test("stepOnce processes only one queued action per tick", () => {
    const state = createInitialState(SEED);
    const loop = createGameLoop(state);

    loop.dispatchAction({ type: "set_speed", speed: 5 });
    loop.dispatchAction({ type: "pause" });

    loop.stepOnce();

    const after1 = loop.getState();
    expect(after1.speed).toBe(5);
    expect(after1.paused).toBe(false);

    loop.stepOnce();

    const after2 = loop.getState();
    expect(after2.paused).toBe(true);
  });

  test("three queued actions require three stepOnce calls", () => {
    const state = createInitialState(SEED);
    const loop = createGameLoop(state);

    loop.dispatchAction({ type: "set_speed", speed: 3 });
    loop.dispatchAction({ type: "set_speed", speed: 7 });
    loop.dispatchAction({ type: "set_speed", speed: 10 });

    loop.stepOnce();
    expect(loop.getState().speed).toBe(3);

    loop.stepOnce();
    expect(loop.getState().speed).toBe(7);

    loop.stepOnce();
    expect(loop.getState().speed).toBe(10);
  });

  test("stepOnce with no queued actions still advances the tick", () => {
    const state = createInitialState(SEED);
    const loop = createGameLoop(state);

    const tickBefore = loop.getState().tickCount;
    loop.stepOnce();
    expect(loop.getState().tickCount).toBe(tickBefore + 1);
  });

  test("replay produces identical state when actions are applied one per tick", () => {
    const state = createInitialState(SEED);
    const loop = createGameLoop(state);

    loop.dispatchAction({ type: "set_speed", speed: 5 });
    loop.dispatchAction({ type: "pause" });
    loop.stepOnce();
    loop.stepOnce();
    loop.stepOnce();

    const loopState = loop.getState();

    let manual = state;
    manual = tick(manual, 0.1, [{ type: "set_speed", speed: 5 }]);
    manual = tick(manual, 0.1, [{ type: "pause" }]);
    manual = tick(manual, 0.1, []);

    expect(loopState).toEqual(manual);
  });
});

describe("prestige gameSpeedMultiplier", () => {
  test("getPrestigeMultipliers returns 1x speed with no upgrades", () => {
    const state = createInitialState(SEED);
    const mult = getPrestigeMultipliers(state.prestige);
    expect(mult.gameSpeedMultiplier).toBe(1);
  });

  test("swift_start upgrade increases gameSpeedMultiplier", () => {
    const prestige = createInitialPrestigeWithPoints(1000);
    const result = purchaseUpgrade(prestige, "swift_start");
    expect(result).not.toBeNull();

    const mult = getPrestigeMultipliers(result!);
    const expectedEffect = PRESTIGE_UPGRADES.swift_start.effects[0]!;
    expect(mult.gameSpeedMultiplier).toBe(expectedEffect);
    expect(mult.gameSpeedMultiplier).toBeGreaterThan(1);
  });

  test("swift_start multiplier flows through game state correctly", () => {
    const baseState = createInitialState(SEED);

    const prestigeWithPoints = {
      ...baseState.prestige,
      availablePrestigePoints: 1000,
    };
    const upgraded = purchaseUpgrade(prestigeWithPoints, "swift_start");
    expect(upgraded).not.toBeNull();

    const stateWithUpgrade: GameState = {
      ...baseState,
      prestige: upgraded!,
    };

    const mult = getPrestigeMultipliers(stateWithUpgrade.prestige);
    expect(mult.gameSpeedMultiplier).toBeGreaterThan(1);
  });
});

function createInitialPrestigeWithPoints(points: number): PrestigeState {
  return {
    totalPrestigePoints: points,
    availablePrestigePoints: points,
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
  };
}
