import { AdminHeading } from "@/components/admin/admin-shell";
import { getBalance } from "@/core/wallet/store";
import { formatPaise } from "@/lib/utils";
import { DoubtCommission } from "@/modules/doubts/components/admin-doubts";
import { isTutorOnline } from "@/modules/doubts/logic";
import { ESCROW_ID, settle } from "@/modules/doubts/service";
import { getDoubtSettings, listDoubts, listTutors } from "@/modules/doubts/store";

export const metadata = { title: "Doubts" };

export default async function AdminDoubtsPage() {
  const [raw, tutors, settings, escrow] = await Promise.all([listDoubts(), listTutors(), getDoubtSettings(), getBalance(ESCROW_ID)]);
  const doubts = (await Promise.all(raw.map(settle))).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const done = doubts.filter((d) => d.status === "completed");
  const stats = [
    { label: "Tutors online now", value: String(tutors.filter((t) => isTutorOnline(t)).length) },
    { label: "Completed sessions", value: String(done.length) },
    { label: "Learners paid", value: formatPaise(done.reduce((s, d) => s + (d.charged ?? 0), 0)) },
    { label: "Held in escrow", value: formatPaise(escrow) },
  ];
  return (
    <>
      <AdminHeading title="Doubts" sub="Live doubt sessions, tutors and money in escrow. Escrow should only hold money for sessions still running." />
      <div className="mb-5 grid gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-[24px] p-5">
            <p className="font-display text-3xl font-bold tabular-nums">{s.value}</p>
            <p className="mt-1 text-sm text-muted">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-5">
        <DoubtCommission percent={settings.commissionBps / 100} />
        <section className="glass rounded-[24px] p-5 sm:p-6">
          <h3 className="font-display text-lg font-bold">Recent doubts</h3>
          {doubts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No doubts yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs text-muted uppercase">
                  <tr>
                    <th className="pb-2 font-semibold">When</th>
                    <th className="pb-2 font-semibold">Subject</th>
                    <th className="pb-2 font-semibold">Learner</th>
                    <th className="pb-2 font-semibold">Tutor</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Minutes</th>
                    <th className="pb-2 font-semibold">Charged</th>
                    <th className="pb-2 font-semibold">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {doubts.slice(0, 50).map((d) => (
                    <tr key={d.id}>
                      <td className="py-2.5 text-muted">{new Date(d.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</td>
                      <td className="py-2.5">{d.subject}</td>
                      <td className="py-2.5">{d.studentName}</td>
                      <td className="py-2.5">{d.tutorName ?? "—"}</td>
                      <td className="py-2.5 capitalize">{d.status.replace("_", " ")}</td>
                      <td className="py-2.5 tabular-nums">{d.billedMinutes ?? "—"}</td>
                      <td className="py-2.5 tabular-nums">{d.charged ? formatPaise(d.charged) : "—"}</td>
                      <td className="py-2.5">{d.rating ? `${d.rating.stars}★` : "—"}</td>
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
