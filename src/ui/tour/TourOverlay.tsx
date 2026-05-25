import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTour } from "./TourProvider";
import { useTourTrigger } from "./useTourTrigger";
import { useLoop } from "../context";
import { FONT_MONO, FONT_DISPLAY, COLORS } from "../tokens";

const PADDING = 8;
const TOOLTIP_GAP = 12;
const TOOLTIP_WIDTH = 300;
const TOOLTIP_HEIGHT_EST = 180;
const DIM_BG = "rgba(2,6,14,0.75)";
const DIM_Z = 40;
const TOOLTIP_Z = 200;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

function useTargetRect(selector: string | null): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }

    function measure() {
      const el = document.querySelector(`[data-tour="${selector}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({
          top: r.top - PADDING,
          left: r.left - PADDING,
          width: r.width + PADDING * 2,
          height: r.height + PADDING * 2,
          bottom: r.bottom + PADDING,
          right: r.right + PADDING,
        });
      } else {
        setRect(null);
      }
      rafRef.current = requestAnimationFrame(measure);
    }

    rafRef.current = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafRef.current);
  }, [selector]);

  return rect;
}

function tooltipPosition(
  rect: Rect,
  placement: "top" | "bottom" | "left" | "right",
): { top: number; left: number } {
  switch (placement) {
    case "top":
      return {
        top: rect.top - TOOLTIP_GAP - TOOLTIP_HEIGHT_EST,
        left: rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2,
      };
    case "bottom":
      return {
        top: rect.bottom + TOOLTIP_GAP,
        left: rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2,
      };
    case "left":
      return {
        top: rect.top + rect.height / 2 - 60,
        left: rect.left - TOOLTIP_WIDTH - TOOLTIP_GAP,
      };
    case "right":
      return {
        top: rect.top + rect.height / 2 - 60,
        left: rect.right + TOOLTIP_GAP,
      };
  }
}

function clampToViewport(pos: { top: number; left: number }): { top: number; left: number } {
  return {
    top: Math.max(8, Math.min(pos.top, window.innerHeight - 200)),
    left: Math.max(8, Math.min(pos.left, window.innerWidth - TOOLTIP_WIDTH - 8)),
  };
}

export function TourOverlay() {
  const { active, waiting, currentStep, stepIndex, totalSteps, advance, skip } = useTour();
  useTourTrigger();
  const loop = useLoop();
  const rect = useTargetRect(active ? (currentStep?.target ?? null) : null);

  const showing = active && !!currentStep && !waiting && !!rect;
  const shouldPause = showing && !currentStep?.advanceOn;

  useEffect(() => {
    if (!shouldPause) return;
    const wasPaused = loop.isPaused();
    if (!wasPaused) loop.pause();
    return () => { if (!wasPaused) loop.unpause(); };
  }, [shouldPause, loop]);

  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        skip();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, skip]);

  if (!showing) return null;

  const isInteractive = !!currentStep.advanceOn;
  const blockClicks = !isInteractive;
  const ttPos = clampToViewport(tooltipPosition(rect, currentStep.placement));

  const dimStyle = (extra: React.CSSProperties): React.CSSProperties => ({
    position: "fixed",
    background: DIM_BG,
    zIndex: DIM_Z,
    pointerEvents: blockClicks ? "auto" : "none",
    transition: "all 300ms ease-out",
    ...extra,
  });

  return createPortal(
    <>
      {!isInteractive && (
        <>
          {/* Top */}
          <div style={dimStyle({ top: 0, left: 0, right: 0, height: Math.max(0, rect.top) })} />
          {/* Bottom */}
          <div style={dimStyle({ top: rect.bottom, left: 0, right: 0, bottom: 0 })} />
          {/* Left */}
          <div style={dimStyle({ top: rect.top, left: 0, width: Math.max(0, rect.left), height: rect.height })} />
          {/* Right */}
          <div style={dimStyle({ top: rect.top, left: rect.right, right: 0, height: rect.height })} />
        </>
      )}

      {/* Highlight border */}
      <div
        style={{
          position: "fixed",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          border: `1px solid ${COLORS.borderAccent}`,
          borderRadius: 4,
          boxShadow: `0 0 16px ${COLORS.accentGlow}, inset 0 0 16px ${COLORS.accentGlow}`,
          zIndex: DIM_Z + 1,
          pointerEvents: "none",
          transition: "all 300ms ease-out",
        }}
      />

      {/* Tooltip */}
      <div
        style={{
          position: "fixed",
          top: ttPos.top,
          left: ttPos.left,
          width: TOOLTIP_WIDTH,
          zIndex: TOOLTIP_Z,
          pointerEvents: "auto",
          background: "linear-gradient(180deg, rgba(13,24,46,0.95) 0%, rgba(8,16,30,0.95) 100%)",
          border: `1px solid ${COLORS.borderAccent}`,
          borderRadius: 2,
          padding: "16px 18px 14px",
          transition: "top 300ms ease-out, left 300ms ease-out",
        }}
      >
        {/* Corner ticks */}
        {(["tl", "tr", "bl", "br"] as const).map((c) => {
          const base: React.CSSProperties = { position: "absolute", width: 10, height: 10 };
          const pos: React.CSSProperties =
            c === "tl" ? { top: 0, left: 0, borderTop: `2px solid ${COLORS.accent}`, borderLeft: `2px solid ${COLORS.accent}` }
            : c === "tr" ? { top: 0, right: 0, borderTop: `2px solid ${COLORS.accent}`, borderRight: `2px solid ${COLORS.accent}` }
            : c === "bl" ? { bottom: 0, left: 0, borderBottom: `2px solid ${COLORS.accent}`, borderLeft: `2px solid ${COLORS.accent}` }
            : { bottom: 0, right: 0, borderBottom: `2px solid ${COLORS.accent}`, borderRight: `2px solid ${COLORS.accent}` };
          return <div key={c} style={{ ...base, ...pos }} />;
        })}

        {/* Step counter */}
        <div style={{
          fontFamily: FONT_MONO,
          fontSize: 10,
          color: COLORS.textDim,
          letterSpacing: "0.18em",
          marginBottom: 8,
        }}>
          {stepIndex + 1} / {totalSteps}
        </div>

        {/* Title */}
        <div style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          letterSpacing: "0.22em",
          color: COLORS.accent,
          marginBottom: 8,
        }}>
          {currentStep.title}
        </div>

        {/* Body */}
        <div style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 14,
          lineHeight: 1.5,
          color: COLORS.textPrimary,
          marginBottom: 16,
          whiteSpace: "pre-wrap",
        }}>
          {currentStep.body}
        </div>

        {/* Actions */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <button
            onClick={skip}
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              letterSpacing: "0.14em",
              color: COLORS.textDim,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px 0",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
          >
            Skip tour
          </button>

          {isInteractive ? (
            <span style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              letterSpacing: "0.14em",
              color: COLORS.textSecondary,
            }}>
              Do this to continue
            </span>
          ) : (
            <button
              onClick={advance}
              style={{
                fontFamily: FONT_MONO,
                fontSize: 12,
                letterSpacing: "0.18em",
                padding: "8px 18px",
                background: `${COLORS.accent}18`,
                border: `1px solid ${COLORS.accent}99`,
                color: COLORS.accent,
                borderRadius: 2,
                cursor: "pointer",
                boxShadow: `0 0 12px ${COLORS.accent}30`,
              }}
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
