import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/archivo/standard.css";
import "./styles/app.css";
import { App } from "./App";

if (import.meta.env.DEV) {
  void import("./dev").then((m) => {
    (window as unknown as { vouchSeed: () => Promise<string> }).vouchSeed = m.seedReferenceOrder;
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
