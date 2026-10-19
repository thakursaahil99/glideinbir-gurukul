import path from "node:path";

/** Doubt images live outside /public and are only served by the access-checked media route. */
export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads", "doubts");
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES: Record<string, "png" | "jpg" | "webp"> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
export const IMAGE_MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

/** Real image check from the first bytes, so a renamed file can't pass as a picture. */
export function imageMagicOk(ext: string, b: Uint8Array) {
  if (ext === "png") return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  if (ext === "jpg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (ext === "webp") return String.fromCharCode(...b.subarray(0, 4)) === "RIFF" && String.fromCharCode(...b.subarray(8, 12)) === "WEBP";
  return false;
}
