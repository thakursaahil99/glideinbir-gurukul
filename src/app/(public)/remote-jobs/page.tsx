import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BirdMark } from "@/components/brand/logo";
import { RemotePublic } from "@/modules/jobs/components/remote-public";
import { externalJobs } from "@/modules/jobs/remotive";
import { jobsEnabled } from "@/modules/jobs/service";

export const metadata: Metadata = { title: "Remote jobs", description: "Live remote jobs from around the world, via Remotive." };
export const dynamic = "force-dynamic";

/** Public page: the synced remote listings, open to everyone without signing in. */
export default async function RemoteJobsPage() {
  if (!(await jobsEnabled())) notFound();
  const { jobs, syncedAt } = await externalJobs();
  return (
    <div id="main" role="main" className="relative min-h-svh overflow-hidden px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[50vmax] -translate-x-1/2 rounded-full bg-[#3d8bff]/15 blur-[120px]" />
      <div className="relative mx-auto max-w-5xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 font-display font-bold">
            <BirdMark className="w-8" /> Glideinbir Gurukul
          </Link>
          <Link href="/signup" className="rounded-xl bg-fg px-4 py-2 text-sm font-semibold text-bg">
            Join free
          </Link>
        </header>
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Jobs</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">Remote jobs, worldwide</h1>
          <p className="mt-2 max-w-2xl text-muted">
            {jobs.length} live listings from{" "}
            <a href="https://remotive.com" target="_blank" rel="noopener" className="font-semibold text-fg underline">
              Remotive
            </a>
            {syncedAt && `, updated ${new Date(syncedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`}. Each job opens on Remotive, where you apply. Want skill-matched jobs and internships in India? <Link href="/signup" className="font-semibold text-fg underline">Create a free account</Link>.
          </p>
        </div>
        <RemotePublic jobs={jobs} serverNow={Date.now()} />
      </div>
    </div>
  );
}
