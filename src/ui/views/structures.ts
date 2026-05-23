import type { GameState, SystemState, StructureType } from "../../simulation/state";
import {
  STRUCTURES,
  type StructureDefinition,
} from "../../simulation/data/structures";
import { el, clear } from "../components/dom";

export interface StructuresView {
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

function getDefinitionsForType(type: StructureType): StructureDefinition[] {
  return Object.values(STRUCTURES)
    .filter((def) => def.type === type)
    .sort((a, b) => a.tier - b.tier);
}

function countCompleted(system: SystemState, type: StructureType): number {
  const list = system.structures[type === "miner" ? "miners" : type === "reactor" ? "reactors" : "printers"];
  return list.filter((s) => s.constructionProgress >= 1).length;
}

function totalRate(system: SystemState, type: StructureType): number {
  const list = system.structures[type === "miner" ? "miners" : type === "reactor" ? "reactors" : "printers"];
  let total = 0;
  for (const s of list) {
    if (s.active && s.constructionProgress >= 1) {
      total += s.productionRate;
    }
  }
  return total;
}

function structureListKey(type: StructureType): "miners" | "reactors" | "printers" {
  if (type === "miner") return "miners";
  if (type === "reactor") return "reactors";
  return "printers";
}

function canAfford(
  system: SystemState,
  cost: { materials: number; energy: number },
): boolean {
  return (
    system.resources.materials >= cost.materials &&
    system.resources.energy >= cost.energy
  );
}

function isTechUnlocked(
  system: SystemState,
  techGate: string | null,
): boolean {
  if (techGate === null) return true;
  return system.completedResearch[techGate] === true;
}

function renderBuildButton(
  def: StructureDefinition,
  system: SystemState,
  callback: BuildStructureCallback | null,
): HTMLElement {
  const unlocked = isTechUnlocked(system, def.techGate);
  const affordable = canAfford(system, def.cost);
  const disabled = !unlocked || !affordable;

  const statusText = !unlocked
    ? " [Locked]"
    : !affordable
      ? " [Insufficient Resources]"
      : "";

  const buttonClass = disabled ? "btn btn--disabled" : "btn btn--primary";

  const button = el(
    "button",
    { class: buttonClass },
    `${def.name} (${def.cost.materials}M, ${def.cost.energy}E)${statusText}`,
  );

  if (disabled) {
    button.setAttribute("disabled", "true");
  } else if (callback) {
    button.addEventListener("click", () => {
      callback(def.type, def.tier);
    });
  }

  return button;
}

function renderStructureSection(
  title: string,
  type: StructureType,
  rateUnit: string,
  system: SystemState,
  callback: BuildStructureCallback | null,
): HTMLElement {
  const definitions = getDefinitionsForType(type);
  const count = countCompleted(system, type);
  const rate = totalRate(system, type);
  const listKey = structureListKey(type);
  const instances = system.structures[listKey];

  const summaryText =
    type === "printer"
      ? `You own ${count} ${title}`
      : `You own ${count} ${title} (${formatRate(rate)} ${rateUnit} total)`;

  const existingItems: HTMLElement[] = [];
  if (type !== "miner") {
    const countByTier = new Map<number, number>();
    const rateByTier = new Map<number, number>();
    for (const inst of instances) {
      if (inst.constructionProgress < 1) continue;
      const tierCount = countByTier.get(inst.tier) ?? 0;
      countByTier.set(inst.tier, tierCount + 1);
      if (inst.active) {
        const tierRate = rateByTier.get(inst.tier) ?? 0;
        rateByTier.set(inst.tier, tierRate + inst.productionRate);
      }
    }

    for (const def of definitions) {
      const tierCount = countByTier.get(def.tier) ?? 0;
      if (tierCount === 0) continue;
      const tierRate = rateByTier.get(def.tier) ?? 0;
      const detail =
        type === "printer"
          ? `${def.name} (${tierCount}x) - ${formatRate(def.productionRate)}x speed`
          : `${def.name} (${tierCount}x) +${formatRate(tierRate)} ${rateUnit}`;
      existingItems.push(el("div", { class: "structure-detail" }, detail));
    }
  }

  const buildButtons = definitions.map((def) =>
    renderBuildButton(def, system, callback),
  );

  return el(
    "div",
    { class: "panel" },
    el("h2", { class: "panel-header" }, title),
    el(
      "div",
      { class: "panel-body" },
      el("div", { class: "structure-summary" }, summaryText),
      ...existingItems,
      el(
        "div",
        { class: "build-options" },
        ...buildButtons,
      ),
    ),
  );
}

export function createStructuresView(): StructuresView {
  const element = el("div", { class: "view view--structures" });
  let buildCallback: BuildStructureCallback | null = null;

  function update(state: GameState): void {
    const system = state.systems[state.currentSystemId];
    if (!system) return;

    clear(element);

    element.appendChild(
      el("h1", { class: "view-title" }, `Structures in ${system.name} System`),
    );

    element.appendChild(
      renderStructureSection("Miners", "miner", "Materials/s", system, buildCallback),
    );
    element.appendChild(
      renderStructureSection("Reactors", "reactor", "Energy/s", system, buildCallback),
    );
    element.appendChild(
      renderStructureSection("3D Printers", "printer", "", system, buildCallback),
    );
  }

  function onBuildStructure(
    callback: (structureType: string, tier: number) => void,
  ): void {
    buildCallback = callback;
  }

  return { element, update, onBuildStructure };
}
