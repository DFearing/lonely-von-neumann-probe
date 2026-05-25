import { describe, test, expect } from "bun:test";
import {
  getTechStatus,
  getAvailableStructures,
  getAvailableComponents,
  getMissingPrerequisites,
  getIncomingProbes,
  getProbeETA,
  getProbeProgress,
  getAllTransitProbes,
} from "../src/simulation/queries";
import { createInitialState } from "../src/simulation/state";
import type { GameState, SystemState, ResearchProject, ProbeInTransit } from "../src/simulation/state";
import { TECH_TREE, TECH_BRANCHES } from "../src/simulation/data/tech-tree";
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
    continuousCost: tech.continuousCost,
    progress: 0,
    completed: false,
    paused: false,
  };
}

describe("getTechStatus", () => {
  test("returns 'completed' for completed tech", () => {
    const system = solSystem({
      completedResearch: { mining_efficiency_t1: true },
    });
    expect(getTechStatus(system, "mining_efficiency_t1")).toBe("completed");
  });

  test("returns 'in_progress' for tech in the research queue", () => {
    const project = makeResearchProject("mining_efficiency_t1");
    const system = solSystem({ researchQueue: [project] });

    expect(getTechStatus(system, "mining_efficiency_t1")).toBe("in_progress");
  });

  test("returns 'available' when prerequisites are met but not started", () => {
    const system = solSystem({ completedResearch: {} });
    expect(getTechStatus(system, "mining_efficiency_t1")).toBe("available");
  });

  test("returns 'locked' when prerequisites are not met", () => {
    const system = solSystem({ completedResearch: {} });
    expect(getTechStatus(system, "mining_efficiency_t2")).toBe("locked");
  });

  test("tier-2 tech becomes 'available' after tier-1 prerequisite is completed", () => {
    const system = solSystem({
      completedResearch: { mining_efficiency_t1: true },
    });
    expect(getTechStatus(system, "mining_efficiency_t2")).toBe("available");
  });

  test("cross-branch prerequisite blocks until met", () => {
    const system = solSystem({
      completedResearch: {
        mining_types_t1: true,
        mining_types_t2: true,
        mining_types_t3: true,
      },
    });
    expect(getTechStatus(system, "mining_types_t4")).toBe("locked");

    const withPrereq = solSystem({
      completedResearch: {
        mining_types_t1: true,
        mining_types_t2: true,
        mining_types_t3: true,
        mining_efficiency_t2: true,
        mining_efficiency_t1: true,
      },
    });
    expect(getTechStatus(withPrereq, "mining_types_t4")).toBe("available");
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
      completedResearch: { energy_types_t4: true },
    });
    const available = getAvailableStructures(system);
    const reactor2 = available.find((d) => d.type === "reactor" && d.tier === 2);

    expect(reactor2).toBeDefined();
    expect(reactor2!.techGate).toBe("energy_types_t4");
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

  test("unlocks tier-2 CPU when computing_architecture_t4 is completed", () => {
    const system = solSystem({
      completedResearch: { computing_architecture_t4: true },
    });
    const { cpus } = getAvailableComponents(system);

    const cpuTypes = cpus.map((c) => c.type);
    expect(cpuTypes).toContain("cpu_t1");
    expect(cpuTypes).toContain("cpu_t2");
  });

  test("unlocks tier-2 propulsion when probe_propulsion_t4 is completed", () => {
    const system = solSystem({
      completedResearch: { probe_propulsion_t4: true },
    });
    const { propulsions } = getAvailableComponents(system);

    const propTypes = propulsions.map((p) => p.type);
    expect(propTypes).toContain("prop_t1");
    expect(propTypes).toContain("prop_t2");
  });

  test("unlocks rct_t2 reactor component when probe_reactors_t4 is completed", () => {
    const system = solSystem({
      completedResearch: { probe_reactors_t4: true },
    });
    const { reactors } = getAvailableComponents(system);

    const reactorTypes = reactors.map((r) => r.type);
    expect(reactorTypes).toContain("rct_t1");
    expect(reactorTypes).toContain("rct_t2");
  });
});

