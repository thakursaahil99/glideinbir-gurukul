import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/current";
import { isListed } from "@/modules/notes/logic";
import { previewPdf, UUID_RE } from "@/modules/notes/media";
import { hasAccess, notesEnabled } from "@/modules/notes/service";
import { getNote, getVendor } from "@/modules/notes/store";

/** The free first pages, for anyone signed in (only the preview pages ever leave the server here). */
export async function GET(_req: Request, { params }: { params: Promise<{ noteId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const { noteId } = await params;
  const n = UUID_RE.test(noteId) && (await notesEnabled()) ? await getNote(noteId) : null;
  if (!n?.file || (!isListed(n, await getVendor(n.vendorId)) && !(await hasAccess(user, n)))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const body = await previewPdf(n);
    return new NextResponse(new Uint8Array(body), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline; filename=preview.pdf", "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" },
    });
  } catch (e) {
    console.error("[notes] preview failed", e);
    return NextResponse.json({ error: "Preview unavailable" }, { status: 500 });
  }
}
