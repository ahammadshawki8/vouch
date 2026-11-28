import type { Oracle, OrderStatus, Verdict } from "../core/types";
import { prepareDeviceModel, useDeviceStatus } from "../ai/device";
import { firebaseConfigured } from "../firebase/app";
import { useState } from "react";

export function OracleTag({ oracle }: { oracle: Oracle }) {
  const text = oracle === "DEVICE" ? "On device" : oracle === "CLOUD" ? "Cloud" : "You confirm";
  return <span className={`tag ${oracle.toLowerCase()}`}>{text}</span>;
}

export const STATUS_TEXT: Record<OrderStatus, string> = {
  draft: "Draft",
  compiled: "Needs review",
  confirmed: "Ready to pack",
  packing: "Packing",
  vouched: "Vouched",
};

export const VERDICT_TEXT: Record<Verdict, string> = {
  PASS: "Packed",
  FAIL: "Wrong",
  UNCERTAIN: "Checking",
  ATTESTED: "Confirmed",
};

/** Device model status with the one action that moves it forward. */
export function DeviceStatus({ compact = false }: { compact?: boolean }) {
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
  let color = "var(--ink-2)";
  switch (status) {
    case "checking":
      text = "Checking on-device model";
      break;
    case "available":
      text = "On-device model ready";
      color = "var(--pass)";
      break;
    case "downloading":
      text = progress > 0 ? `Downloading on-device model ${Math.round(progress * 100)}%` : "Preparing on-device model";
      color = "#9a6413";
      break;
    case "downloadable":
      text = "On-device model not downloaded";
      color = "#9a6413";
      break;
    case "unavailable":
      text = "This device cannot run the on-device model";
      color = "var(--fail)";
      break;
    default:
      text = "On-device model needs Chrome on desktop";
      color = "var(--fail)";
  }

  return (
    <span className="small" style={{ display: "inline-flex", gap: 10, alignItems: "center", color }}>
      <span className="status-dot" aria-hidden="true" />
      <span>{text}</span>
      {status === "downloadable" && firebaseConfigured && (
        <button className="btn quiet small" onClick={prepare}>
          Download
        </button>
      )}
      {!compact && error && <span style={{ color: "var(--fail)" }}>{error}</span>}
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
  return new Date(ts).toLocaleDateString();
}
