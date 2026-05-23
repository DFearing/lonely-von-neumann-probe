import { createInitialState } from "./simulation/state";
import { createGameLoop, catchUp } from "./loop/game-loop";
import { loadGame, saveGame } from "./persistence/save-load";

const DEFAULT_SEED = 42;

function boot() {
  const saved = loadGame();
  let state: ReturnType<typeof createInitialState>;

  if (saved) {
    const elapsedMs = Date.now() - saved.timestamp;
    state = elapsedMs > 0 ? catchUp(saved.state, elapsedMs) : saved.state;
    console.log(`Loaded save (${Math.round(elapsedMs / 1000)}s offline, caught up to tick ${state.tickCount})`);
  } else {
    state = createInitialState(DEFAULT_SEED);
    console.log(`New game started with seed ${DEFAULT_SEED}`);
  }

  const loop = createGameLoop(state);

  const app = document.getElementById("app");
  if (app) {
    app.textContent = "Simulation running. Open console for state inspection.";
  }

  (window as unknown as Record<string, unknown>)["gameLoop"] = loop;
  (window as unknown as Record<string, unknown>)["getState"] = () => loop.getState();
  (window as unknown as Record<string, unknown>)["dispatch"] = loop.dispatchAction;

  let lastLogTick = 0;
  loop.onStateChange((s) => {
    if (s.tickCount - lastLogTick >= 10) {
      const sol = s.systems["sol"];
      if (sol) {
        console.log(
          `[tick ${s.tickCount}] M: ${sol.resources.materials.toFixed(1)} (${sol.resourceRates.materialsPerSecond.toFixed(1)}/s) | E: ${sol.resources.energy.toFixed(1)} (${sol.resourceRates.energyPerSecond.toFixed(1)}/s) | C: ${sol.resourceRates.computingPowerPerSecond.toFixed(1)}/s`
        );
      }
      lastLogTick = s.tickCount;
    }
  });

  loop.start();
  console.log("Game loop started. Globals: getState(), dispatch(action), gameLoop");

  window.addEventListener("beforeunload", () => {
    saveGame(loop.getState());
  });
}

boot();
