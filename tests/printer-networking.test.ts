import { describe, test, expect } from "bun:test";
import { tickConstruction } from "../src/simulation/systems/construction";
import { createInitialState } from "../src/simulation/state";
import type {
  GameState,
  StructureInstance,
  ConstructionProject,
  SystemState,
} from "../src/simulation/state";

const SEED = 42;
const DT = 1;

function makePrinter(id: string, productionRate = 1): StructureInstance {
  return {
    id,
    type: "printer",
    tier: 1,
    productionRate,
    operatingCost: 0,
    maintenanceCost: 0,
    computeDemand: 0,
    active: true,
    constructionProgress: 1,
    health: 1,
  };
}

function makeProject(id: string, assignedPrinterIds: string[] = []): ConstructionProject {
  return {
    id,
    targetType: "miner",
    targetTier: 1,
    targetConfig: null,
    totalCost: { materials: 30, energy: 10 },
    remainingCost: { materials: 30, energy: 10 },
    progress: 0,
    assignedPrinterIds,
  };
}

function makeStateWithConstruction(
  systemOverrides: Partial<SystemState>,
): GameState {
  const state = createInitialState(SEED);
  const sol = state.systems["sol"]!;
  return {
    ...state,
    systems: {
      ...state.systems,
      sol: {
        ...sol,
        ...systemOverrides,
        structures: {
          miners: [],
          reactors: [],
          printers: [],
          stations: [],
          ...systemOverrides.structures,
        },
      },
    },
  };
}

describe("printer networking", () => {
  describe("without manufacturing_efficiency_t8", () => {
    test("each project gets at most 1 printer", () => {
      const printers = [makePrinter("p1"), makePrinter("p2"), makePrinter("p3")];
      const projects = [makeProject("proj1"), makeProject("proj2")];

      const state = makeStateWithConstruction({
        structures: { miners: [], reactors: [], printers, stations: [] },
        constructionQueue: projects,
        completedResearch: {},
      });

      const result = tickConstruction(state, DT);
      const queue = result.systems["sol"]!.constructionQueue;

      for (const project of queue) {
        expect(project.assignedPrinterIds.length).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("with manufacturing_efficiency_t8", () => {
    test("multiple printers assigned to the first project", () => {
      const printers = [makePrinter("p1"), makePrinter("p2"), makePrinter("p3")];
      const projects = [makeProject("proj1"), makeProject("proj2")];

      const state = makeStateWithConstruction({
        structures: { miners: [], reactors: [], printers, stations: [] },
        constructionQueue: projects,
        completedResearch: { manufacturing_efficiency_t8: true },
      });

      const result = tickConstruction(state, DT);
      const queue = result.systems["sol"]!.constructionQueue;

      const firstProject = queue[0];
      expect(firstProject).toBeDefined();
      expect(firstProject!.assignedPrinterIds.length).toBeGreaterThan(1);
    });

    test("combined speed is faster than single printer", () => {
      const printers = [makePrinter("p1"), makePrinter("p2")];
      const project = makeProject("proj_net", ["p1", "p2"]);

      const networkState = makeStateWithConstruction({
        structures: { miners: [], reactors: [], printers, stations: [] },
        constructionQueue: [project],
        completedResearch: { manufacturing_efficiency_t8: true },
      });

      const singlePrinter = [makePrinter("p1_solo")];
      const soloProject = makeProject("proj_solo", ["p1_solo"]);

      const soloState = makeStateWithConstruction({
        structures: { miners: [], reactors: [], printers: singlePrinter, stations: [] },
        constructionQueue: [soloProject],
        completedResearch: {},
      });

      const nextNet = tickConstruction(networkState, DT);
      const nextSolo = tickConstruction(soloState, DT);

      const netProgress = nextNet.systems["sol"]!.constructionQueue[0]?.progress ?? 1;
      const soloProgress = nextSolo.systems["sol"]!.constructionQueue[0]?.progress ?? 1;

      expect(netProgress).toBeGreaterThan(soloProgress);
    });
  });

  describe("manufacturing speed multiplier", () => {
    test("manufacturing_efficiency_t1 increases build speed", () => {
      const printers = [makePrinter("p1")];
      const project = makeProject("proj_base", ["p1"]);
      const projectBoosted = makeProject("proj_boosted", ["p1"]);

      const baseState = makeStateWithConstruction({
        structures: { miners: [], reactors: [], printers, stations: [] },
        constructionQueue: [project],
        completedResearch: {},
      });

      const boostedState = makeStateWithConstruction({
        structures: { miners: [], reactors: [], printers, stations: [] },
        constructionQueue: [projectBoosted],
        completedResearch: { manufacturing_efficiency_t1: true },
      });

      const nextBase = tickConstruction(baseState, DT);
      const nextBoosted = tickConstruction(boostedState, DT);

      const baseProgress = nextBase.systems["sol"]!.constructionQueue[0]?.progress ?? 1;
      const boostedProgress = nextBoosted.systems["sol"]!.constructionQueue[0]?.progress ?? 1;

      expect(boostedProgress).toBeGreaterThan(baseProgress);
      expect(boostedProgress).toBeCloseTo(baseProgress * 1.05);
    });
  });
});
