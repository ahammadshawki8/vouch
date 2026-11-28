import { useEffect, useState } from "react";
import { median, subscribeCalls, type CallPurpose, type CallRecord } from "../ai/callLog";
import { CHECK_MODEL, COMPILER_MODEL } from "../firebase/app";
import { useDeviceStatus } from "../ai/device";
import { href } from "../router";
import { DotArrow, Sticker } from "../components/Brand";

/**
 * The technology Vouch runs on, in the order a parcel meets it.
 * Only list what the shipped build uses. (Part B: add Cloud Firestore, Firebase Authentication
 * and Firebase Hosting here when they are live.)
 */
const TECH: { name: string; by: string; role: string; where: "cloud" | "device" | "both" }[] = [
  {
    name: "Firebase AI Logic",
    by: "Firebase",
    role: "One SDK for both models. Hybrid inference modes route each call to the cloud or to the device.",
    where: "both",
  },
  {
    name: `Gemini (${COMPILER_MODEL})`,
    by: "Google",
    role: "Reads chats, screenshots and voice notes once per order and compiles them into typed checks.",
    where: "cloud",
  },
  {
    name: "Gemini Nano",
    by: "Chrome built-in AI",
    role: "Answers the compiled yes or no questions on camera frames, on this device, with no cost per look.",
    where: "device",
  },
  {
    name: "Firebase App Check",
    by: "Firebase, with Fraud Defense",
    role: "Only the real Vouch app can call the Gemini endpoint. Enforced on Firebase AI Logic.",
    where: "cloud",
  },
];

const PURPOSE: Record<CallPurpose, string> = {
  compile: "Read the chat",
  probe: "Check a frame",
  validate: "Test a question",
  rewrite: "Rewrite a question",
  escalate: "Cloud re-check",
};

function useCalls() {
  const [calls, setCalls] = useState<readonly CallRecord[]>([]);
  useEffect(() => subscribeCalls(setCalls), []);
  return calls;
}

