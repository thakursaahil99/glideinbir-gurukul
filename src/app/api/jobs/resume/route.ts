import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { getCurrentUser } from "@/core/auth/current";
import { rateLimit } from "@/core/security/rate-limit";
import { isPdf, MAX_RESUME_BYTES, resumePath } from "@/modules/jobs/media";
import { jobsEnabled } from "@/modules/jobs/service";
import { getProfile, upsertProfile } from "@/modules/jobs/store";

/** PUT the resume PDF (≤ 5 MB) as the raw body; it replaces the profile's resume. */
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || !(await jobsEnabled())) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  if (!rateLimit(`jresume:${user.id}`, 10, 10 * 60_000).ok) return NextResponse.json({ error: "Too many uploads, slow down" }, { status: 429 });
  if ((req.headers.get("content-type") ?? "").split(";")[0]!.trim() !== "application/pdf") return NextResponse.json({ error: "Upload your resume as a PDF" }, { status: 415 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_RESUME_BYTES) return NextResponse.json({ error: "Resume must be under 5 MB" }, { status: 413 });

  const reader = req.body?.getReader();
  if (!reader) return NextResponse.json({ error: "Empty file" }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESUME_BYTES) {
      await reader.cancel();
      return NextResponse.json({ error: "Resume must be under 5 MB" }, { status: 413 });
    }
    chunks.push(value);
  }
  const buf = Buffer.concat(chunks);
  if (!buf.length || !isPdf(buf)) return NextResponse.json({ error: "That file isn't a real PDF" }, { status: 415 });
  try {
    await PDFDocument.load(buf, { updateMetadata: false });
  } catch {
    return NextResponse.json({ error: "Couldn't open this PDF. It may be password-protected or damaged." }, { status: 415 });
  }

  const name = (new URL(req.url).searchParams.get("name") ?? "resume.pdf").replace(/[^\w .()-]/g, "").slice(0, 80) || "resume.pdf";
  const file = `${randomUUID()}.pdf`;
  const target = resumePath(user.id, file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buf);
  const old = (await getProfile(user.id))?.resume?.file;
  await upsertProfile(user.id, (p) => ({
    userId: user.id,
    headline: p?.headline ?? "",
    skills: p?.skills ?? [],
    experience: p?.experience ?? "fresher",
    location: p?.location ?? "",
    about: p?.about ?? "",
    links: p?.links ?? {},
    resume: { file, name, bytes: buf.length, updatedAt: new Date().toISOString() },
    updatedAt: "",
  }));
  // Applications keep their own copies, so the old file can go.
  if (old && old !== file) await fs.rm(resumePath(user.id, old), { force: true });
  return NextResponse.json({ ok: true, name, bytes: buf.length });
}

/** Your own current resume. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const r = (await getProfile(user.id))?.resume;
  if (!r) return NextResponse.json({ error: "No resume yet" }, { status: 404 });
  try {
    const body = await fs.readFile(resumePath(user.id, r.file));
    return new NextResponse(new Uint8Array(body), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${r.name.replace(/"/g, "")}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
