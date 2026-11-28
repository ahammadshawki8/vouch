import { useEffect, useState } from "react";
import type { Oracle, Order, Test, TestSuite, TestType, TestValidation } from "../core/types";
import { validateSuite } from "../core/validateSuite";
import { checkLabel } from "../core/gate";
import { repo } from "../data/repo";
import { dataUrl } from "../lib/files";
import { go } from "../router";
import { OracleTag, StatusTag } from "../components/bits";
import { DotArrow, Sticker } from "../components/Brand";
import { QuestionTest } from "../components/QuestionTest";

const TYPE_TEXT: Record<TestType, string> = {
  PRESENCE: "Must be in the box",
  COUNT: "Exact quantity",
  ATTRIBUTE: "Right variant",
  ABSENCE: "Must not be in the box",
  NO_EXTRAS: "Nothing extra",
  ATTESTATION: "You confirm by hand",
};

const VALIDATION_TEXT: Record<TestValidation, string> = {
  passed: "Tested on the photos",
  rewritten: "Rewritten after testing",
  rerouted: "Moved to the cloud after testing",
  untested: "No photo to test on",
};

export function Review({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [manual, setManual] = useState("");
  const [warnings] = useState<string[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(`warnings:${id}`) ?? "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    void repo()
      .getOrder(id)
      .then((o) => setOrder(o ?? null));
  }, [id]);

  if (order === undefined) return null;
  if (order === null || !order.suite) {
    return (
      <div className="page">
        <div className="note error">This order has no checklist yet. Go back and build it from the conversation.</div>
      </div>
    );
  }

  const suite = order.suite;
  const save = async (tests: Test[]) => {
    const next = { ...order, suite: { ...suite, tests } };
    setOrder(next);
    await repo().saveOrder(next);
  };
  const saveSuite = async (next: TestSuite) => {
    const latest = (await repo().getOrder(order.id)) ?? order;
    const updated = { ...latest, suite: next };
    setOrder(updated);
    await repo().saveOrder(updated);
  };
  const removeTest = (tid: string) => save(suite.tests.filter((t) => t.id !== tid));
  const setOracle = (tid: string, oracle: Oracle) =>
    save(suite.tests.map((t) => (t.id === tid ? { ...t, oracle } : t)));
  const addManual = () => {
    const label = manual.trim();
    if (!label) return;
    setManual("");
    void save([
      ...suite.tests,
      {
        id: `t${suite.tests.length + 1}_m`,
        type: "ATTESTATION",
        label,
        item: label,
        evidence: "Added by the seller",
        oracle: "HUMAN",
        probes: [],
      },
    ]);
  };

  const counts: Record<Oracle, number> = { DEVICE: 0, CLOUD: 0, HUMAN: 0 };
  for (const t of suite.tests) counts[t.oracle]++;
  const check = validateSuite(suite);
  const notes = [...new Set([...warnings, ...check.errors])];

  const confirm = async () => {
    await repo().saveOrder({ ...order, status: "confirmed" });
    go({ name: "pack", id: order.id });
  };

  const images = order.sources.filter((s) => s.kind === "screenshot" || s.kind === "product");
  const texts = order.sources.filter((s) => s.kind === "text");
  const audio = order.sources.filter((s) => s.kind === "audio");

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div style={{ marginBottom: 18 }}>
            <StatusTag status={order.status} />
          </div>
          <h1 className="page-title" style={{ fontSize: "clamp(44px, 5.4vw, 80px)" }}>
            {order.title}
          </h1>
        </div>
        <button className="btn primary big" onClick={confirm} disabled={suite.tests.length === 0}>
          Start packing
          <DotArrow />
        </button>
      </div>

      <div className="review">
        <aside aria-label="What the customer sent">
          <span className="aside-label">What the customer sent</span>
          {texts.map((s) => (
            <div key={s.id} className="chat-bubble">
              {s.data}
            </div>
          ))}
          {images.map((s) => (
            <div className="source" key={s.id}>
              <div className="thumb">
                <img src={dataUrl(s)} alt={s.name} />
              </div>
              <div className="meta">
                <span>
                  <span className="sid">{s.id}</span>{" "}
                  <span className="faint">{s.kind === "product" ? "Product photo" : "Chat screenshot"}</span>
                </span>
              </div>
            </div>
          ))}
          {audio.map((s) => (
            <audio key={s.id} controls src={dataUrl(s)} style={{ width: "100%" }} />
          ))}
        </aside>

        <div>
          <span className="aside-label">What goes in the box</span>
          <div className="summary-wrap">
            <p className="summary" style={{ marginTop: 10 }}>
              {suite.summary}
            </p>
          </div>

          {suite.changes.length > 0 && (
            <div className="changes">
              <Sticker tilt={-4} tone="signal">
                {suite.changes.length === 1 ? "The customer changed one thing" : `${suite.changes.length} changes`}
              </Sticker>
              {suite.changes.map((c, i) => (
                <span className="change-chip" key={i}>
                  <span className="from">{c.from}</span>
                  <span className="to">{c.to}</span>
                  <span className="quote">{c.evidence}</span>
                </span>
              ))}
            </div>
          )}

          {(suite.openQuestions.length > 0 || notes.length > 0) && (
            <div style={{ display: "grid", gap: 10, marginTop: 32 }}>
              {suite.openQuestions.length > 0 && (
                <div className="note warn">
                  <strong>Ask the customer before packing.</strong> {suite.openQuestions.join(" ")}
                </div>
              )}
              {notes.map((w) => (
                <div className="note warn" key={w}>
                  {w}
                </div>
              ))}
            </div>
          )}

          <section className="block" aria-labelledby="where-title">
            <div className="block-head">
              <h2 id="where-title">Where each check runs</h2>
              <span className="small muted">
                {suite.validated
                  ? "On-device questions were tested on the right item and the wrong variants."
                  : "Test the questions on the product photos before you pack."}
              </span>
            </div>
            <div className="where-strip">
              <div className="where-cell device" style={{ "--i": 0 } as React.CSSProperties}>
                <span className="n num">{counts.DEVICE}</span>
                <span className="muted">on this device, offline, free</span>
              </div>
              <div className="where-cell" style={{ "--i": 1 } as React.CSSProperties}>
                <span className="n num" style={{ color: "#2b4fc9" }}>
                  {counts.CLOUD}
                </span>
                <span className="muted">in the cloud, for fine detail</span>
              </div>
              <div className="where-cell" style={{ "--i": 2 } as React.CSSProperties}>
                <span className="n num" style={{ color: "#a3330a" }}>
                  {counts.HUMAN}
                </span>
                <span className="muted">confirmed by you</span>
              </div>
            </div>
            <QuestionTest order={order} onDone={saveSuite} />
          </section>

          <section className="block" aria-labelledby="checks-title">
            <div className="block-head">
              <h2 id="checks-title">The checklist</h2>
              <span className="small muted">{suite.tests.length} checks</span>
            </div>
            <ul className="checks">
              {suite.tests.map((t, i) => (
                <li className="check-row" key={t.id} style={{ "--i": i } as React.CSSProperties}>
                  <div>
                    <h4>{checkLabel(t)}</h4>
                    <div className="kind">
                      <span>{TYPE_TEXT[t.type]}</span>
                      {t.validation && <span className={`vtag ${t.validation}`}>{VALIDATION_TEXT[t.validation]}</span>}
                      <span className="quote">{t.evidence}</span>
                    </div>
                    {t.probes.length > 0 && (
                      <ul className="probe-list">
                        {t.probes.map((p) => (
                          <li key={p.id}>
                            <span>{p.question}</span>
                            <span className="ans">passes on {p.pass}</span>
                            {t.probeStats?.[p.id] && (
                              <span className="faint">
                                reliable in {Math.round(t.probeStats[p.id].reliability * 100)}% of test runs
                                {t.probeStats[p.id].rewritten ? ", rewritten once" : ""}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    {t.type === "ATTESTATION" ? (
                      <OracleTag oracle="HUMAN" />
                    ) : (
                      <div className="segmented" role="group" aria-label={`Who checks ${t.label}`}>
                        <button aria-pressed={t.oracle === "DEVICE"} onClick={() => setOracle(t.id, "DEVICE")}>
                          On device
                        </button>
                        <button aria-pressed={t.oracle === "CLOUD"} onClick={() => setOracle(t.id, "CLOUD")}>
                          Cloud
                        </button>
                      </div>
                    )}
                  </div>
                  <button className="btn ghost small" onClick={() => removeTest(t.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="add-row">
              <input
                type="text"
                aria-label="Add something you will confirm by hand"
                placeholder="Add something to confirm by hand, like size M or a gift note"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addManual()}
              />
              <button className="btn pill" onClick={addManual} disabled={!manual.trim()}>
                Add check
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
