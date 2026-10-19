import type { Metadata } from "next";
import { requireUser } from "@/core/auth/current";
import { getSite } from "@/core/site/store";
import { MentorshipTabs } from "@/modules/mentorship/components/bits";
import { MentorGrid } from "@/modules/mentorship/components/mentor-grid";
import { publishedMentors } from "@/modules/mentorship/queries";
import { isMentorRole } from "@/modules/mentorship/service";

export async function generateMetadata(): Promise<Metadata> {
  const { modules } = await getSite();
  return { title: modules.find((m) => m.key === "mentorship")?.name ?? "Mentorship" };
}

export default async function MentorshipPage() {
  const user = await requireUser("/mentorship");
  const mentors = (await publishedMentors()).filter((m) => m.userId !== user.id);
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Mentorship</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Learn from people who&apos;ve <span className="bg-gradient-to-r from-[#c04dff] to-[#ff4da6] bg-clip-text text-transparent">done it</span>
          </h1>
          <p className="mt-2 max-w-xl text-muted">Book a 1-on-1 video call in IST. Pay from your wallet; the mentor is paid only after the session.</p>
        </div>
        <MentorshipTabs isMentor={isMentorRole(user)} />
      </div>
      <MentorGrid mentors={mentors} />
    </div>
  );
}
