import { randomUUID } from "node:crypto";
import { createWriteStream, promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/current";
import { rateLimit } from "@/core/security/rate-limit";
import { maxPreview } from "@/modules/notes/logic";
import { COVER_TYPES, inspectPdf, magicOk, MAX_COVER_BYTES, MAX_PDF_BYTES, NOTES_DIR, UUID_RE } from "@/modules/notes/media";
import { activeVendor, notesEnabled } from "@/modules/notes/service";
import { changeNote, getNote } from "@/modules/notes/store";

/**
 * PUT /api/notes/upload?noteId=…&kind=pdf|cover with the raw file as the body.
 * Streams to disk with a size cap and a magic-byte check; PDFs must open and have pages.
 * On success the note points at the new file and the old one is removed.
 */
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || !(await notesEnabled()) || !(await activeVendor(user.id))) return NextResponse.json({ error: "Only approved sellers can upload" }, { status: 403 });
  if (!rateLimit(`nupload:${user.id}`, 40, 10 * 60_000).ok) return NextResponse.json({ error: "Too many uploads, slow down" }, { status: 429 });

  const url = new URL(req.url);
  const noteId = url.searchParams.get("noteId") ?? "";
  const kind = url.searchParams.get("kind");
  if (!UUID_RE.test(noteId) || (kind !== "pdf" && kind !== "cover")) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const note = await getNote(noteId);
  if (!note || note.vendorId !== user.id) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const type = (req.headers.get("content-type") ?? "").split(";")[0]!.trim();
  const ext = kind === "pdf" ? (type === "application/pdf" ? "pdf" : null) : COVER_TYPES[type];
  if (!ext) return NextResponse.json({ error: kind === "pdf" ? "Upload a PDF file" : "Use a PNG, JPG or WebP image" }, { status: 415 });
  const max = kind === "pdf" ? MAX_PDF_BYTES : MAX_COVER_BYTES;
  const tooBig = `File is too large (max ${max / 1024 / 1024} MB)`;
  if (Number(req.headers.get("content-length") ?? 0) > max) return NextResponse.json({ error: tooBig }, { status: 413 });
  if (!req.body) return NextResponse.json({ error: "Empty file" }, { status: 400 });

  const dir = path.join(NOTES_DIR, note.id);
  await fs.mkdir(dir, { recursive: true });
  const file = `${randomUUID()}.${ext}`;
  const target = path.join(dir, file);
  const out = createWriteStream(target);
  const fail = async (status: number, error: string) => {
    out.destroy();
    await fs.rm(target, { force: true });
    return NextResponse.json({ error }, { status });
  };

  let bytes = 0;
  let head = new Uint8Array(0);
  try {
    const reader = req.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > max) {
        await reader.cancel();
        return fail(413, tooBig);
      }
      if (head.length < 16) {
        head = Uint8Array.from([...head, ...value.subarray(0, 16 - head.length)]);
        if (head.length >= 12 && !magicOk(ext, head)) {
          await reader.cancel();
          return fail(415, kind === "pdf" ? "That file isn't a real PDF" : "That file isn't a real image");
        }
      }
      if (!out.write(value)) await new Promise<void>((r) => out.once("drain", () => r()));
    }
    await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())));
  } catch {
    return fail(500, "Upload failed");
  }
  if (bytes === 0 || !magicOk(ext, head)) return fail(415, "That file is empty or not the right type");

  let pages = 0;
  if (kind === "pdf") {
    try {
      pages = await inspectPdf(await fs.readFile(target));
    } catch {
      return fail(415, "Couldn't open this PDF. It may be password-protected or damaged.");
    }
  }

  const res = await changeNote(
    note.id,
    (x) => (x.vendorId === user.id ? null : "Not allowed"),
    (x) => (kind === "pdf" ? { ...x, file, pages, bytes, previewPages: Math.min(Math.max(1, x.previewPages), maxPreview(pages, x.price)) } : { ...x, cover: file }),
  );
  if (!res.ok) return fail(409, res.error);

  // Old file (and any cached previews of it) are no longer referenced.
  const old = kind === "pdf" ? note.file : note.cover;
  for (const name of await fs.readdir(dir)) if (old && (name === old || name.endsWith(`-${old}`))) await fs.rm(path.join(dir, name), { force: true });
  return NextResponse.json({ file, pages, bytes, previewPages: res.value.previewPages });
}
