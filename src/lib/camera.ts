/**
 * Front-camera capture helpers. The preview is mirrored (selfie view) but the
 * captured still is un-mirrored so text in the scene reads correctly.
 */

export interface CapturedPhoto {
  /** Off-screen canvas holding the still, usable directly by the compositor. */
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export async function startCamera(deviceId?: string): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera API unavailable (needs HTTPS or localhost)");
  }
  const video: MediaTrackConstraints = deviceId
    ? { deviceId: { exact: deviceId } }
    : { facingMode: "user" };
  // Request the highest resolution the front camera will give us.
  video.width = { ideal: 1920 };
  video.height = { ideal: 1080 };
  return navigator.mediaDevices.getUserMedia({ video, audio: false });
}

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}

/** Grab a still from a playing <video>, un-mirrored, at native resolution. */
export function capturePhoto(video: HTMLVideoElement): CapturedPhoto {
  const width = video.videoWidth;
  const height = video.videoHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");
  // Un-mirror: the preview was flipped horizontally for selfie view, so flip
  // back here to store a true-to-life image.
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, width, height);
  return { canvas, width, height };
}

export async function listCameras(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === "videoinput");
}
