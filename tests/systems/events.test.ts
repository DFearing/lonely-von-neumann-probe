import { describe, test, expect } from "bun:test";
import { tickEvents } from "../../src/simulation/systems/events";
import { createInitialState } from "../../src/simulation/state";
import type { GameState } from "../../src/simulation/state";
import { createRngFromState } from "../../src/simulation/rng";

const DT = 1;

describe("tickEvents", () => {
  describe("determinism", () => {
    test("same RNG state produces the same events", () => {
      const state = createInitialState(42);

      const rng1 = createRngFromState(state.rngState);
      const result1 = tickEvents(state, DT, rng1);

      const rng2 = createRngFromState(state.rngState);
      const result2 = tickEvents(state, DT, rng2);

      expect(result1.log).toEqual(result2.log);
      if (result1 !== state) {
        for (const [id, sys] of Object.entries(result1.systems)) {
          expect(sys.resources).toEqual(result2.systems[id]!.resources);
        }
      }
    });
  });

  describe("systems without mainProbe", () => {
    test("no events fire for systems without a mainProbe", () => {
      const state = createInitialState(42);

      const noProbeState: GameState = {
        ...state,
        systems: Object.fromEntries(
          Object.entries(state.systems).map(([id, sys]) => [
            id,
            { ...sys, mainProbe: null },
          ]),
        ),
      };

      let current = noProbeState;
      for (let i = 0; i < 500; i++) {
        const rng = createRngFromState(current.rngState);
        const next = tickEvents(current, DT, rng);

        expect(next.log.length).toBe(current.log.length);
        expect(next).toBe(current);

        const advancedRng = createRngFromState(current.rngState);
        advancedRng.nextFloat();
        current = { ...current, rngState: advancedRng.snapshot() };
      }
    });
  });
});
