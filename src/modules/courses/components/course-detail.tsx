"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  Check,
  ChevronDown,
  CircleAlert,
  Clock,
  Download,
  Globe,
  Loader2,
  Lock,
  PlayCircle,
  Signal,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { topUpWallet } from "@/core/payments/checkout-client";
import { MIN_RECHARGE_RUPEES } from "@/core/payments/limits";
import { cn, formatPaise } from "@/lib/utils";
import type { CourseView } from "../access";
import { formatDuration } from "../logic";
import type { CourseStats, Review } from "../types";
import { CourseCover, ProgressBar, StarInput, Stars } from "./bits";
import { rpc } from "@/lib/rpc";

export interface DetailProps {
  course: CourseView;
  stats: CourseStats;
  instructorName: string;
  reviews: Review[];
  myReview: Review | null;
  access: "owner" | "enrolled" | "none";
  balance: number;
  progress: number;
  resumeLectureId: string | null;
  certificateCode: string | null;
  totalSec: number;
  lectureCount: number;
  viewerName: string;
}

export function CourseDetail(p: DetailProps) {
  const { course } = p;
  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <Hero {...p} />
          {course.outcomes.length > 0 && (
            <section className="glass mt-8 rounded-[28px] p-6 sm:p-8">
              <h2 className="font-display text-2xl font-bold">What you&apos;ll learn</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {course.outcomes.map((o, i) => (
                  <motion.li
                    key={o}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="flex gap-3 text-sm"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-teal" /> {o}
                  </motion.li>
                ))}
              </ul>
            </section>
          )}
          <Curriculum {...p} />
          {course.description && (
            <section className="mt-8">
              <h2 className="font-display text-2xl font-bold">About this course</h2>
              <p className="mt-4 leading-relaxed whitespace-pre-line text-muted">{course.description}</p>
            </section>
          )}
          <Reviews {...p} />
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <PurchaseCard {...p} />
        </aside>
      </div>
    </div>
  );
}

function Hero({ course, stats, instructorName, totalSec, lectureCount }: DetailProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.7 }}>
      <Link href={`/courses?category=${encodeURIComponent(course.category)}`} className="text-sm font-semibold text-primary hover:underline">
        {course.category}
      </Link>
      <h1 className="mt-2 font-display text-4xl leading-tight font-bold tracking-tight text-balance sm:text-5xl">{course.title}</h1>
      {course.subtitle && <p className="mt-3 text-lg text-muted">{course.subtitle}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        {stats.reviews > 0 && (
          <span className="flex items-center gap-1.5">
            <b className="text-saffron">{stats.rating.toFixed(1)}</b> <Stars value={stats.rating} /> <span className="text-muted">({stats.reviews} ratings)</span>
          </span>
        )}
        <span className="flex items-center gap-1.5 text-muted">
          <Users className="size-4" /> {stats.students} learner{stats.students === 1 ? "" : "s"}
        </span>
        {course.demo && <span className="rounded-full bg-saffron/15 px-2.5 py-0.5 text-xs font-bold text-saffron">Demo course</span>}
      </div>
      <p className="mt-3 text-sm">
        Created by <b>{instructorName}</b>
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {[
          [Clock, `${formatDuration(totalSec)} · ${lectureCount} lectures`],
          [Signal, course.level.charAt(0).toUpperCase() + course.level.slice(1)],
          [Globe, course.language],
        ].map(([Icon, label]) => {
          const I = Icon as typeof Clock;
          return (
            <span key={label as string} className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5">
              <I className="size-3.5" /> {label as string}
            </span>
          );
        })}
      </div>
    </motion.div>
  );
}

