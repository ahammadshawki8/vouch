import type { Order, Receipt, Verdict } from "../core/types";
import { evaluateGate } from "../core/gate";
import { newId, repo } from "../data/repo";

export interface SealInput {
  order: Order;
  verdicts: Record<string, Verdict>;
  /** Base64 JPEG of the box at the moment of sealing. */
  photo: string;
}

export type SealOutcome =
  | { ok: true; receipt: Receipt }
  | { ok: false; reasons: string[] };

/**
 * Seal the parcel. The gate decides, never a model.
 * Part B extends this with a final check on fresh frames and cloud re-checks for
 * CLOUD tests and anything still uncertain.
 */
export async function sealParcel({ order, verdicts, photo }: SealInput): Promise<SealOutcome> {
  const suite = order.suite;
  if (!suite) return { ok: false, reasons: ["This order has no checklist."] };
  const gate = evaluateGate(suite.tests, verdicts);
  if (!gate.approved) return { ok: false, reasons: gate.reasons };

  const receipt: Receipt = {
    id: newId("vch"),
    orderId: order.id,
    sealedAt: Date.now(),
    photo,
    items: suite.tests.map((t) => ({ label: t.label, verdict: verdicts[t.id] ?? "UNCERTAIN", checkedBy: t.oracle })),
  };
  await repo().saveReceipt(receipt);
  await repo().saveOrder({ ...order, status: "vouched", receiptId: receipt.id });
  return { ok: true, receipt };
}
