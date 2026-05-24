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

export function simulateToCycle(
  state: GameState,
  profile: AutopilotProfile,
  targetCycle: number,
): SimulationResult {
  const currentCycle = 1000 + state.elapsedSeconds;
  const cyclesToAdvance = Math.max(0, targetCycle - currentCycle);
  return simulateWithProfile(state, profile, yearsToTicks(cyclesToAdvance));
}
