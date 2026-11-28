import { href, useRoute, type Route } from "./router";
import { Landing } from "./screens/Landing";
import { Orders } from "./screens/Orders";
import { NewOrder } from "./screens/NewOrder";
import { Review } from "./screens/Review";
import { PackStation } from "./screens/PackStation";
import { ReceiptView } from "./screens/ReceiptView";
import { Setup } from "./screens/Setup";
import { Engine } from "./screens/Engine";
import { DeviceStatus } from "./components/bits";
import { Logo } from "./components/Brand";

type Section = "orders" | "new" | "engine" | "setup";

function sectionOf(r: Route): Section {
  if (r.name === "new") return "new";
  if (r.name === "engine") return "engine";
  if (r.name === "setup") return "setup";
  return "orders";
}

function TabIcon({ name }: { name: Section }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      {name === "orders" && (
        <>
          <path {...p} d="M4 8l8-4 8 4-8 4-8-4z" />
          <path {...p} d="M4 8v8l8 4 8-4V8M12 12v8" />
        </>
      )}
      {name === "new" && <path {...p} d="M12 5v14M5 12h14" />}
      {name === "engine" && (
        <>
          <circle {...p} cx="12" cy="12" r="3" />
          <path {...p} d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
        </>
      )}
      {name === "setup" && <path {...p} d="M5 12.5l4.5 4.5L19 7.5" />}
    </svg>
  );
}

const NAV: { name: Section; label: string; to: Route }[] = [
  { name: "orders", label: "Orders", to: { name: "orders" } },
  { name: "new", label: "New order", to: { name: "new" } },
  { name: "engine", label: "Under the hood", to: { name: "engine" } },
];

export function App() {
  const route = useRoute();

  if (route.name === "landing") return <Landing />;

  // The receipt is what customers open. It carries the brand, not the seller's tools.
  if (route.name === "receipt") return <ReceiptView id={route.id} />;

  const section = sectionOf(route);
  return (
    <div className="app">
      <header className="topbar">
        <div className="left">
          <a href={href({ name: "landing" })} aria-label="Vouch home" style={{ textDecoration: "none" }}>
            <Logo size={28} />
          </a>
        </div>
        <nav className="center navpills" aria-label="Main">
          {NAV.map((n) => (
            <a key={n.name} href={href(n.to)} aria-current={section === n.name ? "page" : undefined}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="right">
          <a href={href({ name: "setup" })} className="status-link" aria-label="Device setup">
            <DeviceStatus />
          </a>
        </div>
      </header>
      <main className="app-main">
        {route.name === "orders" && <Orders />}
        {route.name === "new" && <NewOrder />}
        {route.name === "review" && <Review id={route.id} />}
        {route.name === "pack" && <PackStation id={route.id} />}
        {route.name === "setup" && <Setup />}
        {route.name === "engine" && <Engine />}
      </main>
      <nav className="tabbar" aria-label="Main">
        {[...NAV.slice(0, 2), { name: "setup" as const, label: "Setup", to: { name: "setup" } as Route }, NAV[2]].map((n) => (
          <a key={n.name} href={href(n.to)} aria-current={section === n.name ? "page" : undefined}>
            <TabIcon name={n.name} />
            <span>{n.name === "engine" ? "Engine" : n.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
