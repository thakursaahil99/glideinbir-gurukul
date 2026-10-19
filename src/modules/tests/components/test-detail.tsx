"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, Clock, FileQuestion, Loader2, Medal, Play, RotateCcw, Trophy, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { topUpWallet } from "@/core/payments/checkout-client";
import { MIN_RECHARGE_RUPEES } from "@/core/payments/limits";
import { refreshSummary } from "@/lib/summary";
import { rpc } from "@/lib/rpc";
import { cn, formatPaise } from "@/lib/utils";
import type { Exam } from "../types";
import { Stat, TestCover } from "./bits";

export interface DetailData {
  id: string;
  slug: string;
  title: string;
  description: string;
  exam: Exam;
  colors: [string, string];
  price: number;
  durationMin: number;
  instructions: string[];
  demo?: boolean;
  sections: { title: string; questions: number; marks: number }[];
  questions: number;
  maxScore: number;
  attempts: number;
  canTake: boolean;
  isOwner: boolean;
  balance: number;
  mine: { id: string; status: "in_progress" | "submitted" } | null;
  leaderboard: { name: string; score: number; timeSec: number; isMe: boolean }[];
}

export function TestDetail(d: DetailData) {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            <p className="text-sm font-semibold text-primary">{d.exam}</p>
            <h1 className="mt-2 font-display text-4xl leading-tight font-bold tracking-tight text-balance sm:text-5xl">{d.title}</h1>
            {d.description && <p className="mt-3 text-lg text-muted">{d.description}</p>}
            {d.demo && <span className="mt-3 inline-block rounded-full bg-saffron/15 px-2.5 py-0.5 text-xs font-bold text-saffron">Demo test</span>}
          </motion.div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={FileQuestion} label="Questions" value={String(d.questions)} />
            <Stat icon={Trophy} label="Total marks" value={String(d.maxScore)} tint="text-saffron" />
            <Stat icon={Clock} label="Minutes" value={String(d.durationMin)} tint="text-teal" />
            <Stat icon={Medal} label="Attempted" value={String(d.attempts)} tint="text-rose" />
          </div>

          <section className="glass overflow-hidden rounded-[24px]">
            <h2 className="px-6 pt-5 font-display text-xl font-bold">Sections</h2>
            <table className="mt-3 w-full text-left text-sm">
              <thead className="text-xs text-muted uppercase">
                <tr className="border-b border-line">
                  <th className="px-6 py-2 font-semibold">Section</th>
                  <th className="px-6 py-2 font-semibold">Questions</th>
                  <th className="px-6 py-2 font-semibold">Marks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {d.sections.map((s) => (
                  <tr key={s.title}>
                    <td className="px-6 py-3 font-semibold">{s.title}</td>
                    <td className="px-6 py-3 tabular-nums">{s.questions}</td>
                    <td className="px-6 py-3 tabular-nums">{s.marks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold">Instructions</h2>
            <ol className="mt-3 space-y-2">
              {d.instructions.map((ins, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">{i + 1}</span>
                  <span className="pt-0.5 text-muted">{ins}</span>
                </li>
              ))}
            </ol>
          </section>

          <Leaderboard rows={d.leaderboard} />
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <ActionCard {...d} />
        </aside>
      </div>
    </div>
  );
}

function ActionCard(d: DetailData) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [unlocked, setUnlocked] = useState(d.canTake);

  const shortfall = Math.max(0, d.price - d.balance);
  const topUpRupees = Math.max(MIN_RECHARGE_RUPEES, Math.ceil(shortfall / 100));

  const run = async (job: () => Promise<void>) => {
    setBusy(true);
    setMsg(null);
    try {
      await job();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const start = () =>
    run(async () => {
      const res = await rpc("tests.start", d.id);
      if (res.ok) router.push(res.url);
      else setMsg(res.error);
    });

  const buy = () =>
    run(async () => {
      if (shortfall > 0) {
        const top = await topUpWallet(topUpRupees, `Top-up for ${d.title}`);
        if (!top.ok) return setMsg(top.message);
      }
      const res = await rpc("tests.buy", d.id);
      if (!res.ok) return setMsg(res.error);
      setUnlocked(true);
      refreshSummary();
    });

  const btn = "mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-white disabled:opacity-50";
  const grad = "bg-gradient-to-r from-primary via-[#7a5cff] to-[#00c2ff]";

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="glass overflow-hidden rounded-[28px]">
      <TestCover colors={d.colors} exam={d.exam} big className="aspect-video" />
      <div className="p-6">
        {d.mine?.status === "submitted" ? (
          <>
            <p className="font-semibold text-teal">You&apos;ve taken this test</p>
            <Link href={`/tests/${d.slug}/result/${d.mine.id}`} className={cn(btn, grad)}>
              <Trophy className="size-5" /> View result & solutions
            </Link>
          </>
        ) : d.mine?.status === "in_progress" ? (
          <>
            <p className="font-semibold text-saffron">Your attempt is in progress. The timer keeps running.</p>
            <button type="button" onClick={start} disabled={busy} className={cn(btn, "bg-gradient-to-r from-saffron to-rose")}>
              {busy ? <Loader2 className="size-5 animate-spin" /> : <RotateCcw className="size-5" />} Resume test
            </button>
          </>
        ) : unlocked ? (
          <>
            <p className="font-display text-3xl font-bold">{d.price && !d.isOwner ? <span className="text-teal">Unlocked</span> : d.isOwner ? "Preview" : <span className="text-teal">Free</span>}</p>
            <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" />
              <span className="text-muted">I have read the instructions. The {d.durationMin}-minute timer starts as soon as I begin and can&apos;t be paused.</span>
            </label>
            <button type="button" onClick={start} disabled={busy || !agreed} className={cn(btn, grad)}>
              {busy ? <Loader2 className="size-5 animate-spin" /> : <Play className="size-5 fill-current" />} Start test
            </button>
          </>
        ) : (
          <>
            <p className="font-display text-4xl font-bold">{formatPaise(d.price)}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
              <Wallet className="size-4" /> Wallet balance {formatPaise(d.balance)}
            </p>
            <button type="button" onClick={buy} disabled={busy} className={cn(btn, grad)}>
              {busy && <Loader2 className="size-5 animate-spin" />}
              {shortfall > 0 ? `Add ${formatPaise(topUpRupees * 100)} & buy` : "Buy with wallet"}
            </button>
            {shortfall > 0 && <p className="mt-2 text-center text-xs text-muted">We&apos;ll top up the shortfall via Razorpay, then unlock the test.</p>}
          </>
        )}
        <AnimatePresence>
          {msg && (
            <motion.p
              role="status"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex items-center gap-2 rounded-2xl border border-rose/40 bg-rose/10 p-3 text-sm"
            >
              <CircleAlert className="size-4 shrink-0 text-rose" /> {msg}
            </motion.p>
          )}
        </AnimatePresence>
        <p className="mt-5 border-t border-line pt-4 text-xs text-muted">One attempt per learner, so every rank is fair. Solutions unlock after you submit.</p>
      </div>
    </motion.div>
  );
}

const fmtTime = (s: number) => `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, "0")}s`;

function Leaderboard({ rows }: { rows: DetailData["leaderboard"] }) {
  return (
    <section>
      <h2 className="font-display text-xl font-bold">Leaderboard</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No results yet. Be the first on the board!</p>
      ) : (
        <ol className="glass mt-3 divide-y divide-line overflow-hidden rounded-[24px]">
          {rows.map((r, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className={cn("flex items-center gap-4 px-5 py-3 text-sm", r.isMe && "bg-primary/10")}
            >
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full text-xs font-bold",
                  i === 0 ? "bg-saffron text-black" : i === 1 ? "bg-fg/20" : i === 2 ? "bg-rose/40" : "bg-fg/5 text-muted",
                )}
              >
                {i + 1}
              </span>
              <span className="flex-1 font-semibold">
                {r.name}
                {r.isMe && <span className="ml-2 text-xs text-primary">(you)</span>}
              </span>
              <span className="text-xs text-muted tabular-nums">{fmtTime(r.timeSec)}</span>
              <span className="w-14 text-right font-display font-bold tabular-nums">{r.score}</span>
            </motion.li>
          ))}
        </ol>
      )}
    </section>
  );
}
