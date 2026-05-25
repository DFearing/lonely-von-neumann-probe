import type { ViewId } from "../shell/Sidebar";
import { useGameState, useDispatch, useCurrentSystem } from "../context";
import { ProbesColumn } from "./overview/ProbesColumn";
import { StructureColumn } from "./overview/StructureColumn";

export function Overview({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const state = useGameState();
  const dispatch = useDispatch();
  const system = useCurrentSystem();
  const showExpansion = Object.keys(system.completedResearch).length >= 4;
  const cols = showExpansion ? "1fr 1fr 1fr 1fr 1fr" : "1fr 1fr 1fr 1fr";

  return (
    <div
      data-tour="overview"
      style={{
        display: "grid",
        gridTemplateColumns: cols,
        gridTemplateRows: "minmax(0, 1fr)",
        gap: 16,
        flex: 1,
        minHeight: 0,
      }}
    >
      <ProbesColumn state={state} system={system} dispatch={dispatch} onNavigate={onNavigate} />
      <StructureColumn
        system={system}
        category="miners"
        dispatch={dispatch}
      />
      <StructureColumn
        system={system}
        category="reactors"
        dispatch={dispatch}
      />
      <StructureColumn
        system={system}
        category="printers"
        dispatch={dispatch}
      />
      {showExpansion && (
        <StructureColumn
          system={system}
          category="stations"
          dispatch={dispatch}
        />
      )}
    </div>
  );
}
