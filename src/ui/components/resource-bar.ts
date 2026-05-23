import type { GameState } from "../../simulation/state";
import { el } from "./dom";

export interface ResourceBar {
  element: HTMLElement;
  update(state: GameState): void;
}

function formatValue(value: number): string {
  return Math.floor(value).toLocaleString();
}

function formatRate(rate: number): string {
  const sign = rate >= 0 ? "+" : "";
  return `${sign}${rate.toFixed(1)}/s`;
}

function rateClass(rate: number): string {
  if (rate > 0) return "resource-rate resource-rate--positive";
  if (rate < 0) return "resource-rate resource-rate--negative";
  return "resource-rate";
}

function createResourceDisplay(label: string): {
  container: HTMLElement;
  valueEl: HTMLElement;
  rateEl: HTMLElement;
} {
  const valueEl = el("span", { class: "resource-value" });
  const rateEl = el("span", { class: "resource-rate" });
  const container = el(
    "div",
    { class: "resource-display" },
    el("span", { class: "resource-label" }, label),
    valueEl,
    rateEl,
  );
  return { container, valueEl, rateEl };
}

export function createResourceBar(): ResourceBar {
  const materials = createResourceDisplay("Materials");
  const energy = createResourceDisplay("Energy");
  const computing = createResourceDisplay("Computing");

  const element = el(
    "div",
    { class: "resource-bar" },
    materials.container,
    energy.container,
    computing.container,
  );

  return {
    element,
    update(state: GameState): void {
      const system = state.systems[state.currentSystemId];
      if (!system) return;

      const { resources, resourceRates } = system;

      materials.valueEl.textContent = formatValue(resources.materials);
      materials.rateEl.textContent = formatRate(resourceRates.materialsPerSecond);
      materials.rateEl.className = rateClass(resourceRates.materialsPerSecond);

      energy.valueEl.textContent = formatValue(resources.energy);
      energy.rateEl.textContent = formatRate(resourceRates.energyPerSecond);
      energy.rateEl.className = rateClass(resourceRates.energyPerSecond);

      computing.valueEl.textContent = formatValue(resources.computingPower);
      computing.rateEl.textContent = formatRate(resourceRates.computingPowerPerSecond);
      computing.rateEl.className = rateClass(resourceRates.computingPowerPerSecond);
    },
  };
}
