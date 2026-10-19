import { requireUser } from "@/core/auth/current";
import { MentorshipTabs } from "@/modules/mentorship/components/bits";
import { MyBookings } from "@/modules/mentorship/components/my-bookings";
import { settledBookings } from "@/modules/mentorship/queries";
import { isMentorRole } from "@/modules/mentorship/service";

export const metadata = { title: "My sessions" };

export default async function MySessionsPage() {
  const user = await requireUser("/mentorship/bookings");
  const mine = (await settledBookings()).filter((b) => b.studentId === user.id || b.mentorId === user.id);
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Mentorship</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">My sessions</h1>
        </div>
        <MentorshipTabs isMentor={isMentorRole(user)} />
      </div>
      <MyBookings bookings={mine} userId={user.id} serverNow={Date.now()} />
    </div>
  );
}
