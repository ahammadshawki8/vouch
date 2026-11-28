import { useEffect, useState } from "react";
import type { Order } from "../core/types";
import { repo } from "../data/repo";
import { go, href } from "../router";
import { STATUS_TEXT, timeAgo } from "../components/bits";

export function Orders() {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    void repo().listOrders().then(setOrders);
  }, []);

  const open = (o: Order) => {
    if (o.status === "vouched" && o.receiptId) go({ name: "receipt", id: o.receiptId });
    else if (o.status === "confirmed" || o.status === "packing") go({ name: "pack", id: o.id });
    else go({ name: "review", id: o.id });
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Orders</h1>
          <p>Every order becomes a checklist the parcel has to pass before it ships.</p>
        </div>
        <a className="btn primary" href={href({ name: "new" })}>
          New order
        </a>
      </div>

      {orders === null ? null : orders.length === 0 ? (
        <div className="notice">
          <p>
            No orders yet. Start with the customer's chat: screenshots, pasted messages, voice notes and the product
            photos you sent them.
          </p>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>What goes in the box</th>
              <th>Checks</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="clickable" onClick={() => open(o)}>
                <td>
                  <a
                    href={href({ name: "review", id: o.id })}
                    onClick={(e) => {
                      e.preventDefault();
                      open(o);
                    }}
                    style={{ fontWeight: 600, textDecoration: "none" }}
                  >
                    {o.title}
                  </a>
                </td>
                <td className="muted">{o.suite?.summary ?? "Not compiled yet"}</td>
                <td>{o.suite?.tests.length ?? 0}</td>
                <td>
                  <strong style={{ color: o.status === "vouched" ? "var(--pass)" : undefined }}>
                    {STATUS_TEXT[o.status]}
                  </strong>
                </td>
                <td className="muted small">{timeAgo(o.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
