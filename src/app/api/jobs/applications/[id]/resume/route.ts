import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/current";
import { applicationResumePath, UUID_RE } from "@/modules/jobs/media";
import { getApplication, getCompany } from "@/modules/jobs/store";

/** The resume sent with an application: for the candidate, the hiring company's owner, or an admin. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const { id } = await params;
  const a = UUID_RE.test(id) ? await getApplication(id) : null;
  const company = a ? await getCompany(a.companyId) : null;
  if (!a || !(a.userId === user.id || company?.ownerId === user.id || user.role === "admin")) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const body = await fs.readFile(applicationResumePath(a.id));
    const name = `${a.userName.replace(/[^\w ]/g, "").trim().replace(/\s+/g, "-") || "candidate"}-resume.pdf`;
    return new NextResponse(new Uint8Array(body), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${name}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
