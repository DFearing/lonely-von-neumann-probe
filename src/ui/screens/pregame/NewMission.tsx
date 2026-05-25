import { useState, useEffect } from "react";
import { Panel } from "../../components/Panel";
import { FONT_MONO } from "../../tokens";
import { PreGameFrame, PreGameLogo } from "./CharacterSelector";

export function NewMission({
  onStart,
  onBack,
}: {
  onStart: (name: string) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState("Lonely-Probe");
  const valid = name.trim().length >= 2;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onBack();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onBack]);

  return (
    <PreGameFrame label="new-mission">
      <PreGameLogo />
      <div style={{ width: 560 }}>
        <Panel
          label="NEW MISSION"
          right={
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                color: valid ? "#4cd8a8" : "#ff9966",
                letterSpacing: "0.16em",
              }}
            >
              {valid ? "● READY" : "◌ DESIGNATION REQUIRED"}
            </span>
          }
        >
          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                color: "#6b87a3",
                letterSpacing: "0.20em",
                marginBottom: 8,
              }}
            >
              PROBE DESIGNATION
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 24))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && valid) onStart(name.trim());
              }}
              placeholder="Lonely-Probe"
              autoFocus
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "14px 16px",
                background: "rgba(8,16,30,0.6)",
                border: "1px solid rgba(110,200,255,0.30)",
                color: "#4ddbff",
                caretColor: "#4ddbff",
                fontFamily: FONT_MONO,
                fontSize: 20,
                letterSpacing: "0.08em",
                fontWeight: 600,
                borderRadius: 2,
                outline: "none",
                transition: "border-color .15s, box-shadow .15s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#4ddbff";
                e.target.style.boxShadow =
                  "0 0 0 1px rgba(77,219,255,0.30)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(110,200,255,0.30)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onBack}
              style={{
                flex: "0 0 auto",
                padding: "12px 18px",
                background: "transparent",
                border: "1px solid rgba(110,200,255,0.22)",
                color: "#9ab4cf",
                fontFamily: FONT_MONO,
                fontSize: 12,
                letterSpacing: "0.18em",
                cursor: "pointer",
                borderRadius: 2,
              }}
            >
              {"←"} BACK
            </button>
            <button
              disabled={!valid}
              onClick={() => {
                if (valid) onStart(name.trim());
              }}
              style={{
                flex: 1,
                padding: "12px 18px",
                background: valid
                  ? "linear-gradient(180deg, rgba(77,219,255,0.20), rgba(77,219,255,0.08))"
                  : "rgba(77,219,255,0.04)",
                border: `1px solid ${valid ? "#4ddbff" : "rgba(77,219,255,0.20)"}`,
                color: valid ? "#4ddbff" : "#3d5572",
                fontFamily: FONT_MONO,
                fontSize: 13,
                letterSpacing: "0.22em",
                fontWeight: 600,
                cursor: valid ? "pointer" : "not-allowed",
                borderRadius: 2,
                boxShadow: valid
                  ? "0 0 14px rgba(77,219,255,0.22)"
                  : "none",
                transition: "background .15s",
              }}
            >
              {"▶"} INITIATE MISSION
            </button>
          </div>
        </Panel>
      </div>
    </PreGameFrame>
  );
}
