import { useRef, useEffect } from "react";
import { useGameState } from "../context";
import { Panel } from "../components/Panel";
import { FONT_MONO, COLORS } from "../tokens";
import type { LogEntry } from "../../simulation/state";

const CATEGORY_COLORS: Record<LogEntry["category"], string> = {
  info: COLORS.success,
  discovery: COLORS.accent,
  warning: COLORS.warning,
  milestone: COLORS.success,
  error: COLORS.error,
};

const CATEGORY_PREFIXES: Record<LogEntry["category"], string> = {
  info: "INFO",
  discovery: "DISC",
  warning: "WARN",
  milestone: "INFO",
  error: "ERR!",
};

function formatTick(tick: number): string {
  const cycle = 1000 + tick;
  return String(cycle);
}

export function Log() {
  const state = useGameState();
  const scrollRef = useRef<HTMLDivElement>(null);
  const entries = state.log;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
      }}
    >
      <Panel
        label="SYSTEM LOG"
        style={{ flex: 1, display: "flex", flexDirection: "column" }}
        contentStyle={{ flex: 1, minHeight: 0, padding: 0 }}
      >
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "12px 18px",
            fontFamily: FONT_MONO,
            fontSize: 13,
            lineHeight: 1.8,
            background: "rgba(0,0,0,0.3)",
          }}
        >
          {entries.length === 0 ? (
            <div style={{ color: COLORS.textDim }}>
              No log entries yet.
            </div>
          ) : (
            entries.map((entry, i) => (
              <div key={i} style={{ display: "flex", gap: 12 }}>
                <span style={{ color: COLORS.textDim, flexShrink: 0 }}>
                  {formatTick(entry.tick)}
                </span>
                <span
                  style={{
                    color: CATEGORY_COLORS[entry.category],
                    flexShrink: 0,
                    width: 36,
                  }}
                >
                  {CATEGORY_PREFIXES[entry.category]}
                </span>
                <span style={{ color: COLORS.textPrimary }}>
                  {entry.message}
                </span>
              </div>
            ))
          )}
          <div
            style={{
              color: COLORS.textDim,
              marginTop: 4,
              animation: "blink 1s step-end infinite",
            }}
          >
            _
          </div>
        </div>
      </Panel>
    </div>
  );
}
