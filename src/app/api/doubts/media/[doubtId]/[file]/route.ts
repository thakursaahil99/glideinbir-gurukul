import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/current";
import { IMAGE_MIME, UPLOAD_DIR } from "@/modules/doubts/media";
import { isTutorRole } from "@/modules/doubts/service";
import { getDoubt } from "@/modules/doubts/store";

/** A doubt's image, for its learner, its tutor, or any tutor while the request is open. */
export async function GET(_req: Request, { params }: { params: Promise<{ doubtId: string; file: string }> }) {
  const { doubtId, file } = await params;
  if (!/^[0-9a-f-]{36}$/.test(doubtId) || !/^[0-9a-f-]{36}\.(png|jpg|webp)$/.test(file)) return new NextResponse("Not found", { status: 404 });
  const [user, d] = await Promise.all([getCurrentUser(), getDoubt(doubtId)]);
  if (!user || !d || d.image !== file) return new NextResponse("Not found", { status: 404 });
  if (!(d.studentId === user.id || d.tutorId === user.id || (d.status === "requested" && isTutorRole(user)))) return new NextResponse("Not allowed", { status: 403 });
  try {
    const buf = await fs.readFile(path.join(UPLOAD_DIR, d.id, file));
    return new NextResponse(buf, { headers: { "Content-Type": IMAGE_MIME[file.split(".").pop()!]!, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
