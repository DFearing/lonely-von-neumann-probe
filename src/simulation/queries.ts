import type { GameState, ProbeInTransit, SystemState } from "./state";
import { TECH_TREE, techsInBranch } from "./data/tech-tree";
import type { TechDefinition } from "./data/tech-tree";
import { STRUCTURES } from "./data/structures";
import type { StructureDefinition } from "./data/structures";
import { CPUS, PROPULSIONS, REACTORS } from "./data/components";
import type {
  CpuDefinition,
  PropulsionDefinition,
  ReactorDefinition,
} from "./data/components";
import { KNOWN_SYSTEMS } from "./data/star-systems";

export type TechStatus = "completed" | "in_progress" | "available" | "locked";

export function hasPrerequisites(
  system: SystemState,
  techId: string,
): boolean {
  const tech = TECH_TREE[techId];
  if (!tech) return false;

  if (tech.tier <= 1) return true;

  const branchTechs = techsInBranch(tech.branchId);
  for (const t of branchTechs) {
    if (t.tier < tech.tier && !system.completedResearch[t.id]) {
      return false;
    }
  }

  for (const prereqId of tech.prerequisites) {
    if (!system.completedResearch[prereqId]) {
      return false;
    }
  }

  return true;
}

export function getTechStatus(
  system: SystemState,
  techId: string,
): TechStatus {
  if (system.completedResearch[techId]) return "completed";
  if (system.researchQueue.some((p) => p.techId === techId)) return "in_progress";
  if (hasPrerequisites(system, techId)) return "available";
  return "locked";
}

export function getAvailableStructures(
  system: SystemState,
): StructureDefinition[] {
  return Object.values(STRUCTURES).filter(
    (def: StructureDefinition) =>
      !def.techGate || system.completedResearch[def.techGate] === true,
  );
}

export function getAvailableComponents(
  system: SystemState,
): {
  cpus: CpuDefinition[];
  propulsions: PropulsionDefinition[];
  reactors: ReactorDefinition[];
} {
  const gateCheck = (gate: string | null): boolean =>
    !gate || system.completedResearch[gate] === true;

  return {
    cpus: Object.values(CPUS).filter((d: CpuDefinition) => gateCheck(d.techGate)),
    propulsions: Object.values(PROPULSIONS).filter((d: PropulsionDefinition) =>
      gateCheck(d.techGate),
    ),
    reactors: Object.values(REACTORS).filter((d: ReactorDefinition) =>
      gateCheck(d.techGate),
    ),
  };
}

export function getMissingPrerequisites(
  system: SystemState,
  techId: string,
): { id: string; branchId: string; tier: number; name: string }[] {
  const tech = TECH_TREE[techId];
  if (!tech) return [];

  const missingByBranch = new Map<string, TechDefinition>();

  const branchTechs = techsInBranch(tech.branchId);
  for (const t of branchTechs) {
    if (t.tier < tech.tier && !system.completedResearch[t.id]) {
      const existing = missingByBranch.get(t.branchId);
      if (!existing || t.tier > existing.tier) {
        missingByBranch.set(t.branchId, t);
      }
    }
  }

  for (const prereqId of tech.prerequisites) {
    if (!system.completedResearch[prereqId]) {
      const prereqTech = TECH_TREE[prereqId];
      if (prereqTech) {
        const existing = missingByBranch.get(prereqTech.branchId);
        if (!existing || prereqTech.tier > existing.tier) {
          missingByBranch.set(prereqTech.branchId, prereqTech);
        }
      }
    }
  }

  return Array.from(missingByBranch.values()).map((t) => ({
    id: t.id,
    branchId: t.branchId,
    tier: t.tier,
    name: t.name,
  }));
}

export function isBlackHoleVisible(state: GameState): boolean {
  return Object.values(state.systems).some(
    (sys) => sys.completedResearch["computing_architecture_t4"] === true,
  );
}

export function getBlackHoleSystemId(): string {
  return "cygnus_x1";
}

export function getIncomingProbes(
  state: GameState,
  targetSystemId: string,
): ProbeInTransit[] {
  const results: ProbeInTransit[] = [];
  for (const system of Object.values(state.systems)) {
    for (const probe of system.sentProbes) {
      if (probe.destinationSystemId === targetSystemId) {
        results.push(probe);
      }
    }
  }
  return results;
}

export function getProbeETA(probe: ProbeInTransit): number {
  return Math.max(0, probe.travelTimeSeconds - probe.elapsedSeconds);
}

export function getProbeProgress(probe: ProbeInTransit): number {
  if (probe.travelTimeSeconds <= 0) return 1;
  return Math.min(1, probe.elapsedSeconds / probe.travelTimeSeconds);
}

export function getAllTransitProbes(state: GameState): ProbeInTransit[] {
  const results: ProbeInTransit[] = [];
  for (const system of Object.values(state.systems)) {
    for (const probe of system.sentProbes) {
      results.push(probe);
    }
  }
  return results;
}

export function resolveDistance(
  originSystem: SystemState,
  targetSystemId: string,
  allSystems: Record<string, SystemState>,
): number {
  const target = allSystems[targetSystemId];
  if (target) {
    return Math.abs(target.distanceFromOrigin - originSystem.distanceFromOrigin);
  }

  const knownTarget = KNOWN_SYSTEMS.find((s) => s.id === targetSystemId);
  if (knownTarget) {
    return Math.abs(knownTarget.distanceFromOrigin - originSystem.distanceFromOrigin);
  }

  return 10;
}
