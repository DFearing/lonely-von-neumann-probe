import type { ReactNode } from "react";

export function Panel({
  label,
  right,
  ticked,
  flush,
  children,
}: {
  label?: string;
  right?: ReactNode;
  ticked?: boolean;
  flush?: boolean;
  children: ReactNode;
}) {
  const cls = ticked ? "panel panel--ticked" : "panel";
  return (
    <div className={cls}>
      {label && (
        <div className="panel-header">
          <span className="panel-label">{label}</span>
          {right && <div>{right}</div>}
        </div>
      )}
      <div className={flush ? "panel-body--flush" : "panel-body"}>
        {children}
      </div>
    </div>
  );
}
