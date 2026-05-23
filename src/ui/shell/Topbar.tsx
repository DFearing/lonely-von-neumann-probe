import { useGameState, useDispatch, useLoop } from "../context";
import type { GameSpeed } from "../../simulation/actions";

const SPEEDS: GameSpeed[] = [1, 2, 5, 10];

export function Topbar() {
  const state = useGameState();
  const dispatch = useDispatch();
  const loop = useLoop();
  const system = state.systems[state.currentSystemId];
  const year = 2185 + Math.floor(state.elapsedSeconds);

  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="topbar-status">
          <span className="topbar-status-dot" />
          {system?.name ?? "Unknown"} — {system?.starType ?? ""} star
        </div>
      </div>
      <div className="topbar-right">
        <span className="topbar-year">Year {year}</span>
        <div className="topbar-speed">
          <button
            className={`topbar-pause-btn${state.paused ? " topbar-pause-btn--paused" : ""}`}
            onClick={() => {
              if (state.paused) loop.unpause();
              else loop.pause();
            }}
          >
            {state.paused ? "▶" : "⏸"}
          </button>
          {SPEEDS.map((s) => (
            <button
              key={s}
              className={`topbar-speed-btn${state.speed === s ? " topbar-speed-btn--active" : ""}`}
              onClick={() => dispatch({ type: "set_speed", speed: s })}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
