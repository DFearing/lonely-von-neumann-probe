import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PreGameGate } from "./ui/screens/pregame/PreGameGate";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <PreGameGate />
    </StrictMode>,
  );
}
