import type { Metadata } from "next";
import { requireUser } from "@/core/auth/current";
import { getSite } from "@/core/site/store";
import { JobsTabs } from "@/modules/jobs/components/bits";
import { JobSearch, type PostingCard } from "@/modules/jobs/components/job-search";
import { matchScore, salaryText } from "@/modules/jobs/logic";
import { adzunaConfigured, CATEGORIES, CITIES } from "@/modules/jobs/adzuna";
import { externalJobs } from "@/modules/jobs/remotive";
import { activeCompany, livePostings } from "@/modules/jobs/service";
import { getProfile, listApplications, listSaved } from "@/modules/jobs/store";

export async function generateMetadata(): Promise<Metadata> {
  const { modules } = await getSite();
  return { title: modules.find((m) => m.key === "jobs")?.name ?? "Jobs & Internships" };
}

export default async function JobsPage() {
  const user = await requireUser("/jobs");
  const [postings, external, profile, apps, saved, company] = await Promise.all([livePostings(), externalJobs(), getProfile(user.id), listApplications(), listSaved(user.id), activeCompany(user.id)]);
  const skills = profile?.skills ?? [];
  const mine = new Map(apps.filter((a) => a.userId === user.id && !a.withdrawn).map((a) => [a.postingId, a.stage]));
  const cards: PostingCard[] = postings.map((p) => ({
    id: p.id,
    title: p.title,
    companyName: p.companyName,
    type: p.type,
    workMode: p.workMode,
    location: p.location,
    experience: p.experience,
    salary: salaryText(p),
    skills: p.skills,
    description: p.description.slice(0, 600),
    publishedAt: p.publishedAt ?? p.createdAt,
    deadline: p.deadline,
    score: skills.length ? matchScore(p.skills, skills).score : null,
    applied: mine.get(p.id) ?? null,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Jobs & Internships</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            From learner to <span className="bg-gradient-to-r from-[#3d8bff] to-[#2ee6c5] bg-clip-text text-transparent">hired</span>
          </h1>
          <p className="mt-2 max-w-xl text-muted">Live jobs from every Indian city, skill-matched roles with one-click apply, and remote jobs worldwide. Free for everyone.</p>
        </div>
        <JobsTabs isRecruiter={!!company} />
      </div>
      <JobSearch
        postings={cards}
        remote={external.jobs}
        remoteSyncedAt={external.syncedAt}
        india={{ configured: adzunaConfigured(), cities: CITIES, categories: CATEGORIES }}
        saved={saved.map((s) => s.jobId)}
        mySkills={skills}
        hasProfile={!!profile?.resume && skills.length > 0}
        isAdmin={user.role === "admin"}
        serverNow={Date.now()}
      />
    </div>
  );
}
