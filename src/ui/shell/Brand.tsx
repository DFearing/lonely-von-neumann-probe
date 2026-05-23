export function Brand({ onClick }: { onClick: () => void }) {
  return (
    <div className="sidebar-brand" onClick={onClick}>
      <svg
        className="sidebar-brand-logo"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon
          points="20,2 38,20 20,38 2,20"
          stroke="#4ddbff"
          strokeWidth="2"
          fill="none"
        />
        <polygon
          points="20,10 30,20 20,30 10,20"
          fill="#4ddbff"
          opacity="0.6"
        />
      </svg>
      <div>
        <div className="sidebar-brand-text">LVNP</div>
        <div className="sidebar-brand-sub">MISSION CTRL</div>
      </div>
    </div>
  );
}
