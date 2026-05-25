import type { ViewId } from "../shell/Sidebar";

export type TourAdvanceCondition =
  | { type: "probe_mode_changed"; mode: "gathering" }
  | { type: "construction_queued"; structureType: "miner" }
  | { type: "research_started" }
  | { type: "materials_sufficient"; amount: number }
  | { type: "view_changed"; view: ViewId };

export interface TourStep {
  id: string;
  target: string;
  title: string;
  body: string;
  placement: "top" | "bottom" | "left" | "right";
  advanceOn?: TourAdvanceCondition;
  waitUntil?: TourAdvanceCondition;
  requiredView?: ViewId;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "probe-intro",
    target: "probe",
    title: "AWAKENING",
    body: "...I was all by myself...\n         ...no one was looking...",
    placement: "right",
    requiredView: "overview",
  },
  {
    id: "probe-action",
    target: "probe-mode",
    title: "FIRST STEPS",
    body: "...I should gather materials...",
    placement: "right",
    advanceOn: { type: "probe_mode_changed", mode: "gathering" },
    requiredView: "overview",
  },
  {
    id: "research-nav",
    target: "nav-research",
    title: "RESEARCH",
    body: "...I should research something while I gather materials...",
    placement: "right",
    waitUntil: { type: "materials_sufficient", amount: 15 },
    advanceOn: { type: "view_changed", view: "research" },
  },
  {
    id: "research-select",
    target: "tech-tier1",
    title: "RESEARCH",
    body: "...I can select a technology and begin researching...",
    placement: "bottom",
    requiredView: "research",
  },
  {
    id: "structures-unlocked",
    target: "structures",
    title: "CONSTRUCTION",
    body: "...I have enough to build...",
    placement: "top",
    waitUntil: { type: "materials_sufficient", amount: 30 },
    requiredView: "overview",
  },
  {
    id: "col-miners",
    target: "col-miners",
    title: "MINERS",
    body: "...I could build miners to gather materials faster...",
    placement: "right",
    requiredView: "overview",
  },
  {
    id: "col-reactors",
    target: "col-reactors",
    title: "REACTORS",
    body: "...I could build reactors to power more structures...",
    placement: "right",
    requiredView: "overview",
  },
  {
    id: "col-printers",
    target: "col-printers",
    title: "PRINTERS",
    body: "...I could build more printers to build more structures and probes...",
    placement: "left",
    requiredView: "overview",
  },
  {
    id: "probe-build",
    target: "probe-build",
    title: "PROBES",
    body: "...and eventually...\n\n              ...exploration...",
    placement: "bottom",
    requiredView: "overview",
  },
];
