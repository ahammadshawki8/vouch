import { useEffect, useRef, useState } from "react";
import { prepareDeviceModel, useDeviceStatus } from "../ai/device";
import { firebaseConfigured } from "../firebase/app";
import { startCamera, stopCamera } from "../runtime/camera";
import { go, href } from "../router";
import { markSetupDone, queueSample } from "../lib/demo";
import { DotArrow } from "../components/Brand";
import { CheckIcon } from "../components/Icons";
import { PhotoCard } from "../components/PhotoCard";
import { PHOTOS } from "../lib/photos";

type StepState = "done" | "now" | "todo" | "warn";

function Step({
  n,
  state,
  title,
  children,
}: {
  n: number;
  state: StepState;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className={`setup-step ${state}`}>
      <span className="setup-mark" aria-hidden="true">
        {state === "done" ? <CheckIcon size={18} /> : n}
      </span>
      <div className="setup-body">
        <h3>
          {title}
          <span className="visually-hidden">
            {state === "done" ? " (done)" : state === "warn" ? " (needs attention)" : ""}
          </span>
        </h3>
        {children}
      </div>
    </li>
  );
}

/** First-run journey: browser, on-device model, camera, first order. About two minutes, once. */
export function Setup() {
  const { status, progress } = useDeviceStatus();
  const [error, setError] = useState<string | null>(null);
  const [cam, setCam] = useState<"idle" | "on" | "skipped" | "error">("idle");
  const [camError, setCamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => () => stopCamera(streamRef.current), []);

  const browserOk = status !== "unsupported" && status !== "checking";
  const nanoOk = status === "available";
  const nanoNo = status === "unavailable" || status === "unsupported";
  const camOk = cam === "on" || cam === "skipped";

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

  const nanoState: StepState = nanoOk ? "done" : nanoNo ? "warn" : browserOk ? "now" : "todo";

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Set up your packing table.</h1>
          <p className="page-lede">
            About two minutes, once. After this, Vouch checks parcels right on this computer, even when the internet
            drops.
          </p>
        </div>
      </div>

      <div className="setup">
        <ol className="setup-steps">
          <Step n={1} state={browserOk ? "done" : status === "checking" ? "now" : "warn"} title="Open Vouch in Chrome on a computer">
            {browserOk ? (
              <p>This browser can run Gemini Nano, Google's on-device model.</p>
            ) : status === "checking" ? (
              <p>Checking this browser.</p>
            ) : (
              <>
                <p>
                  On-device checks need Chrome 139 or newer on a desktop or laptop. In Chrome, open{" "}
                  <code>chrome://flags/#prompt-api-for-gemini-nano-multimodal-input</code>, set it to Enabled and
                  restart. Without it, Vouch still works and runs every check in the cloud.
                </p>
              </>
            )}
          </Step>

          <Step n={2} state={nanoState} title="Put Gemini Nano on this device">
            {nanoOk && <p>Ready. Checks run here, for free, with or without internet.</p>}
            {status === "downloadable" && (
              <>
                <p>A one-time download from Google, handled by Chrome. It takes a few minutes on a normal connection.</p>
                <button className="btn primary" onClick={download} disabled={!firebaseConfigured}>
                  Download Gemini Nano
                  <DotArrow />
                </button>
              </>
            )}
            {status === "downloading" && (
              <>
                <p>Downloading. You can keep going, Vouch will use the cloud until it is ready.</p>
                <div className="setup-progress" aria-label="Download progress">
                  <span style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }} />
                </div>
              </>
            )}
            {nanoNo && (
              <p>
                This device cannot run Gemini Nano. Vouch will run checks with Gemini in the cloud instead, which needs
                an internet connection.
              </p>
            )}
            {error && <p className="setup-error">{error}</p>}
          </Step>

          <Step n={3} state={camOk ? "done" : cam === "error" ? "warn" : "now"} title="Point a camera into the box">
            <div className={`setup-cam${cam === "on" ? " live" : ""}`}>
              <video ref={videoRef} muted playsInline hidden={cam !== "on"} />
              {cam !== "on" && <span>Any webcam works. Aim it down into an open box on your table.</span>}
            </div>
            {cam !== "on" && (
              <div className="row-actions">
                <button className="btn pill" onClick={testCamera}>
                  Allow the camera
                </button>
                <button className="btn ghost" onClick={() => setCam("skipped")}>
                  Skip, I will use photos or the demo box
                </button>
              </div>
            )}
            {camError && <p className="setup-error">The camera did not start: {camError}</p>}
          </Step>

          <Step n={4} state={camOk ? "now" : "todo"} title="Pack your first order">
            <p>
              Start with our sample chat: a customer who changes her mind halfway through. Then pack it with the demo
              box, wrong first, then right.
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
          </Step>
        </ol>

        <aside className="setup-aside">
          <PhotoCard photo={PHOTOS.packer} width={420} ratio={0.85} tilt={2} />
          <div className="setup-need">
            <h3>What you need</h3>
            <ul>
              <li>Chrome on a laptop or desktop</li>
              <li>A webcam, phone photos, or our demo box</li>
              <li>The customer's chat, in any language</li>
            </ul>
            <a className="text-btn" href={href({ name: "engine" })}>
              See what runs where
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
