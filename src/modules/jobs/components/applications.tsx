"use client";

import { motion } from "framer-motion";
import { Bell, Bookmark, ExternalLink, FileText, Inbox, Loader2, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { rpc } from "@/lib/rpc";
import { cn } from "@/lib/utils";
import { MODE_LABEL, TYPE_LABEL } from "../logic";
import type { JobType, Stage, WorkMode } from "../types";
import { ago, CompanyMark, GRADIENT, MatchRing, Notice, StageBadge } from "./bits";

export interface MyApplication {
  id: string;
  postingId: string;
  title: string;
  companyName: string;
  stage: Stage;
  withdrawn: boolean;
  score: number;
  createdAt: string;
  updatedAt: string;
  lastNote: string | null;
}

export interface SavedItem {
  id: string;
  title: string;
  company: string;
  href: string;
  external: boolean;
  source: "adzuna" | "remotive" | null;
}

export interface AlertItem {
  id: string;
  query: string;
  type: JobType | null;
  workMode: WorkMode | null;
}

const FLOW: Stage[] = ["applied", "shortlisted", "interview", "hired"];

export function Applications({ apps: initialApps, saved: initialSaved, alerts: initialAlerts, serverNow }: { apps: MyApplication[]; saved: SavedItem[]; alerts: AlertItem[]; serverNow: number }) {
  const [apps, setApps] = useState(initialApps);
  const [saved, setSaved] = useState(initialSaved);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const active = apps.filter((a) => !a.withdrawn && a.stage !== "rejected" && a.stage !== "hired").length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="min-w-0 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Applications</h2>
          <span className="text-sm text-muted">{active} in progress</span>
        </div>
        <Notice msg={msg} />
        {apps.length === 0 ? (
          <div className="glass rounded-[24px] p-10 text-center">
            <motion.span animate={{ y: [0, -5, 0] }} transition={{ duration: 2.4, repeat: Infinity }} className={cn("mx-auto grid size-14 place-items-center rounded-2xl text-white", GRADIENT)}>
              <Inbox className="size-6" />
            </motion.span>
            <p className="mt-3 font-semibold">No applications yet</p>
            <p className="text-sm text-muted">Find a role you like and apply in one click.</p>
            <Link href="/jobs" className={cn("mt-4 inline-flex rounded-xl px-4 py-2 text-sm font-semibold text-white", GRADIENT)}>
              Find jobs
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {apps.map((a, i) => {
              const reached = a.stage === "rejected" ? -1 : FLOW.indexOf(a.stage);
              return (
                <motion.li key={a.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }} className={cn("glass rounded-[22px] p-5", a.withdrawn && "opacity-60")}>
                  <div className="flex items-start gap-3">
                    <CompanyMark name={a.companyName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/jobs/${a.postingId}`} className="font-semibold hover:text-[#6aa6ff]">
                        {a.title}
                      </Link>
                      <p className="text-xs text-muted">
                        {a.companyName} · applied {ago(a.createdAt, serverNow).toLowerCase()}
                      </p>
                    </div>
                    <MatchRing score={a.score} size={44} />
                    <StageBadge stage={a.stage} withdrawn={a.withdrawn} />
                  </div>
                  {!a.withdrawn && a.stage !== "rejected" && (
                    <div className="mt-4 grid grid-cols-4 gap-1.5">
                      {FLOW.map((s, j) => (
                        <div key={s}>
                          <div className="h-1.5 overflow-hidden rounded-full bg-fg/10">
                            <motion.div className={cn("h-full", j <= reached ? GRADIENT : "")} initial={{ width: 0 }} animate={{ width: j <= reached ? "100%" : 0 }} transition={{ delay: 0.2 + j * 0.15, duration: 0.5 }} />
                          </div>
                          <p className={cn("mt-1 text-[11px] font-semibold capitalize", j <= reached ? "" : "text-muted")}>{s}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {a.lastNote && <p className="mt-3 rounded-xl bg-fg/[0.04] p-3 text-sm">“{a.lastNote}”</p>}
                  <div className="mt-3 flex items-center gap-3 text-xs">
                    <a href={`/api/jobs/applications/${a.id}/resume`} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-muted hover:text-fg">
                      <FileText className="size-3.5" /> Resume sent
                    </a>
                    {!a.withdrawn && (a.stage === "applied" || a.stage === "shortlisted") && (
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={async () => {
                          if (!window.confirm("Withdraw this application? The recruiter will no longer see you in their pipeline.")) return;
                          setBusy(a.id);
                          const res = await rpc("jobs.withdraw", a.id).catch(() => ({ ok: false as const, error: "Something went wrong" }));
                          if (res.ok) setApps((all) => all.map((x) => (x.id === a.id ? { ...x, withdrawn: true } : x)));
                          else setMsg({ ok: false, text: res.error });
                          setBusy(null);
                        }}
                        className="ml-auto flex items-center gap-1 font-semibold text-muted hover:text-rose"
                      >
                        {busy === a.id ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />} Withdraw
                      </button>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </section>

      <aside className="space-y-4">
        <section className="glass rounded-[24px] p-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold">
            <Bookmark className="size-5 text-saffron" /> Saved jobs
          </h3>
          {saved.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Tap the bookmark on any job to keep it here.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {saved.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  {s.external ? (
                    <a href={s.href} target="_blank" rel="noopener" className="min-w-0 flex-1 text-sm">
                      <span className="block truncate font-semibold">{s.title}</span>
                      <span className="flex items-center gap-1 text-xs text-muted">
                        {s.company} · via {s.source === "adzuna" ? "Adzuna" : "Remotive"} <ExternalLink className="size-3" />
                      </span>
                    </a>
                  ) : (
                    <Link href={s.href} className="min-w-0 flex-1 text-sm">
                      <span className="block truncate font-semibold">{s.title}</span>
                      <span className="text-xs text-muted">{s.company}</span>
                    </Link>
                  )}
                  <button
                    type="button"
                    aria-label={`Unsave ${s.title}`}
                    onClick={async () => {
                      setSaved((all) => all.filter((x) => x.id !== s.id));
                      await rpc("jobs.save", s.id).catch(() => null);
                    }}
                    className="text-muted hover:text-rose"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass rounded-[24px] p-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold">
            <Bell className="size-5 text-[#6aa6ff]" /> Job alerts
          </h3>
          {alerts.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Search on Find jobs and press “Alert me” to get a daily email of new matches.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {alerts.map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{[a.query && `“${a.query}”`, a.type && TYPE_LABEL[a.type], a.workMode && MODE_LABEL[a.workMode]].filter(Boolean).join(" · ")}</span>
                  <button
                    type="button"
                    aria-label="Delete alert"
                    onClick={async () => {
                      setAlerts((all) => all.filter((x) => x.id !== a.id));
                      await rpc("jobs.deleteAlert", a.id).catch(() => null);
                    }}
                    className="text-muted hover:text-rose"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
