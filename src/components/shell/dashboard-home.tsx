"use client";

import { motion, type Variants } from "framer-motion";
import { ArrowRight, ArrowUpRight, BookOpen, Code2, Gift, Lock, NotebookPen, Plus, Sparkles, Timer, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ModuleKey } from "@/core/module-registry";
import { useModules, useSite } from "@/core/site/site-context";
import { formatPaise } from "@/lib/utils";

const list: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** A free thing to start with right now, picked on the server from the live catalogs. */
export interface FreePick {
  kind: "course" | "test" | "notes" | "code";
  title: string;
  href: string;
  meta: string;
}

const KIND = {
  course: { icon: BookOpen, label: "Course", colors: ["#ff8a00", "#ff4d6d"] },
  test: { icon: Timer, label: "Mock test", colors: ["#5b47ff", "#00c2ff"] },
  notes: { icon: NotebookPen, label: "Notes", colors: ["#00b89c", "#7ddc5a"] },
  code: { icon: Code2, label: "Problem", colors: ["#2ee6c5", "#5b47ff"] },
} as const;

export function DashboardHome({ userName, balance = 0, stats = {}, picks = [] }: { userName?: string; balance?: number; stats?: Partial<Record<ModuleKey, string>>; picks?: FreePick[] }) {
  const { dashboard } = useSite();
  const modules = useModules();
  // The greeting depends on the viewer's clock, so it's set after hydration (never mismatches the server).
  const [hello, setHello] = useState("Welcome back");
  useEffect(() => {
    setHello(greeting());
  }, []);
  return (
    <div className="mx-auto max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{hello} 👋</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Namaste, <span className="text-gradient">{userName?.split(" ")[0] || dashboard.greetingName}</span>
          </h1>
        </div>
        {dashboard.tagline && (
          <p className="glass flex items-center gap-2 rounded-full px-4 py-2 text-sm">
            <Sparkles className="size-4 text-saffron" /> {dashboard.tagline}
          </p>
        )}
      </motion.div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* Module tiles from the registry */}
        <motion.ul variants={list} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((m) => {
            const inner = (
              <>
                <div
                  aria-hidden
                  className="absolute -top-16 -right-16 size-40 rounded-full opacity-30 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-60"
                  style={{ background: `linear-gradient(135deg, ${m.colors[0]}, ${m.colors[1]})` }}
                />
                <div className="relative flex items-start justify-between">
                  <span
                    className="grid size-12 place-items-center rounded-2xl text-white transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110"
                    style={{ background: `linear-gradient(135deg, ${m.colors[0]}, ${m.colors[1]})` }}
                  >
                    <m.icon className="size-6" />
                  </span>
                  {m.enabled ? (
                    <ArrowUpRight className="size-5 text-muted transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-fg" />
                  ) : (
                    <span className="flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-muted">
                      <Lock className="size-3" /> Soon
                    </span>
                  )}
                </div>
                <h3 className="relative mt-6 font-display text-xl font-bold">{m.name}</h3>
                <p className="relative mt-1 text-sm text-muted">{m.tagline}</p>
                {m.enabled && stats[m.key] && <p className="relative mt-4 w-fit rounded-full bg-fg/[0.06] px-2.5 py-1 text-[11px] font-semibold">{stats[m.key]}</p>}
              </>
            );
            return (
              <motion.li key={m.key} variants={item} whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <Link
                  href={m.href}
                  className={`glass group relative block h-full overflow-hidden rounded-[24px] p-5 ${m.enabled ? "" : "opacity-70 saturate-50 hover:opacity-100 hover:saturate-100"}`}
                >
                  {inner}
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>

        <div className="space-y-4">
          {/* Wallet */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#5b47ff] via-[#a64dff] to-[#ff4d6d] p-6 text-white"
          >
            <div className="absolute -right-10 -bottom-10 size-40 rounded-full border-[24px] border-white/10" />
            <div className="absolute -top-8 -right-2 size-24 rounded-full border-[14px] border-white/10" />
            <div className="relative flex items-center gap-2 text-sm text-white/80">
              <Wallet className="size-4" /> Gurukul Wallet
            </div>
            <p className="relative mt-3 font-display text-5xl font-bold tracking-tight">{formatPaise(balance)}</p>
            <p className="relative mt-1 text-xs text-white/70">One balance for every module</p>
            <Link href="/wallet" className="relative mt-6 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#5b47ff] transition-transform hover:scale-105">
              <Plus className="size-4" /> Add money
            </Link>
          </motion.div>

          {/* Start free */}
          {picks.length > 0 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="glass rounded-[24px] p-5">
              <p className="flex items-center gap-2 font-display text-lg font-bold">
                <Gift className="size-5 text-teal" /> Start free today
              </p>
              <p className="mt-0.5 text-xs text-muted">No payment needed. Try these first.</p>
              <ul className="mt-4 space-y-2">
                {picks.slice(0, 5).map((p, i) => {
                  const k = KIND[p.kind];
                  return (
                    <motion.li key={p.href} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.05 }}>
                      <Link href={p.href} className="group flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-fg/[0.05]">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: `linear-gradient(135deg, ${k.colors[0]}, ${k.colors[1]})` }}>
                          <k.icon className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold group-hover:text-teal">{p.title}</span>
                          <span className="block truncate text-xs text-muted">
                            {k.label} · {p.meta}
                          </span>
                        </span>
                        <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-bold text-teal">FREE</span>
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
            </motion.div>
          )}
        </div>
      </div>

      {picks.length > 5 && (
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mt-10">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">Free to learn, right now</h2>
              <p className="text-sm text-muted">Real lectures, mock tests, notes and coding problems. Upgrade only when you want more.</p>
            </div>
          </div>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {picks.slice(5, 13).map((p, i) => {
              const k = KIND[p.kind];
              return (
                <motion.li key={p.href} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.04 }} whileHover={{ y: -4 }}>
                  <Link href={p.href} className="glass group relative flex h-full flex-col overflow-hidden rounded-[22px] p-4">
                    <span aria-hidden className="absolute -top-12 -right-12 size-28 rounded-full opacity-25 blur-2xl transition-opacity group-hover:opacity-50" style={{ background: `linear-gradient(135deg, ${k.colors[0]}, ${k.colors[1]})` }} />
                    <span className="relative flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                        <k.icon className="size-4" /> {k.label}
                      </span>
                      <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-bold text-teal">FREE</span>
                    </span>
                    <span className="relative mt-3 line-clamp-2 font-semibold group-hover:text-teal">{p.title}</span>
                    <span className="relative mt-auto flex items-center justify-between pt-4 text-xs text-muted">
                      {p.meta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        </motion.section>
      )}
    </div>
  );
}
