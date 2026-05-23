import type { SaveSlotInfo } from "../../../persistence/save-load";
import { deleteSlot } from "../../../persistence/save-load";
import { Panel } from "../../components/Panel";
import { useState } from "react";

export function CharacterSelector({
  saves,
  onLoadSlot,
  onNewMission,
}: {
  saves: SaveSlotInfo[];
  onLoadSlot: (slot: SaveSlotInfo) => void;
  onNewMission: () => void;
}) {
  const [slots, setSlots] = useState(saves);

  function handleDelete(key: string) {
    deleteSlot(key);
    setSlots((s) => s.filter((slot) => slot.key !== key));
  }

  return (
    <div className="pregame">
      <div className="pregame-logo">
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon
            points="40,4 76,40 40,76 4,40"
            stroke="#4ddbff"
            strokeWidth="3"
            fill="none"
          />
          <polygon
            points="40,18 62,40 40,62 18,40"
            fill="#4ddbff"
            opacity="0.5"
          />
        </svg>
        <div className="pregame-title">LVNP</div>
        <div className="pregame-subtitle">LONELY VON NEUMANN PROBE</div>
      </div>

      <div className="pregame-panel">
        <Panel label="Mission Archive">
          {slots.length === 0 ? (
            <div className="empty-state">No saved missions</div>
          ) : (
            slots.map((slot) => (
              <div key={slot.key} className="save-slot">
                <div onClick={() => onLoadSlot(slot)} style={{ flex: 1, cursor: "pointer" }}>
                  <div className="save-slot-name">{slot.name}</div>
                  <div className="save-slot-info">
                    Tick {slot.tickCount} · {new Date(slot.timestamp).toLocaleDateString()}
                  </div>
                </div>
                <button
                  className="btn-icon"
                  style={{ width: 20, height: 20, fontSize: 9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(slot.key);
                  }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </Panel>

        <div style={{ marginTop: 12, textAlign: "center" }}>
          <button className="btn btn-primary" onClick={onNewMission}>
            + New Mission
          </button>
        </div>
      </div>
    </div>
  );
}
