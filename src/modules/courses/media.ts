import path from "node:path";

/** Lecture uploads live outside /public, so every byte goes through the access-checked media route. */
export const UPLOAD_ROOT = path.join(process.cwd(), "data", "uploads", "courses");

export const UPLOAD_KINDS = {
  video: { maxBytes: 300 * 1024 * 1024, types: { "video/mp4": "mp4", "video/webm": "webm" } as Record<string, string> },
  pdf: { maxBytes: 25 * 1024 * 1024, types: { "application/pdf": "pdf" } as Record<string, string> },
} as const;
export type UploadKind = keyof typeof UPLOAD_KINDS;

export const MIME_BY_EXT: Record<string, string> = { mp4: "video/mp4", webm: "video/webm", pdf: "application/pdf" };

/** Checks the file really is what its content type claims, from its first bytes. */
export function magicMatches(ext: string, head: Uint8Array) {
  const ascii = (from: number, to: number) => String.fromCharCode(...head.subarray(from, to));
  if (ext === "pdf") return ascii(0, 4) === "%PDF";
  if (ext === "mp4") return ascii(4, 8) === "ftyp";
  if (ext === "webm") return head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3;
  return false;
}

export const FILE_RE = /^[0-9a-f-]{36}\.(mp4|webm|pdf)$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