function completeUpTo(
  system: SystemState,
  branchId: string,
  tier: number,
): void {
  for (let t = 1; t <= tier; t++) {
    system.completedResearch[`${branchId}_t${t}`] = true;
  }
}

describe("cross-branch prerequisites", () => {
  test("mining_types_t8 is locked without manufacturing_types_t4", () => {
    const system = solSystem({ completedResearch: {} });
    completeUpTo(system, "mining_types", 7);
    completeUpTo(system, "mining_efficiency", 5);

    expect(getTechStatus(system, "mining_types_t8")).toBe("locked");
  });

  test("mining_types_t8 is available with all prerequisites met", () => {
    const system = solSystem({ completedResearch: {} });
    completeUpTo(system, "mining_types", 7);
    completeUpTo(system, "mining_efficiency", 5);
    completeUpTo(system, "manufacturing_types", 4);

    expect(getTechStatus(system, "mining_types_t8")).toBe("available");
  });

  test("manufacturing_types_t8 is locked without energy_types_t4", () => {
    const system = solSystem({ completedResearch: {} });
    completeUpTo(system, "manufacturing_types", 7);
    completeUpTo(system, "manufacturing_efficiency", 5);

    expect(getTechStatus(system, "manufacturing_types_t8")).toBe("locked");
  });

  test("manufacturing_types_t8 is available with all prerequisites met", () => {
    const system = solSystem({ completedResearch: {} });
    completeUpTo(system, "manufacturing_types", 7);
    completeUpTo(system, "manufacturing_efficiency", 5);
    completeUpTo(system, "energy_types", 4);

    expect(getTechStatus(system, "manufacturing_types_t8")).toBe("available");
  });

  test("computing_architecture_t8 requires both station_types_t4 and energy_types_t4", () => {
    const system = solSystem({ completedResearch: {} });
    completeUpTo(system, "computing_architecture", 7);
    completeUpTo(system, "computing_speed", 7);

    expect(getTechStatus(system, "computing_architecture_t8")).toBe("locked");

    completeUpTo(system, "station_types", 4);
    expect(getTechStatus(system, "computing_architecture_t8")).toBe("locked");

    completeUpTo(system, "energy_types", 4);
    expect(getTechStatus(system, "computing_architecture_t8")).toBe("available");
  });

  test("energy_types_t8 is locked without manufacturing_types_t4", () => {
    const system = solSystem({ completedResearch: {} });
    completeUpTo(system, "energy_types", 7);
    completeUpTo(system, "energy_production", 5);

    expect(getTechStatus(system, "energy_types_t8")).toBe("locked");

    completeUpTo(system, "manufacturing_types", 4);
    expect(getTechStatus(system, "energy_types_t8")).toBe("available");
  });

  test("station_types_t8 is locked without energy_types_t4", () => {
    const system = solSystem({ completedResearch: {} });
    completeUpTo(system, "station_types", 7);
    completeUpTo(system, "station_efficiency", 5);

    expect(getTechStatus(system, "station_types_t8")).toBe("locked");

    completeUpTo(system, "energy_types", 4);
    expect(getTechStatus(system, "station_types_t8")).toBe("available");
  });

  test("probe_propulsion_t8 requires both manufacturing_types_t4 and energy_types_t4", () => {
    const system = solSystem({ completedResearch: {} });
    completeUpTo(system, "probe_propulsion", 7);

    expect(getTechStatus(system, "probe_propulsion_t8")).toBe("locked");

    completeUpTo(system, "manufacturing_types", 4);
    expect(getTechStatus(system, "probe_propulsion_t8")).toBe("locked");

    completeUpTo(system, "energy_types", 4);
    expect(getTechStatus(system, "probe_propulsion_t8")).toBe("available");
  });

  test("probe_reactors_t8 is locked without energy_types_t4", () => {
    const system = solSystem({ completedResearch: {} });
    completeUpTo(system, "probe_reactors", 7);

    expect(getTechStatus(system, "probe_reactors_t8")).toBe("locked");

    completeUpTo(system, "energy_types", 4);
    expect(getTechStatus(system, "probe_reactors_t8")).toBe("available");
  });

  test("T4 types techs have no cross-branch gates", () => {
    const t4Branches = [
      { branch: "mining_types", pairBranch: "mining_efficiency" },
      { branch: "energy_types", pairBranch: "energy_production" },
      { branch: "manufacturing_types", pairBranch: "manufacturing_efficiency" },
      { branch: "computing_architecture", pairBranch: "computing_speed" },
    ];

    for (const { branch, pairBranch } of t4Branches) {
      const system = solSystem({ completedResearch: {} });
      completeUpTo(system, branch, 3);
      completeUpTo(system, pairBranch, 2);

      expect(getTechStatus(system, `${branch}_t4`)).toBe("available");
    }
  });

  test("T4 types techs only require within-pair prerequisites", () => {
    const tech = TECH_TREE["mining_types_t4"]!;
    const prereqs = tech.prerequisites;

    const crossBranchPrereqs = prereqs.filter(
      (id) => !id.startsWith("mining_efficiency"),
    );
    expect(crossBranchPrereqs).toHaveLength(0);
  });
});

