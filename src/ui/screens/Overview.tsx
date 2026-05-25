import { useRef } from "react";
import { useGameState, useDispatch, useCurrentSystem } from "../context";
import { ProbesColumn } from "./overview/ProbesColumn";
import { StructureColumn } from "./overview/StructureColumn";

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
  const cols = !showStructures
    ? "1fr"
    : showExpansion ? "1fr 1fr 1fr 1fr 1fr" : "1fr 1fr 1fr 1fr";

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
      <ProbesColumn state={state} system={system} dispatch={dispatch} />
      {showStructures && (
        <div
          data-tour="structures"
          style={{
            display: "grid",
            gridTemplateColumns: showExpansion ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr",
            gap: 16,
            gridColumn: showExpansion ? "span 4" : "span 3",
            minHeight: 0,
          }}
        >
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
      )}
    </div>
  );
}
