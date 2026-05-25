import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useGameState } from "../context";
import type { ViewId } from "../shell/Sidebar";
import { TOUR_STEPS, type TourStep } from "./tour-steps";
import { markTourCompleted } from "./tour-persistence";

interface TourContextValue {
  active: boolean;
  currentStep: TourStep | null;
  stepIndex: number;
  totalSteps: number;
  advance: () => void;
  skip: () => void;
  startTour: () => void;
}

const TourContext = createContext<TourContextValue>({
  active: false,
  currentStep: null,
  stepIndex: 0,
  totalSteps: TOUR_STEPS.length,
  advance: () => {},
  skip: () => {},
  startTour: () => {},
});

export function useTour() {
  return useContext(TourContext);
}

export function TourProvider({
  children,
  onNavigate,
}: {
  children: ReactNode;
  onNavigate: (view: ViewId) => void;
}) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const state = useGameState();
  const prevStateRef = useRef(state);

  const currentStep = active ? (TOUR_STEPS[stepIndex] ?? null) : null;

  const finish = useCallback(() => {
    setActive(false);
    setStepIndex(0);
    markTourCompleted();
  }, []);

  const advance = useCallback(() => {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= TOUR_STEPS.length) {
      finish();
      return;
    }
    setStepIndex(nextIndex);
    const nextStep = TOUR_STEPS[nextIndex];
    if (nextStep?.requiredView) {
      onNavigate(nextStep.requiredView);
    }
  }, [stepIndex, finish, onNavigate]);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setActive(true);
    const first = TOUR_STEPS[0];
    if (first?.requiredView) {
      onNavigate(first.requiredView);
    }
  }, [onNavigate]);

  useEffect(() => {
    if (!active || !currentStep?.advanceOn) {
      prevStateRef.current = state;
      return;
    }

    const prev = prevStateRef.current;
    const cond = currentStep.advanceOn;
    let met = false;

    const sysId = state.currentSystemId;
    const sys = state.systems[sysId];
    const prevSys = prev.systems[sysId];

    if (sys && prevSys) {
      switch (cond.type) {
        case "probe_mode_changed":
          met = sys.mainProbe?.mode === cond.mode && prevSys.mainProbe?.mode !== cond.mode;
          break;
        case "construction_queued":
          met = sys.constructionQueue.length > prevSys.constructionQueue.length
            && sys.constructionQueue.some((q) => q.targetType === cond.structureType);
          break;
        case "research_started":
          met = sys.researchQueue.length > prevSys.researchQueue.length;
          break;
      }
    }

    prevStateRef.current = state;
    if (met) {
      advance();
    }
  }, [active, currentStep, state, advance]);

  return (
    <TourContext.Provider
      value={{
        active,
        currentStep,
        stepIndex,
        totalSteps: TOUR_STEPS.length,
        advance,
        skip,
        startTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}
