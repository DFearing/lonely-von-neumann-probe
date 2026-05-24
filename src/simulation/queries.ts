import type { SystemState } from "./state";
import { TECH_TREE, techsInBranch } from "./data/tech-tree";
import { STRUCTURES } from "./data/structures";
import type { StructureDefinition } from "./data/structures";
import { CPUS, PROPULSIONS, REACTORS } from "./data/components";
import type {
  CpuDefinition,
  PropulsionDefinition,
  ReactorDefinition,
} from "./data/components";

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
