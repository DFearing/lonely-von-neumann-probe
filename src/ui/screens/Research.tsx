import { useState } from "react";
import { useCurrentSystem, useDispatch } from "../context";
import { ActiveBanner } from "./research/ActiveBanner";
import { TechWeb } from "./research/TechWeb";
import { TechDetail } from "./research/TechDetail";
import { ResearchQueue } from "./research/ResearchQueue";

export function Research() {
  const system = useCurrentSystem();
  const dispatch = useDispatch();
  const [selectedTech, setSelectedTech] = useState<string | null>(null);

  const activeProject = system.researchQueue.find(
    (r) => !r.completed && !r.paused,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {activeProject && (
        <ActiveBanner
          project={activeProject}
          computeRate={system.resourceRates.computingPowerPerSecond}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 12 }}>
        <TechWeb
          system={system}
          selectedTech={selectedTech}
          onSelect={setSelectedTech}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {selectedTech ? (
            <TechDetail
              system={system}
              techId={selectedTech}
              dispatch={dispatch}
            />
          ) : (
            <div className="panel">
              <div className="panel-body">
                <div className="empty-state">Select a technology to view details</div>
              </div>
            </div>
          )}
          <ResearchQueue system={system} dispatch={dispatch} />
        </div>
      </div>
    </div>
  );
}
