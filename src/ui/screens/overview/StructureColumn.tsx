import type { SystemState, StructureType } from "../../../simulation/state";
import type { PlayerAction } from "../../../simulation/actions";
import { STRUCTURES } from "../../../simulation/data/structures";
import { getAvailableStructures } from "../../../simulation/queries";
import { Panel } from "../../components/Panel";
import { fmt, fmtPercent } from "../../format";

function structureListKey(type: StructureType): "miners" | "reactors" | "printers" {
  if (type === "miner") return "miners";
  if (type === "reactor") return "reactors";
  return "printers";
}

export function StructureColumn({
  system,
  type,
  label,
  rateUnit,
  dispatch,
}: {
  system: SystemState;
  type: StructureType;
  label: string;
  rateUnit: string;
  dispatch: (action: PlayerAction) => void;
}) {
  const listKey = structureListKey(type);
  const instances = system.structures[listKey];
  const completed = instances.filter((s) => s.constructionProgress >= 1);
  const building = system.constructionQueue.filter((c) => c.targetType === type);

  let totalRate = 0;
  for (const s of completed) {
    if (s.active) totalRate += s.productionRate;
  }

  const available = getAvailableStructures(system).filter((d) => d.type === type);
  const allDefs = Object.values(STRUCTURES).filter((d) => d.type === type);

  return (
    <div className="overview-col">
      <Panel
        label={label}
        right={
          <span className="text-dim">
            {completed.length} owned
            {rateUnit ? ` · ${fmt(totalRate, 1)} ${rateUnit}` : ""}
          </span>
        }
      >
        {building.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div className="section-label">Building</div>
            {building.map((c) => (
              <div key={c.id} className="queue-item" style={{ padding: "6px 0" }}>
                <span className="queue-item-name">
                  {allDefs.find((d) => d.tier === c.targetTier)?.name ?? type}
                </span>
                <div className="queue-item-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${c.progress * 100}%` }}
                    />
                  </div>
                </div>
                <span className="queue-item-detail">{fmtPercent(c.progress)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="section-label">Build</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {allDefs
            .sort((a, b) => a.tier - b.tier)
            .map((def) => {
              const unlocked = available.some((a) => a.type === def.type && a.tier === def.tier);
              const canAfford =
                system.resources.materials >= def.cost.materials &&
                system.resources.energy >= def.cost.energy;
              const hasPrinter =
                system.structures.printers.some((p) => p.constructionProgress >= 1) ||
                (system.mainProbe?.internalPrinterSpeed ?? 0) > 0;
              const disabled = !unlocked || !canAfford || !hasPrinter;

              return (
                <div
                  key={`${def.type}_${def.tier}`}
                  className={`build-card${!unlocked ? " build-card--locked" : ""}`}
                >
                  <div className="build-card-info">
                    <span className="build-card-name">{def.name}</span>
                    <span className="build-card-cost">
                      {fmt(def.cost.materials)} M · {fmt(def.cost.energy)} E
                      {def.productionRate > 0 && rateUnit
                        ? ` → +${fmt(def.productionRate, 1)} ${rateUnit}`
                        : ""}
                    </span>
                    {!unlocked && def.techGate && (
                      <span className="build-card-gate">
                        Requires: {def.techGate.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={disabled}
                    onClick={() =>
                      dispatch({
                        type: "build_structure",
                        systemId: system.id,
                        structureType: type,
                        tier: def.tier,
                      })
                    }
                  >
                    Build
                  </button>
                </div>
              );
            })}
        </div>
      </Panel>
    </div>
  );
}
