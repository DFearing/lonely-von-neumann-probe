import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useGameState } from "../context";
import type { ViewId } from "../shell/Sidebar";
import { TOUR_STEPS, type TourAdvanceCondition, type TourStep } from "./tour-steps";
import { markTourCompleted } from "./tour-persistence";

interface TourContextValue {
  active: boolean;
  waiting: boolean;
  currentStep: TourStep | null;
  stepIndex: number;
  totalSteps: number;
  advance: () => void;
  skip: () => void;
  startTour: () => void;
}

const TourContext = createContext<TourContextValue>({
  active: false,
  waiting: false,
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

function isConditionMet(cond: TourAdvanceCondition, sys: { mainProbe?: { mode: string } | null; resources: { materials: number }; constructionQueue: { targetType: string }[]; researchQueue: unknown[] }, currentView: ViewId): boolean {
  switch (cond.type) {
    case "probe_mode_changed":
      return sys.mainProbe?.mode === cond.mode;
    case "construction_queued":
      return sys.constructionQueue.some((q) => q.targetType === cond.structureType);
    case "research_started":
      return sys.researchQueue.length > 0;
    case "materials_sufficient":
      return sys.resources.materials >= cond.amount;
    case "view_changed":
      return currentView === cond.view;
  }
}

export function TourProvider({
  children,
  onNavigate,
  currentView,
}: {
  children: ReactNode;
  onNavigate: (view: ViewId) => void;
  currentView: ViewId;
}) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const state = useGameState();
  const prevStateRef = useRef(state);
  const prevViewRef = useRef(currentView);
  const didNavigateRef = useRef(false);

  const currentStep = active ? (TOUR_STEPS[stepIndex] ?? null) : null;

  const sysId = state.currentSystemId;
  const sys = state.systems[sysId];
  const waiting = !!(active && currentStep?.waitUntil && sys && !isConditionMet(currentStep.waitUntil, sys, currentView));

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
    didNavigateRef.current = false;
    setStepIndex(nextIndex);
    const nextStep = TOUR_STEPS[nextIndex];
    if (nextStep?.requiredView && !nextStep.waitUntil) {
      didNavigateRef.current = true;
      onNavigate(nextStep.requiredView);
    }
  }, [stepIndex, finish, onNavigate]);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  const startTour = useCallback(() => {
    didNavigateRef.current = false;
    setStepIndex(0);
    setActive(true);
    const first = TOUR_STEPS[0];
    if (first?.requiredView) {
      onNavigate(first.requiredView);
    }
  }, [onNavigate]);

  useEffect(() => {
    if (!active || !currentStep) {
      prevStateRef.current = state;
      return;
    }

    if (currentStep.waitUntil && currentStep.requiredView && !didNavigateRef.current && sys && isConditionMet(currentStep.waitUntil, sys, currentView)) {
      didNavigateRef.current = true;
      onNavigate(currentStep.requiredView);
    }

    if (!currentStep.advanceOn) {
      prevStateRef.current = state;
      prevViewRef.current = currentView;
      return;
    }

    const prev = prevStateRef.current;
    const prevView = prevViewRef.current;
    const cond = currentStep.advanceOn;
    let met = false;

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
        case "materials_sufficient":
          met = sys.resources.materials >= cond.amount;
          break;
        case "view_changed":
          met = currentView === cond.view && prevView !== cond.view;
          break;
      }
    }

    prevStateRef.current = state;
    prevViewRef.current = currentView;
    if (met) {
      advance();
    }
  }, [active, currentStep, state, advance, sys, sysId, onNavigate, currentView]);

  return (
    <TourContext.Provider
      value={{
        active,
        waiting,
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
