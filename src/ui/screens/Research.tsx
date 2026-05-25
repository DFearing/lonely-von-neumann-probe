import { useState } from "react";
import { useCurrentSystem, useDispatch } from "../context";
import { ScreenHeader } from "../components/ScreenHeader";
import { Panel } from "../components/Panel";
import { ActiveBanner } from "./research/ActiveBanner";
import { DepMap } from "./research/DepMap";
import { TechDetail } from "./research/TechDetail";
import { ResearchQueue } from "./research/ResearchQueue";

export function Research() {
  const system = useCurrentSystem();
  const dispatch = useDispatch();
  const [selectedTech, setSelectedTech] = useState<string | null>(null);

  const activeProject = system.researchQueue.find(
    (r) => !r.completed && !r.paused,
  );

  const handleQueue = (techId: string) =>
    dispatch({
      type: "start_research",
      systemId: system.id,
      techId,
    });

  return (
    <>
      <ScreenHeader title="Research & Technology" />

      <div data-tour="research-banner">
        <ActiveBanner
          project={activeProject ?? null}
          computeRate={system.resourceRates.computingPowerPerSecond}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 420px",
          gridTemplateRows: "minmax(0, 1fr)",
          gap: 16,
          flex: 1,
          minHeight: 0,
        }}
      >
        <DepMap
          system={system}
          selectedTech={selectedTech}
          onSelect={setSelectedTech}
          onQueue={handleQueue}
          onDequeue={(projectIds) =>
            dispatch({
              type: "cancel_research",
              systemId: system.id,
              projectId: projectIds,
            })
          }
        />

        <Panel
          label="DETAIL"
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              overflowY: "auto",
              overflowX: "hidden",
              flex: 1,
              margin: "-18px",
            }}
          >
            {selectedTech ? (
              <TechDetail
                system={system}
                techId={selectedTech}
                dispatch={dispatch}
              />
            ) : (
              <div
                style={{
                  padding: "24px 16px",
                  textAlign: "center",
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  fontSize: 10,
                  color: "#6b87a3",
                }}
              >
                Select a technology to view details
              </div>
            )}
            <ResearchQueue system={system} dispatch={dispatch} onSelect={setSelectedTech} selectedTech={selectedTech} />
          </div>
        </Panel>
      </div>
    </>
  );
}
