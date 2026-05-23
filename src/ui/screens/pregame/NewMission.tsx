import { useState } from "react";
import { Panel } from "../../components/Panel";

export function NewMission({
  onStart,
  onBack,
}: {
  onStart: (name: string) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState("");

  return (
    <div className="pregame">
      <div className="pregame-logo">
        <svg
          width="60"
          height="60"
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
        <div className="pregame-title">NEW MISSION</div>
      </div>

      <div className="pregame-panel">
        <Panel label="Probe Designation">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              className="pregame-input"
              placeholder="Enter probe designation..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) onStart(name.trim());
              }}
              autoFocus
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={onBack}>
                Back
              </button>
              <button
                className="btn btn-primary"
                disabled={!name.trim()}
                onClick={() => onStart(name.trim())}
              >
                Initiate Mission
              </button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
