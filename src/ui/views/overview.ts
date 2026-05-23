import type { GameState, SystemState } from "../../simulation/state";
import {
  CPUS,
  PROPULSIONS,
  REACTORS as REACTOR_COMPONENTS,
} from "../../simulation/data/components";
import { STRUCTURES, structureKey } from "../../simulation/data/structures";
import { el, clear } from "../components/dom";
import { createProgressBar } from "../components/progress-bar";

export interface OverviewView {
  element: HTMLElement;
  update(state: GameState): void;
  onBuildStructure(
    callback: (structureType: string, tier: number) => void,
  ): void;
}

type BuildStructureCallback = (structureType: string, tier: number) => void;

function formatRate(value: number): string {
  return value % 1 === 0 ? String(value) : value.toFixed(1);
}

function renderSystemStatus(system: SystemState): HTMLElement {
  const probe = system.mainProbe;

  const probeInfo = probe
    ? el(
        "div",
        { class: "probe-info" },
        el(
          "span",
          { class: "label" },
          "Active Probe: ",
        ),
        el(
          "span",
          {},
          `${CPUS[probe.components.cpu].name} | ${PROPULSIONS[probe.components.propulsion].name} | ${REACTOR_COMPONENTS[probe.components.reactor].name}`,
        ),
        el("br"),
        el(
          "span",
          { class: "label" },
          "Mining: ",
        ),
        el("span", { class: "value" }, `${probe.miningOutput}/s`),
        el("span", { class: "separator" }, " | "),
        el(
          "span",
          { class: "label" },
          "Computing: ",
        ),
        el("span", { class: "value" }, `${probe.computingOutput}/s`),
      )
    : el("div", { class: "probe-info" }, "No active probe in this system");

  return el(
    "div",
    { class: "panel" },
    el("h2", { class: "panel-header" }, "Current System Status"),
    el(
      "div",
      { class: "panel-body" },
      el(
        "div",
        { class: "system-info" },
        el("span", { class: "label" }, "System: "),
        el("span", { class: "value" }, system.name),
        el("span", { class: "separator" }, " | "),
        el("span", { class: "label" }, "Richness: "),
        el("span", { class: "value" }, `${system.resourceRichness}x`),
      ),
      probeInfo,
    ),
  );
}

function countActiveStructures(
  structures: SystemState["structures"],
  type: "miners" | "reactors" | "printers",
): number {
  return structures[type].filter((s) => s.constructionProgress >= 1).length;
}

function totalProductionRate(
  structures: SystemState["structures"],
  type: "miners" | "reactors" | "printers",
): number {
  let total = 0;
  for (const s of structures[type]) {
    if (s.active && s.constructionProgress >= 1) {
      total += s.productionRate;
    }
  }
  return total;
}

function renderStructuresSummary(
  system: SystemState,
  onBuild: BuildStructureCallback | null,
): HTMLElement {
  const { structures } = system;

  const minerCount = countActiveStructures(structures, "miners");
  const minerRate = totalProductionRate(structures, "miners");

  const reactorCount = countActiveStructures(structures, "reactors");
  const reactorRate = totalProductionRate(structures, "reactors");

  const printerCount = countActiveStructures(structures, "printers");

  const buildButton = el("button", { class: "btn btn--primary" }, "Build Structures");
  if (onBuild) {
    buildButton.addEventListener("click", () => {
      onBuild("miner", 1);
    });
  }

  return el(
    "div",
    { class: "panel" },
    el("h2", { class: "panel-header" }, "Structures Summary"),
    el(
      "div",
      { class: "panel-body" },
      el(
        "div",
        { class: "structure-row" },
        `Miners: ${minerCount} (+${formatRate(minerRate * system.resourceRichness)} Materials/s)`,
      ),
      el(
        "div",
        { class: "structure-row" },
        `Reactors: ${reactorCount} (+${formatRate(reactorRate)} Energy/s)`,
      ),
      el(
        "div",
        { class: "structure-row" },
        `3D Printers: ${printerCount}`,
      ),
      buildButton,
    ),
  );
}

function renderConstructionQueue(system: SystemState): HTMLElement {
  const { constructionQueue } = system;

  const items: HTMLElement[] = [];
  for (let i = 0; i < constructionQueue.length; i++) {
    const project = constructionQueue[i]!;
    const def = STRUCTURES[structureKey(project.targetType as "miner" | "reactor" | "printer", project.targetTier)];
    const name = def?.name ?? project.targetType;

    const progressPercent = Math.round(project.progress * 100);
    const progressBar = createProgressBar();
    progressBar.update(project.progress, `${name} (${progressPercent}%)`);

    items.push(
      el(
        "div",
        { class: "queue-item" },
        el("div", { class: "queue-item-name" }, `${i + 1}. ${name}`),
        progressBar.element,
        el(
          "div",
          { class: "queue-item-detail" },
          `Remaining: ${formatRate(project.remainingCost.materials)}M, ${formatRate(project.remainingCost.energy)}E`,
        ),
      ),
    );
  }

  if (items.length === 0) {
    items.push(el("div", { class: "empty-state" }, "No active construction projects"));
  }

  return el(
    "div",
    { class: "panel" },
    el("h2", { class: "panel-header" }, "Construction Queue"),
    el("div", { class: "panel-body" }, ...items),
  );
}

function renderResearchProgress(system: SystemState): HTMLElement {
  const activeResearch = system.researchQueue.filter((r) => !r.completed);

  const items: HTMLElement[] = [];
  for (const research of activeResearch) {
    const progressPercent = Math.round(research.progress * 100);
    const progressBar = createProgressBar();
    progressBar.update(research.progress, `${research.name} (${progressPercent}%)`);

    items.push(
      el(
        "div",
        { class: "research-item" },
        el(
          "div",
          { class: "research-item-name" },
          `${research.name} (Tier ${research.tier})`,
        ),
        progressBar.element,
        el(
          "div",
          { class: "research-item-detail" },
          `Computing: ${research.continuousCost}/s`,
        ),
      ),
    );
  }

  if (items.length === 0) {
    items.push(el("div", { class: "empty-state" }, "No active research"));
  }

  return el(
    "div",
    { class: "panel" },
    el("h2", { class: "panel-header" }, "Research In Progress"),
    el("div", { class: "panel-body" }, ...items),
  );
}

export function createOverviewView(): OverviewView {
  const element = el("div", { class: "view view--overview" });
  let buildCallback: BuildStructureCallback | null = null;

  function update(state: GameState): void {
    const system = state.systems[state.currentSystemId];
    if (!system) return;

    clear(element);

    element.appendChild(renderSystemStatus(system));
    element.appendChild(renderStructuresSummary(system, buildCallback));
    element.appendChild(renderConstructionQueue(system));
    element.appendChild(renderResearchProgress(system));
  }

  function onBuildStructure(
    callback: (structureType: string, tier: number) => void,
  ): void {
    buildCallback = callback;
  }

  return { element, update, onBuildStructure };
}
