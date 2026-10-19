import { requireUser } from "@/core/auth/current";
import { Applications, type MyApplication, type SavedItem } from "@/modules/jobs/components/applications";
import { JobsTabs } from "@/modules/jobs/components/bits";
import { externalJobs } from "@/modules/jobs/remotive";
import { activeCompany } from "@/modules/jobs/service";
import { listAlerts, listApplications, listPostings, listSaved } from "@/modules/jobs/store";

export const metadata = { title: "My applications" };

export default async function ApplicationsPage() {
  const user = await requireUser("/jobs/applications");
  const [apps, postings, saved, alerts, external, company] = await Promise.all([listApplications(), listPostings(), listSaved(user.id), listAlerts(), externalJobs(), activeCompany(user.id)]);
  const byId = new Map(postings.map((p) => [p.id, p]));
  const extById = new Map(external.jobs.map((j) => [j.id, j]));
  const mine: MyApplication[] = apps
    .filter((a) => a.userId === user.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((a) => ({ id: a.id, postingId: a.postingId, title: byId.get(a.postingId)?.title ?? "Job removed", companyName: byId.get(a.postingId)?.companyName ?? "", stage: a.stage, withdrawn: !!a.withdrawn, score: a.score, createdAt: a.createdAt, updatedAt: a.updatedAt, lastNote: a.history.at(-1)?.note ?? null }));
  const savedItems: SavedItem[] = saved
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .flatMap((s): SavedItem[] => {
      const p = byId.get(s.jobId);
      if (p) return [{ id: s.jobId, title: p.title, company: p.companyName, href: `/jobs/${p.id}`, external: false, source: null }];
      const j = extById.get(s.jobId);
      if (j) return [{ id: s.jobId, title: j.title, company: j.company, href: j.url, external: true, source: j.source }];
      return s.snapshot ? [{ id: s.jobId, title: s.snapshot.title, company: s.snapshot.company, href: s.snapshot.url, external: true, source: s.snapshot.source }] : [];
    });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Jobs & Internships</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">My applications</h1>
        </div>
        <JobsTabs isRecruiter={!!company} />
      </div>
      <Applications apps={mine} saved={savedItems} alerts={alerts.filter((a) => a.userId === user.id).map(({ id, query, type, workMode }) => ({ id, query, type, workMode }))} serverNow={Date.now()} />
    </div>
  );
}
