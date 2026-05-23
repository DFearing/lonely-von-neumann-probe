import { describe, test, expect } from "bun:test";
import { catchUp, TICK_MS } from "../src/loop/game-loop";
import { createInitialState } from "../src/simulation/state";
import { tick } from "../src/simulation/tick";

const SEED = 42;
const DT = TICK_MS / 1000;

describe("catchUp", () => {
  test("0 elapsed ms returns same state", () => {
    const state = createInitialState(SEED);
    const result = catchUp(state, 0);
    expect(result).toBe(state);
  });

  test("1000ms runs 10 ticks (TICK_MS = 100)", () => {
    const state = createInitialState(SEED);
    const result = catchUp(state, 1000);

    expect(result.tickCount).toBe(state.tickCount + 10);
  });

  test("result matches running N ticks manually", () => {
    const state = createInitialState(SEED);
    const elapsedMs = 500;
    const expectedTicks = Math.floor(elapsedMs / TICK_MS);

    let manual = state;
    for (let i = 0; i < expectedTicks; i++) {
      manual = tick(manual, DT, []);
    }

    const caught = catchUp(state, elapsedMs);
    expect(caught).toEqual(manual);
  });

  test("caps at maxSeconds (default 86400 = 24h)", () => {
    const state = createInitialState(SEED);
    const maxTicks = (86400 * 1000) / TICK_MS;
    const wayTooMuchMs = 200_000_000;

    const result = catchUp(state, wayTooMuchMs);
    expect(result.tickCount).toBe(state.tickCount + maxTicks);
  }, 15_000);

  test("custom maxSeconds caps correctly", () => {
    const state = createInitialState(SEED);
    const maxSeconds = 10;
    const maxTicks = (maxSeconds * 1000) / TICK_MS;
    const elapsedMs = 1_000_000;

    const result = catchUp(state, elapsedMs, maxSeconds);
    expect(result.tickCount).toBe(state.tickCount + maxTicks);
  });

  test("partial tick remainder is discarded (floor behavior)", () => {
    const state = createInitialState(SEED);
    const result = catchUp(state, 150);

    expect(result.tickCount).toBe(state.tickCount + 1);
  });
});
