import { el, toggleClass } from "./components/dom";

export type ViewId =
  | "overview"
  | "structures"
  | "probes"
  | "tech-tree"
  | "systems"
  | "research";

export interface Sidebar {
  element: HTMLElement;
  onNavigate(callback: (viewId: ViewId) => void): void;
  setActiveView(viewId: ViewId): void;
}

interface NavItem {
  id: ViewId;
  label: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { id: "overview", label: "Overview" },
  { id: "structures", label: "Structures" },
  { id: "probes", label: "Probes" },
  { id: "tech-tree", label: "Tech Tree" },
  { id: "systems", label: "Systems" },
  { id: "research", label: "Research" },
];

export function createSidebar(): Sidebar {
  const buttons = new Map<ViewId, HTMLButtonElement>();

  const nav = el("nav", { class: "sidebar-nav" });

  for (const item of NAV_ITEMS) {
    const btn = el(
      "button",
      {
        class: "sidebar-item",
        "data-view": item.id,
      },
      item.label,
    );
    buttons.set(item.id, btn);
    nav.appendChild(btn);
  }

  const element = el("aside", { class: "sidebar" }, nav);

  let navigateCallback: ((viewId: ViewId) => void) | null = null;
  let activeView: ViewId = "overview";

  function updateActiveState(): void {
    for (const [id, btn] of buttons) {
      toggleClass(btn, "sidebar-item--active", id === activeView);
    }
  }

  updateActiveState();

  nav.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLButtonElement)) return;

    const viewId = target.dataset["view"] as ViewId | undefined;
    if (!viewId) return;

    activeView = viewId;
    updateActiveState();
    navigateCallback?.(viewId);
  });

  return {
    element,
    onNavigate(callback: (viewId: ViewId) => void): void {
      navigateCallback = callback;
    },
    setActiveView(viewId: ViewId): void {
      activeView = viewId;
      updateActiveState();
    },
  };
}
