import { href, useRoute } from "./router";
import { Landing } from "./screens/Landing";
import { Orders } from "./screens/Orders";
import { NewOrder } from "./screens/NewOrder";
import { Review } from "./screens/Review";
import { PackStation } from "./screens/PackStation";
import { ReceiptView } from "./screens/ReceiptView";
import { DeviceStatus } from "./components/bits";
import { Logo } from "./components/Brand";

export function App() {
  const route = useRoute();

  if (route.name === "landing") return <Landing />;

  // The receipt is what customers open. It carries the brand, not the seller's tools.
  if (route.name === "receipt") return <ReceiptView id={route.id} />;

  const inOrders = route.name === "orders" || route.name === "review" || route.name === "pack";
  return (
    <div className="app">
      <header className="topbar">
        <div className="left">
          <a href={href({ name: "landing" })} aria-label="Vouch home" style={{ textDecoration: "none" }}>
            <Logo size={28} />
          </a>
        </div>
        <nav className="center navpills" aria-label="Main">
          <a href={href({ name: "orders" })} aria-current={inOrders ? "page" : undefined}>
            Orders
          </a>
          <a href={href({ name: "new" })} aria-current={route.name === "new" ? "page" : undefined}>
            New order
          </a>
        </nav>
        <div className="right">
          <DeviceStatus />
        </div>
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
