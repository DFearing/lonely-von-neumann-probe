import { Brand } from "./Brand";

export type ViewId = "overview" | "fleet" | "systems" | "research";

interface NavItem {
  id: ViewId;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: "◈" },
  { id: "fleet", label: "Fleet", icon: "△" },
  { id: "systems", label: "Systems", icon: "✦" },
  { id: "research", label: "Research", icon: "⬡" },
];

export function Sidebar({
  activeView,
  onNavigate,
}: {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
}) {
  return (
    <aside className="sidebar">
      <Brand onClick={() => onNavigate("overview")} />
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item${activeView === item.id ? " sidebar-item--active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-version">v0.1.0 alpha</div>
      </div>
    </aside>
  );
}
