"use client";

import { motion } from "framer-motion";
import { BarChart3, IndianRupee, Loader2, Pencil, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { rpc } from "@/lib/rpc";
import { cn, formatPaise } from "@/lib/utils";
import type { Exam, TestStatus } from "../types";
import { TestCover } from "./bits";

export interface TeachTestRow {
  id: string;
  slug: string;
  title: string;
  exam: Exam;
  colors: [string, string];
  status: TestStatus;
  price: number;
  questions: number;
  attempts: number;
  avgScore: number | null;
  maxScore: number;
  earned: number;
}

const STATUS_CLS: Record<TestStatus, string> = { published: "bg-teal/15 text-teal", draft: "bg-saffron/15 text-saffron", archived: "bg-fg/10 text-muted" };

export function TestTeachDashboard({ rows, commissionPercent }: { rows: TeachTestRow[]; commissionPercent: number }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attempts = rows.reduce((s, r) => s + r.attempts, 0);
  const earned = rows.reduce((s, r) => s + r.earned, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: IndianRupee, label: "Total earnings", value: formatPaise(earned), tint: "text-teal" },
          { icon: Users, label: "Attempts", value: String(attempts), tint: "text-primary" },
          { icon: BarChart3, label: "Tests", value: String(rows.length), tint: "text-saffron" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="glass rounded-[24px] p-5">
            <s.icon className={cn("size-5", s.tint)} />
            <p className="mt-3 font-display text-3xl font-bold tabular-nums">{s.value}</p>
            <p className="text-sm text-muted">{s.label}</p>
          </motion.div>
        ))}
      </div>
      <p className="text-xs text-muted">Paid tests credit your wallet instantly. Platform commission is {commissionPercent}% per sale.</p>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const title = String(new FormData(e.currentTarget).get("title") ?? "");
          setCreating(true);
          setError(null);
          try {
            const res = await rpc("testsTeach.create", title);
            if (res.ok) router.push(`/tests/teach/${res.id}`);
            else setError(res.error);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't create the test");
          } finally {
            setCreating(false);
          }
        }}
        className="glass flex flex-wrap items-center gap-3 rounded-[24px] p-4"
      >
        <label htmlFor="new-test-title" className="sr-only">
          New test title
        </label>
        <input
          id="new-test-title"
          name="title"
          required
          minLength={3}
          maxLength={120}
          placeholder="Title of your new test, e.g. NEET Biology Full Mock 1"
          className="min-w-64 flex-1 rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <button disabled={creating} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#00c2ff] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Create test
        </button>
        {error && <p className="w-full text-sm text-rose">{error}</p>}
      </form>

      {rows.length === 0 ? (
        <div className="glass rounded-[28px] px-6 py-14 text-center">
          <p className="font-display text-2xl font-bold">Your first test starts here</p>
          <p className="mt-2 text-muted">Give it a title above, then add questions by hand or import a CSV.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r, i) => (
            <motion.li key={r.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="glass flex flex-wrap items-center gap-4 rounded-[22px] p-4">
              <TestCover colors={r.colors} exam={r.exam} className="aspect-video w-32 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold capitalize", STATUS_CLS[r.status])}>{r.status}</span>
                  <span className="text-xs text-muted">{r.price ? formatPaise(r.price) : "Free"}</span>
                </div>
                <p className="mt-1 truncate font-display text-lg font-bold">{r.title}</p>
                <p className="text-xs text-muted">
                  {r.questions} questions · {r.attempts} attempts · {r.avgScore === null ? "no results yet" : `avg ${r.avgScore}/${r.maxScore}`} · earned {formatPaise(r.earned)}
                </p>
              </div>
              <div className="flex gap-2">
                {r.status === "published" && (
                  <Link href={`/tests/${r.slug}`} className="rounded-xl border border-line px-3.5 py-2 text-sm font-semibold hover:bg-fg/5">
                    View
                  </Link>
                )}
                <Link href={`/tests/teach/${r.id}`} className="flex items-center gap-1.5 rounded-xl bg-fg px-3.5 py-2 text-sm font-semibold text-bg">
                  <Pencil className="size-4" /> Edit
                </Link>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
