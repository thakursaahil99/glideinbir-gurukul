import { BadgeCheck, CircleX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BirdMark } from "@/components/brand/logo";
import { getCertificate } from "@/modules/courses/store";

export const metadata: Metadata = { title: "Verify certificate", robots: { index: false } };

/** Public: anyone (an employer, a college) can confirm a certificate code is genuine. */
export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const cert = /^GG-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code) ? await getCertificate(code) : null;

  return (
    <div className="relative grid min-h-svh place-items-center overflow-hidden px-4 py-16">
      <div className="absolute top-1/2 left-1/2 size-[60vmax] -translate-x-1/2 -translate-y-1/2 animate-aurora rounded-full bg-primary/15 blur-[120px]" />
      <div className="glass relative w-full max-w-lg rounded-[32px] p-8 text-center sm:p-10">
        <BirdMark className="mx-auto w-14" />
        {cert ? (
          <>
            <BadgeCheck className="mx-auto mt-6 size-14 text-teal" />
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">Verified certificate</h1>
            <p className="mt-6 text-muted">This certifies that</p>
            <p className="mt-1 font-display text-2xl font-bold">{cert.userName}</p>
            <p className="mt-3 text-muted">completed</p>
            <p className="mt-1 text-lg font-semibold">{cert.courseTitle}</p>
            <p className="mt-1 text-sm text-muted">Instructor: {cert.instructorName}</p>
            <dl className="mt-8 grid grid-cols-2 gap-3 text-left text-sm">
              <div className="rounded-2xl border border-line p-3">
                <dt className="text-xs text-muted">Certificate ID</dt>
                <dd className="font-mono font-semibold">{cert.code}</dd>
              </div>
              <div className="rounded-2xl border border-line p-3">
                <dt className="text-xs text-muted">Issued</dt>
                <dd className="font-semibold">{new Date(cert.issuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <CircleX className="mx-auto mt-6 size-14 text-rose" />
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">Certificate not found</h1>
            <p className="mt-3 text-muted">
              No certificate matches <span className="font-mono">{code.slice(0, 20)}</span>. Check the code and try again.
            </p>
          </>
        )}
        <Link href="/" className="mt-8 inline-block text-sm font-semibold text-primary hover:underline">
          Glideinbir Gurukul · Learn. Soar. Grow.
        </Link>
      </div>
    </div>
  );
}
