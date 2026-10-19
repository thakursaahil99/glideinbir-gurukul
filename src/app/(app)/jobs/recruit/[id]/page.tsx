import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/core/auth/current";
import { PostingWorkspace } from "@/modules/jobs/components/posting-workspace";
import { normSkill } from "@/modules/jobs/logic";
import { UUID_RE } from "@/modules/jobs/media";
import { activeCompany } from "@/modules/jobs/service";
import { getPosting, listApplications } from "@/modules/jobs/store";

export const metadata = { title: "Manage job" };

export default async function ManagePostingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser("/jobs/recruit");
  const company = await activeCompany(user.id);
  if (!company) redirect("/jobs/recruit");
  const { id } = await params;
  const p = UUID_RE.test(id) ? await getPosting(id) : null;
  if (!p || p.companyId !== company.id) notFound();
  const wanted = new Set(p.skills.map(normSkill));
  const candidates = (await listApplications())
    .filter((a) => a.postingId === p.id && !a.withdrawn)
    .map((a) => ({ id: a.id, userName: a.userName, email: a.email, score: a.score, skills: a.skills, coverNote: a.coverNote, stage: a.stage, createdAt: a.createdAt, matched: a.skills.filter((s) => wanted.has(normSkill(s))) }));
  const { tab } = await searchParams;
  return (
    <div className="mx-auto max-w-7xl">
      <PostingWorkspace key={p.id} initial={p} candidates={candidates} initialTab={tab === "details" || p.status === "draft" ? "details" : "applicants"} serverNow={Date.now()} />
    </div>
  );
}
