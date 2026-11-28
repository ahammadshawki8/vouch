import { useEffect, useMemo, useRef, useState } from "react";
import type { Order, Test, Verdict } from "../core/types";
import { evaluateGate } from "../core/gate";
import { repo } from "../data/repo";
import { median } from "../ai/callLog";
import { useDeviceStatus } from "../ai/device";
import { firebaseConfigured } from "../firebase/app";
import { listCameras, startCamera, stopCamera, type FrameSource } from "../runtime/camera";
import { usePackLoop } from "../runtime/usePackLoop";
import { sealParcel } from "../runtime/seal";
import { DeviceStatus, OracleTag } from "../components/bits";
import { Stamp } from "../components/Stamp";
import { go } from "../router";

function stateWord(t: Test, v: Verdict): string {
  if (v === "ATTESTED") return "Confirmed";
  if (v === "PASS") return t.type === "ABSENCE" ? "Not in box" : t.type === "NO_EXTRAS" ? "Nothing extra" : "Packed";
  if (v === "FAIL") {
    switch (t.type) {
      case "ABSENCE":
        return "Remove it";
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
  if (t.type === "ATTESTATION") return "Confirm";
  if (t.oracle === "CLOUD") return "At seal";
  return "Checking";
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
  const [stamped, setStamped] = useState<{ receiptId: string; at: number } | null>(null);
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
  const canRun = firebaseConfigured && (where === "device" || online);
  const loop = usePackLoop(order?.suite, source, canRun && !stamped, where);

  const gate = useMemo(
    () => (order?.suite ? evaluateGate(order.suite.tests, loop.verdicts) : null),
    [order, loop.verdicts],
  );

  const start = async (deviceId?: string) => {
    setCamError(null);
    setPhotoUrl(null);
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
    if (photoUrl) URL.revokeObjectURL(photoUrl);
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
    setStamped({ receiptId: result.receipt.id, at: result.receipt.sealedAt });
    window.setTimeout(() => go({ name: "receipt", id: result.receipt.id }), 2000);
  };

  if (order === undefined) return null;
  if (order === null || !order.suite) {
    return (
      <div className="page">
        <div className="notice error">
          <p>This order has no confirmed checklist. Review it first.</p>
        </div>
      </div>
    );
  }

  const suite = order.suite;
  const med = median(loop.latencies);
  const motionText =
    loop.motion === "moving" ? "Hands in the box" : loop.motion === "settling" ? "Settling" : "Watching the box";
  const sourceText =
    loop.lastCall?.source === "on_device" ? "on this device" : loop.lastCall?.source === "in_cloud" ? "in the cloud" : "";

  return (
    <div className="station">
      <section className="stage" aria-label="Camera">
        <video ref={videoRef} hidden={!source || source !== videoRef.current} />
        {photoUrl && (
          <img
            ref={imgRef}
            src={photoUrl}
            alt="Photo of the box being checked"
            onLoad={() => setSource(imgRef.current)}
          />
        )}
        {!source && !photoUrl && (
          <div className="stage-empty">
            <h2>Point the camera at the open box</h2>
            <p>Put items in one at a time. Each check turns green as soon as the item is seen.</p>
            <div className="actions">
              <button className="btn big" onClick={() => start()}>
                Start camera
              </button>
              <button className="btn quiet" style={{ color: "#dfe6f2" }} onClick={() => fileRef.current?.click()}>
                Use a photo instead
              </button>
            </div>
            {camError && <p style={{ color: "#f2b8b3" }}>Camera could not start: {camError}</p>}
          </div>
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
        {source && (
          <div className="stage-bar">
            <span>
              <strong>{loop.checking ? "Checking" : motionText}</strong>
            </span>
            <span>{loop.checks} checks</span>
            {med > 0 && <span>{(med / 1000).toFixed(1)} s per check</span>}
            {sourceText && <span>Last check ran {sourceText}</span>}
            <span style={{ flex: 1 }} />
            {cameras.length > 1 && (
              <select
                aria-label="Camera"
                value={cameraId}
                onChange={(e) => {
                  setCameraId(e.target.value);
                  void start(e.target.value);
                }}
                style={{ width: "auto", padding: "4px 8px" }}
              >
                <option value="">Default camera</option>
                {cameras.map((c) => (
                  <option key={c.deviceId} value={c.deviceId}>
                    {c.label || "Camera"}
                  </option>
                ))}
              </select>
            )}
            <button className="btn quiet small" style={{ color: "#dfe6f2" }} onClick={() => fileRef.current?.click()}>
              Use a photo
            </button>
          </div>
        )}
      </section>

      <section className="checklist-panel" aria-label="Checklist">
        <div className="checklist-head">
          <h2>{order.title}</h2>
          <p className="muted small">{suite.summary}</p>
          <div className="actions" style={{ gap: 16 }}>
            <DeviceStatus compact />
            <span className="small" style={{ color: online ? "var(--ink-2)" : "#9a6413" }}>
              {online ? "Online" : "Offline"}
            </span>
          </div>
          {device.status !== "available" && device.status !== "checking" && (
            <p className="small muted">
              {online
                ? "Checks will run in the cloud until the on-device model is ready."
                : "Offline and no on-device model: checks are paused."}
            </p>
          )}
          {device.status === "available" && (
            <label className="small muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={useCloud} onChange={(e) => setUseCloud(e.target.checked)} />
              Run checks in the cloud instead
            </label>
          )}
          {loop.error && (
            <p className="small" style={{ color: "var(--fail)" }}>
              Last check failed: {loop.error}
            </p>
          )}
        </div>

        <ul className="checklist">
          {suite.tests.map((t) => {
            const v = loop.verdicts[t.id] ?? "UNCERTAIN";
            const cls = v.toLowerCase() + (loop.flash.has(t.id) ? " flash" : "");
            return (
              <li key={t.id} className={`check ${cls}`} aria-live="polite">
                <span className="bar" aria-hidden="true" />
                <div>
                  <div className="label">
                    {t.type === "ABSENCE" ? `No ${t.label.charAt(0).toLowerCase()}${t.label.slice(1)}` : t.label}
                  </div>
                  <div className="sub">
                    <OracleTag oracle={t.oracle} />
                    {t.type === "ATTESTATION" && v !== "ATTESTED" && (
                      <button className="btn small" style={{ padding: "4px 12px" }} onClick={() => loop.confirm(t.id)}>
                        I checked this
                      </button>
                    )}
                  </div>
                </div>
                <span className="state">{stateWord(t, v)}</span>
              </li>
            );
          })}
        </ul>

        <div className="seal-area">
          {gate && !gate.approved && (
            <ul className="blockers" aria-label="What still blocks the parcel">
              {(sealReasons.length ? sealReasons : gate.reasons).slice(0, 4).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          <button
            className="btn primary big"
            disabled={!gate?.approved || sealing || !loop.lastFrame}
            onClick={seal}
          >
            {gate?.approved ? "Seal parcel" : "Seal parcel when every check passes"}
          </button>
        </div>
      </section>

      {stamped && <Stamp at={stamped.at} reference={order.title} />}
    </div>
  );
}
