import { href, useRoute } from "./router";
import { Orders } from "./screens/Orders";
import { NewOrder } from "./screens/NewOrder";
import { Review } from "./screens/Review";
import { PackStation } from "./screens/PackStation";
import { ReceiptView } from "./screens/ReceiptView";
import { DeviceStatus } from "./components/bits";

export function App() {
  const route = useRoute();

  // The receipt is what customers open. It has no seller navigation.
  if (route.name === "receipt") {
    return (
      <div className="shell">
        <header className="topbar">
          <span className="wordmark">Vouch</span>
        </header>
        <main>
          <ReceiptView id={route.id} />
        </main>
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="topbar">
        <a className="wordmark" href={href({ name: "orders" })}>
          Vouch
        </a>
        <nav className="topnav" aria-label="Main">
          <a href={href({ name: "orders" })} aria-current={route.name === "orders" ? "page" : undefined}>
            Orders
          </a>
          <a href={href({ name: "new" })} aria-current={route.name === "new" ? "page" : undefined}>
            New order
          </a>
        </nav>
        <span className="spacer" />
        <DeviceStatus />
      </header>
      <main>
        {route.name === "orders" && <Orders />}
        {route.name === "new" && <NewOrder />}
        {route.name === "review" && <Review id={route.id} />}
        {route.name === "pack" && <PackStation id={route.id} />}
      </main>
    </div>
  );
}
