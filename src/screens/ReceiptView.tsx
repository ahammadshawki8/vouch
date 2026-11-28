import { useEffect, useState } from "react";
import type { Oracle, Receipt } from "../core/types";
import { repo } from "../data/repo";

const CHECKED_BY: Record<Oracle, string> = {
  DEVICE: "Checked by camera",
  CLOUD: "Checked by camera, cloud",
  HUMAN: "Confirmed by the seller",
};

/** What the customer sees. Items and verdicts only, never the conversation. */
export function ReceiptView({ id }: { id: string }) {
  const [receipt, setReceipt] = useState<Receipt | null | undefined>(undefined);
  const [note, setNote] = useState("");
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    void repo()
      .getReceipt(id)
      .then((r) => setReceipt(r ?? null));
  }, [id]);

  if (receipt === undefined) return null;
  if (receipt === null) {
    return (
      <div className="page">
        <div className="notice error">
          <p>This receipt does not exist or has not synced yet.</p>
        </div>
      </div>
    );
  }

  const flag = async () => {
    const next = { ...receipt, flagged: { at: Date.now(), note: note.trim() } };
    await repo().saveReceipt(next);
    setReceipt(next);
    setReporting(false);
  };

  const sealed = new Date(receipt.sealedAt).toLocaleString([], { dateStyle: "long", timeStyle: "short" });

  return (
    <div className="page">
      <article className="receipt">
        <div>
          <h1>Packed as you asked</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Every item below was checked before the parcel was sealed on {sealed}.
          </p>
        </div>
        <img className="photo" src={`data:image/jpeg;base64,${receipt.photo}`} alt="The parcel when it was sealed" />
        <ul className="receipt-items">
          {receipt.items.map((it, i) => (
            <li key={i}>
              <span style={{ fontWeight: 600 }}>{it.label}</span>
              <span className="small muted">{CHECKED_BY[it.checkedBy]}</span>
            </li>
          ))}
        </ul>
        {receipt.flagged ? (
          <div className="notice warn">
            <p>You reported a problem. The seller has been told and will contact you before delivery.</p>
          </div>
        ) : reporting ? (
          <div className="field">
            <label htmlFor="note">What is not right?</label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="For example: I asked for the green notebook, not the blue one."
              style={{ minHeight: 100 }}
            />
            <div className="actions" style={{ marginTop: 8 }}>
              <button className="btn primary" onClick={flag} disabled={!note.trim()}>
                Send to the seller
              </button>
              <button className="btn quiet" onClick={() => setReporting(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="actions">
            <button className="btn" onClick={() => setReporting(true)}>
              Something is not right
            </button>
            <span className="small muted">Tell the seller before the parcel reaches you.</span>
          </div>
        )}
        <p className="small muted">Receipt {receipt.id}</p>
      </article>
    </div>
  );
}
