import type { ResearchProject } from "../../../simulation/state";
import { TECH_TREE } from "../../../simulation/data/tech-tree";
import { FONT_MONO } from "../../tokens";
import { fmtYears } from "../../format";

export function ActiveBanner({
  project,
  computeRate,
}: {
  project: ResearchProject;
  computeRate: number;
}) {
  const pct = project.progress * 100;
  const techDef = TECH_TREE[project.techId];
  const researchTime = techDef?.researchTime ?? 0;
  const remaining =
    project.continuousCost > 0 && computeRate > 0 && researchTime > 0
      ? ((1 - project.progress) * project.continuousCost * researchTime) / computeRate
      : 0;

  const circumference = 2 * Math.PI * 22;
  const dashLen = (pct / 100) * circumference;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "14px 18px",
        marginBottom: 16,
        background:
          "linear-gradient(90deg, rgba(176,139,255,0.10), rgba(176,139,255,0.02) 70%)",
        border: "1px solid rgba(176,139,255,0.3)",
        borderLeft: "3px solid #b08bff",
        flexShrink: 0,
      }}
    >
      {/* Mini dial */}
      <svg width="56" height="56" viewBox="0 0 56 56" style={{ flexShrink: 0 }}>
        <circle
          cx="28"
          cy="28"
          r="22"
          fill="none"
          stroke="rgba(176,139,255,0.15)"
          strokeWidth="4"
        />
        <circle
          cx="28"
          cy="28"
          r="22"
          fill="none"
          stroke="#b08bff"
          strokeWidth="4"
          strokeDasharray={`${dashLen} ${circumference}`}
          transform="rotate(-90 28 28)"
          strokeLinecap="round"
          style={{
            transition: "stroke-dasharray .4s linear",
            filter: "drop-shadow(0 0 4px rgba(176,139,255,0.4))",
          }}
        />
        <text
          x="28"
          y="32"
          textAnchor="middle"
          fontFamily="JetBrains Mono"
          fontSize="12"
          fontWeight="600"
          fill="#b08bff"
        >
          {pct.toFixed(0)}%
        </text>
      </svg>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 9,
              color: "#b08bff",
              letterSpacing: "0.18em",
            }}
          >
            ACTIVE · {project.branchId.toUpperCase().replaceAll("_", " ")} · TIER {project.tier}
          </span>
        </div>
        <div
          style={{
            fontSize: 18,
            color: "#d6e8f5",
            fontWeight: 500,
            marginBottom: 6,
          }}
        >
          {project.name}
        </div>
        <div
          style={{
            position: "relative",
            height: 4,
            background: "rgba(176,139,255,0.10)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "0 auto 0 0",
              width: `${pct}%`,
              background: "linear-gradient(90deg, #6b3fff, #b08bff)",
              transition: "width .4s linear",
              boxShadow: "0 0 6px rgba(176,139,255,0.5)",
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          flexShrink: 0,
          gap: 4,
        }}
      >
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 20,
            color: "#b08bff",
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          {fmtYears(remaining)}
        </span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#6b87a3" }}>
          @ {computeRate.toFixed(1)} Teraflops
        </span>
      </div>
    </div>
  );
}
