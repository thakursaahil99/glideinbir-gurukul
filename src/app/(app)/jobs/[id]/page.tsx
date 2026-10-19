import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/core/auth/current";
import { JobsTabs } from "@/modules/jobs/components/bits";
import { JobDetail } from "@/modules/jobs/components/job-detail";
import { isOpen, matchScore, salaryText } from "@/modules/jobs/logic";
import { UUID_RE } from "@/modules/jobs/media";
import { activeCompany } from "@/modules/jobs/service";
import { getCompany, getPosting, getProfile, listApplications, listSaved } from "@/modules/jobs/store";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = UUID_RE.test(id) ? await getPosting(id) : null;
  return { title: p?.status === "open" ? `${p.title} · ${p.companyName}` : "Job" };
}

export default async function JobPage({ params }: Props) {
  const user = await requireUser("/jobs");
  const { id } = await params;
  const p = UUID_RE.test(id) ? await getPosting(id) : null;
  const company = p ? await getCompany(p.companyId) : null;
  if (!p || !company) notFound();
  const [profile, apps, saved, mine] = await Promise.all([getProfile(user.id), listApplications(), listSaved(user.id), activeCompany(user.id)]);
  const isOwner = company.ownerId === user.id;
  const myApps = apps.filter((a) => a.postingId === p.id && a.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const application = myApps.find((a) => !a.withdrawn) ?? myApps[0] ?? null;
  const visible = company.status === "approved" && !p.hidden && p.status !== "draft";
  // Drafts, hidden or suspended jobs: only the owner, admins and people who already applied.
  if (!visible && !isOwner && user.role !== "admin" && !application) notFound();
  const skills = profile?.skills ?? [];
  const match = skills.length ? matchScore(p.skills, skills) : { score: null, matched: [], missing: [] };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/jobs" className="flex items-center gap-2 text-sm font-semibold text-muted hover:text-fg">
          <ArrowLeft className="size-4" /> All jobs
        </Link>
        <JobsTabs isRecruiter={!!mine} />
      </div>
      <JobDetail
        posting={p}
        salary={salaryText(p)}
        company={company}
        match={match}
        application={application ? { id: application.id, stage: application.stage, history: application.history, withdrawn: application.withdrawn, createdAt: application.createdAt } : null}
        saved={saved.some((s) => s.jobId === p.id)}
        profileReady={!!profile?.resume && skills.length > 0}
        isOwner={isOwner}
        open={visible && isOpen(p, Date.now())}
      />
    </div>
  );
}
