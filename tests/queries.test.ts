import { describe, test, expect } from "bun:test";
import {
  getTechStatus,
  getAvailableStructures,
  getAvailableComponents,
} from "../src/simulation/queries";
import { createInitialState } from "../src/simulation/state";
import type { SystemState, ResearchProject } from "../src/simulation/state";
import { TECH_TREE } from "../src/simulation/data/tech-tree";
import { STRUCTURES } from "../src/simulation/data/structures";

const SEED = 42;

function solSystem(overrides?: Partial<SystemState>): SystemState {
  const state = createInitialState(SEED);
  const sol = state.systems["sol"]!;
  return { ...sol, ...overrides };
}

function makeResearchProject(techId: string): ResearchProject {
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
    paused: false,
  };
}

describe("getTechStatus", () => {
  test("returns 'completed' for completed tech", () => {
    const system = solSystem({
      completedResearch: { mining_t1: true },
    });
    expect(getTechStatus(system, "mining_t1")).toBe("completed");
  });

  test("returns 'in_progress' for tech in the research queue", () => {
    const project = makeResearchProject("mining_t1");
    const system = solSystem({ researchQueue: [project] });

    expect(getTechStatus(system, "mining_t1")).toBe("in_progress");
  });

  test("returns 'available' when prerequisites are met but not started", () => {
    const system = solSystem({ completedResearch: {} });
    expect(getTechStatus(system, "mining_t1")).toBe("available");
  });

  test("returns 'locked' when prerequisites are not met", () => {
    const system = solSystem({ completedResearch: {} });
    expect(getTechStatus(system, "mining_t2")).toBe("locked");
  });

  test("tier-2 tech becomes 'available' after tier-1 prerequisite is completed", () => {
    const system = solSystem({
      completedResearch: { mining_t1: true },
    });
    expect(getTechStatus(system, "mining_t2")).toBe("available");
  });
});

describe("getAvailableStructures", () => {
  test("returns structures with no techGate for a fresh system", () => {
    const system = solSystem({ completedResearch: {} });
    const available = getAvailableStructures(system);

    const noGateStructures = Object.values(STRUCTURES).filter(
      (d) => d.techGate === null,
    );
    expect(available).toHaveLength(noGateStructures.length);
    for (const def of available) {
      expect(def.techGate).toBeNull();
    }
  });

  test("includes gated structure when its tech is completed", () => {
    const system = solSystem({
      completedResearch: { energy_t2: true },
    });
    const available = getAvailableStructures(system);
    const reactor2 = available.find((d) => d.type === "reactor" && d.tier === 2);

    expect(reactor2).toBeDefined();
    expect(reactor2!.techGate).toBe("energy_t2");
  });

  test("excludes gated structure when its tech is not completed", () => {
    const system = solSystem({ completedResearch: {} });
    const available = getAvailableStructures(system);
    const reactor2 = available.find((d) => d.type === "reactor" && d.tier === 2);

    expect(reactor2).toBeUndefined();
  });
});

describe("getAvailableComponents", () => {
  test("returns only ungated components for a fresh system", () => {
    const system = solSystem({ completedResearch: {} });
    const { cpus, propulsions, reactors } = getAvailableComponents(system);

    expect(cpus).toHaveLength(1);
    expect(cpus[0]!.type).toBe("cpu_t1");

    expect(propulsions).toHaveLength(1);
    expect(propulsions[0]!.type).toBe("prop_t1");

    expect(reactors).toHaveLength(1);
    expect(reactors[0]!.type).toBe("rct_t1");
  });

  test("unlocks tier-2 components when probe_components_t2 is completed", () => {
    const system = solSystem({
      completedResearch: { probe_components_t2: true },
    });
    const { cpus, propulsions } = getAvailableComponents(system);

    const cpuTypes = cpus.map((c) => c.type);
    expect(cpuTypes).toContain("cpu_t1");
    expect(cpuTypes).toContain("cpu_t2");

    const propTypes = propulsions.map((p) => p.type);
    expect(propTypes).toContain("prop_t1");
    expect(propTypes).toContain("prop_t2");
  });

  test("unlocks rct_t2 reactor component when energy_t2 is completed", () => {
    const system = solSystem({
      completedResearch: { energy_t2: true },
    });
    const { reactors } = getAvailableComponents(system);

    const reactorTypes = reactors.map((r) => r.type);
    expect(reactorTypes).toContain("rct_t1");
    expect(reactorTypes).toContain("rct_t2");
  });
});
