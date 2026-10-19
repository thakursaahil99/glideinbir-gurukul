import { createHmac, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { NoteItem } from "./types";

/** Notes live outside /public; every byte goes through an access-checked route. */
export const NOTES_DIR = path.join(process.cwd(), "data", "uploads", "notes");
export const MAX_PDF_BYTES = 30 * 1024 * 1024;
export const MAX_COVER_BYTES = 3 * 1024 * 1024;
export const COVER_TYPES: Record<string, "png" | "jpg" | "webp"> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
export const COVER_MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };
export const FILE_RE = /^[0-9a-f-]{36}\.(pdf|png|jpg|webp)$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const notePath = (noteId: string, file: string) => path.join(NOTES_DIR, noteId, file);

export function magicOk(ext: string, b: Uint8Array) {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (ext === "pdf") return ascii(0, 5) === "%PDF-";
  if (ext === "png") return b[0] === 0x89 && ascii(1, 4) === "PNG";
  if (ext === "jpg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (ext === "webp") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  return false;
}

/** Page count of a real, unencrypted PDF; throws for anything else. */
export async function inspectPdf(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const pages = doc.getPageCount();
  if (pages < 1) throw new Error("empty");
  return pages;
}

/**
 * First N pages with a "preview" band, cached next to the original. The cache name
 * includes the file id and N, so a new upload or a new preview length rebuilds it.
 */
export async function previewPdf(n: Pick<NoteItem, "id" | "file" | "previewPages" | "pages">) {
  if (!n.file) throw new Error("no file");
  const count = Math.min(n.previewPages, n.pages);
  const cached = notePath(n.id, `preview-${count}-${n.file}`);
  try {
    return await fs.readFile(cached);
  } catch {}
  const src = await PDFDocument.load(await fs.readFile(notePath(n.id, n.file)), { updateMetadata: false });
  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.HelveticaBold);
  const pages = await out.copyPages(src, Array.from({ length: count }, (_, i) => i));
  for (const p of pages) {
    out.addPage(p);
    const { width } = p.getSize();
    p.drawRectangle({ x: 0, y: 0, width, height: 22, color: rgb(0.36, 0.28, 1), opacity: 0.92 });
    p.drawText(`FREE PREVIEW · ${count} of ${n.pages} pages · Buy the full notes on Glideinbir Gurukul`, { x: 12, y: 7, size: 9, font, color: rgb(1, 1, 1) });
  }
  const bytes = await out.save();
  await fs.writeFile(cached, bytes);
  return Buffer.from(bytes);
}

/** The full PDF stamped with the buyer on every page, so leaked copies can be traced. */
export async function watermarkedPdf(n: Pick<NoteItem, "id" | "file">, rawStamp: string) {
  if (!n.file) throw new Error("no file");
  // Standard PDF fonts only cover Latin-1; drop anything else (e.g. a Devanagari name) instead of failing.
  const stamp = rawStamp.replace(/[^\x20-\x7e]/g, "").replace(/\s+/g, " ").trim();
  const doc = await PDFDocument.load(await fs.readFile(notePath(n.id, n.file)), { updateMetadata: false });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const p of doc.getPages()) {
    const { width, height } = p.getSize();
    p.drawText(stamp, { x: 12, y: 8, size: 7, font, color: rgb(0.45, 0.45, 0.5), opacity: 0.8 });
    p.drawText(stamp, { x: width / 2 - font.widthOfTextAtSize(stamp, 13) / 2, y: height / 2, size: 13, font, color: rgb(0.5, 0.5, 0.55), opacity: 0.12, rotate: degrees(30) });
  }
  return Buffer.from(await doc.save());
}

/* ---------------- Signed download links ---------------- */

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET (32+ chars) is missing");
  return s;
}
const sign = (noteId: string, userId: string, exp: number) => createHmac("sha256", secret()).update(`notes-dl:${noteId}:${userId}:${exp}`).digest("base64url");

export function signDownload(noteId: string, userId: string, ttlMs: number, now = Date.now()) {
  const exp = now + ttlMs;
  return `/api/notes/file/${noteId}?exp=${exp}&sig=${sign(noteId, userId, exp)}`;
}

/** The link must be unexpired, untampered and used by the same signed-in user it was made for. */
export function verifyDownload(noteId: string, userId: string, exp: string | null, sig: string | null, now = Date.now()) {
  const e = Number(exp);
  if (!sig || !Number.isFinite(e) || e < now) return false;
  const want = Buffer.from(sign(noteId, userId, e));
  const got = Buffer.from(sig);
  return got.length === want.length && timingSafeEqual(got, want);
}
