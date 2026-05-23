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
    active: true,
    constructionProgress: 1,
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
    const state = stateWithSystem({ resources: { materials: 100, energy: 100, computingPower: 0 } });
    const next = tickResources(state, 2);
    const sol = next.systems["sol"]!;
    expect(sol.resources.materials).toBe(100 + 5 * 2);
  });

  test("clamps resources to minimum 0", () => {
    const state = stateWithSystem({
      resources: { materials: 0, energy: 1, computingPower: 0 },
      structures: {
        miners: [makeStructure({ type: "miner", operatingCost: 100 })],
        reactors: [],
        printers: [],
      },
    });
    const next = tickResources(state, 10);
    const sol = next.systems["sol"]!;
    expect(sol.resources.energy).toBe(0);
  });

  test("updates resourceRates on the system", () => {
    const state = createInitialState(42);
    const next = tickResources(state, 1);
    const sol = next.systems["sol"]!;
    expect(sol.resourceRates.materialsPerSecond).toBe(5);
    expect(sol.resourceRates.computingPowerPerSecond).toBe(1);
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

  test("dt of 0 produces no change in resources", () => {
    const state = createInitialState(42);
    const next = tickResources(state, 0);
    const sol = next.systems["sol"]!;
    expect(sol.resources.materials).toBe(state.systems["sol"]!.resources.materials);
    expect(sol.resources.energy).toBe(state.systems["sol"]!.resources.energy);
  });
});
