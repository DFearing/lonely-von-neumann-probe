import type { GameState } from "../state";
import type { AutopilotProfile } from "./profiles";
import { tick } from "../tick";
import { TICK_MS } from "../../loop/game-loop";

const DT = TICK_MS / 1000;

export interface SimulationResult {
  finalState: GameState;
  ticksRun: number;
  elapsedGameSeconds: number;
}

export function simulateWithProfile(
  initialState: GameState,
  profile: AutopilotProfile,
  targetTicks: number,
): SimulationResult {
  let state = initialState;

  for (let i = 0; i < targetTicks; i++) {
    const actions = (i % profile.evaluateEvery === 0) ? profile.decide(state) : [];
    state = tick(state, DT, actions);
  }

  return {
    finalState: state,
    ticksRun: targetTicks,
    elapsedGameSeconds: targetTicks * DT,
  };
}

export function yearsToTicks(years: number): number {
  return Math.round(years / DT);
}

export function simulateToYear(
  state: GameState,
  profile: AutopilotProfile,
  targetYear: number,
): SimulationResult {
  const currentYear = 2026 + state.elapsedSeconds;
  const yearsToAdvance = Math.max(0, targetYear - currentYear);
  return simulateWithProfile(state, profile, yearsToTicks(yearsToAdvance));
}
