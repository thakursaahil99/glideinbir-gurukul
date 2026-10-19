import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/core/auth/current";
import { formatPaise } from "@/lib/utils";
import { DoubtsTabs, StatusBadge } from "@/modules/doubts/components/bits";
import { isTutorRole, settle } from "@/modules/doubts/service";
import { listDoubts } from "@/modules/doubts/store";

export const metadata = { title: "My doubts" };

export default async function DoubtHistoryPage() {
  const user = await requireUser("/doubts/history");
  const rows = (await Promise.all((await listDoubts()).filter((d) => d.studentId === user.id || d.tutorId === user.id).map(settle))).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Instant Doubts</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">My doubts</h1>
        </div>
        <DoubtsTabs isTutor={isTutorRole(user)} />
      </div>
      {rows.length === 0 ? (
        <div className="glass rounded-[28px] px-6 py-16 text-center">
          <p className="font-display text-2xl font-bold">No doubts yet</p>
          <p className="mt-2 text-muted">Ask your first one; a tutor can be with you in about a minute.</p>
          <Link href="/doubts" className="mt-6 inline-block rounded-2xl bg-fg px-6 py-3 font-semibold text-bg">
            Ask a doubt
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((d) => {
            const asTutor = d.tutorId === user.id;
            return (
              <li key={d.id}>
                <Link href={`/doubts/${d.id}`} className="glass group flex flex-wrap items-center gap-4 rounded-[22px] p-4 transition-transform hover:-translate-y-0.5">
                  <StatusBadge status={d.status} />
                  <span className="rounded-full bg-fg/5 px-2.5 py-0.5 text-xs font-semibold">{d.subject}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{d.text}</span>
                  <span className="text-xs text-muted">
                    {asTutor ? `Tutored ${d.studentName.split(" ")[0]}` : d.tutorName ? `with ${d.tutorName}` : ""} · {new Date(d.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                  {d.status === "completed" && <span className="text-sm font-semibold tabular-nums">{asTutor ? "+" : "−"}{formatPaise(d.charged ?? 0)}</span>}
                  <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-1" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
