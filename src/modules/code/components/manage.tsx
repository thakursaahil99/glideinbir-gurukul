"use client";

import { motion } from "framer-motion";
import { Crown, Flame, Loader2, Medal, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "@/components/admin/fields";
import { rpc } from "@/lib/rpc";
import { cn } from "@/lib/utils";
import type { Difficulty, Problem } from "../types";
import { DifficultyBadge, GRADIENT } from "./bits";

export function ManageList({ problems }: { problems: (Pick<Problem, "id" | "title" | "difficulty" | "status" | "slug" | "updatedAt"> & { tests: number; submissions: number; accepted: number })[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted">Write problems with hidden tests. Learners see only the samples.</p>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              const res = await rpc("codeAuthor.create");
              if (res.ok) return router.push(`/code/manage/${res.id}`);
              setErr(res.error);
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Something went wrong");
            }
            setBusy(false);
          }}
          className={cn("ml-auto flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60", GRADIENT)}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} New problem
        </button>
      </div>
      {err && <p className="text-sm text-rose">{err}</p>}
      {problems.length === 0 ? (
        <p className="glass rounded-[24px] p-10 text-center text-sm text-muted">You haven&apos;t written any problems yet.</p>
      ) : (
        <ul className="glass divide-y divide-line overflow-hidden rounded-[24px]">
          {problems.map((p) => (
            <li key={p.id} className="flex items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className={cn("rounded-full px-2 py-0.5 font-bold", p.status === "published" ? "bg-teal/15 text-teal" : "bg-fg/10")}>{p.status === "published" ? "Live" : "Draft"}</span>
                  <DifficultyBadge d={p.difficulty as Difficulty} /> · {p.tests} tests · {p.submissions} submissions · {p.accepted} accepted
                </p>
              </div>
              <Link href={`/code/manage/${p.id}`} aria-label={`Edit ${p.title}`} className="grid size-9 place-items-center rounded-xl ring-1 ring-line hover:bg-fg/5">
                <Pencil className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface BoardRow {
  rank: number;
  userId: string;
  name: string;
  points: number;
  solved: number;
  streak: number;
}

export function Leaderboard({ rows, me }: { rows: BoardRow[]; me: string }) {
  const top = rows.slice(0, 3);
  const order = [top[1], top[0], top[2]];
  if (!rows.length) return <p className="glass rounded-[24px] p-10 text-center text-sm text-muted">No one has solved a problem yet. Be the first on the board!</p>;
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 items-end gap-3 sm:gap-6">
        {order.map((r, i) =>
          r ? (
            <motion.div key={r.userId} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: [0.15, 0, 0.3][i], type: "spring", stiffness: 140, damping: 16 }} className="text-center">
              <div className={cn("mx-auto grid place-items-center rounded-full font-display font-bold text-white", r.rank === 1 ? "size-20 bg-gradient-to-br from-[#ffb800] to-[#ff5e3a] text-2xl" : "size-16 bg-gradient-to-br from-[#5b47ff] to-[#2ee6c5] text-xl")}>
                {r.name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((x) => x[0])
                  .join("")
                  .toUpperCase()}
              </div>
              <p className="mt-2 truncate font-semibold">{r.name}</p>
              <p className="text-sm text-muted">{r.points} pts</p>
              <div className={cn("mt-3 flex items-start justify-center rounded-t-2xl pt-3", r.rank === 1 ? "h-28 bg-gradient-to-b from-[#ffb800]/40 to-transparent" : r.rank === 2 ? "h-20 bg-gradient-to-b from-fg/20 to-transparent" : "h-14 bg-gradient-to-b from-[#ff8a00]/30 to-transparent")}>
                {r.rank === 1 ? <Crown className="size-6 text-saffron" /> : <Medal className={cn("size-6", r.rank === 2 ? "text-fg/70" : "text-[#ff8a00]")} />}
              </div>
            </motion.div>
          ) : (
            <div key={i} />
          ),
        )}
      </div>
      <div className="glass overflow-x-auto rounded-[24px]">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="text-xs text-muted uppercase">
            <tr className="border-b border-line">
              <th className="px-5 py-3 font-semibold">Rank</th>
              <th className="py-3 font-semibold">Coder</th>
              <th className="py-3 text-right font-semibold">Solved</th>
              <th className="py-3 text-right font-semibold">Streak</th>
              <th className="px-5 py-3 text-right font-semibold">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.userId} className={cn(r.userId === me && "bg-[#5b47ff]/10")}>
                <td className="px-5 py-3 font-display font-bold tabular-nums">#{r.rank}</td>
                <td className="py-3 font-semibold">
                  {r.name}
                  {r.userId === me && <span className="ml-2 text-xs text-[#8f80ff]">you</span>}
                </td>
                <td className="py-3 text-right tabular-nums">{r.solved}</td>
                <td className="py-3 text-right tabular-nums">
                  {r.streak > 0 && (
                    <span className="inline-flex items-center gap-1 text-saffron">
                      <Flame className="size-3.5" /> {r.streak}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-right font-display font-bold tabular-nums">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-center text-xs text-muted">Easy 10 · Medium 25 · Hard 50 points for each problem solved. Ties go to whoever got there first.</p>
    </div>
  );
}

export function DemoProblemsButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <Card title="Demo problems" description="Adds ten classic problems (easy to hard) with samples and large hidden tests. They are also added automatically as starter content.">
      {msg && <p className="text-sm text-teal">{msg}</p>}
      <Button
        className="w-fit"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const res = await rpc("codeAdmin.loadDemo");
            setMsg(res.ok ? `Added ${res.added} problems` : res.error);
            router.replace(`/admin/code?updated=${Date.now()}`);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy && <Loader2 className="size-4 animate-spin" />} Load demo problems
      </Button>
    </Card>
  );
}
