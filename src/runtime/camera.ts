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

/** Capture the current frame as base64 JPEG (no data: prefix), scaled to `maxWidth`. */
export function captureJpeg(video: HTMLVideoElement, maxWidth = 768, quality = 0.82): string {
  const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
  const w = Math.round((video.videoWidth || maxWidth) * scale);
  const h = Math.round((video.videoHeight || maxWidth * 0.75) * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.drawImage(video, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality).split(",")[1];
}

/** Tiny RGBA thumbnail for the motion gate. */
export function captureThumb(video: HTMLVideoElement, canvas: HTMLCanvasElement, w = 64, h = 48): Uint8ClampedArray {
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || !video.videoWidth) return new Uint8ClampedArray();
  ctx.drawImage(video, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h).data;
}