function Arrow() {
  return (
    <svg className="flow-arrow" width="28" height="14" viewBox="0 0 28 14" aria-hidden="true">
      <path d="M1 7h24M19 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function Engine() {
  const calls = useCalls();
  const device = useDeviceStatus();
  const onDevice = calls.filter((c) => c.ok && c.source === "on_device");
  const inCloud = calls.filter((c) => c.ok && c.source === "in_cloud");
  const recent = [...calls].reverse().slice(0, 8);
  const answered = onDevice.length + inCloud.length;
  const share = answered ? Math.round((onDevice.length / answered) * 100) : 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Under the hood.</h1>
          <p className="page-lede">
            The cloud writes the checks once. The device runs them on every frame. Plain code, not a model, decides
            whether a parcel may ship.
          </p>
        </div>
      </div>

      <section className="engine-block" aria-labelledby="flow-title">
        <h2 id="flow-title" className="block-title">
          What happens to an order
        </h2>
        <ol className="flow">
          <li className="flow-node">
            <span className="flow-k">Input</span>
            <b>Customer chat</b>
            <small>Screenshots, text, voice notes, product photos</small>
          </li>
          <Arrow />
          <li className="flow-node cloud">
            <span className="flow-k">Cloud, once</span>
            <b>Gemini compiles</b>
            <small>Final order, typed checks, yes or no questions</small>
          </li>
          <Arrow />
          <li className="flow-node device">
            <span className="flow-k">Device, every frame</span>
            <b>Gemini Nano answers</b>
            <small>On settled camera frames, offline</small>
          </li>
          <Arrow />
          <li className="flow-node code">
            <span className="flow-k">Code</span>
            <b>Pass, fail or unsure</b>
            <small>2 of 3 frames must agree. Unsure always blocks.</small>
          </li>
          <Arrow />
          <li className="flow-node seal">
            <span className="flow-k">Output</span>
            <b>Seal and receipt</b>
            <small>Photo and checks for the customer</small>
          </li>
        </ol>
        <p className="flow-note">
          <Sticker tilt={-3} tone="paper">
            Fine detail?
          </Sticker>
          Checks the device cannot judge reliably, like near-identical variants, are marked for the cloud and
          re-checked with Gemini when you seal.
        </p>
      </section>

      <section className="engine-block" aria-labelledby="live-title">
        <div className="block-head">
          <h2 id="live-title" className="block-title">
            This session, live
          </h2>
          <span className="small muted">Every model call Vouch made in this tab.</span>
        </div>
        <div className="stat-row">
          <div className="stat dark">
            <span className="n num">{onDevice.length}</span>
            <span>calls on this device</span>
            <small>{onDevice.length ? `${(median(onDevice.map((c) => c.ms)) / 1000).toFixed(1)} s median` : "none yet"}</small>
          </div>
          <div className="stat">
            <span className="n num">{inCloud.length}</span>
            <span>calls in the cloud</span>
            <small>{inCloud.length ? `${(median(inCloud.map((c) => c.ms)) / 1000).toFixed(1)} s median` : "none yet"}</small>
          </div>
          <div className="stat">
            <span className="n num">{share}%</span>
            <span>of work done on device</span>
            <small>
              {device.status === "available" ? "Gemini Nano is ready here" : "Gemini Nano is not ready on this device"}
            </small>
          </div>
        </div>
        {recent.length === 0 ? (
          <div className="note" style={{ marginTop: 14 }}>
            Nothing yet. Build an order and pack it, and every call shows up here with where it ran and how long it
            took.{" "}
            <a className="text-btn" href={href({ name: "new" })}>
              Start an order
            </a>
          </div>
        ) : (
          <div className="log" role="table" aria-label="Recent model calls">
            {recent.map((c) => (
              <div className="log-row" role="row" key={c.id}>
                <span role="cell" className="num faint">
                  {new Date(c.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                <span role="cell">{PURPOSE[c.purpose]}</span>
                <span role="cell">
                  <span className={`oracle ${c.source === "on_device" ? "device" : "cloud"}`}>
                    {c.source === "on_device" ? "On device" : c.source === "in_cloud" ? "Cloud" : "Not sent"}
                  </span>
                </span>
                <span role="cell" className="num">
                  {c.ok ? `${(c.ms / 1000).toFixed(1)} s` : "failed"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="engine-block" aria-labelledby="tech-title">
        <h2 id="tech-title" className="block-title">
          Built on
        </h2>
        <ul className="tech">
          {TECH.map((t) => (
            <li key={t.name} className={`tech-item ${t.where}`}>
              <div>
                <b>{t.name}</b>
                <small>{t.by}</small>
              </div>
              <p>{t.role}</p>
              <span className={`oracle ${t.where === "device" ? "device" : t.where === "cloud" ? "cloud" : "human"}`}>
                {t.where === "both" ? "Cloud and device" : t.where === "device" ? "On device" : "Cloud"}
              </span>
            </li>
          ))}
        </ul>
        <p className="small muted" style={{ marginTop: 12 }}>
          Cloud checks use {CHECK_MODEL}. Measured on our test laptop in November 2026: about 3 s to compile an order,
          about 2.2 s per on-device look once Gemini Nano is warm, with must-not-be-there questions asked on their own for accuracy.
        </p>
      </section>

      <section className="engine-block" aria-labelledby="data-title">
        <h2 id="data-title" className="block-title">
          What leaves this device
        </h2>
        <div className="data-split">
          <div className="data-card">
            <span className="oracle cloud">Sent to the cloud</span>
            <ul>
              <li>The customer chat and product photos, once, to build the checks</li>
              <li>Frames for checks marked for the cloud, only when you seal and only when online</li>
            </ul>
          </div>
          <div className="data-card dark">
            <span className="oracle device">Stays on this device</span>
            <ul>
              <li>The live camera feed and every on-device check</li>
              <li>Your orders and receipts, stored in this browser</li>
            </ul>
          </div>
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>
          Customer receipts show the sealed photo and the checks. Never the chat, names or phone numbers.
        </p>
      </section>

      <div className="engine-cta">
        <a className="btn primary big" href={href({ name: "setup" })}>
          Set up your packing table
          <DotArrow />
        </a>
      </div>
    </div>
  );
}
