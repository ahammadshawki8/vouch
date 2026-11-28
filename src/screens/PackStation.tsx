import { useEffect, useMemo, useRef, useState } from "react";
import type { Order, Test, Verdict } from "../core/types";
import { checkLabel, evaluateGate } from "../core/gate";
import { repo } from "../data/repo";
import { median } from "../ai/callLog";
import { useDeviceStatus, warmDevice } from "../ai/device";
import { firebaseConfigured } from "../firebase/app";
import { listCameras, startCamera, stopCamera, type FrameSource } from "../runtime/camera";
import { usePackLoop } from "../runtime/usePackLoop";
import { sealParcel } from "../runtime/seal";
import { OracleTag } from "../components/bits";
import { DotArrow, TapeTick } from "../components/Brand";
import { CheckIcon, CrossIcon, HandIcon } from "../components/Icons";
import { SealMoment } from "../components/SealMoment";
import { go } from "../router";
import { resetTab, setTabState } from "../lib/favicon";
import { drawDemoBox, type DemoVariant } from "../lib/demo";

function stateWord(t: Test, v: Verdict): string {
  if (v === "ATTESTED") return "Confirmed";
  if (v === "PASS") return t.type === "ABSENCE" ? "Not in box" : t.type === "NO_EXTRAS" ? "Nothing extra" : "Packed";
  if (v === "FAIL") {
    switch (t.type) {
      case "ABSENCE":
        return "Take it out";
      case "COUNT":
        return "Wrong count";
      case "ATTRIBUTE":
        return "Wrong one";
      case "NO_EXTRAS":
        return "Extra item";
      default:
        return "Missing";
    }
  }
  if (t.type === "ATTESTATION") return "Your call";
  if (t.oracle === "CLOUD") return "At seal";
  return "Looking";
}

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function PackStation({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [source, setSource] = useState<FrameSource | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState<string>("");
  const [camError, setCamError] = useState<string | null>(null);
  const [useCloud, setUseCloud] = useState(false);
  const [sealing, setSealing] = useState(false);
  const [sealReasons, setSealReasons] = useState<string[]>([]);
  const [sealed, setSealed] = useState<{ receiptId: string; at: number } | null>(null);
  const [demo, setDemo] = useState<DemoVariant | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const device = useDeviceStatus();
  const online = useOnline();

  useEffect(() => {
    void repo()
      .getOrder(id)
      .then(async (o) => {
        if (o && o.status === "confirmed") {
          o = { ...o, status: "packing" };
          await repo().saveOrder(o);
        }
        setOrder(o ?? null);
      });
    return () => stopCamera(streamRef.current);
  }, [id]);

  const where: "device" | "cloud" = useCloud || device.status !== "available" ? "cloud" : "device";

  useEffect(() => {
    if (where === "device" && firebaseConfigured) void warmDevice();
  }, [where]);

  /** The demo box: a drawn parcel for trying Vouch without products. The model checks it like any frame. */
  const showDemo = (variant: DemoVariant) => {
    stopCamera(streamRef.current);
    streamRef.current = null;
    if (photoUrl?.startsWith("blob:")) URL.revokeObjectURL(photoUrl);
    setDemo(variant);
    setSource(null);
    setPhotoUrl(drawDemoBox(variant));
  };
  const canRun = firebaseConfigured && (where === "device" || online);
  const loop = usePackLoop(order?.suite, source, canRun && !sealed, where);

  const gate = useMemo(
    () => (order?.suite ? evaluateGate(order.suite.tests, loop.verdicts) : null),
    [order, loop.verdicts],
  );

  useEffect(() => {
    if (!order?.suite || !gate) return;
    const total = order.suite.tests.length;
    const label = `${gate.passed.length} of ${total} packed, ${order.title}`;
    setTabState(gate.approved ? "pass" : gate.failed.length ? "fail" : "brand", label);
  }, [gate, order]);
  useEffect(() => resetTab, []);

  const start = async (deviceId?: string) => {
    setCamError(null);
    if (photoUrl?.startsWith("blob:")) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(null);
    setDemo(null);
    try {
      stopCamera(streamRef.current);
      const video = videoRef.current!;
      streamRef.current = await startCamera(video, deviceId);
      setSource(video);
      setCameras(await listCameras());
    } catch (e) {
      setCamError(e instanceof Error ? e.message : String(e));
    }
  };

  const usePhoto = (file: File | undefined) => {
    if (!file) return;
    stopCamera(streamRef.current);
    streamRef.current = null;
    if (photoUrl?.startsWith("blob:")) URL.revokeObjectURL(photoUrl);
    setDemo(null);
    setSource(null);
    setPhotoUrl(URL.createObjectURL(file));
  };

  const seal = async () => {
    if (!order || !loop.lastFrame) return;
    setSealing(true);
    setSealReasons([]);
    const result = await sealParcel({ order, verdicts: loop.verdicts, photo: loop.lastFrame });
    setSealing(false);
    if (!result.ok) {
      setSealReasons(result.reasons);
      return;
    }
    stopCamera(streamRef.current);
    setSealed({ receiptId: result.receipt.id, at: result.receipt.sealedAt });
    window.setTimeout(() => go({ name: "receipt", id: result.receipt.id }), 2400);
  };

  if (order === undefined) return null;
  if (order === null || !order.suite) {
    return (
      <div className="page">
        <div className="note error">This order has no confirmed checklist. Review it first.</div>
      </div>
    );
  }

  const suite = order.suite;
  const med = median(loop.latencies);
  const done = gate?.passed.length ?? 0;
  const total = suite.tests.length;
  const motionText = loop.checking
    ? "Checking"
    : loop.motion === "moving"
      ? "Hands in the box"
      : loop.motion === "settling"
        ? "Settling"
        : "Watching";
  const ranOn =
    loop.lastCall?.source === "on_device" ? "device" : loop.lastCall?.source === "in_cloud" ? "cloud" : null;
  const live = Boolean(source || photoUrl);

  return (
    <div className="station">
      <section className="stage" aria-label="Camera">
        <video ref={videoRef} hidden={!source || source !== videoRef.current} />
        {photoUrl && (
          <img
            ref={imgRef}
            className="still"
            src={photoUrl}
            alt="Photo of the box being checked"
            onLoad={() => setSource(imgRef.current)}
          />
        )}

        {!live && (
          <div className="stage-empty">
            <h2>Point the camera into the open box.</h2>
            <p>Put items in one at a time. Each check turns green the moment Vouch sees the right thing.</p>
            <div className="actions">
              <button className="btn primary big" onClick={() => start()}>
                Start the camera
                <DotArrow />
              </button>
              <button className="btn pill big" onClick={() => fileRef.current?.click()}>
                Use a photo
              </button>
            </div>
            <button className="demo-link" onClick={() => showDemo("wrong")}>
              No products at hand? <b>Try the demo box</b>, a drawn parcel for the sample order.
            </button>
            {camError && <p style={{ color: "#f5b7c1" }}>The camera did not start: {camError}</p>}
          </div>
        )}
        {!live && (
          <span className="corner-tick" aria-hidden="true">
            <TapeTick size={420} />
          </span>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg"
          hidden
          onChange={(e) => {
            usePhoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {live && (
          <>
            <div className="hud">
              <span className="hud-chip live">
                <span className="lamp" />
                {motionText}
              </span>
              {ranOn && (
                <span className={`hud-chip ${ranOn}`}>
                  <span className="lamp" />
                  {ranOn === "device" ? "Checked on device" : "Checked in the cloud"}
                  {med > 0 && <span className="num"> {(med / 1000).toFixed(1)} s</span>}
                </span>
              )}
              <span className="hud-chip num">{loop.checks} looks</span>
            </div>
            <div className="hud-bottom">
              {demo ? (
                <div className="demo-switch" role="group" aria-label="Demo box contents">
                  <span>Demo box</span>
                  <button aria-pressed={demo === "wrong"} onClick={() => showDemo("wrong")}>
                    Packed wrong
                  </button>
                  <button aria-pressed={demo === "right"} onClick={() => showDemo("right")}>
                    Packed right
                  </button>
                </div>
              ) : cameras.length > 1 ? (
                <span className="hud-chip">
                  <select
                    aria-label="Camera"
                    value={cameraId}
                    onChange={(e) => {
                      setCameraId(e.target.value);
                      void start(e.target.value);
                    }}
                  >
                    <option value="">Default camera</option>
                    {cameras.map((c) => (
                      <option key={c.deviceId} value={c.deviceId}>
                        {c.label || "Camera"}
                      </option>
                    ))}
                  </select>
                </span>
              ) : (
                <span />
              )}
              <button className="btn pill small" onClick={() => fileRef.current?.click()}>
                Use a photo
              </button>
            </div>
          </>
        )}
      </section>

      <section className="sheet" aria-label="Checklist">
        <div className="sheet-head">
          <h2>{order.title}</h2>
          <div className="progress-bar" aria-label={`${done} of ${total} checks done`}>
            <span style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
          <div className="row">
            <span className="mini-pill num">
              {done} of {total} done
            </span>
            <span className={`mini-pill ${online ? "ok" : "warn"}`}>
              <span className="lamp" />
              {online ? "Online" : "Offline"}
            </span>
            <span className={`mini-pill ${where === "device" ? "ok" : "warn"}`}>
              <span className="lamp" />
              {where === "device" ? "Checks run on this device" : "Checks run in the cloud"}
            </span>
            {device.status === "available" && (
              <span className="mini-pill">
                <label>
                  <input type="checkbox" checked={useCloud} onChange={(e) => setUseCloud(e.target.checked)} />
                  Use cloud
                </label>
              </span>
            )}
          </div>
          {!canRun && (
            <p className="small muted">Offline and the on-device model is not ready, so checks are paused.</p>
          )}
          {loop.error && (
            <p className="small" style={{ color: "var(--fail)" }}>
              The last check failed: {loop.error}
            </p>
          )}
        </div>

        <ul className="live-list">
          {suite.tests.map((t, i) => {
            const v = loop.verdicts[t.id] ?? "UNCERTAIN";
            const human = t.type === "ATTESTATION" && v !== "ATTESTED";
            const idle = v === "UNCERTAIN" && loop.checks === 0 && !human;
            const cls = human ? "human" : idle ? "idle" : v.toLowerCase();
            return (
              <li
                key={t.id}
                className={`live ${cls}${loop.flash.has(t.id) ? " flash" : ""}`}
                style={{ "--i": i } as React.CSSProperties}
              >
                <span className="mark" aria-hidden="true">
                  {(v === "PASS" || v === "ATTESTED") && <CheckIcon />}
                  {v === "FAIL" && <CrossIcon />}
                  {human && <HandIcon />}
                </span>
                <div>
                  <div className="label">{checkLabel(t)}</div>
                  <div className="sub">
                    <OracleTag oracle={t.oracle} />
                    {human && (
                      <button className="btn primary small" onClick={() => loop.confirm(t.id)}>
                        I checked this
                        <DotArrow />
                      </button>
                    )}
                  </div>
                </div>
                <span className="state" aria-live="polite">
                  {idle ? (live ? "Looking" : "Waiting") : stateWord(t, v)}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="seal">
          {gate && !gate.approved && (
            <ul className="blockers" aria-label="What still blocks the parcel">
              {(sealReasons.length ? sealReasons : gate.reasons).slice(0, 3).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          <button
            className="btn primary big wide"
            disabled={!gate?.approved || sealing || !loop.lastFrame}
            onClick={seal}
          >
            {gate?.approved ? "Seal the parcel" : `Seal when all ${total} checks pass`}
            <DotArrow />
          </button>
        </div>
      </section>

      {sealed && <SealMoment at={sealed.at} reference={order.title} checks={total} />}
    </div>
  );
}
