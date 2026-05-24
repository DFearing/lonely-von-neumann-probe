import { useState } from "react";
import { CharacterSelector } from "./CharacterSelector";
import { NewMission } from "./NewMission";
import { GameProvider } from "../../context";
import { App } from "../../shell/App";
import { LVNPGateContext } from "../../shell/Sidebar";
import { createInitialState } from "../../../simulation/state";
import type { GameState } from "../../../simulation/state";
import { createGameLoop, catchUp } from "../../../loop/game-loop";
import { performPrestige } from "../../../simulation/prestige";
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
  const [slotInfo, setSlotInfo] = useState<{ key: string; probeName: string } | null>(null);

  function saveNow(gameLoop: GameLoop) {
    if (slotInfo) {
      saveGameSlot(slotInfo.key, gameLoop.getState(), slotInfo.probeName);
    }
  }

  function attachSaveListener(gameLoop: GameLoop, info: { key: string; probeName: string }) {
    let saveCounter = 0;
    gameLoop.onStateChange(() => {
      saveCounter++;
      if (saveCounter % 100 === 0 || gameLoop.getState().paused) {
        saveGameSlot(info.key, gameLoop.getState(), info.probeName);
      }
    });
  }

  function startGame(gameLoop: GameLoop) {
    setLoop(gameLoop);
    setPhase("play");
    gameLoop.start();
  }

  function handleBackToSelect() {
    if (loop) {
      saveNow(loop);
      loop.stop();
    }
    setLoop(null);
    setSlotInfo(null);
    setPhase("select");
  }

  function handleLoadSlot(slot: SaveSlotInfo) {
    const save = loadGameSlot(slot.key);
    if (!save) return;
    const elapsedMs = Date.now() - save.timestamp;
    const state = elapsedMs > 0 ? catchUp(save.state, elapsedMs) : save.state;
    const gameLoop = createGameLoop(state);

    const info = { key: slot.key, probeName: slot.probeName };
    setSlotInfo(info);
    attachSaveListener(gameLoop, info);
    startGame(gameLoop);
  }

  function handleNewMission(probeName: string) {
    const seed = Date.now() % 1_000_000;
    const state = createInitialState(seed, probeName);
    const gameLoop = createGameLoop(state);
    const slotKey = `save_${Date.now()}`;

    const info = { key: slotKey, probeName };
    setSlotInfo(info);
    saveGameSlot(slotKey, state, probeName);
    attachSaveListener(gameLoop, info);
    startGame(gameLoop);
  }

  function handlePrestige() {
    if (!loop || !slotInfo) return;

    const currentState = loop.getState();
    loop.stop();

    const seed = Date.now() % 1_000_000;
    const newState = performPrestige(currentState, seed, slotInfo.probeName);
    const newLoop = createGameLoop(newState);

    saveGameSlot(slotInfo.key, newState, slotInfo.probeName);
    attachSaveListener(newLoop, slotInfo);

    setLoop(newLoop);
    newLoop.start();
  }

  function handleDevJumpForward(newState: GameState) {
    if (!loop || !slotInfo) return;
    loop.stop();

    const newLoop = createGameLoop(newState);
    saveGameSlot(slotInfo.key, newState, slotInfo.probeName);
    attachSaveListener(newLoop, slotInfo);

    setLoop(newLoop);
    newLoop.start();
  }

  if (phase === "play" && loop) {
    return (
      <LVNPGateContext.Provider value={{ onBack: handleBackToSelect }}>
        <GameProvider loop={loop} onPrestige={handlePrestige} onDevJumpForward={handleDevJumpForward}>
          <App />
        </GameProvider>
      </LVNPGateContext.Provider>
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
