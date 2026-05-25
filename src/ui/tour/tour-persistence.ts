const TOUR_KEY = "lonely-probe-tour-completed";

export function isTourCompleted(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) === "true";
  } catch {
    return false;
  }
}

export function markTourCompleted(): void {
  try {
    localStorage.setItem(TOUR_KEY, "true");
  } catch {
    // localStorage unavailable
  }
}
