import { ArrowLeft, Clock, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/core/auth/current";
import { getBalance } from "@/core/wallet/store";
import { formatPaise } from "@/lib/utils";
import { Avatar, MentorshipTabs, Stars } from "@/modules/mentorship/components/bits";
import { BookPanel } from "@/modules/mentorship/components/book-panel";
import { slotsAhead } from "@/modules/mentorship/logic";
import { mentorStats, settledBookings } from "@/modules/mentorship/queries";
import { busyOf, isMentorRole } from "@/modules/mentorship/service";
import { getMentor } from "@/modules/mentorship/store";

type Props = { params: Promise<{ mentorId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = await getMentor((await params).mentorId);
  return { title: m?.published ? `${m.name} · Mentorship` : "Mentor" };
}

export default async function MentorPage({ params }: Props) {
  const user = await requireUser("/mentorship");
  const m = await getMentor((await params).mentorId);
  if (!m || (!m.published && m.userId !== user.id)) notFound();
  const [bookings, balance] = await Promise.all([settledBookings(), getBalance(user.id)]);
  const stats = mentorStats(bookings, m.userId);
  const days = slotsAhead(m, busyOf(bookings, m.userId), Date.now());

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/mentorship" className="flex items-center gap-2 text-sm font-semibold text-muted hover:text-fg">
          <ArrowLeft className="size-4" /> All mentors
        </Link>
        <MentorshipTabs isMentor={isMentorRole(user)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="glass relative overflow-hidden rounded-[30px] p-6">
            <div className="pointer-events-none absolute -top-20 -left-16 size-56 rounded-full bg-[#c04dff]/25 blur-3xl" />
            <div className="relative">
              <Avatar name={m.name} size="lg" />
              <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">{m.name}</h1>
              <p className="mt-1 text-muted">{m.headline}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                {stats.rating ? (
                  <>
                    <Stars value={stats.rating} /> <b>{stats.rating.toFixed(1)}</b> <span className="text-muted">({stats.ratings} {stats.ratings === 1 ? "review" : "reviews"})</span>
                  </>
                ) : (
                  <span className="rounded-full bg-[#c04dff]/15 px-2.5 py-0.5 text-xs font-semibold text-[#d17aff]">New mentor</span>
                )}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-fg/[0.05] p-3">
                  <p className="font-display text-lg font-bold">{formatPaise(m.price)}</p>
                  <p className="text-[11px] text-muted">per session</p>
                </div>
                <div className="rounded-2xl bg-fg/[0.05] p-3">
                  <p className="flex items-center justify-center gap-1 font-display text-lg font-bold">
                    <Clock className="size-4" />
                    {m.sessionMin}
                  </p>
                  <p className="text-[11px] text-muted">minutes</p>
                </div>
                <div className="rounded-2xl bg-fg/[0.05] p-3">
                  <p className="flex items-center justify-center gap-1 font-display text-lg font-bold">
                    <Users className="size-4" />
                    {stats.sessions}
                  </p>
                  <p className="text-[11px] text-muted">sessions</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {m.expertise.map((t) => (
                  <span key={t} className="rounded-lg bg-fg/[0.06] px-2.5 py-1 text-xs font-medium">
                    {t}
                  </span>
                ))}
              </div>
              {m.bio && <p className="mt-5 text-sm leading-relaxed whitespace-pre-wrap text-muted">{m.bio}</p>}
              <p className="mt-5 flex items-center gap-2 text-xs text-muted">
                <ShieldCheck className="size-4 text-teal" /> Paid from your wallet, held until the session ends.
              </p>
            </div>
          </section>

          {stats.reviews.length > 0 && (
            <section className="glass rounded-[26px] p-5">
              <h2 className="font-display text-lg font-bold">What learners say</h2>
              <ul className="mt-3 space-y-4">
                {stats.reviews.map((r) => (
                  <li key={r.at} className="text-sm">
                    <Stars value={r.stars} />
                    {r.text && <p className="mt-1">“{r.text}”</p>}
                    <p className="mt-0.5 text-xs text-muted">{r.name}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        <BookPanel mentor={{ userId: m.userId, name: m.name, price: m.price, sessionMin: m.sessionMin }} days={days} balance={balance} isSelf={m.userId === user.id} />
      </div>
    </div>
  );
}
