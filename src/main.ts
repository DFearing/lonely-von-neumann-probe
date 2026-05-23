import { createInitialState } from "./simulation/state";
import { createGameLoop, catchUp } from "./loop/game-loop";
import { loadGame, saveGame } from "./persistence/save-load";

const DEFAULT_SEED = 42;

function boot() {
  let state = loadGame()?.state ?? createInitialState(DEFAULT_SEED);

  const saved = loadGame();
  if (saved) {
    const elapsedMs = Date.now() - saved.timestamp;
    if (elapsedMs > 0) {
      state = catchUp(saved.state, elapsedMs);
    }
  }

  const loop = createGameLoop(state);

  const app = document.getElementById("app");
  if (app) {
    app.textContent = "Simulation running. Open console for state inspection.";
  }

  (window as unknown as Record<string, unknown>)["gameLoop"] = loop;
  (window as unknown as Record<string, unknown>)["getState"] = () => loop.getState();
  (window as unknown as Record<string, unknown>)["dispatch"] = loop.dispatchAction;

  loop.start();

  window.addEventListener("beforeunload", () => {
    saveGame(loop.getState());
  });
}

boot();
