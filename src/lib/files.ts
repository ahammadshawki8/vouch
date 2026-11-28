import type { Source, SourceKind } from "../core/types";

const MAX_IMAGE_EDGE = 1600;

/** Read a dropped file into a Source. Images are downscaled and re-encoded as JPEG. */
export async function fileToSource(file: File, id: string): Promise<Source> {
  if (file.type.startsWith("audio/")) {
    return { id, kind: "audio", name: file.name, mimeType: file.type, data: await toBase64(file) };
  }
  if (file.type.startsWith("image/")) {
    const data = await downscale(file);
    return { id, kind: guessKind(file.name), name: file.name, mimeType: "image/jpeg", data };
  }
  if (file.type.startsWith("text/") || file.name.endsWith(".txt")) {
    return { id, kind: "text", name: file.name, mimeType: "text/plain", data: await file.text() };
  }
  throw new Error(`${file.name}: only images, voice notes and text files can be added.`);
}

/** Chat screenshots are usually tall phone captures; product photos are not. */
function guessKind(name: string): SourceKind {
  return /screen|chat|whatsapp|messenger|img_\d+_\d+/i.test(name) ? "screenshot" : "product";
}

export function toBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

async function downscale(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
}

export function dataUrl(s: Pick<Source, "mimeType" | "data">): string {
  return `data:${s.mimeType};base64,${s.data}`;
}

export function textSource(id: string, text: string): Source {
  return { id, kind: "text", name: "Pasted chat", mimeType: "text/plain", data: text };
}
