import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/archivo/standard.css";
import "./styles/app.css";
import { App } from "./App";

if (import.meta.env.DEV) {
  void import("./dev").then((m) => {
    Object.assign(window, { vouchSeed: m.seedReferenceOrder, vouchSmoke: m.smokeTest });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
