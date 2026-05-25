import { useRef } from "react";
import { useGameState, useDispatch, useCurrentSystem } from "../context";
import { ProbesColumn } from "./overview/ProbesColumn";
import { StructureColumn } from "./overview/StructureColumn";
import { DetailsPanel } from "./overview/DetailsPanel";

const MIN_BUILD_COST = 30;

export function Overview() {
  const state = useGameState();
  const dispatch = useDispatch();
  const system = useCurrentSystem();

  const canBuild = system.resources.materials >= MIN_BUILD_COST
    || system.constructionQueue.length > 0
    || system.structures.miners.length > 0
    || system.structures.reactors.length > 0
    || system.structures.printers.length > 0;
  const showStructuresRef = useRef(canBuild);
  if (canBuild) showStructuresRef.current = true;
  const showStructures = showStructuresRef.current;

  const showExpansion = Object.keys(system.completedResearch).length >= 4;

  return (
    <div
      data-tour="overview"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: 16,
        flex: 1,
        minHeight: 0,
      }}
    >
      <div style={{ gridColumn: "1", gridRow: "1", minHeight: 0, display: "flex", flexDirection: "column" as const }}>
        <ProbesColumn state={state} system={system} dispatch={dispatch} />
      </div>
      <div style={{ gridColumn: "2", gridRow: "1", minHeight: 0, display: "flex", flexDirection: "column" as const }}>
        <StructureColumn
          system={system}
          category="stations"
          dispatch={dispatch}
          disabled={!showExpansion}
        />
      </div>
      <div style={{ gridColumn: "3", gridRow: "1", minHeight: 0, display: "flex" }}>
        <DetailsPanel state={state} system={system} />
      </div>
      <div
        data-tour="structures"
        style={{
          gridColumn: "1 / -1",
          gridRow: "2",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          minHeight: 0,
        }}
      >
        <StructureColumn
          system={system}
          category="miners"
          dispatch={dispatch}
          disabled={!showStructures}
        />
        <StructureColumn
          system={system}
          category="reactors"
          dispatch={dispatch}
          disabled={!showStructures}
        />
        <StructureColumn
          system={system}
          category="printers"
          dispatch={dispatch}
          disabled={!showStructures}
        />
      </div>
    </div>
  );
}
