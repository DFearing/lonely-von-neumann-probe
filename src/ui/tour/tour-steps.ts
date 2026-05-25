import type { ViewId } from "../shell/Sidebar";

export type TourAdvanceCondition =
  | { type: "probe_mode_changed"; mode: "gathering" }
  | { type: "construction_queued"; structureType: "miner" }
  | { type: "research_started" };

export interface TourStep {
  id: string;
  target: string;
  title: string;
  body: string;
  placement: "top" | "bottom" | "left" | "right";
  advanceOn?: TourAdvanceCondition;
  requiredView?: ViewId;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "sidebar",
    target: "sidebar",
    title: "NAVIGATION",
    body: "Navigate between views — Overview, Fleet, Systems, Research, and more.",
    placement: "right",
  },
  {
    id: "footer",
    target: "footer",
    title: "RESOURCES",
    body: "Your resources at a glance: materials, energy, and computing power.",
    placement: "top",
  },
  {
    id: "topbar",
    target: "topbar",
    title: "CONTROLS",
    body: "Pause, play, and adjust simulation speed. The year counter tracks elapsed time.",
    placement: "bottom",
  },
  {
    id: "overview",
    target: "overview",
    title: "HOME SYSTEM",
    body: "Your home system at a glance — probes, miners, reactors, and printers.",
    placement: "top",
    requiredView: "overview",
  },
  {
    id: "probe-mode",
    target: "probe-mode",
    title: "START GATHERING",
    body: "Open the ACTION menu and set your probe to GATHER mode to start mining materials.",
    placement: "right",
    advanceOn: { type: "probe_mode_changed", mode: "gathering" },
    requiredView: "overview",
  },
  {
    id: "build-miner",
    target: "build-miner",
    title: "BUILD A MINER",
    body: "Click the + button to queue your first miner and boost material production.",
    placement: "left",
    advanceOn: { type: "construction_queued", structureType: "miner" },
    requiredView: "overview",
  },
  {
    id: "start-research",
    target: "start-research",
    title: "BEGIN RESEARCH",
    body: "Select a technology and double-click it to begin researching.",
    placement: "left",
    advanceOn: { type: "research_started" },
    requiredView: "research",
  },
];
