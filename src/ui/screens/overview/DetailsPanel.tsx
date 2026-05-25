import type { GameState, SystemState } from "../../../simulation/state";
import { Panel } from "../../components/Panel";
import { FONT_MONO } from "../../tokens";
import { starColor } from "../../data/star-colors";
import { MiniStarMap } from "./MiniStarMap";

export function DetailsPanel({
  state,
  system,
}: {
  state: GameState;
  system: SystemState;
}) {
  return (
    <Panel
      label="SYSTEM"
      right={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: starColor(system.starType),
              boxShadow: `0 0 8px ${starColor(system.starType)}80`,
            }}
          />
          <span style={{ fontFamily: FONT_MONO, fontSize: 16, color: "#d6e8f5", fontWeight: 500 }}>
            {system.name}
          </span>
        </div>
      }
      style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
      contentStyle={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: 0 }}
    >
      <MiniStarMap state={state} />
    </Panel>
  );
}
