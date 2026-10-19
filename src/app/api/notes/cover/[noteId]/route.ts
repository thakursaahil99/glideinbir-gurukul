import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/current";
import { COVER_MIME, notePath, UUID_RE } from "@/modules/notes/media";
import { getNote } from "@/modules/notes/store";

/** Cover images for signed-in users. Not secret, but kept out of /public with the PDFs. */
export async function GET(_req: Request, { params }: { params: Promise<{ noteId: string }> }) {
  if (!(await getCurrentUser())) return new NextResponse(null, { status: 401 });
  const { noteId } = await params;
  const n = UUID_RE.test(noteId) ? await getNote(noteId) : null;
  if (!n?.cover) return new NextResponse(null, { status: 404 });
  try {
    const body = await fs.readFile(notePath(n.id, n.cover));
    return new NextResponse(body, { headers: { "Content-Type": COVER_MIME[n.cover.split(".").pop()!] ?? "application/octet-stream", "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
