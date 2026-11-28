import { useEffect, useState } from "react";

export type Route =
  | { name: "orders" }
  | { name: "new" }
  | { name: "review"; id: string }
  | { name: "pack"; id: string }
  | { name: "receipt"; id: string };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const [head, id] = parts;
  if (head === "new") return { name: "new" };
  if (head === "order" && id) return { name: "review", id };
  if (head === "pack" && id) return { name: "pack", id };
  if (head === "receipt" && id) return { name: "receipt", id };
  return { name: "orders" };
}

export function href(r: Route): string {
  switch (r.name) {
    case "orders":
      return "#/";
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
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}
