import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PreGameGate } from "./ui/screens/pregame/PreGameGate";

if (import.meta.env.DEV) {
  const splash = document.getElementById("splash");
  if (splash) splash.style.animation = "splash-fade 0.25s ease-out 0.75s forwards";
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <PreGameGate />
    </StrictMode>,
  );
}
