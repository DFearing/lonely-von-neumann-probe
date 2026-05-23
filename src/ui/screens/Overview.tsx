import type { ViewId } from "../shell/Sidebar";
import { useGameState, useDispatch, useCurrentSystem } from "../context";
import { ProbesColumn } from "./overview/ProbesColumn";
import { StructureColumn } from "./overview/StructureColumn";

export function Overview({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const state = useGameState();
  const dispatch = useDispatch();
  const system = useCurrentSystem();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1fr",
        gridTemplateRows: "minmax(0, 1fr)",
        gap: 16,
        flex: 1,
        minHeight: 0,
      }}
    >
      <ProbesColumn state={state} system={system} onNavigate={onNavigate} />
      <StructureColumn
        system={system}
        category="miners"
        dispatch={dispatch}
        onNavigate={onNavigate}
      />
      <StructureColumn
        system={system}
        category="reactors"
        dispatch={dispatch}
        onNavigate={onNavigate}
      />
      <StructureColumn
        system={system}
        category="printers"
        dispatch={dispatch}
        onNavigate={onNavigate}
      />
    </div>
  );
}
