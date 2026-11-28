import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

export type Route =
  | { name: "landing" }
  | { name: "orders" }
  | { name: "setup" }
  | { name: "engine" }
  | { name: "new" }
  | { name: "review"; id: string }
  | { name: "pack"; id: string }
  | { name: "receipt"; id: string };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const [head, id] = parts;
  if (head === "orders") return { name: "orders" };
  if (head === "setup") return { name: "setup" };
  if (head === "engine") return { name: "engine" };
  if (head === "new") return { name: "new" };
  if (head === "order" && id) return { name: "review", id };
  if (head === "pack" && id) return { name: "pack", id };
  if (head === "receipt" && id) return { name: "receipt", id };
  return { name: "landing" };
}

export function href(r: Route): string {
  switch (r.name) {
    case "landing":
      return "#/";
    case "orders":
      return "#/orders";
    case "setup":
      return "#/setup";
    case "engine":
      return "#/engine";
    case "new":
      return "#/new";
    case "review":
      return `#/order/${r.id}`;
    case "pack":
      return `#/pack/${r.id}`;
    case "receipt":
      return `#/receipt/${r.id}`;
  }
}

export function go(r: Route) {
  window.location.hash = href(r);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => {
      const next = parseHash(window.location.hash);
      const apply = () => {
        setRoute(next);
        window.scrollTo(0, 0);
      };
      const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (doc.startViewTransition && !calm) doc.startViewTransition(() => flushSync(apply));
      else apply();
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}
