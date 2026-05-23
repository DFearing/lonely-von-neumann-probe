import type { CpuType, PropulsionType, ReactorType, StructureType } from "./state";

export type GameSpeed = 1 | 2 | 5 | 10;

export type PlayerAction =
  | { type: "build_structure"; systemId: string; structureType: StructureType; tier: number }
  | { type: "cancel_construction"; systemId: string; projectId: string }
  | { type: "build_probe"; systemId: string; cpu: CpuType; propulsion: PropulsionType; reactor: ReactorType; targetSystemId: string }
  | { type: "start_research"; systemId: string; techId: string }
  | { type: "pause_research"; systemId: string; projectId: string }
  | { type: "cancel_research"; systemId: string; projectId: string }
  | { type: "reorder_research"; systemId: string; projectId: string; newIndex: number }
  | { type: "switch_system"; systemId: string }
  | { type: "set_speed"; speed: GameSpeed }
  | { type: "pause" }
  | { type: "unpause" };
