import { describe, test, expect } from "bun:test";
import { tickResearch } from "../src/simulation/systems/research";
import { createInitialState } from "../src/simulation/state";
import type { GameState, ResearchProject, SystemState } from "../src/simulation/state";
import { TECH_TREE } from "../src/simulation/data/tech-tree";

const SEED = 42;
const DT = 1;

function makeResearchProject(
  techId: string,
  overrides?: Partial<ResearchProject>,
): ResearchProject {
  const tech = TECH_TREE[techId]!;
  return {
    id: `research_${techId}`,
    techId,
    branchId: tech.branchId,
    tier: tech.tier,
    name: tech.name,
    initialCost: { ...tech.initialCost },
    continuousCost: tech.continuousCost,
    progress: 0,
    completed: false,
    ...overrides,
  };
}

function makeGameStateWithResearch(
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
        resourceRates: {
          ...sol.resourceRates,
          ...systemOverrides.resourceRates,
        },
      },
    },
  };
}

describe("parallel research mechanics", () => {
  describe("without parallel_processing", () => {
    test("only the first queued project progresses", () => {
      const project1 = makeResearchProject("basic_mining_techniques");
      const project2 = makeResearchProject("basic_reactors");

      const state = makeGameStateWithResearch({
        researchQueue: [project1, project2],
        resourceRates: { materialsPerSecond: 0, energyPerSecond: 0, computingPowerPerSecond: 10 },
        completedResearch: {},
      });

      const next = tickResearch(state, DT);
      const sol = next.systems["sol"]!;

      const p1 = sol.researchQueue.find((p) => p.techId === "basic_mining_techniques");
      const p2 = sol.researchQueue.find((p) => p.techId === "basic_reactors");

      expect(p1).toBeDefined();
      expect(p1!.progress).toBeGreaterThan(0);
      expect(p2).toBeDefined();
      expect(p2!.progress).toBe(0);
    });
  });

  describe("with parallel_processing", () => {
    test("both of the first 2 queued projects progress simultaneously", () => {
      const project1 = makeResearchProject("basic_mining_techniques");
      const project2 = makeResearchProject("basic_reactors");

      const state = makeGameStateWithResearch({
        researchQueue: [project1, project2],
        resourceRates: { materialsPerSecond: 0, energyPerSecond: 0, computingPowerPerSecond: 20 },
        completedResearch: { parallel_processing: true },
      });

      const next = tickResearch(state, DT);
      const sol = next.systems["sol"]!;

      const p1 = sol.researchQueue.find((p) => p.techId === "basic_mining_techniques");
      const p2 = sol.researchQueue.find((p) => p.techId === "basic_reactors");

      expect(p1).toBeDefined();
      expect(p1!.progress).toBeGreaterThan(0);
      expect(p2).toBeDefined();
      expect(p2!.progress).toBeGreaterThan(0);
    });

    test("computing power is split evenly across concurrent projects", () => {
      const project1 = makeResearchProject("basic_mining_techniques");
      const project2 = makeResearchProject("basic_reactors");

      const computingPower = 20;

      const parallelState = makeGameStateWithResearch({
        researchQueue: [project1, project2],
        resourceRates: { materialsPerSecond: 0, energyPerSecond: 0, computingPowerPerSecond: computingPower },
        completedResearch: { parallel_processing: true },
      });

      const serialState = makeGameStateWithResearch({
        researchQueue: [{ ...project1 }],
        resourceRates: { materialsPerSecond: 0, energyPerSecond: 0, computingPowerPerSecond: computingPower / 2 },
        completedResearch: {},
      });

      const nextParallel = tickResearch(parallelState, DT);
      const nextSerial = tickResearch(serialState, DT);

      const parallelP1 = nextParallel.systems["sol"]!.researchQueue.find(
        (p) => p.techId === "basic_mining_techniques",
      );
      const serialP1 = nextSerial.systems["sol"]!.researchQueue.find(
        (p) => p.techId === "basic_mining_techniques",
      );

      expect(parallelP1).toBeDefined();
      expect(serialP1).toBeDefined();
      expect(parallelP1!.progress).toBeCloseTo(serialP1!.progress);
    });
  });

  describe("distributed_intelligence", () => {
    test("pooled computing from multiple systems benefits all research projects", () => {
      const project1 = makeResearchProject("basic_mining_techniques");
      const project2 = makeResearchProject("basic_reactors");

      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;
      const ac = state.systems["alpha_centauri"]!;

      const distributed: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: {
            ...sol,
            researchQueue: [project1],
            resourceRates: { materialsPerSecond: 0, energyPerSecond: 0, computingPowerPerSecond: 10 },
            completedResearch: { distributed_intelligence: true },
          },
          alpha_centauri: {
            ...ac,
            researchQueue: [{ ...project2 }],
            resourceRates: { materialsPerSecond: 0, energyPerSecond: 0, computingPowerPerSecond: 5 },
            completedResearch: { distributed_intelligence: true },
          },
        },
      };

      const next = tickResearch(distributed, DT);
      const solP = next.systems["sol"]!.researchQueue.find(
        (p) => p.techId === "basic_mining_techniques",
      );
      const acP = next.systems["alpha_centauri"]!.researchQueue.find(
        (p) => p.techId === "basic_reactors",
      );

      expect(solP).toBeDefined();
      expect(solP!.progress).toBeGreaterThan(0);
      expect(acP).toBeDefined();
      expect(acP!.progress).toBeGreaterThan(0);
    });

    test("pooled computing is divided across total active projects, not given in full to each", () => {
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;
      const ac = state.systems["alpha_centauri"]!;

      const project1 = makeResearchProject("basic_mining_techniques");
      const project2 = makeResearchProject("basic_reactors");

      const twoSystemState: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: {
            ...sol,
            researchQueue: [project1],
            resourceRates: { materialsPerSecond: 0, energyPerSecond: 0, computingPowerPerSecond: 10 },
            completedResearch: { distributed_intelligence: true },
          },
          alpha_centauri: {
            ...ac,
            researchQueue: [{ ...project2 }],
            resourceRates: { materialsPerSecond: 0, energyPerSecond: 0, computingPowerPerSecond: 5 },
            completedResearch: { distributed_intelligence: true },
          },
        },
      };

      const singleSystemState = makeGameStateWithResearch({
        researchQueue: [{ ...project1 }],
        resourceRates: { materialsPerSecond: 0, energyPerSecond: 0, computingPowerPerSecond: 15 / 2 },
        completedResearch: {},
      });

      const nextTwo = tickResearch(twoSystemState, DT);
      const nextSingle = tickResearch(singleSystemState, DT);

      const twoSolP = nextTwo.systems["sol"]!.researchQueue.find(
        (p) => p.techId === "basic_mining_techniques",
      );
      const singleP = nextSingle.systems["sol"]!.researchQueue.find(
        (p) => p.techId === "basic_mining_techniques",
      );

      expect(twoSolP).toBeDefined();
      expect(singleP).toBeDefined();
      expect(twoSolP!.progress).toBeCloseTo(singleP!.progress);
    });
  });

  describe("research speed multiplier", () => {
    test("basic_computing increases research progress rate by 1.25x", () => {
      const project = makeResearchProject("basic_reactors");

      const baseState = makeGameStateWithResearch({
        researchQueue: [{ ...project }],
        resourceRates: { materialsPerSecond: 0, energyPerSecond: 0, computingPowerPerSecond: 10 },
        completedResearch: {},
      });

      const boostedState = makeGameStateWithResearch({
        researchQueue: [{ ...project }],
        resourceRates: { materialsPerSecond: 0, energyPerSecond: 0, computingPowerPerSecond: 10 },
        completedResearch: { basic_computing: true },
      });

      const nextBase = tickResearch(baseState, DT);
      const nextBoosted = tickResearch(boostedState, DT);

      const baseProgress = nextBase.systems["sol"]!.researchQueue[0]!.progress;
      const boostedProgress = nextBoosted.systems["sol"]!.researchQueue[0]!.progress;

      expect(boostedProgress).toBeGreaterThan(baseProgress);
      expect(boostedProgress).toBeCloseTo(baseProgress * 1.25);
    });

    test("quantum_computing stacks to 2.25x research speed", () => {
      const project = makeResearchProject("basic_reactors");

      const baseState = makeGameStateWithResearch({
        researchQueue: [{ ...project }],
        resourceRates: { materialsPerSecond: 0, energyPerSecond: 0, computingPowerPerSecond: 10 },
        completedResearch: {},
      });

      const maxState = makeGameStateWithResearch({
        researchQueue: [{ ...project }],
        resourceRates: { materialsPerSecond: 0, energyPerSecond: 0, computingPowerPerSecond: 10 },
        completedResearch: { basic_computing: true, quantum_computing: true },
      });

      const nextBase = tickResearch(baseState, DT);
      const nextMax = tickResearch(maxState, DT);

      const baseProgress = nextBase.systems["sol"]!.researchQueue[0]!.progress;
      const maxProgress = nextMax.systems["sol"]!.researchQueue[0]!.progress;

      expect(maxProgress).toBeCloseTo(baseProgress * 2.25);
    });
  });
});
