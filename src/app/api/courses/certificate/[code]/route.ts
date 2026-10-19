import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/current";
import { certificatePdf } from "@/modules/courses/certificate";
import { getCertificate, getCourse } from "@/modules/courses/store";

/** The certificate PDF, for its owner (and admins). Anyone can verify a code at /verify/<code>. */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^GG-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return new NextResponse("Not found", { status: 404 });
  const [user, cert] = await Promise.all([getCurrentUser(), getCertificate(code)]);
  if (!cert) return new NextResponse("Not found", { status: 404 });
  if (!user || (user.id !== cert.userId && user.role !== "admin")) return new NextResponse("Not allowed", { status: 403 });

  const course = await getCourse(cert.courseId);
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const bytes = await certificatePdf(cert, `${origin.replace(/^https?:\/\//, "")}/verify/${cert.code}`, course?.colors);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Glideinbir-Certificate-${cert.code}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
