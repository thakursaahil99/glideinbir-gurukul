import { requireUser } from "@/core/auth/current";
import { JobsTabs } from "@/modules/jobs/components/bits";
import { ProfileForm } from "@/modules/jobs/components/profile-form";
import { activeCompany } from "@/modules/jobs/service";
import { getProfile } from "@/modules/jobs/store";

export const metadata = { title: "Job profile" };

export default async function JobProfilePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await requireUser("/jobs/profile");
  const [profile, company] = await Promise.all([getProfile(user.id), activeCompany(user.id)]);
  const { next } = await searchParams;
  // Only ever send people back to a job page (no open redirects).
  const safeNext = next && /^\/jobs\/[0-9a-f-]{36}$/.test(next) ? next : null;
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Jobs & Internships</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">Job profile</h1>
          <p className="mt-2 text-muted">Recruiters see this with every application. Fill it once, apply everywhere in one click.</p>
        </div>
        <JobsTabs isRecruiter={!!company} />
      </div>
      <ProfileForm initial={profile} name={user.name} next={safeNext} />
    </div>
  );
}
