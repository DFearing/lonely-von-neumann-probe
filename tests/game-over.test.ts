import { describe, test, expect } from "bun:test";
import { tick } from "../src/simulation/tick";
import { createInitialState } from "../src/simulation/state";
import type { GameState, ProbeInTransit } from "../src/simulation/state";

const SEED = 42;
const DT = 1;

function stateWithDeadProbe(): GameState {
  const state = createInitialState(SEED);
  const sol = state.systems["sol"]!;
  return {
    ...state,
    systems: {
      ...state.systems,
      sol: {
        ...sol,
        resources: { ...sol.resources, materials: 0 },
        mainProbe: sol.mainProbe ? { ...sol.mainProbe, health: 0 } : null,
      },
    },
  };
}

describe("game-over detection (isAllProbesDead)", () => {
  test("game-over triggers when all probes have health <= 0", () => {
    const state = stateWithDeadProbe();

    const next = tick(state, DT, []);

    expect(next.gameOver).toBe(true);
    expect(next.paused).toBe(true);
  });

  test("game-over produces a log entry with mission failed message", () => {
    const state = stateWithDeadProbe();
    const logLengthBefore = state.log.length;

    const next = tick(state, DT, []);

    const newEntries = next.log.slice(logLengthBefore);
    const gameOverEntry = newEntries.find(
      (e) => e.message.includes("Mission failed"),
    );
    expect(gameOverEntry).toBeDefined();
    expect(gameOverEntry!.category).toBe("error");
  });

  test("game-over does NOT trigger when probes are in transit", () => {
    const state = stateWithDeadProbe();
    const sol = state.systems["sol"]!;

    const transitProbe: ProbeInTransit = {
      id: "transit_probe_1",
      name: "Probe-02",
      components: { cpu: "cpu_t1", propulsion: "prop_t1", reactor: "rct_t1" },
      originSystemId: "sol",
      destinationSystemId: "alpha_centauri",
      travelTimeSeconds: 1000,
      elapsedSeconds: 500,
    };

    const stateWithTransit: GameState = {
      ...state,
      systems: {
        ...state.systems,
        sol: {
          ...sol,
          sentProbes: [transitProbe],
        },
      },
    };

    const next = tick(stateWithTransit, DT, []);

    expect(next.gameOver).toBe(false);
  });

  test("game-over does NOT trigger when at least one system has a healthy probe", () => {
    const state = createInitialState(SEED);
    const sol = state.systems["sol"]!;
    const alphaCentauri = state.systems["alpha_centauri"]!;

    const stateWithTwoSystems: GameState = {
      ...state,
      systems: {
        ...state.systems,
        sol: {
          ...sol,
          resources: { ...sol.resources, materials: 0 },
          mainProbe: sol.mainProbe ? { ...sol.mainProbe, health: 0 } : null,
        },
        alpha_centauri: {
          ...alphaCentauri,
          mainProbe: {
            id: "probe_ac_1",
            name: "Probe-02",
            mode: "idle",
            systemId: "alpha_centauri",
            components: { cpu: "cpu_t1", propulsion: "prop_t1", reactor: "rct_t1" },
            miningOutput: 1,
            computingOutput: 1,
            internalPrinterSpeed: 0.5,
            autoReplicating: false,
            health: 0.5,
          },
        },
      },
    };

    const next = tick(stateWithTwoSystems, DT, []);

    expect(next.gameOver).toBe(false);
  });

  test("game-over does NOT re-trigger on subsequent ticks", () => {
    const state = stateWithDeadProbe();
    const afterGameOver = tick(state, DT, []);
    expect(afterGameOver.gameOver).toBe(true);

    const logLengthAfterFirst = afterGameOver.log.length;

    const secondTick = tick({ ...afterGameOver, paused: false }, DT, []);

    const newEntries = secondTick.log.slice(logLengthAfterFirst);
    const duplicateGameOver = newEntries.find(
      (e) => e.message.includes("Mission failed"),
    );
    expect(duplicateGameOver).toBeUndefined();
  });
});
