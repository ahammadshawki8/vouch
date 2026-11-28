/** Camera access and frame capture for the pack station. */

export async function startCamera(video: HTMLVideoElement, deviceId?: string): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: deviceId
      ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
      : { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();
  return stream;
}

export function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

export async function listCameras(): Promise<MediaDeviceInfo[]> {
  const all = await navigator.mediaDevices.enumerateDevices();
  return all.filter((d) => d.kind === "videoinput");
}

export type FrameSource = HTMLVideoElement | HTMLImageElement;

export function sourceSize(el: FrameSource): { w: number; h: number } {
  if (el instanceof HTMLVideoElement) return { w: el.videoWidth, h: el.videoHeight };
  return { w: el.naturalWidth, h: el.naturalHeight };
}

/** Capture the current frame as base64 JPEG (no data: prefix), scaled to `maxWidth`. */
export function captureJpeg(video: FrameSource, maxWidth = 768, quality = 0.82): string {
  const size = sourceSize(video);
  if (!size.w || !size.h) throw new Error("The camera has no picture yet.");
  const scale = Math.min(1, maxWidth / size.w);
  const w = Math.round(size.w * scale);
  const h = Math.round(size.h * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.drawImage(video, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality).split(",")[1];
}

/** Tiny RGBA thumbnail for the motion gate. */
export function captureThumb(video: FrameSource, canvas: HTMLCanvasElement, w = 64, h = 48): Uint8ClampedArray {
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || !sourceSize(video).w) return new Uint8ClampedArray();
  ctx.drawImage(video, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h).data;
}
