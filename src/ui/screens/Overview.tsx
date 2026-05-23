import { useGameState, useDispatch } from "../context";
import { ProbesColumn } from "./overview/ProbesColumn";
import { StructureColumn } from "./overview/StructureColumn";

export function Overview() {
  const state = useGameState();
  const dispatch = useDispatch();
  const system = state.systems[state.currentSystemId];
  if (!system) return null;

  return (
    <div className="overview-grid">
      <ProbesColumn state={state} />
      <StructureColumn
        system={system}
        type="miner"
        label="Miners"
        rateUnit="mat/s"
        dispatch={dispatch}
      />
      <StructureColumn
        system={system}
        type="reactor"
        label="Reactors"
        rateUnit="E/s"
        dispatch={dispatch}
      />
      <StructureColumn
        system={system}
        type="printer"
        label="Printers"
        rateUnit=""
        dispatch={dispatch}
      />
    </div>
  );
}
