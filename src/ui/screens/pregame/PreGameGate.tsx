import { useState } from "react";
import { CharacterSelector } from "./CharacterSelector";
import { NewMission } from "./NewMission";
import { GameProvider } from "../../context";
import { App } from "../../shell/App";
import { createInitialState } from "../../../simulation/state";
import { createGameLoop, catchUp } from "../../../loop/game-loop";
import {
  listSaves,
  loadGameSlot,
  saveGameSlot,
  type SaveSlotInfo,
} from "../../../persistence/save-load";
import type { GameLoop } from "../../../loop/game-loop";

type Phase = "select" | "new" | "play";

export function PreGameGate() {
  const [phase, setPhase] = useState<Phase>("select");
  const [loop, setLoop] = useState<GameLoop | null>(null);

  function startGame(gameLoop: GameLoop) {
    setLoop(gameLoop);
    setPhase("play");
    gameLoop.start();
  }

  function handleLoadSlot(slot: SaveSlotInfo) {
    const save = loadGameSlot(slot.key);
    if (!save) return;
    const elapsedMs = Date.now() - save.timestamp;
    const state = elapsedMs > 0 ? catchUp(save.state, elapsedMs) : save.state;
    const gameLoop = createGameLoop(state);

    const slotKey = slot.key;
    gameLoop.onStateChange(() => {
      saveGameSlot(slotKey, gameLoop.getState());
    });

    startGame(gameLoop);
  }

  function handleNewMission(_name: string) {
    const seed = Date.now() % 1_000_000;
    const state = createInitialState(seed);
    const gameLoop = createGameLoop(state);
    const slotKey = `save_${Date.now()}`;

    saveGameSlot(slotKey, state);

    let saveCounter = 0;
    gameLoop.onStateChange(() => {
      saveCounter++;
      if (saveCounter % 100 === 0) {
        saveGameSlot(slotKey, gameLoop.getState());
      }
    });

    startGame(gameLoop);
  }

  if (phase === "play" && loop) {
    return (
      <GameProvider loop={loop}>
        <App />
      </GameProvider>
    );
  }

  if (phase === "new") {
    return (
      <NewMission
        onStart={handleNewMission}
        onBack={() => setPhase("select")}
      />
    );
  }

  return (
    <CharacterSelector
      saves={listSaves()}
      onLoadSlot={handleLoadSlot}
      onNewMission={() => setPhase("new")}
    />
  );
}
