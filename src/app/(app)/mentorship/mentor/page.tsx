import { redirect } from "next/navigation";
import { requireUser } from "@/core/auth/current";
import { listEntries } from "@/core/wallet/store";
import { MentorshipTabs } from "@/modules/mentorship/components/bits";
import { Studio } from "@/modules/mentorship/components/studio";
import { mentorStats, settledBookings } from "@/modules/mentorship/queries";
import { isMentorRole } from "@/modules/mentorship/service";
import { getMentor } from "@/modules/mentorship/store";

export const metadata = { title: "Mentor studio" };

export default async function MentorStudioPage() {
  const user = await requireUser("/mentorship/mentor");
  if (!isMentorRole(user)) redirect("/mentorship");
  const [profile, bookings, entries] = await Promise.all([getMentor(user.id), settledBookings(), listEntries(user.id, 10_000)]);
  const stats = mentorStats(bookings, user.id);
  const earned = entries.filter((e) => e.type === "transfer_in" && e.ref?.startsWith("mentor:")).reduce((s, e) => s + e.amount, 0);
  const upcoming = bookings.filter((b) => b.mentorId === user.id && b.status === "confirmed").sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Mentorship</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">Mentor studio</h1>
        </div>
        <MentorshipTabs isMentor />
      </div>
      <Studio profile={profile} name={user.name} userId={user.id} upcoming={upcoming} stats={{ earned, sessions: stats.sessions, rating: stats.rating, ratings: stats.ratings }} reviews={stats.reviews} serverNow={Date.now()} />
    </div>
  );
}
