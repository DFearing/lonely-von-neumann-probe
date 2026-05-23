import { useCurrentSystem } from "../context";
import { fmt, fmtRate } from "../format";
import { getMaterialsCap, getEnergyCap } from "../queries";

function rateClass(rate: number): string {
  if (rate > 0) return "footer-cell-rate footer-cell-rate--positive";
  if (rate < 0) return "footer-cell-rate footer-cell-rate--negative";
  return "footer-cell-rate footer-cell-rate--zero";
}

function StockpileCell({
  label,
  value,
  cap,
  rate,
  barClass,
}: {
  label: string;
  value: number;
  cap: number;
  rate: number;
  barClass: string;
}) {
  const pct = cap > 0 ? Math.min(value / cap, 1) : 0;
  return (
    <div className="footer-cell">
      <span className="footer-cell-label">{label}</span>
      <span className="footer-cell-value">
        {fmt(value)} <span className="text-dim" style={{ fontSize: 11 }}>/ {fmt(cap)}</span>
      </span>
      <div className="footer-cell-bar">
        <div
          className={`footer-cell-bar-fill ${barClass}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className={rateClass(rate)}>{fmtRate(rate)}</span>
    </div>
  );
}

export function Footer() {
  const system = useCurrentSystem();
  const { resources, resourceRates } = system;
  const matCap = getMaterialsCap(system);
  const enCap = getEnergyCap(system);

  return (
    <div className="footer">
      <StockpileCell
        label="Materials"
        value={resources.materials}
        cap={matCap}
        rate={resourceRates.materialsPerSecond}
        barClass="footer-cell-bar-fill--materials"
      />
      <StockpileCell
        label="Energy"
        value={resources.energy}
        cap={enCap}
        rate={resourceRates.energyPerSecond}
        barClass="footer-cell-bar-fill--energy"
      />
      <div className="footer-cell">
        <div className="footer-compute-row">
          <div className="footer-compute-item">
            <span className="footer-compute-label">Compute</span>
            <span className="footer-compute-value">
              {resourceRates.computingPowerPerSecond.toFixed(1)}/s
            </span>
          </div>
          <div className="footer-compute-item">
            <span className="footer-compute-label">Research</span>
            <span className="footer-compute-value">
              {system.researchQueue.filter((r) => !r.completed && !r.paused).length} active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
