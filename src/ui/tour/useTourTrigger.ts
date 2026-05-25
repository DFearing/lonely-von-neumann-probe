import { useEffect } from "react";
import { useGameState } from "../context";
import { isTourCompleted } from "./tour-persistence";
import { useTour } from "./TourProvider";

export function useTourTrigger() {
  const state = useGameState();
  const { startTour } = useTour();
  const freshGame = state.tickCount <= 10;

  useEffect(() => {
    if (!freshGame) return;
    if (isTourCompleted()) return;
    startTour();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
