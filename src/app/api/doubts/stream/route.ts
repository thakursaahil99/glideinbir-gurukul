import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/current";
import { sseResponse } from "@/core/realtime/bus";
import { doubtChannel, isTutorRole, subjectChannel } from "@/modules/doubts/service";
import { getDoubt, getTutor, touchTutor } from "@/modules/doubts/store";

export const dynamic = "force-dynamic";

/**
 * Realtime over Server-Sent Events.
 *   ?doubt=<id>  → status changes and chat messages for one doubt (its learner / tutor)
 *   ?feed=1      → new and taken requests for a tutor's subjects; also keeps them "online"
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const url = new URL(req.url);

  if (url.searchParams.get("feed")) {
    if (!isTutorRole(user)) return NextResponse.json({ error: "Tutors only" }, { status: 403 });
    const profile = await getTutor(user.id);
    if (!profile) return NextResponse.json({ error: "Save your tutor profile first" }, { status: 409 });
    await touchTutor(user.id);
    return sseResponse(req, profile.subjects.map(subjectChannel), { subjects: profile.subjects }, () => void touchTutor(user.id));
  }

  const id = url.searchParams.get("doubt") ?? "";
  const d = /^[0-9a-f-]{36}$/.test(id) ? await getDoubt(id) : null;
  const allowed = d && (d.studentId === user.id || d.tutorId === user.id || (d.status === "requested" && isTutorRole(user)));
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return sseResponse(req, [doubtChannel(d.id)]);
}
