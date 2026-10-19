import { randomUUID } from "node:crypto";
import { createWriteStream, promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/current";
import { rateLimit } from "@/core/security/rate-limit";
import { canTeach, ownsOrAdmin } from "@/modules/courses/access";
import { magicMatches, UPLOAD_KINDS, UPLOAD_ROOT, UUID_RE, type UploadKind } from "@/modules/courses/media";
import { getCourse } from "@/modules/courses/store";

/**
 * PUT /api/courses/upload?courseId=…&kind=video|pdf with the raw file as the body.
 * Streams to disk with a hard size cap and a magic-byte check, then returns the file id
 * that the course editor stores on the lecture.
 */
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || !canTeach(user)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  if (!rateLimit(`upload:${user.id}`, 30, 10 * 60_000).ok) return NextResponse.json({ error: "Too many uploads, slow down" }, { status: 429 });

  const url = new URL(req.url);
  const courseId = url.searchParams.get("courseId") ?? "";
  const kind = url.searchParams.get("kind") as UploadKind;
  if (!UUID_RE.test(courseId) || !(kind in UPLOAD_KINDS)) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const course = await getCourse(courseId);
  if (!course || !ownsOrAdmin(course, user)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const rule = UPLOAD_KINDS[kind];
  const type = (req.headers.get("content-type") ?? "").split(";")[0]!.trim();
  const ext = rule.types[type];
  if (!ext) return NextResponse.json({ error: kind === "pdf" ? "Only PDF files" : "Only MP4 or WebM video" }, { status: 415 });
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > rule.maxBytes) return NextResponse.json({ error: `File is too large (max ${rule.maxBytes / 1024 / 1024} MB)` }, { status: 413 });
  if (!req.body) return NextResponse.json({ error: "Empty file" }, { status: 400 });

  const dir = path.join(UPLOAD_ROOT, course.id);
  await fs.mkdir(dir, { recursive: true });
  const file = `${randomUUID()}.${ext}`;
  const target = path.join(dir, file);
  const out = createWriteStream(target);

  let bytes = 0;
  let checked = false;
  const fail = async (status: number, error: string) => {
    out.destroy();
    await fs.rm(target, { force: true });
    return NextResponse.json({ error }, { status });
  };

  try {
    const reader = req.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > rule.maxBytes) {
        await reader.cancel();
        return fail(413, `File is too large (max ${rule.maxBytes / 1024 / 1024} MB)`);
      }
      if (!checked) {
        if (!magicMatches(ext, value)) {
          await reader.cancel();
          return fail(415, "That file doesn't look like a real " + ext.toUpperCase());
        }
        checked = true;
      }
      if (!out.write(value)) await new Promise<void>((r) => out.once("drain", () => r()));
    }
    await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())));
  } catch {
    return fail(500, "Upload failed");
  }
  if (bytes === 0) return fail(400, "Empty file");
  return NextResponse.json({ file, bytes });
}
