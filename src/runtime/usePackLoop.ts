import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TestSuite, Verdict } from "../core/types";
import { evaluateFrame } from "../core/evaluate";
import { attest, initialSmoothing, stableVerdicts, stepSmoothing, type SmoothingState } from "../core/smoothing";
import { deviceProbes } from "../core/validateSuite";
import { runProbes } from "../ai/probeRunner";
import type { CallRecord } from "../ai/callLog";
import { captureJpeg, captureThumb, type FrameSource } from "./camera";
import { frameDiff, initialMotion, stepMotion, toGray, type MotionState } from "./motion";

const SAMPLE_MS = 200;
const FLASH_MS = 800;

export interface PackLoop {
  verdicts: Record<string, Verdict>;
  smoothing: SmoothingState;
  motion: MotionState["phase"];
  checking: boolean;
  checks: number;
  lastCall: CallRecord | null;
  latencies: number[];
  lastFrame: string | null;
  flash: Set<string>;
  error: string | null;
  confirm: (testId: string) => void;
  reset: () => void;
}

/**
 * The live verification loop at the packing table.
 * Samples tiny thumbnails for motion, and when the scene settles sends one frame to the
 * runtime model with every device question at once. Answers are scored by pure code and
 * smoothed over frames before the checklist changes.
 */
export function usePackLoop(
  suite: TestSuite | undefined,
  source: FrameSource | null,
  enabled: boolean,
  where: "device" | "cloud",
): PackLoop {
  const ids = useMemo(() => suite?.tests.map((t) => t.id) ?? [], [suite]);
  const probes = useMemo(() => (suite ? deviceProbes(suite) : []), [suite]);

  const [smoothing, setSmoothing] = useState(() => initialSmoothing(ids));
  const [motion, setMotion] = useState<MotionState["phase"]>("settling");
  const [checking, setChecking] = useState(false);
  const [checks, setChecks] = useState(0);
  const [lastCall, setLastCall] = useState<CallRecord | null>(null);
  const [latencies, setLatencies] = useState<number[]>([]);
  const [lastFrame, setLastFrame] = useState<string | null>(null);
  const [flash, setFlash] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const smoothingRef = useRef(smoothing);
  smoothingRef.current = smoothing;
  const motionRef = useRef<MotionState>(initialMotion);
  const prevGray = useRef<Uint8ClampedArray | null>(null);
  const inFlight = useRef(false);
  const thumbCanvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setSmoothing(initialSmoothing(ids));
  }, [ids]);

  const runCheck = useCallback(async () => {
    if (!source || !suite || probes.length === 0 || inFlight.current) return;
    inFlight.current = true;
    setChecking(true);
    try {
      const jpeg = captureJpeg(source);
      const { answers, record } = await runProbes(probes, jpeg, where);
      const frame = evaluateFrame(suite.tests, answers);
      const before = stableVerdicts(smoothingRef.current);
      const next = stepSmoothing(smoothingRef.current, frame);
      const after = stableVerdicts(next);
      const newlyFailed = Object.keys(after).filter((id) => after[id] === "FAIL" && before[id] !== "FAIL");
      if (newlyFailed.length) {
        setFlash(new Set(newlyFailed));
        window.setTimeout(() => setFlash(new Set()), FLASH_MS);
      }
      smoothingRef.current = next;
      setSmoothing(next);
      setLastFrame(jpeg);
      setLastCall(record);
      setLatencies((l) => [...l, record.ms].slice(-40));
      setChecks((n) => n + 1);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      inFlight.current = false;
      setChecking(false);
    }
  }, [source, suite, probes, where]);

  useEffect(() => {
    if (!enabled || !source) return;
    if (!thumbCanvas.current) thumbCanvas.current = document.createElement("canvas");
    const timer = window.setInterval(() => {
      const rgba = captureThumb(source, thumbCanvas.current!);
      if (rgba.length === 0) return;
      const gray = toGray(rgba);
      const diff = prevGray.current ? frameDiff(prevGray.current, gray) : 255;
      prevGray.current = gray;
      const { state, fire } = stepMotion(motionRef.current, diff, performance.now());
      motionRef.current = state;
      setMotion(state.phase);
      if (fire && !inFlight.current) void runCheck();
    }, SAMPLE_MS);
    return () => window.clearInterval(timer);
  }, [enabled, source, runCheck]);

  const confirm = useCallback((testId: string) => {
    const next = attest(smoothingRef.current, testId);
    smoothingRef.current = next;
    setSmoothing(next);
  }, []);

  const reset = useCallback(() => {
    const fresh = initialSmoothing(ids);
    smoothingRef.current = fresh;
    setSmoothing(fresh);
    motionRef.current = initialMotion;
    setChecks(0);
    setLatencies([]);
  }, [ids]);

  return {
    verdicts: stableVerdicts(smoothing),
    smoothing,
    motion,
    checking,
    checks,
    lastCall,
    latencies,
    lastFrame,
    flash,
    error,
    confirm,
    reset,
  };
}
