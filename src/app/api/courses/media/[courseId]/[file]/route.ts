import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/current";
import { viewerOf } from "@/modules/courses/access";
import { allLectures, canAccessLecture } from "@/modules/courses/logic";
import { FILE_RE, MIME_BY_EXT, UPLOAD_ROOT, UUID_RE } from "@/modules/courses/media";
import { getCourse } from "@/modules/courses/store";

/**
 * Streams an uploaded lecture video or notes PDF, only to people allowed to see
 * that lecture (enrolled, owner/admin, or a free-preview lecture). Supports
 * Range requests so videos can seek. Responses are private and never cached publicly.
 */
export async function GET(req: Request, { params }: { params: Promise<{ courseId: string; file: string }> }) {
  const { courseId, file } = await params;
  if (!UUID_RE.test(courseId) || !FILE_RE.test(file)) return new NextResponse("Not found", { status: 404 });

  const [course, user] = await Promise.all([getCourse(courseId), getCurrentUser()]);
  if (!course) return new NextResponse("Not found", { status: 404 });

  const viewer = await viewerOf(course, user);
  const lecture = allLectures(course).find((l) => (l.video?.kind === "upload" && l.video.src === file) || l.notes?.src === file);
  // Owners can preview files they uploaded but haven't attached yet.
  const allowed = viewer.isOwnerOrAdmin || (lecture ? canAccessLecture(lecture, viewer) : false);
  if (!allowed) return new NextResponse(user ? "Enroll to watch this lecture" : "Sign in to continue", { status: user ? 403 : 401 });

  const full = path.join(UPLOAD_ROOT, course.id, file);
  let size: number;
  try {
    size = (await fs.stat(full)).size;
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = file.split(".").pop()!;
  const headers: Record<string, string> = {
    "Content-Type": MIME_BY_EXT[ext]!,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (ext === "pdf") {
    const name = (lecture?.notes?.name ?? "notes").replace(/[^\w.\- ]/g, "_");
    headers["Content-Disposition"] = `inline; filename="${name.endsWith(".pdf") ? name : `${name}.pdf`}"`;
  }

  const range = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range) {
    let start = range[1] ? Number(range[1]) : NaN;
    let end = range[2] ? Number(range[2]) : size - 1;
    if (Number.isNaN(start)) {
      start = Math.max(0, size - end); // suffix range: last N bytes
      end = size - 1;
    }
    end = Math.min(end, size - 1);
    if (start > end || start >= size) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    const stream = Readable.toWeb(createReadStream(full, { start, end })) as ReadableStream;
    return new NextResponse(stream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }

  const stream = Readable.toWeb(createReadStream(full)) as ReadableStream;
  return new NextResponse(stream, { headers: { ...headers, "Content-Length": String(size) } });
}
