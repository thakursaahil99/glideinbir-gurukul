import { AdminHeading } from "@/components/admin/admin-shell";
import { CompanyQueue, ExternalSync, PostingModeration } from "@/modules/jobs/components/admin-jobs";
import { adzunaConfigured } from "@/modules/jobs/adzuna";
import { getExternal, listApplications, listCompanies, listPostings, listProfiles } from "@/modules/jobs/store";

export const metadata = { title: "Jobs" };

const ORDER = { pending: 0, approved: 1, suspended: 2, rejected: 3 } as const;

export default async function AdminJobsPage() {
  const [companies, postings, apps, profiles, external] = await Promise.all([listCompanies(), listPostings(), listApplications(), listProfiles(), getExternal()]);
  const stats = [
    { label: "Verified companies", value: `${companies.filter((c) => c.status === "approved").length} / ${companies.length}` },
    { label: "Live jobs", value: String(postings.filter((p) => p.status === "open" && !p.hidden).length) },
    { label: "Applications", value: String(apps.length) },
    { label: "Job profiles", value: String(profiles.length) },
  ];
  return (
    <>
      <AdminHeading title="Jobs & Internships" sub="Verify companies, moderate postings and keep the remote feed fresh." />
      <div className="mb-5 grid gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-[24px] p-5">
            <p className="font-display text-3xl font-bold tabular-nums">{s.value}</p>
            <p className="mt-1 text-sm text-muted">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-5">
        <CompanyQueue companies={[...companies].sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.createdAt.localeCompare(a.createdAt)).map((c) => ({ ...c, jobs: postings.filter((p) => p.companyId === c.id).length }))} />
        <PostingModeration postings={[...postings].filter((p) => p.status !== "draft").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((p) => ({ id: p.id, title: p.title, companyName: p.companyName, status: p.status, hidden: p.hidden?.reason ?? null, applicants: apps.filter((a) => a.postingId === p.id).length }))} />
        <section className="glass rounded-[24px] p-5 sm:p-6">
          <h3 className="font-display text-lg font-bold">Jobs across India (Adzuna)</h3>
          {adzunaConfigured() ? (
            <p className="mt-2 text-sm">
              <b className="text-teal">Connected.</b> Learners search live listings in every city and category (results cached 30 min, max 20 calls a minute).
            </p>
          ) : (
            <p className="mt-2 text-sm">
              <b className="text-saffron">Not connected.</b> Create a free account at developer.adzuna.com and add <code>ADZUNA_APP_ID</code> and <code>ADZUNA_APP_KEY</code> to <code>.env.local</code>, then restart. It costs nothing and fills every city with real jobs.
            </p>
          )}
        </section>
        <ExternalSync count={external.jobs.length} syncedAt={external.syncedAt} />
      </div>
    </>
  );
}
