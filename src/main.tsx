import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/funnel-display/index.css";
import "@fontsource-variable/funnel-sans/index.css";
import "./styles/app.css";
import "./styles/motion.css";
import "./styles/photos.css";
import "./styles/how.css";
import "./styles/pages.css";
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
