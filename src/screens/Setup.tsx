import { useEffect, useRef, useState } from "react";
import { prepareDeviceModel, useDeviceStatus } from "../ai/device";
import { firebaseConfigured } from "../firebase/app";
import { startCamera, stopCamera } from "../runtime/camera";
import { go, href } from "../router";
import { markSetupDone, queueSample } from "../lib/demo";
import { DotArrow, TapeTick } from "../components/Brand";
import { CheckIcon } from "../components/Icons";

type StepId = "browser" | "nano" | "camera" | "start";
type StepState = "done" | "warn" | "now" | "todo";

/**
 * First-run journey: browser, on-device model, camera, first order.
 * The packing table on the left shows what is ready; the steps on the right open one at a time.
 */
export function Setup() {
  const { status, progress } = useDeviceStatus();
  const [error, setError] = useState<string | null>(null);
  const [cam, setCam] = useState<"idle" | "on" | "skipped" | "error">("idle");
  const [camError, setCamError] = useState<string | null>(null);
  const [open, setOpen] = useState<StepId | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => () => stopCamera(streamRef.current), []);

  const browserOk = status !== "unsupported" && status !== "checking";
  const nanoOk = status === "available";
  const nanoNo = status === "unavailable" || status === "unsupported";

  const states: Record<StepId, StepState> = {
    browser: status === "checking" ? "now" : browserOk ? "done" : "warn",
    nano: nanoOk ? "done" : nanoNo ? "warn" : "now",
    camera: cam === "on" || cam === "skipped" ? "done" : cam === "error" ? "warn" : "now",
    start: "now",
  };
  const order: StepId[] = ["browser", "nano", "camera", "start"];
  // The first step that still needs the seller opens by itself. A download in progress does not block.
  const current =
    order.find((s) => states[s] === "now" && !(s === "nano" && status === "downloading")) ?? "start";
  const active = open ?? current;
  const ready = order.slice(0, 3).filter((s) => states[s] === "done").length;

  const download = async () => {
    setError(null);
    try {
      await prepareDeviceModel();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const testCamera = async () => {
    setCamError(null);
    try {
      streamRef.current = await startCamera(videoRef.current!);
      setCam("on");
      setOpen(null);
    } catch (e) {
      setCamError(e instanceof Error ? e.message : String(e));
      setCam("error");
    }
  };

  const finish = (sample: boolean) => {
    stopCamera(streamRef.current);
    markSetupDone();
    if (sample) {
      queueSample();
      go({ name: "new" });
    } else go({ name: "orders" });
  };

  const nanoText = nanoOk
    ? "Ready"
    : status === "downloading"
      ? `Downloading ${Math.round(progress * 100)}%`
      : nanoNo
        ? "Cloud only"
        : "Not downloaded";

  return (
    <div className="page setup-page">
      <div className="setup">
        <section className="table-stage" aria-label="Your packing table">
          <div className="ts-top">
            <span className="ts-title">Your packing table</span>
            <span className="ts-count num">{ready} of 3 ready</span>
          </div>

          <div className={`ts-view${cam === "on" ? " live" : ""}`}>
            <video ref={videoRef} muted playsInline hidden={cam !== "on"} />
            {cam === "on" && (
              <>
                <span className="vf tl" aria-hidden="true" />
                <span className="vf tr" aria-hidden="true" />
                <span className="vf bl" aria-hidden="true" />
                <span className="vf br" aria-hidden="true" />
                <span className="ts-live">
                  <i /> Live. Aim down into the open box.
                </span>
              </>
            )}
            {cam !== "on" && (
              <div className="ts-empty">
                <TapeTick size={120} />
                <p>{cam === "skipped" ? "No camera. You will use photos or the demo box." : "The camera view appears here."}</p>
              </div>
            )}
          </div>

          <ul className="ts-lamps">
            <li className={states.browser}>
              <i aria-hidden="true" />
              <span>Chrome</span>
              <b>{browserOk ? "Ready" : status === "checking" ? "Checking" : "Needs Chrome"}</b>
            </li>
            <li className={states.nano}>
              <i aria-hidden="true" />
              <span>Gemini Nano</span>
              <b>{nanoText}</b>
            </li>
            <li className={states.camera}>
              <i aria-hidden="true" />
              <span>Camera</span>
              <b>{cam === "on" ? "Live" : cam === "skipped" ? "Skipped" : cam === "error" ? "Blocked" : "Off"}</b>
            </li>
          </ul>
          <div className="ts-meter" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < ready ? "on" : ""} />
            ))}
          </div>
        </section>

        <section className="setup-flow" aria-labelledby="setup-title">
          <h1 id="setup-title" className="setup-title">
            Set up your packing table.
          </h1>
          <p className="page-lede">
            About two minutes, once. After this, Vouch checks parcels on this computer, even when the internet drops.
          </p>

          <ol className="acc">
            <AccStep
              n={1}
              id="browser"
              state={states.browser}
              active={active === "browser"}
              title="Open Vouch in Chrome on a computer"
              summary={browserOk ? "This browser can run Gemini Nano" : "On-device checks need desktop Chrome"}
              onOpen={setOpen}
            >
              {browserOk ? (
                <p>This browser can run Gemini Nano, the model Chrome keeps on your device.</p>
              ) : (
                <p>
                  Use Chrome 139 or newer on a laptop or desktop. Open{" "}
                  <code>chrome://flags/#prompt-api-for-gemini-nano-multimodal-input</code>, set it to Enabled and restart.
                  Without it, Vouch still works and runs checks in the cloud.
                </p>
              )}
            </AccStep>

            <AccStep
              n={2}
              id="nano"
              state={states.nano}
              active={active === "nano"}
              title="Put Gemini Nano on this device"
              summary={nanoOk ? "Ready. Checks run here, free, offline" : nanoText}
              onOpen={setOpen}
            >
              {nanoOk && <p>Ready. Every check runs here, for free, with or without internet.</p>}
              {status === "downloadable" && (
                <>
                  <p>A one-time download from Google, handled by Chrome. A few minutes on a normal connection.</p>
                  <button className="btn primary" onClick={download} disabled={!firebaseConfigured}>
                    Download Gemini Nano
                    <DotArrow />
                  </button>
                </>
              )}
              {status === "downloading" && (
                <>
                  <p>Downloading. You can carry on; Vouch uses the cloud until it is ready.</p>
                  <div className="setup-progress" aria-label="Download progress">
                    <span style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }} />
                  </div>
                </>
              )}
              {nanoNo && (
                <p>This device cannot run Gemini Nano. Vouch will check parcels with Gemini in the cloud instead.</p>
              )}
              {error && <p className="setup-error">{error}</p>}
            </AccStep>

            <AccStep
              n={3}
              id="camera"
              state={states.camera}
              active={active === "camera"}
              title="Point a camera into the box"
              summary={cam === "on" ? "Camera is live" : cam === "skipped" ? "Skipped, using photos or the demo box" : "Any webcam works"}
              onOpen={setOpen}
            >
              <p>Any webcam works. Aim it down into an open box on your table. The picture stays on this computer.</p>
              <div className="row-actions">
                <button className="btn primary" onClick={testCamera}>
                  Allow the camera
                  <DotArrow />
                </button>
                <button
                  className="btn ghost"
                  onClick={() => {
                    setCam("skipped");
                    setOpen(null);
                  }}
                >
                  Skip, I will use photos
                </button>
              </div>
              {camError && <p className="setup-error">The camera did not start: {camError}</p>}
            </AccStep>

            <AccStep
              n={4}
              id="start"
              state={active === "start" ? "now" : "todo"}
              active={active === "start"}
              title="Pack your first order"
              summary="The sample order, packed wrong first, then right"
              onOpen={setOpen}
            >
              <p>
                Start with a real-looking chat from a customer who changes her mind halfway through. Then pack it with
                the demo box: wrong first, to see Vouch stop you, then right.
              </p>
              <div className="row-actions">
                <button className="btn primary big" onClick={() => finish(true)}>
                  Try the sample order
                  <DotArrow />
                </button>
                <button className="btn pill big" onClick={() => finish(false)}>
                  Go to my orders
                </button>
              </div>
            </AccStep>
          </ol>

          <p className="small muted setup-foot">
            Curious what runs where?{" "}
            <a className="text-btn" href={href({ name: "engine" })}>
              See under the hood
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}

function AccStep({
  n,
  id,
  state,
  active,
  title,
  summary,
  onOpen,
  children,
}: {
  n: number;
  id: StepId;
  state: StepState;
  active: boolean;
  title: string;
  summary: string;
  onOpen: (id: StepId) => void;
  children: React.ReactNode;
}) {
  return (
    <li className={`acc-step ${state}${active ? " open" : ""}`}>
      <button className="acc-head" onClick={() => onOpen(id)} aria-expanded={active}>
        <span className="acc-mark" aria-hidden="true">
          {state === "done" ? <CheckIcon size={16} /> : state === "warn" ? "!" : n}
        </span>
        <span className="acc-title">
          <b>{title}</b>
          {!active && <small>{summary}</small>}
        </span>
      </button>
      {active && <div className="acc-body">{children}</div>}
    </li>
  );
}
