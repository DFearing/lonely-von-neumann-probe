import {
  createContext,
  useContext,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import type { GameState } from "../simulation/state";
import type { PlayerAction } from "../simulation/actions";
import type { GameLoop } from "../loop/game-loop";

interface GameContextValue {
  loop: GameLoop;
  dispatch: (action: PlayerAction) => void;
  onPrestige: (() => void) | null;
  onDevJumpForward: ((state: GameState) => void) | null;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({
  loop,
  onPrestige,
  onDevJumpForward,
  children,
}: {
  loop: GameLoop;
  onPrestige?: () => void;
  onDevJumpForward?: (state: GameState) => void;
  children: ReactNode;
}) {
  const value: GameContextValue = {
    loop,
    dispatch: loop.dispatchAction,
    onPrestige: onPrestige ?? null,
    onDevJumpForward: onDevJumpForward ?? null,
  };
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGameState must be inside GameProvider");
  return ctx;
}

export function useGameState(): GameState {
  const { loop } = useGameContext();

  const state = useSyncExternalStore(
    (onStoreChange) => loop.onStateChange(onStoreChange),
    () => loop.getState(),
  );

  return state;
}

export function useDispatch(): (action: PlayerAction) => void {
  return useGameContext().dispatch;
}

export function useCurrentSystem() {
  const state = useGameState();
  const system = state.systems[state.currentSystemId];
  if (!system) throw new Error(`System ${state.currentSystemId} not found`);
  return system;
}

export function useLoop(): GameLoop {
  return useGameContext().loop;
}

export function usePrestige(): (() => void) | null {
  return useGameContext().onPrestige;
}

export function useDevJumpForward(): ((state: GameState) => void) | null {
  return useGameContext().onDevJumpForward;
}
