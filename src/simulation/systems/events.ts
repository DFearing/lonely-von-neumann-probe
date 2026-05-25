import type { GameState } from "../state";
import type { Rng } from "../rng";

export function tickEvents(
  state: GameState,
  _dt: number,
  _rng: Rng,
): GameState {
  return state;
}
