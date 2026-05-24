import { describe, test, expect } from "bun:test";
import { tickResources } from "../../src/simulation/systems/resources";
import { createInitialState } from "../../src/simulation/state";
import type { GameState, SystemState, StructureInstance } from "../../src/simulation/state";

function makeStructure(overrides: Partial<StructureInstance> & Pick<StructureInstance, "type">): StructureInstance {
  return {
    id: "s_1",
    tier: 1,
    productionRate: 10,
    operatingCost: 0,
    maintenanceCost: 0,
    computeDemand: 0,
    active: true,
    constructionProgress: 1,
    health: 1,
    ...overrides,
  };
}

function stateWithSystem(systemOverrides?: Partial<SystemState>): GameState {
  const base = createInitialState(42);
  const sol = base.systems["sol"]!;
  return {
    ...base,
    systems: {
      ...base.systems,
      sol: { ...sol, ...systemOverrides },
    },
  };
}

describe("tickResources", () => {
  test("returns a new state object (immutability)", () => {
    const state = createInitialState(42);
    const next = tickResources(state, 1);
    expect(next).not.toBe(state);
    expect(next.systems).not.toBe(state.systems);
    expect(next.systems["sol"]).not.toBe(state.systems["sol"]);
  });

  test("does not mutate the original state", () => {
    const state = createInitialState(42);
    const originalMaterials = state.systems["sol"]!.resources.materials;
    tickResources(state, 1);
    expect(state.systems["sol"]!.resources.materials).toBe(originalMaterials);
  });

  test("accumulates materials over time using dt", () => {
    const base = createInitialState(42);
    const sol = base.systems["sol"]!;
    const state = stateWithSystem({
      resources: { materials: 100, energy: 0, computingPower: 0 },
      mainProbe: { ...sol.mainProbe!, mode: "gathering" },
    });
    const next = tickResources(state, 2);
    const nextSol = next.systems["sol"]!;
    expect(nextSol.resources.materials).toBeCloseTo(100 + 0.9 * 2);
  });

  test("materials never go below 0", () => {
    const state = stateWithSystem({
      resources: { materials: 0, energy: 0, computingPower: 0 },
      mainProbe: null,
      structures: { miners: [], reactors: [], printers: [], stations: [] },
    });
    const next = tickResources(state, 10);
    const sol = next.systems["sol"]!;
    expect(sol.resources.materials).toBe(0);
  });

  test("energy reflects net supply/demand, can be negative", () => {
    const state = stateWithSystem({
      structures: {
        miners: [makeStructure({ type: "miner", operatingCost: 100 })],
        reactors: [],
        printers: [],
        stations: [],
      },
    });
    const next = tickResources(state, 1);
    const sol = next.systems["sol"]!;
    expect(sol.resources.energy).toBeLessThan(0);
  });

  test("updates resourceRates on the system", () => {
    const base = createInitialState(42);
    const sol = base.systems["sol"]!;
    const state = stateWithSystem({
      mainProbe: { ...sol.mainProbe!, mode: "gathering" },
    });
    const next = tickResources(state, 1);
    const nextSol = next.systems["sol"]!;
    expect(nextSol.resourceRates.materialsPerSecond).toBeCloseTo(0.9);
    expect(nextSol.resourceRates.computingPowerPerSecond).toBe(1);
  });

  test("ticks all systems independently", () => {
    const state = createInitialState(42);
    const next = tickResources(state, 1);
    for (const id of Object.keys(state.systems)) {
      expect(next.systems[id]).toBeDefined();
    }
  });

  test("preserves non-resource fields of the state", () => {
    const state = createInitialState(42);
    const next = tickResources(state, 1);
    expect(next.seed).toBe(state.seed);
    expect(next.tickCount).toBe(state.tickCount);
    expect(next.currentSystemId).toBe(state.currentSystemId);
    expect(next.log).toBe(state.log);
    expect(next.paused).toBe(state.paused);
  });

  test("dt of 0 produces no change in materials", () => {
    const state = createInitialState(42);
    const next = tickResources(state, 0);
    const sol = next.systems["sol"]!;
    expect(sol.resources.materials).toBe(state.systems["sol"]!.resources.materials);
  });
});
