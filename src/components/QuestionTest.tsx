import { useState } from "react";
import type { Order, TestSuite } from "../core/types";
import { VALIDATION_REPEATS } from "../core/validation";
import { useDeviceStatus } from "../ai/device";
import { plannedLooks, validateProbes, type ValidationProgress } from "../ai/validateProbes";

/**
 * Review screen step: test the on-device questions on the product photos before packing.
 * Shows what the run will do, its progress, and the numbers it produced.
 */
export function QuestionTest({ order, onDone }: { order: Order; onDone: (suite: TestSuite) => Promise<void> }) {
  const suite = order.suite!;
  const { status } = useDeviceStatus();
  const [progress, setProgress] = useState<ValidationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const looks = plannedLooks(order.sources, suite);
  const report = suite.validation;
  const busy = progress !== null;

  const run = async () => {
    setError(null);
    setProgress({ phase: "testing", done: 0, total: looks });
    try {
      await onDone(await validateProbes(order.sources, suite, setProgress));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProgress(null);
    }
  };

  let body: React.ReactNode;
  if (busy) {
    const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
    const text =
      progress.phase === "testing"
        ? `Testing on this device, look ${progress.done} of ${progress.total}`
        : progress.phase === "rewriting"
          ? `Gemini is rewriting ${progress.total === 1 ? "1 question" : `${progress.total} questions`} that answered wrong`
          : `Testing the rewritten questions, look ${progress.done} of ${progress.total}`;
    body = (
      <>
        <p className="small" aria-live="polite">
          {text}
        </p>
        <div className="progress-bar" aria-hidden="true">
          <span style={{ width: `${progress.phase === "rewriting" ? 100 : pct}%` }} />
        </div>
      </>
    );
  } else if (looks === 0 && !report) {
    body = (
      <p className="small muted">
        No product photos to test the questions against. Add the photos you showed the customer when you build the
        order, and Vouch tests each question on them before you pack.
      </p>
    );
  } else if (status !== "available") {
    body = (
      <p className="small muted">
        The questions are tested on Gemini Nano, on this device. <a href="#/setup">Open Setup</a> to download it, then
        come back.
      </p>
    );
  } else {
    body = (
      <div className="qt-row">
        <p className="small muted">
          {report ? (
            <>
              Tested on this device: {report.looks} looks, {(report.medianMs / 1000).toFixed(1)} s each.{" "}
              {report.passed} passed first time, {report.rewritten} rewritten, {report.rerouted} moved to the cloud
              {report.untested > 0 ? `, ${report.untested} without a photo` : ""}.
            </>
          ) : (
            <>
              Asks each on-device question {VALIDATION_REPEATS} times about the right item and the wrong variants, on this device. About{" "}
              {looks} looks.
            </>
          )}
        </p>
        <button className={report ? "btn ghost small" : "btn pill"} onClick={run} disabled={looks === 0}>
          {report ? "Test again" : "Test the questions"}
        </button>
      </div>
    );
  }

  return (
    <div className="qt">
      {body}
      {error && <div className="note error">{error}</div>}
    </div>
  );
}
