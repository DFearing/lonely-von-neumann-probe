import { describe, test, expect } from "bun:test";
import { tick } from "../src/simulation/tick";
import { createInitialState } from "../src/simulation/state";
import type { GameState } from "../src/simulation/state";
import type { PlayerAction } from "../src/simulation/actions";

const SEED = 42;
const DT = 1;

function stateWithMode(mode: "idle" | "gathering" | "printing", materials = 500): GameState {
  const state = createInitialState(SEED);
  const sol = state.systems["sol"]!;
  return {
    ...state,
    systems: {
      ...state.systems,
      sol: {
        ...sol,
        resources: { ...sol.resources, materials },
        mainProbe: sol.mainProbe ? { ...sol.mainProbe, mode } : null,
      },
    },
  };
}

describe("set_probe_mode action", () => {
  test("setting mode to 'gathering' tracks gatheringStartMaterials", () => {
    const startMaterials = 250;
    const state = stateWithMode("idle", startMaterials);

    const action: PlayerAction = {
      type: "set_probe_mode",
      systemId: "sol",
      mode: "gathering",
    };

    const next = tick(state, DT, [action]);
    const probe = next.systems["sol"]!.mainProbe!;

    expect(probe.mode).toBe("gathering");
    expect(probe.gatheringStartMaterials).toBe(startMaterials);
  });

  test("setting same mode as current is a no-op", () => {
    const state = stateWithMode("idle");
    const logLengthBefore = state.log.length;

    const action: PlayerAction = {
      type: "set_probe_mode",
      systemId: "sol",
      mode: "idle",
    };

    const next = tick(state, DT, [action]);
    const newLogEntries = next.log.slice(logLengthBefore);
    const modeChangeEntry = newLogEntries.find(
      (e) => e.message.includes("mode") || e.message.includes("idle") || e.message.includes("began"),
    );

    expect(modeChangeEntry).toBeUndefined();
  });

  test("switching to 'gathering' produces 'began gathering' log", () => {
    const state = stateWithMode("idle");
    const logLengthBefore = state.log.length;

    const action: PlayerAction = {
      type: "set_probe_mode",
      systemId: "sol",
      mode: "gathering",
    };

    const next = tick(state, DT, [action]);
    const newEntries = next.log.slice(logLengthBefore);
    const gatherEntry = newEntries.find((e) => e.message.includes("began gathering"));

    expect(gatherEntry).toBeDefined();
  });

  test("switching to 'printing' produces 'began printing' log", () => {
    const state = stateWithMode("idle");
    const logLengthBefore = state.log.length;

    const action: PlayerAction = {
      type: "set_probe_mode",
      systemId: "sol",
      mode: "printing",
    };

    const next = tick(state, DT, [action]);
    const newEntries = next.log.slice(logLengthBefore);
    const printEntry = newEntries.find((e) => e.message.includes("began printing"));

    expect(printEntry).toBeDefined();
  });

  test("switching to 'idle' from 'printing' produces 'is now idle' log", () => {
    const state = stateWithMode("printing");
    const logLengthBefore = state.log.length;

    const action: PlayerAction = {
      type: "set_probe_mode",
      systemId: "sol",
      mode: "idle",
    };

    const next = tick(state, DT, [action]);
    const newEntries = next.log.slice(logLengthBefore);
    const idleEntry = newEntries.find((e) => e.message.includes("is now idle"));

    expect(idleEntry).toBeDefined();
  });

  test("switching from 'gathering' produces 'stopped gathering' log with collected amount", () => {
    const state = createInitialState(SEED);
    const sol = state.systems["sol"]!;
    const gatherStart = 100;

    const stateGathering: GameState = {
      ...state,
      systems: {
        ...state.systems,
        sol: {
          ...sol,
          resources: { ...sol.resources, materials: 150 },
          mainProbe: sol.mainProbe
            ? { ...sol.mainProbe, mode: "gathering", gatheringStartMaterials: gatherStart }
            : null,
        },
      },
    };

    const logLengthBefore = stateGathering.log.length;

    const action: PlayerAction = {
      type: "set_probe_mode",
      systemId: "sol",
      mode: "idle",
    };

    const next = tick(stateGathering, DT, [action]);
    const newEntries = next.log.slice(logLengthBefore);
    const stopEntry = newEntries.find((e) => e.message.includes("stopped gathering"));

    expect(stopEntry).toBeDefined();
    expect(stopEntry!.message).toContain("tons collected");
  });
});
