import { useRef, useState } from "react";
import type { Order, Source, SourceKind } from "../core/types";
import { compileOrder } from "../ai/compiler";
import { firebaseConfigured } from "../firebase/app";
import { dataUrl, fileToSource, textSource } from "../lib/files";
import { newId, repo } from "../data/repo";
import { go } from "../router";

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const counter = useRef(1);

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

  const sources = (): Source[] => {
    const all = [...files];
    if (chat.trim()) all.push(textSource(`S${counter.current}`, chat.trim()));
    return all;
  };

  const compile = async () => {
    setBusy(true);
    setError(null);
    const now = Date.now();
    const order: Order = {
      id: newId("ord"),
      title: title.trim() || `Order ${new Date(now).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`,
      createdAt: now,
      updatedAt: now,
      status: "draft",
      sources: sources(),
    };
    try {
      await repo().saveOrder(order);
      const result = await compileOrder(order.sources);
      await repo().saveOrder({ ...order, status: "compiled", suite: result.suite });
      sessionStorage.setItem(`warnings:${order.id}`, JSON.stringify(result.warnings));
      go({ name: "review", id: order.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const canCompile = (files.length > 0 || chat.trim().length > 0) && !busy && firebaseConfigured;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>New order</h1>
          <p>
            Add everything the customer sent you. Vouch reads it in the cloud, works out the final order and turns it
            into checks for the packing table.
          </p>
        </div>
      </div>

      {!firebaseConfigured && (
        <div className="notice error" style={{ marginBottom: 24 }}>
          <p>Firebase is not configured. Copy .env.example to .env.local, add your web app config and restart.</p>
        </div>
      )}

      <div className="intake">
        <div>
          <div
            className={`dropzone${over ? " over" : ""}`}
            role="button"
            tabIndex={0}
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
            <strong>Drop chat screenshots, product photos or voice notes</strong>
            <span className="muted">Or click to choose files. Images and audio both work.</span>
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
                      <audio controls src={dataUrl(s)} style={{ width: "100%" }} />
                    ) : s.kind === "text" ? (
                      <span className="small muted">Text</span>
                    ) : (
                      <img src={dataUrl(s)} alt={s.name} />
                    )}
                  </div>
                  <div className="meta">
                    <span>
                      <span className="sid">{s.id}</span> <span className="muted">{s.name}</span>
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
                    <button className="btn quiet small" onClick={() => remove(s.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <div className="field">
            <label htmlFor="title">Order name</label>
            <input
              id="title"
              type="text"
              value={title}
              placeholder="For example: Maya, 3 items, Thursday"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="chat">Chat messages</label>
            <textarea
              id="chat"
              value={chat}
              placeholder={"Paste the conversation, in any language.\n\nOne blue notebook, two black pens and a yellow highlighter please\nactually make the notebook green"}
              onChange={(e) => setChat(e.target.value)}
            />
            <span className="hint">Customer names and phone numbers are not needed. You can leave them out.</span>
          </div>

          {error && (
            <div className="notice error">
              <p>{error}</p>
            </div>
          )}

          <div className="actions">
            <button className="btn primary big" disabled={!canCompile} onClick={compile}>
              {busy ? "Reading the conversation" : "Build the checklist"}
            </button>
            {busy && <span className="muted small">Cloud model is resolving changes and writing checks.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
