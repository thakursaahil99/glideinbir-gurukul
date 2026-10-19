import { redirect } from "next/navigation";
import { requireUser } from "@/core/auth/current";
import { listEntries } from "@/core/wallet/store";
import { tutorFeedAction } from "@/modules/doubts/actions";
import { DoubtsTabs } from "@/modules/doubts/components/bits";
import { TutorDesk } from "@/modules/doubts/components/tutor-desk";
import { firstName } from "@/modules/doubts/logic";
import { isTutorRole } from "@/modules/doubts/service";
import { listDoubts } from "@/modules/doubts/store";

export const metadata = { title: "Tutor desk" };

export default async function TutorDeskPage() {
  const user = await requireUser("/doubts/tutor");
  if (!isTutorRole(user)) redirect("/doubts");
  const [feed, doubts, entries] = await Promise.all([tutorFeedAction(), listDoubts(), listEntries(user.id, 10_000)]);
  if (!feed.ok) redirect("/doubts");

  const mine = doubts.filter((d) => d.tutorId === user.id);
  const rated = mine.filter((d) => d.rating);
  const earned = entries.filter((e) => e.type === "transfer_in" && e.ref?.startsWith("doubt:")).reduce((s, e) => s + e.amount, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Instant Doubts</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">Tutor desk</h1>
        </div>
        <DoubtsTabs isTutor />
      </div>
      <TutorDesk
        profile={feed.profile}
        requests={feed.requests}
        active={feed.active}
        stats={{
          earned,
          sessions: mine.filter((d) => d.status === "completed").length,
          rating: rated.length ? rated.reduce((s, d) => s + d.rating!.stars, 0) / rated.length : null,
          ratings: rated.length,
        }}
        reviews={rated
          .sort((a, b) => b.rating!.at.localeCompare(a.rating!.at))
          .slice(0, 5)
          .map((d) => ({ stars: d.rating!.stars, text: d.rating!.text, name: firstName(d.studentName), at: d.rating!.at }))}
        serverNow={Date.now()}
      />
    </div>
  );
}
