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
    continuousCost: tech.continuousCost,
    progress: 0,
    completed: false,
    paused: false,
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
  describe("without computing_architecture_t4", () => {
    test("only the first queued project progresses", () => {
      const project1 = makeResearchProject("mining_efficiency_t1");
      const project2 = makeResearchProject("energy_production_t1");

      const state = makeGameStateWithResearch({
        researchQueue: [project1, project2],
        resourceRates: { materialsPerSecond: 0, materialsSupply: 0, materialsDemand: 0, energySupply: 0, energyDemand: 0, energyNet: 0, computingPowerPerSecond: 10, computeSupply: 0, computeDemand: 0, computeNet: 0, computeEfficiency: 1 },
        completedResearch: {},
      });

      const next = tickResearch(state, DT);
      const sol = next.systems["sol"]!;

      const p1 = sol.researchQueue.find((p) => p.techId === "mining_efficiency_t1");
      const p2 = sol.researchQueue.find((p) => p.techId === "energy_production_t1");

      expect(p1).toBeDefined();
      expect(p1!.progress).toBeGreaterThan(0);
      expect(p2).toBeDefined();
      expect(p2!.progress).toBe(0);
    });
  });

  describe("with computing_architecture_t4", () => {
    test("both of the first 2 queued projects progress simultaneously", () => {
      const project1 = makeResearchProject("mining_efficiency_t1");
      const project2 = makeResearchProject("energy_production_t1");

      const state = makeGameStateWithResearch({
        researchQueue: [project1, project2],
        resourceRates: { materialsPerSecond: 0, materialsSupply: 0, materialsDemand: 0, energySupply: 0, energyDemand: 0, energyNet: 0, computingPowerPerSecond: 20, computeSupply: 0, computeDemand: 0, computeNet: 0, computeEfficiency: 1 },
        completedResearch: { computing_architecture_t4: true },
      });

      const next = tickResearch(state, DT);
      const sol = next.systems["sol"]!;

      const p1 = sol.researchQueue.find((p) => p.techId === "mining_efficiency_t1");
      const p2 = sol.researchQueue.find((p) => p.techId === "energy_production_t1");

      expect(p1).toBeDefined();
      expect(p1!.progress).toBeGreaterThan(0);
      expect(p2).toBeDefined();
      expect(p2!.progress).toBeGreaterThan(0);
    });

    test("computing power is split evenly across concurrent projects", () => {
      const project1 = makeResearchProject("mining_efficiency_t1");
      const project2 = makeResearchProject("energy_production_t1");

      const computingPower = 20;

      const parallelState = makeGameStateWithResearch({
        researchQueue: [project1, project2],
        resourceRates: { materialsPerSecond: 0, materialsSupply: 0, materialsDemand: 0, energySupply: 0, energyDemand: 0, energyNet: 0, computingPowerPerSecond: computingPower, computeSupply: 0, computeDemand: 0, computeNet: 0, computeEfficiency: 1 },
        completedResearch: { computing_architecture_t4: true },
      });

      const serialState = makeGameStateWithResearch({
        researchQueue: [{ ...project1 }],
        resourceRates: { materialsPerSecond: 0, materialsSupply: 0, materialsDemand: 0, energySupply: 0, energyDemand: 0, energyNet: 0, computingPowerPerSecond: computingPower / 2, computeSupply: 0, computeDemand: 0, computeNet: 0, computeEfficiency: 1 },
        completedResearch: {},
      });

      const nextParallel = tickResearch(parallelState, DT);
      const nextSerial = tickResearch(serialState, DT);

      const parallelP1 = nextParallel.systems["sol"]!.researchQueue.find(
        (p) => p.techId === "mining_efficiency_t1",
      );
      const serialP1 = nextSerial.systems["sol"]!.researchQueue.find(
        (p) => p.techId === "mining_efficiency_t1",
      );

      expect(parallelP1).toBeDefined();
      expect(serialP1).toBeDefined();
      expect(parallelP1!.progress).toBeCloseTo(serialP1!.progress);
    });
  });

  describe("computing_architecture_t14", () => {
    test("pooled computing from multiple systems benefits all research projects", () => {
      const project1 = makeResearchProject("mining_efficiency_t1");
      const project2 = makeResearchProject("energy_production_t1");

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
            resourceRates: { materialsPerSecond: 0, materialsSupply: 0, materialsDemand: 0, energySupply: 0, energyDemand: 0, energyNet: 0, computingPowerPerSecond: 10, computeSupply: 0, computeDemand: 0, computeNet: 0, computeEfficiency: 1 },
            completedResearch: { computing_architecture_t14: true },
          },
          alpha_centauri: {
            ...ac,
            researchQueue: [{ ...project2 }],
            resourceRates: { materialsPerSecond: 0, materialsSupply: 0, materialsDemand: 0, energySupply: 0, energyDemand: 0, energyNet: 0, computingPowerPerSecond: 5, computeSupply: 0, computeDemand: 0, computeNet: 0, computeEfficiency: 1 },
            completedResearch: { computing_architecture_t14: true },
          },
        },
      };

      const next = tickResearch(distributed, DT);
      const solP = next.systems["sol"]!.researchQueue.find(
        (p) => p.techId === "mining_efficiency_t1",
      );
      const acP = next.systems["alpha_centauri"]!.researchQueue.find(
        (p) => p.techId === "energy_production_t1",
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

      const project1 = makeResearchProject("mining_efficiency_t1");
      const project2 = makeResearchProject("energy_production_t1");

      const twoSystemState: GameState = {
        ...state,
        systems: {
          ...state.systems,
          sol: {
            ...sol,
            researchQueue: [project1],
            resourceRates: { materialsPerSecond: 0, materialsSupply: 0, materialsDemand: 0, energySupply: 0, energyDemand: 0, energyNet: 0, computingPowerPerSecond: 10, computeSupply: 0, computeDemand: 0, computeNet: 0, computeEfficiency: 1 },
            completedResearch: { computing_architecture_t14: true },
          },
          alpha_centauri: {
            ...ac,
            researchQueue: [{ ...project2 }],
            resourceRates: { materialsPerSecond: 0, materialsSupply: 0, materialsDemand: 0, energySupply: 0, energyDemand: 0, energyNet: 0, computingPowerPerSecond: 5, computeSupply: 0, computeDemand: 0, computeNet: 0, computeEfficiency: 1 },
            completedResearch: { computing_architecture_t14: true },
          },
        },
      };

      const singleSystemState = makeGameStateWithResearch({
        researchQueue: [{ ...project1 }],
        resourceRates: { materialsPerSecond: 0, materialsSupply: 0, materialsDemand: 0, energySupply: 0, energyDemand: 0, energyNet: 0, computingPowerPerSecond: 15 / 2, computeSupply: 0, computeDemand: 0, computeNet: 0, computeEfficiency: 1 },
        completedResearch: {},
      });

      const nextTwo = tickResearch(twoSystemState, DT);
      const nextSingle = tickResearch(singleSystemState, DT);

      const twoSolP = nextTwo.systems["sol"]!.researchQueue.find(
        (p) => p.techId === "mining_efficiency_t1",
      );
      const singleP = nextSingle.systems["sol"]!.researchQueue.find(
        (p) => p.techId === "mining_efficiency_t1",
      );

      expect(twoSolP).toBeDefined();
      expect(singleP).toBeDefined();
      expect(twoSolP!.progress).toBeCloseTo(singleP!.progress);
    });
  });

  describe("zero computing power", () => {
    test("research progress stays at 0 with no computing power", () => {
      const project = makeResearchProject("mining_efficiency_t1");

      const state = makeGameStateWithResearch({
        researchQueue: [project],
        resourceRates: { materialsPerSecond: 0, materialsSupply: 0, materialsDemand: 0, energySupply: 0, energyDemand: 0, energyNet: 0, computingPowerPerSecond: 0, computeSupply: 0, computeDemand: 0, computeNet: 0, computeEfficiency: 1 },
        completedResearch: {},
      });

      const next = tickResearch(state, DT);
      const p = next.systems["sol"]!.researchQueue.find(
        (p) => p.techId === "mining_efficiency_t1",
      );

      expect(p).toBeDefined();
      expect(p!.progress).toBe(0);
    });
  });

  describe("research completion", () => {
    test("completed project is removed from queue and added to completedResearch", () => {
      const tech = TECH_TREE["mining_efficiency_t1"]!;
      const project = makeResearchProject("mining_efficiency_t1", {
        progress: 0.999,
      });

      const computingPower = tech.continuousCost * 10;

      const state = makeGameStateWithResearch({
        researchQueue: [project],
        resourceRates: {
          materialsPerSecond: 0,
          materialsSupply: 0, materialsDemand: 0,
          energySupply: 0, energyDemand: 0, energyNet: 0,
          computingPowerPerSecond: computingPower,
          computeSupply: 0, computeDemand: 0, computeNet: 0, computeEfficiency: 1,
        },
        completedResearch: {},
      });

      let current = state;
      for (let i = 0; i < 1000; i++) {
        current = tickResearch(current, DT);
        const sol = current.systems["sol"]!;
        if (sol.completedResearch["mining_efficiency_t1"]) break;
      }

      const sol = current.systems["sol"]!;
      expect(sol.completedResearch["mining_efficiency_t1"]).toBe(true);
      expect(
        sol.researchQueue.some((p) => p.techId === "mining_efficiency_t1"),
      ).toBe(false);
    });
  });

});
