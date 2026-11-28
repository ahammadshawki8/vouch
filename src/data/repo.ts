import { createStore, del, get, keys, set, getMany } from "idb-keyval";
import type { Order, Receipt } from "../core/types";

/**
 * Storage interface. Part A ships a local IndexedDB implementation so everything works offline.
 * Part B swaps in Firestore (with offline persistence) behind the same interface.
 */
export interface Repo {
  listOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  saveOrder(order: Order): Promise<void>;
  deleteOrder(id: string): Promise<void>;
  saveReceipt(receipt: Receipt): Promise<void>;
  getReceipt(id: string): Promise<Receipt | undefined>;
}

const orders = createStore("vouch-orders", "orders");
const receipts = createStore("vouch-receipts", "receipts");

export const localRepo: Repo = {
  async listOrders() {
    const ids = (await keys(orders)) as string[];
    const all = (await getMany<Order>(ids, orders)).filter(Boolean);
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  getOrder: (id) => get<Order>(id, orders),
  saveOrder: (order) => set(order.id, { ...order, updatedAt: Date.now() }, orders),
  deleteOrder: (id) => del(id, orders),
  saveReceipt: (r) => set(r.id, r, receipts),
  getReceipt: (id) => get<Receipt>(id, receipts),
};

let active: Repo = localRepo;
export function repo(): Repo {
  return active;
}
/** Part B: call with the Firestore implementation at startup. */
export function setRepo(next: Repo) {
  active = next;
}

export function newId(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  const s = Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 14);
  return `${prefix}_${s}`;
}
