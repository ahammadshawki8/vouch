import { useEffect, useRef, useState } from "react";
import type { Order, Source, SourceKind } from "../core/types";
import { compileOrder } from "../ai/compiler";
import { firebaseConfigured } from "../firebase/app";
import { dataUrl, fileToSource, textSource } from "../lib/files";
import { newId, repo } from "../data/repo";
import { go } from "../router";
import { DotArrow, Sticker } from "../components/Brand";
import { SAMPLE_CHAT, SAMPLE_PHOTOS, SAMPLE_TITLE, drawNotebookPhoto, takeSample } from "../lib/demo";

const KIND_TEXT: Record<SourceKind, string> = {
  screenshot: "Chat screenshot",
  product: "Product photo",
  audio: "Voice note",
  text: "Chat text",
};

export function NewOrder() {
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<Source[]>([]);
  const [chat, setChat] = useState("");
  const [over, setOver] = useState(false);
  const [busySince, setBusySince] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const counter = useRef(1);

  const useSample = () => {
    setTitle(SAMPLE_TITLE);
    setChat(SAMPLE_CHAT);
    setFiles(
      SAMPLE_PHOTOS.map((color, i) => ({
        id: `S${i + 1}`,
        kind: "product",
        name: `notebook-${color}.jpg`,
        mimeType: "image/jpeg",
        data: drawNotebookPhoto(color).split(",")[1],
      })),
    );
    counter.current = SAMPLE_PHOTOS.length + 1;
  };
  useEffect(() => {
    if (takeSample()) useSample();
  }, []);

  useEffect(() => {
    if (busySince === null) return;
    const t = window.setInterval(() => setElapsed(Math.round((Date.now() - busySince) / 1000)), 250);
    return () => window.clearInterval(t);
  }, [busySince]);

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    setError(null);
    const added: Source[] = [];
    for (const f of Array.from(list)) {
      try {
        added.push(await fileToSource(f, `S${counter.current++}`));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    setFiles((prev) => [...prev, ...added]);
  };

  const setKind = (id: string, kind: SourceKind) =>
    setFiles((prev) => prev.map((s) => (s.id === id ? { ...s, kind } : s)));
  const remove = (id: string) => setFiles((prev) => prev.filter((s) => s.id !== id));

  const compile = async () => {
    setBusySince(Date.now());
    setElapsed(0);
    setError(null);
    const now = Date.now();
    const sources = [...files];
    if (chat.trim()) sources.push(textSource(`S${counter.current}`, chat.trim()));
    const order: Order = {
      id: newId("ord"),
      title: title.trim() || `Order of ${new Date(now).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`,
      createdAt: now,
      updatedAt: now,
      status: "draft",
      sources,
    };
    try {
      await repo().saveOrder(order);
      const result = await compileOrder(order.sources);
      await repo().saveOrder({ ...order, status: "compiled", suite: result.suite });
      sessionStorage.setItem(`warnings:${order.id}`, JSON.stringify(result.warnings));
      go({ name: "review", id: order.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusySince(null);
    }
  };

  const busy = busySince !== null;
  const ready = files.length > 0 || chat.trim().length > 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">New order</h1>
          <p className="page-lede">
            Give Vouch everything the customer sent. It works out the final order and turns it into checks for the
            packing table.
          </p>
        </div>
      </div>

      {!firebaseConfigured && (
        <div className="note error" style={{ marginBottom: 24 }}>
          Firebase is not configured. Copy .env.example to .env.local, add the web app config and restart.
        </div>
      )}

      <div className="intake">
        <div>
          <div
            className={`dropzone${over ? " over" : ""}`}
            role="button"
            tabIndex={0}
            aria-label="Add chat screenshots, product photos or voice notes"
            onClick={() => input.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              void addFiles(e.dataTransfer.files);
            }}
          >
            <span className="strip" aria-hidden="true" />
            <span className="label-sticker">
              <Sticker tilt={6} tone="paper">
                Drop or click
              </Sticker>
            </span>
            <strong>Drop the whole conversation here</strong>
            <span className="muted">Phone screenshots work best. Add the product photos you showed the customer.</span>
            <div className="kinds" aria-hidden="true">
              <span>Chat screenshots</span>
              <span>Product photos</span>
              <span>Voice notes</span>
            </div>
            <input
              ref={input}
              type="file"
              accept="image/*,audio/*,.txt"
              multiple
              hidden
              onChange={(e) => {
                void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {files.length > 0 && (
            <div className="sources">
              {files.map((s) => (
                <div className="source" key={s.id}>
                  <div className="thumb">
                    {s.kind === "audio" ? (
                      <audio controls src={dataUrl(s)} style={{ width: "92%" }} />
                    ) : s.kind === "text" ? (
                      <span className="small muted">Text</span>
                    ) : (
                      <img src={dataUrl(s)} alt={s.name} />
                    )}
                  </div>
                  <div className="meta">
                    <span>
                      <span className="sid">{s.id}</span> <span className="faint">{s.name}</span>
                    </span>
                    {s.kind === "screenshot" || s.kind === "product" ? (
                      <select
                        aria-label={`What ${s.id} shows`}
                        value={s.kind}
                        onChange={(e) => setKind(s.id, e.target.value as SourceKind)}
                      >
                        <option value="screenshot">{KIND_TEXT.screenshot}</option>
                        <option value="product">{KIND_TEXT.product}</option>
                      </select>
                    ) : (
                      <span className="muted">{KIND_TEXT[s.kind]}</span>
                    )}
                    <button className="btn ghost small" onClick={() => remove(s.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="compose">
          <div className="field">
            <label htmlFor="title">Order name</label>
            <input
              id="title"
              type="text"
              value={title}
              placeholder="Maya, stationery gift"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="field">
            <div className="label-row">
              <label htmlFor="chat">Or paste the messages</label>
              <button type="button" className="text-btn" onClick={useSample}>
                Use the sample order
              </button>
            </div>
            <textarea
              id="chat"
              value={chat}
              placeholder={"Any language, as it was written.\n\nhi! one blue notebook, two black pens and a yellow highlighter\nwait, notebook ta green kore dao, blue na"}
              onChange={(e) => setChat(e.target.value)}
            />
            <span className="hint">Leave out phone numbers and addresses. Vouch only needs what goes in the box.</span>
          </div>

          {error && <div className="note error">{error}</div>}

          <button className="btn primary big wide" disabled={!ready || busy || !firebaseConfigured} onClick={compile}>
            {busy ? `Reading the conversation, ${elapsed}s` : "Build the checklist"}
            <DotArrow />
          </button>
          <p className="small muted">
            {busy
              ? "Gemini is resolving changes and writing the checks. This usually takes a few seconds."
              : "Runs once in the cloud. Everything after this works on your device."}
          </p>
        </div>
      </div>
    </div>
  );
}
