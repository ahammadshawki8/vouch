import { useState } from "react";
import type { Oracle, OrderStatus, Verdict } from "../core/types";
import { prepareDeviceModel, useDeviceStatus } from "../ai/device";
import { firebaseConfigured } from "../firebase/app";

export function OracleTag({ oracle }: { oracle: Oracle }) {
  const text = oracle === "DEVICE" ? "On device" : oracle === "CLOUD" ? "Cloud" : "You confirm";
  return <span className={`oracle ${oracle.toLowerCase()}`}>{text}</span>;
}

export const STATUS_TEXT: Record<OrderStatus, string> = {
  draft: "Draft",
  compiled: "Needs review",
  confirmed: "Ready to pack",
  packing: "Packing",
  vouched: "Vouched",
};

export function StatusTag({ status }: { status: OrderStatus }) {
  return <span className={`status-tag ${status}`}>{STATUS_TEXT[status]}</span>;
}

export const VERDICT_TEXT: Record<Verdict, string> = {
  PASS: "Packed",
  FAIL: "Wrong",
  UNCERTAIN: "Checking",
  ATTESTED: "Confirmed",
};

/** On-device model status as a pill, with the one action that moves it forward. */
export function DeviceStatus() {
  const { status, progress } = useDeviceStatus();
  const [error, setError] = useState<string | null>(null);

  const prepare = async () => {
    setError(null);
    try {
      await prepareDeviceModel();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  let text: string;
  let tone = "";
  switch (status) {
    case "checking":
      text = "Checking device";
      break;
    case "available":
      text = "Nano ready on device";
      tone = "ready";
      break;
    case "downloading":
      text = progress > 0 ? `Getting Nano ${Math.round(progress * 100)}%` : "Getting Nano ready";
      tone = "busy";
      break;
    case "downloadable":
      text = "Nano not on this device";
      break;
    case "unavailable":
      text = "Device cannot run Nano";
      tone = "bad";
      break;
    default:
      text = "Nano needs desktop Chrome";
      tone = "bad";
  }

  return (
    <span className={`status-pill ${tone}`} title={error ?? undefined}>
      <span className="lamp" aria-hidden="true" />
      <span>{text}</span>
      {status === "downloadable" && firebaseConfigured && <button onClick={prepare}>Download</button>}
    </span>
  );
}

export function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(ts).toLocaleDateString([], { day: "numeric", month: "short" });
}
