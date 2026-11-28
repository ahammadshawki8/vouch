import { useEffect, useState } from "react";
import type { Oracle, Order, Test, TestType } from "../core/types";
import { validateSuite } from "../core/validateSuite";
import { repo } from "../data/repo";
import { dataUrl } from "../lib/files";
import { go } from "../router";
import { OracleTag } from "../components/bits";

const TYPE_TEXT: Record<TestType, string> = {
  PRESENCE: "Must be in the box",
  COUNT: "Exact quantity",
  ATTRIBUTE: "Right variant",
  ABSENCE: "Must not be in the box",
  NO_EXTRAS: "Nothing extra",
  ATTESTATION: "You confirm by hand",
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
        <div className="notice error">
          <p>This order has no checklist yet. Go back and build it from the conversation.</p>
        </div>
      </div>
    );
  }

  const suite = order.suite;
  const save = async (tests: Test[]) => {
    const next = { ...order, suite: { ...suite, tests } };
    setOrder(next);
    await repo().saveOrder(next);
  };
  const removeTest = (tid: string) => save(suite.tests.filter((t) => t.id !== tid));
  const setOracle = (tid: string, oracle: Oracle) =>
    save(suite.tests.map((t) => (t.id === tid ? { ...t, oracle } : t)));
  const addManual = () => {
    const label = manual.trim();
    if (!label) return;
    const n = suite.tests.length + 1;
    setManual("");
    void save([
      ...suite.tests,
      { id: `t${n}_m`, type: "ATTESTATION", label, item: label, evidence: "Added by seller", oracle: "HUMAN", probes: [] },
    ]);
  };

  const counts = { DEVICE: 0, CLOUD: 0, HUMAN: 0 } as Record<Oracle, number>;
  for (const t of suite.tests) counts[t.oracle]++;
  const check = validateSuite(suite);

  const confirm = async () => {
    await repo().saveOrder({ ...order, status: "confirmed" });
    go({ name: "pack", id: order.id });
  };

  const images = order.sources.filter((s) => s.kind === "screenshot" || s.kind === "product");

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{order.title}</h1>
          <p>Check what Vouch understood. Fix anything that is wrong, then start packing.</p>
        </div>
        <button className="btn primary big" onClick={confirm} disabled={suite.tests.length === 0}>
          Confirm and start packing
        </button>
      </div>

      <div className="review">
        <aside aria-label="What the customer sent">
          <h3>What the customer sent</h3>
          {images.map((s) => (
            <div className="source" key={s.id}>
              <div className="thumb">
                <img src={dataUrl(s)} alt={s.name} />
              </div>
              <div className="meta">
                <span>
                  <span className="sid">{s.id}</span>{" "}
                  <span className="muted">{s.kind === "product" ? "Product photo" : "Chat screenshot"}</span>
                </span>
              </div>
            </div>
          ))}
          {order.sources
            .filter((s) => s.kind === "text")
            .map((s) => (
              <div key={s.id} className="notice small" style={{ whiteSpace: "pre-wrap" }}>
                {s.data}
              </div>
            ))}
          {order.sources
            .filter((s) => s.kind === "audio")
            .map((s) => (
              <audio key={s.id} controls src={dataUrl(s)} style={{ width: "100%" }} />
            ))}
        </aside>

        <div>
          <p className="summary-line">{suite.summary}</p>

          {suite.changes.length > 0 && (
            <div className="section" style={{ marginTop: 32 }}>
              <h3>Changes the customer made</h3>
              <div>
                {suite.changes.map((c, i) => (
                  <div className="change" key={i}>
                    <span>
                      <span className="from">{c.from}</span> to <strong>{c.to}</strong>
                    </span>
                    <span className="quote">"{c.evidence}"</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(suite.openQuestions.length > 0 || warnings.length > 0 || !check.ok) && (
            <div className="section" style={{ marginTop: 32 }}>
              {suite.openQuestions.length > 0 && (
                <div className="notice warn">
                  <p>
                    <strong>Ask the customer before packing:</strong> {suite.openQuestions.join(" ")}
                  </p>
                </div>
              )}
              {[...new Set([...warnings, ...check.errors])].map((w) => (
                <div className="notice warn" key={w}>
                  <p>{w}</p>
                </div>
              ))}
            </div>
          )}

          <div className="section">
            <h3>How each check will run</h3>
            <div className="health" role="group" aria-label="Where checks run">
              <div>
                <div className="n" style={{ color: "var(--pass)" }}>
                  {counts.DEVICE}
                </div>
                <div className="small muted">on this device, offline</div>
              </div>
              <div>
                <div className="n" style={{ color: "var(--focus)" }}>
                  {counts.CLOUD}
                </div>
                <div className="small muted">in the cloud, when online</div>
              </div>
              <div>
                <div className="n" style={{ color: "#9a6413" }}>
                  {counts.HUMAN}
                </div>
                <div className="small muted">confirmed by you</div>
              </div>
            </div>
            <p className="small muted">
              {suite.validated
                ? "Every on-device question was tested against the right item and the wrong variants."
                : "Questions have not been tested against product photos yet."}
            </p>
          </div>

          <div className="section">
            <h3>Checklist</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Check</th>
                  <th>Checked by</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {suite.tests.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 18 }}>{t.label}</div>
                      <div className="small muted">{TYPE_TEXT[t.type]}</div>
                      <div className="quote" style={{ marginTop: 4 }}>
                        "{t.evidence}"
                      </div>
                      {t.probes.length > 0 && (
                        <ul className="probe-list">
                          {t.probes.map((p) => (
                            <li key={p.id}>
                              {p.question} <span className="muted">Passes on {p.pass}.</span>
                              {t.probeStats?.[p.id] && (
                                <span className="muted">
                                  {" "}
                                  Reliable in {Math.round(t.probeStats[p.id].reliability * 100)}% of test runs
                                  {t.probeStats[p.id].rewritten ? ", rewritten once" : ""}.
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td>
                      {t.type === "ATTESTATION" ? (
                        <OracleTag oracle="HUMAN" />
                      ) : (
                        <select
                          aria-label={`Who checks ${t.label}`}
                          value={t.oracle}
                          onChange={(e) => setOracle(t.id, e.target.value as Oracle)}
                          style={{ width: "auto" }}
                        >
                          <option value="DEVICE">On device</option>
                          <option value="CLOUD">Cloud</option>
                        </select>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn quiet" onClick={() => removeTest(t.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="actions">
              <input
                type="text"
                aria-label="Add something you will confirm by hand"
                placeholder="Add something you will confirm by hand, for example: size M"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addManual()}
                style={{ flex: 1, minWidth: 260 }}
              />
              <button className="btn" onClick={addManual} disabled={!manual.trim()}>
                Add check
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
