import { el } from "./dom";

export interface ProgressBar {
  element: HTMLElement;
  update(progress: number, label?: string): void;
}

export function createProgressBar(): ProgressBar {
  const fill = el("div", { class: "progress-bar-fill" });
  const labelEl = el("span", { class: "progress-bar-label" });
  const element = el("div", { class: "progress-bar" }, fill, labelEl);

  return {
    element,
    update(progress: number, label?: string): void {
      const clamped = Math.max(0, Math.min(1, progress));
      fill.style.width = `${clamped * 100}%`;
      labelEl.textContent = label ?? "";
    },
  };
}
