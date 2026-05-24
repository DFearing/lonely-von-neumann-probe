import type { ProbeMode, StructureType } from "./state";

export type GameSpeed = 1 | 10 | 100 | 1000;

export type PlayerAction =
  | { type: "build_structure"; systemId: string; structureType: StructureType; tier: number }
  | { type: "cancel_construction"; systemId: string; projectId: string }
  | { type: "build_probe"; systemId: string; cpu: string; propulsion: string; reactor: string; targetSystemId: string }
  | { type: "start_research"; systemId: string; techId: string; priority?: boolean }
  | { type: "pause_research"; systemId: string; projectId: string }
  | { type: "cancel_research"; systemId: string; projectId: string }
  | { type: "reorder_research"; systemId: string; projectId: string; newIndex: number }
  | { type: "toggle_structure"; systemId: string; structureId: string }
  | { type: "destroy_structure"; systemId: string; structureId: string }
  | { type: "set_probe_mode"; systemId: string; mode: ProbeMode }
  | { type: "switch_system"; systemId: string }
  | { type: "set_speed"; speed: GameSpeed }
  | { type: "pause" }
  | { type: "unpause" }
  | { type: "purchase_prestige_upgrade"; upgradeId: string }
  | { type: "enter_black_hole" };