function PurchaseCard(p: DetailProps) {
  const { course, access, balance } = p;
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const shortfall = Math.max(0, course.price - balance);
  const topUpRupees = Math.max(MIN_RECHARGE_RUPEES, Math.ceil(shortfall / 100));
  const learnHref = p.resumeLectureId ? `/courses/${course.slug}/learn/${p.resumeLectureId}` : null;

  // After enrolling we navigate to the first lecture instead of refreshing this page:
  // a same-URL router.refresh() right after a server action was intermittently not
  // committed (stale "Enroll" button), while a navigation to a new URL is reliable.
  const buy = async () => {
    setPending(true);
    setMsg(null);
    try {
      if (shortfall > 0) {
        const top = await topUpWallet(topUpRupees, `Top-up for ${course.title}`);
        if (!top.ok) return setMsg({ ok: false, text: top.message });
      }
      const res = await rpc("courses.buy", course.id);
      if (!res.ok) return setMsg({ ok: false, text: res.error });
      setMsg({ ok: true, text: "You're enrolled! Opening your first lecture…" });
      router.push(res.learnUrl);
    } finally {
      setPending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, ease: [0.22, 1, 0.36, 1], duration: 0.7 }}
      className="glass overflow-hidden rounded-[28px]"
    >
      <CourseCover colors={course.colors} category={course.category} big className="aspect-video" />
      <div className="p-6">
        {access === "none" ? (
          <>
            <p className="font-display text-4xl font-bold">{course.price ? formatPaise(course.price) : <span className="text-teal">Free</span>}</p>
            {course.price > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                <Wallet className="size-4" /> Wallet balance {formatPaise(balance)}
              </p>
            )}
            <button
              type="button"
              onClick={buy}
              disabled={pending}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-saffron via-rose to-primary bg-[length:200%_100%] py-4 font-semibold text-white transition-[background-position] duration-700 hover:bg-right disabled:opacity-60"
            >
              {pending && <Loader2 className="size-5 animate-spin" />}
              {course.price === 0 ? "Enroll for free" : shortfall > 0 ? `Add ${formatPaise(topUpRupees * 100)} & buy` : "Buy with wallet"}
            </button>
            {shortfall > 0 && (
              <p className="mt-2 text-center text-xs text-muted">
                Your wallet is short by {formatPaise(shortfall)}. We&apos;ll top it up via Razorpay (UPI, cards, netbanking), then enroll you.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="flex items-center gap-2 text-sm font-semibold text-teal">
              <Check className="size-4" /> {access === "owner" ? "You manage this course" : "You're enrolled"}
            </p>
            {access === "enrolled" && (
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-muted">Progress</span>
                  <b>{p.progress}%</b>
                </div>
                <ProgressBar value={p.progress} />
              </div>
            )}
            {learnHref && (
              <Link
                href={learnHref}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-saffron via-rose to-primary py-4 font-semibold text-white"
              >
                <PlayCircle className="size-5" /> {p.progress > 0 ? "Continue learning" : "Start learning"}
              </Link>
            )}
            {p.certificateCode && (
              <a
                href={`/api/courses/certificate/${p.certificateCode}`}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-line py-3 text-sm font-semibold hover:bg-fg/5"
              >
                <Award className="size-4 text-saffron" /> Download certificate
              </a>
            )}
            {access === "owner" && (
              <Link href={`/courses/teach/${course.id}`} className="mt-3 block text-center text-sm font-semibold text-primary hover:underline">
                Edit course
              </Link>
            )}
          </>
        )}
        <AnimatePresence>
          {msg && (
            <motion.p
              role="status"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn("mt-4 flex items-center gap-2 rounded-2xl border p-3 text-sm", msg.ok ? "border-teal/40 bg-teal/10" : "border-rose/40 bg-rose/10")}
            >
              {msg.ok ? <Check className="size-4 text-teal" /> : <CircleAlert className="size-4 text-rose" />} {msg.text}
            </motion.p>
          )}
        </AnimatePresence>
        <ul className="mt-6 space-y-2 border-t border-line pt-5 text-sm text-muted">
          <li className="flex gap-2">
            <PlayCircle className="size-4" /> {p.lectureCount} lectures, {formatDuration(p.totalSec)} total
          </li>
          <li className="flex gap-2">
            <Award className="size-4" /> Certificate of completion
          </li>
          <li className="flex gap-2">
            <Download className="size-4" /> Downloadable notes where provided
          </li>
        </ul>
      </div>
    </motion.div>
  );
}

