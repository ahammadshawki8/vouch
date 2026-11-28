import { useEffect, useState } from "react";
import type { Order } from "../core/types";
import { repo } from "../data/repo";
import { go, href, type Route } from "../router";
import { StatusTag, timeAgo } from "../components/bits";
import { DotArrow, TapeTick } from "../components/Brand";
import { ArrowIcon } from "../components/Icons";

function destination(o: Order): Route {
  if (o.status === "vouched" && o.receiptId) return { name: "receipt", id: o.receiptId };
  if (o.status === "confirmed" || o.status === "packing") return { name: "pack", id: o.id };
  return { name: "review", id: o.id };
}

export function Orders() {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    void repo().listOrders().then(setOrders);
  }, []);

  const waiting = orders?.filter((o) => o.status !== "vouched").length ?? 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-lede">
            {orders && orders.length > 0
              ? `${waiting} ${waiting === 1 ? "parcel is" : "parcels are"} waiting to be checked.`
              : "Every order becomes a checklist the parcel has to pass before it ships."}
          </p>
        </div>
        <a className="btn primary big" href={href({ name: "new" })}>
          New order
          <DotArrow />
        </a>
      </div>

      {orders === null ? null : orders.length === 0 ? (
        <div className="empty">
          <h2>Nothing on the table yet.</h2>
          <p className="muted" style={{ fontSize: 18, maxWidth: "46ch" }}>
            Start with the customer's chat: screenshots, pasted messages, voice notes and the product photos you sent
            them.
          </p>
          <a className="btn primary big" href={href({ name: "new" })}>
            Add the first order
            <DotArrow />
          </a>
          <span className="bg-tick">
            <TapeTick size={360} />
          </span>
        </div>
      ) : (
        <ul className="order-list">
          {orders.map((o) => (
            <li key={o.id}>
              <a
                className="order-row"
                href={href(destination(o))}
                onClick={(e) => {
                  e.preventDefault();
                  go(destination(o));
                }}
              >
                <div>
                  <h3>{o.title}</h3>
                  <div className="meta">Updated {timeAgo(o.updatedAt)}</div>
                </div>
                <p className="muted hide-sm">{o.suite?.summary ?? "Not read yet"}</p>
                <div className="count hide-sm">
                  {o.suite?.tests.length ?? 0}
                  <small>checks</small>
                </div>
                <div className="hide-sm">
                  <StatusTag status={o.status} />
                </div>
                <span className="row-go" aria-hidden="true">
                  <ArrowIcon />
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
