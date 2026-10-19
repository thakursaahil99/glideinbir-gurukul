import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/current";
import { slugTitle } from "@/modules/notes/logic";
import { UUID_RE, verifyDownload, watermarkedPdf } from "@/modules/notes/media";
import { hasAccess } from "@/modules/notes/service";
import { getNote } from "@/modules/notes/store";

/**
 * Full download behind a short-lived signed link (made by downloadLinkAction). The link
 * only works for the user it was signed for, and access is checked again here.
 * Every copy carries the buyer's name and email.
 */
export async function GET(req: Request, { params }: { params: Promise<{ noteId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const { noteId } = await params;
  const url = new URL(req.url);
  if (!UUID_RE.test(noteId) || !verifyDownload(noteId, user.id, url.searchParams.get("exp"), url.searchParams.get("sig")))
    return NextResponse.json({ error: "This download link has expired. Go back and press Download again." }, { status: 403 });
  const n = await getNote(noteId);
  if (!n?.file || !(await hasAccess(user, n))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const stamp = `Licensed to ${user.name} <${user.email}> · ${new Date().toISOString().slice(0, 10)} · Glideinbir Gurukul · Do not share`;
    const body = await watermarkedPdf(n, stamp);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${slugTitle(n.title)}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error("[notes] download failed", e);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