describe("getMissingPrerequisites", () => {
  test("returns missing cross-branch prereqs for mining_types_t8", () => {
    const system = solSystem({ completedResearch: {} });
    completeUpTo(system, "mining_types", 7);
    completeUpTo(system, "mining_efficiency", 5);

    const missing = getMissingPrerequisites(system, "mining_types_t8");
    const missingBranches = missing.map((m) => m.branchId);

    expect(missingBranches).toContain("manufacturing_types");
    expect(missingBranches).not.toContain("mining_types");
    expect(missingBranches).not.toContain("mining_efficiency");
  });

  test("returns highest missing tier per branch", () => {
    const system = solSystem({ completedResearch: {} });
    completeUpTo(system, "mining_types", 11);

    const missing = getMissingPrerequisites(system, "mining_types_t12");
    const miningEfficiencyMissing = missing.filter(
      (m) => m.branchId === "mining_efficiency",
    );

    expect(miningEfficiencyMissing).toHaveLength(1);
    expect(miningEfficiencyMissing[0]!.tier).toBe(8);
  });

  test("returns empty array when all prerequisites are met", () => {
    const system = solSystem({ completedResearch: {} });
    completeUpTo(system, "mining_types", 7);
    completeUpTo(system, "mining_efficiency", 5);
    completeUpTo(system, "manufacturing_types", 4);

    const missing = getMissingPrerequisites(system, "mining_types_t8");
    expect(missing).toHaveLength(0);
  });

  test("returns empty array for nonexistent tech", () => {
    const system = solSystem();
    const missing = getMissingPrerequisites(system, "nonexistent_t1");
    expect(missing).toHaveLength(0);
  });
});

describe("tech prerequisite graph validation", () => {
  test("no cycles in prerequisite graph", () => {
    const allTechIds = Object.keys(TECH_TREE);

    function hasCycle(startId: string): boolean {
      const visited = new Set<string>();
      const stack = [startId];

      while (stack.length > 0) {
        const current = stack.pop()!;
        if (current === startId && visited.size > 0) return true;
        if (visited.has(current)) continue;
        visited.add(current);

        const tech = TECH_TREE[current];
        if (!tech) continue;

        for (const prereqId of tech.prerequisites) {
          if (prereqId === startId) return true;
          if (!visited.has(prereqId)) {
            stack.push(prereqId);
          }
        }
      }

      return false;
    }

    for (const techId of allTechIds) {
      expect(hasCycle(techId)).toBe(false);
    }
  });

  test("all prerequisite IDs reference existing techs", () => {
    for (const tech of Object.values(TECH_TREE)) {
      for (const prereqId of tech.prerequisites) {
        expect(TECH_TREE[prereqId]).toBeDefined();
      }
    }
  });

  test("every branch in TECH_BRANCHES has techs in TECH_TREE", () => {
    for (const branchId of TECH_BRANCHES) {
      const branchTechs = Object.values(TECH_TREE).filter(
        (t) => t.branchId === branchId,
      );
      expect(branchTechs.length).toBeGreaterThan(0);
    }
  });
});

