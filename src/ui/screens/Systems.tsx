import { useState } from "react";
import { useGameState, useDispatch } from "../context";
import { StarMap } from "./systems/StarMap";
import { SystemList } from "./systems/SystemList";
import { SystemDetail } from "./systems/SystemDetail";

export function Systems() {
  const state = useGameState();
  const dispatch = useDispatch();
  const [selected, setSelected] = useState<string>(state.currentSystemId);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 200px 1fr", gap: 12, height: "100%" }}>
      <StarMap state={state} selectedSystem={selected} onSelect={setSelected} />
      <SystemList state={state} selectedSystem={selected} onSelect={setSelected} />
      <SystemDetail state={state} systemId={selected} dispatch={dispatch} />
    </div>
  );
}
