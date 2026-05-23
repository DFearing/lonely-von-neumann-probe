import type { GameState } from "../simulation/state";
import { el } from "./components/dom";

export interface Header {
  element: HTMLElement;
  update(state: GameState): void;
  onPauseToggle(callback: () => void): void;
}

export function createHeader(): Header {
  const systemName = el("span", { class: "header-system-name" }, "Sol");
  const pauseBtn = el("button", { class: "header-btn header-pause-btn" }, "⏸ Pause");
  const speedIndicator = el("span", { class: "header-speed" }, "1x");

  const element = el(
    "header",
    { class: "header" },
    el("div", { class: "header-left" },
      el("span", { class: "header-title" }, "LONELY VON NEUMANN PROBE"),
    ),
    el("div", { class: "header-center" }, systemName),
    el("div", { class: "header-right" }, pauseBtn, speedIndicator),
  );

  let pauseCallback: (() => void) | null = null;
  let paused = false;

  pauseBtn.addEventListener("click", () => {
    pauseCallback?.();
  });

  return {
    element,
    update(state: GameState): void {
      const system = state.systems[state.currentSystemId];
      if (system) {
        systemName.textContent = system.name;
      }

      if (state.paused !== paused) {
        paused = state.paused;
        pauseBtn.textContent = paused ? "▶ Resume" : "⏸ Pause";
      }
    },
    onPauseToggle(callback: () => void): void {
      pauseCallback = callback;
    },
  };
}