function makeProbe(overrides?: Partial<ProbeInTransit>): ProbeInTransit {
  return {
    id: "probe_1",
    name: "Test Probe",
    components: { cpu: "cpu_t1", propulsion: "prop_t1", reactor: "rct_t1" },
    originSystemId: "sol",
    destinationSystemId: "alpha_centauri",
    travelTimeSeconds: 100,
    elapsedSeconds: 50,
    ...overrides,
  };
}

function stateWithProbes(probesBySystem: Record<string, ProbeInTransit[]>): GameState {
  const base = createInitialState(SEED);
  const systems: Record<string, SystemState> = {};
  for (const [id, system] of Object.entries(base.systems)) {
    systems[id] = { ...system, sentProbes: probesBySystem[id] ?? [] };
  }
  return { ...base, systems };
}

describe("getIncomingProbes", () => {
  test("finds probes targeting a specific system", () => {
    const probe = makeProbe({ destinationSystemId: "alpha_centauri" });
    const state = stateWithProbes({ sol: [probe] });

    const incoming = getIncomingProbes(state, "alpha_centauri");
    expect(incoming).toHaveLength(1);
    expect(incoming[0]!.id).toBe("probe_1");
  });

  test("returns empty when no probes target the system", () => {
    const probe = makeProbe({ destinationSystemId: "sirius" });
    const state = stateWithProbes({ sol: [probe] });

    expect(getIncomingProbes(state, "alpha_centauri")).toHaveLength(0);
  });

  test("aggregates probes from multiple origin systems", () => {
    const probe1 = makeProbe({ id: "p1", originSystemId: "sol", destinationSystemId: "sirius" });
    const probe2 = makeProbe({ id: "p2", originSystemId: "alpha_centauri", destinationSystemId: "sirius" });
    const state = stateWithProbes({ sol: [probe1], alpha_centauri: [probe2] });

    const incoming = getIncomingProbes(state, "sirius");
    expect(incoming).toHaveLength(2);
  });
});

describe("getProbeETA", () => {
  test("returns remaining travel time", () => {
    const probe = makeProbe({ travelTimeSeconds: 100, elapsedSeconds: 30 });
    expect(getProbeETA(probe)).toBe(70);
  });

  test("returns 0 when probe has arrived or overshot", () => {
    const probe = makeProbe({ travelTimeSeconds: 100, elapsedSeconds: 150 });
    expect(getProbeETA(probe)).toBe(0);
  });

  test("returns 0 at exact arrival", () => {
    const probe = makeProbe({ travelTimeSeconds: 100, elapsedSeconds: 100 });
    expect(getProbeETA(probe)).toBe(0);
  });
});

describe("getProbeProgress", () => {
  test("returns fractional progress", () => {
    const probe = makeProbe({ travelTimeSeconds: 100, elapsedSeconds: 25 });
    expect(getProbeProgress(probe)).toBe(0.25);
  });

  test("returns 1 when travel time is zero", () => {
    const probe = makeProbe({ travelTimeSeconds: 0, elapsedSeconds: 0 });
    expect(getProbeProgress(probe)).toBe(1);
  });

  test("clamps to 1 when elapsed exceeds travel time", () => {
    const probe = makeProbe({ travelTimeSeconds: 100, elapsedSeconds: 200 });
    expect(getProbeProgress(probe)).toBe(1);
  });

  test("returns 0 at start", () => {
    const probe = makeProbe({ travelTimeSeconds: 100, elapsedSeconds: 0 });
    expect(getProbeProgress(probe)).toBe(0);
  });
});

describe("getAllTransitProbes", () => {
  test("returns all probes from all systems", () => {
    const probe1 = makeProbe({ id: "p1", originSystemId: "sol" });
    const probe2 = makeProbe({ id: "p2", originSystemId: "alpha_centauri" });
    const state = stateWithProbes({ sol: [probe1], alpha_centauri: [probe2] });

    const all = getAllTransitProbes(state);
    expect(all).toHaveLength(2);
    const ids = all.map((p) => p.id);
    expect(ids).toContain("p1");
    expect(ids).toContain("p2");
  });

  test("returns empty when no probes are in transit", () => {
    const state = stateWithProbes({});
    expect(getAllTransitProbes(state)).toHaveLength(0);
  });
});
