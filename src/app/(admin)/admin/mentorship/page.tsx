import { AdminHeading } from "@/components/admin/admin-shell";
import { getBalance } from "@/core/wallet/store";
import { formatPaise } from "@/lib/utils";
import { MentorshipCommission, RefundButton } from "@/modules/mentorship/components/admin-mentorship";
import { fmtWhen } from "@/modules/mentorship/logic";
import { settledBookings } from "@/modules/mentorship/queries";
import { ESCROW_ID } from "@/modules/mentorship/service";
import { getMentorshipSettings, listMentors } from "@/modules/mentorship/store";

export const metadata = { title: "Mentorship" };

export default async function AdminMentorshipPage() {
  const [all, mentors, settings, escrow] = await Promise.all([settledBookings(), listMentors(), getMentorshipSettings(), getBalance(ESCROW_ID)]);
  const bookings = all.sort((a, b) => b.start.localeCompare(a.start));
  const done = bookings.filter((b) => b.status === "completed");
  const stats = [
    { label: "Live mentors", value: `${mentors.filter((m) => m.published).length} / ${mentors.length}` },
    { label: "Upcoming sessions", value: String(bookings.filter((b) => b.status === "confirmed").length) },
    { label: "Completed sessions", value: String(done.length) },
    { label: "Held in escrow", value: formatPaise(escrow) },
  ];
  return (
    <>
      <AdminHeading title="Mentorship" sub="Bookings, mentors and money in escrow. Escrow holds the price of every upcoming session until it ends." />
      <div className="mb-5 grid gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-[24px] p-5">
            <p className="font-display text-3xl font-bold tabular-nums">{s.value}</p>
            <p className="mt-1 text-sm text-muted">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-5">
        <MentorshipCommission percent={settings.commissionBps / 100} />
        <section className="glass rounded-[24px] p-5 sm:p-6">
          <h3 className="font-display text-lg font-bold">Bookings</h3>
          <p className="text-sm text-muted">To make someone a mentor, set their role to &quot;mentor&quot; in Users.</p>
          {bookings.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No bookings yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs text-muted uppercase">
                  <tr>
                    <th className="pb-2 font-semibold">Session</th>
                    <th className="pb-2 font-semibold">Mentor</th>
                    <th className="pb-2 font-semibold">Learner</th>
                    <th className="pb-2 font-semibold">Price</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Refund</th>
                    <th className="pb-2 font-semibold">Rating</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {bookings.slice(0, 100).map((b) => (
                    <tr key={b.id}>
                      <td className="py-2.5 text-muted">{fmtWhen(b.start)}</td>
                      <td className="py-2.5">{b.mentorName}</td>
                      <td className="py-2.5">{b.studentName}</td>
                      <td className="py-2.5 tabular-nums">{formatPaise(b.price)}</td>
                      <td className="py-2.5 capitalize">{b.status}</td>
                      <td className="py-2.5 tabular-nums">{b.status === "cancelled" ? formatPaise(b.refund ?? 0) : "—"}</td>
                      <td className="py-2.5">{b.feedback ? `${b.feedback.stars}★` : "—"}</td>
                      <td className="py-2.5 text-right">{b.status === "confirmed" && <RefundButton id={b.id} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