function Curriculum({ course, lectureCount, totalSec }: DetailProps) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(course.sections.slice(0, 1).map((s) => s.id)));
  const toggle = (id: string) => setOpen((o) => (o.has(id) ? (o.delete(id), new Set(o)) : new Set(o.add(id))));
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-display text-2xl font-bold">Course content</h2>
        <p className="text-sm text-muted">
          {course.sections.length} sections · {lectureCount} lectures · {formatDuration(totalSec)}
        </p>
      </div>
      <div className="glass mt-4 divide-y divide-line overflow-hidden rounded-[24px]">
        {course.sections.map((s) => {
          const isOpen = open.has(s.id);
          return (
            <div key={s.id}>
              <button type="button" onClick={() => toggle(s.id)} aria-expanded={isOpen} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-fg/[0.03]">
                <ChevronDown className={cn("size-4 shrink-0 transition-transform", isOpen && "rotate-180")} />
                <span className="flex-1 font-semibold">{s.title}</span>
                <span className="text-xs text-muted">
                  {s.lectures.length} lectures · {formatDuration(s.lectures.reduce((a, l) => a + l.durationSec, 0))}
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.ul initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    {s.lectures.map((l) => (
                      <li key={l.id} className="flex items-center gap-3 px-5 py-2.5 pl-12 text-sm">
                        {l.locked ? <Lock className="size-4 shrink-0 text-muted" /> : <PlayCircle className="size-4 shrink-0 text-primary" />}
                        {l.locked ? (
                          <span className="flex-1 text-muted">{l.title}</span>
                        ) : (
                          <Link href={`/courses/${course.slug}/learn/${l.id}`} className="flex-1 hover:text-primary hover:underline">
                            {l.title}
                          </Link>
                        )}
                        {l.preview && <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[11px] font-bold text-teal">Preview</span>}
                        <span className="w-14 text-right text-xs text-muted tabular-nums">{formatDuration(l.durationSec)}</span>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Reviews({ course, reviews: initialReviews, myReview: initialMine, access, viewerName }: DetailProps) {
  // Local copy so a posted review shows instantly, without depending on a page refresh.
  const [reviews, setReviews] = useState(initialReviews);
  const myReview = reviews.find((r) => r.id === initialMine?.id || r.id === "mine") ?? initialMine;
  const [rating, setRating] = useState(myReview?.rating ?? 0);
  const [text, setText] = useState(myReview?.text ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const counts = [5, 4, 3, 2, 1].map((n) => reviews.filter((r) => r.rating === n).length);
  const stats = { rating: reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0 };

  const upsertLocal = () => {
    const now = new Date().toISOString();
    setReviews((list) => {
      const mine = list.find((r) => r.id === (initialMine?.id ?? "mine"));
      const next = { ...(mine ?? { id: "mine", courseId: course.id, userId: "me", userName: viewerName, createdAt: now }), rating, text, updatedAt: now };
      return [next, ...list.filter((r) => r !== mine)];
    });
  };

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-bold">Learner reviews</h2>
      {reviews.length > 0 && (
        <div className="glass mt-4 grid gap-6 rounded-[24px] p-6 sm:grid-cols-[auto_1fr]">
          <div className="text-center">
            <p className="font-display text-6xl font-bold text-saffron">{stats.rating.toFixed(1)}</p>
            <Stars value={stats.rating} className="mt-1" />
            <p className="mt-1 text-xs text-muted">Course rating</p>
          </div>
          <ul className="space-y-1.5">
            {counts.map((n, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="w-10 text-muted">{5 - i} ★</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-fg/10">
                  <motion.span
                    className="block h-full rounded-full bg-saffron"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(n / reviews.length) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: i * 0.05 }}
                  />
                </span>
                <span className="w-6 text-right text-muted tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {access === "enrolled" && (
        <div className="glass mt-4 rounded-[24px] p-6">
          <p className="font-semibold">{myReview ? "Update your review" : "Rate this course"}</p>
          <div className="mt-3">
            <StarInput value={rating} onChange={setRating} />
          </div>
          <label htmlFor="review-text" className="sr-only">
            Your review
          </label>
          <textarea
            id="review-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="What did you like? What could be better?"
            className="mt-3 w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />
          {msg && <p className={cn("mt-2 text-sm", msg.ok ? "text-teal" : "text-rose")}>{msg.text}</p>}
          <button
            type="button"
            disabled={pending || rating === 0}
            onClick={() =>
              start(async () => {
                const res = await rpc("courses.review", { courseId: course.id, rating, text });
                setMsg(res.ok ? { ok: true, text: "Thanks for your review!" } : { ok: false, text: res.error ?? "Couldn't save" });
                if (res.ok) upsertLocal();
              })
            }
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-fg px-5 py-2.5 text-sm font-semibold text-bg disabled:opacity-50"
          >
            {pending && <Loader2 className="size-4 animate-spin" />} {myReview ? "Update review" : "Post review"}
          </button>
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No reviews yet{access === "enrolled" ? ". Be the first!" : "."}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="glass rounded-[20px] p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-saffron to-rose text-sm font-bold text-white uppercase">{r.userName.charAt(0)}</span>
                <div>
                  <p className="text-sm font-semibold">{r.userName}</p>
                  <p className="flex items-center gap-2 text-xs text-muted">
                    <Stars value={r.rating} size="size-3" /> {new Date(r.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
              {r.text && <p className="mt-3 text-sm whitespace-pre-line">{r.text}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
