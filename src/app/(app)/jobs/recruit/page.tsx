import { requireUser } from "@/core/auth/current";
import { JobsTabs } from "@/modules/jobs/components/bits";
import { CompanyOnboarding, CompanyPending, RecruiterDashboard, type PostingRow } from "@/modules/jobs/components/recruit";
import { companyOf, listApplications, listPostings } from "@/modules/jobs/store";
import { STAGES, type Stage } from "@/modules/jobs/types";

export const metadata = { title: "Recruiter hub" };

export default async function RecruitPage() {
  const user = await requireUser("/jobs/recruit");
  const company = await companyOf(user.id);
  let body: React.ReactNode;
  if (!company || company.status === "rejected") body = <CompanyOnboarding company={company} />;
  else if (company.status !== "approved") body = <CompanyPending company={company} />;
  else {
    const [postings, apps] = await Promise.all([listPostings(), listApplications()]);
    const rows: PostingRow[] = postings
      .filter((p) => p.companyId === company.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((p) => {
        const mine = apps.filter((a) => a.postingId === p.id && !a.withdrawn);
        const counts = Object.fromEntries(STAGES.map((s) => [s, mine.filter((a) => a.stage === s).length])) as Record<Stage, number>;
        return { id: p.id, title: p.title, type: p.type, status: p.status, hidden: p.hidden?.reason ?? null, deadline: p.deadline, counts, total: mine.length };
      });
    body = <RecruiterDashboard company={company} postings={rows} />;
  }
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Jobs & Internships</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">{company?.status === "approved" ? "Recruiter hub" : "Hire on Glideinbir"}</h1>
        </div>
        <JobsTabs isRecruiter={company?.status === "approved"} />
      </div>
      {body}
    </div>
  );
}
