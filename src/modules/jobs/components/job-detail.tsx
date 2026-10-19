"use client";

import { motion } from "framer-motion";
import { BadgeCheck, Bookmark, BookmarkCheck, Briefcase, Building2, CalendarClock, Check, ExternalLink, GraduationCap, IndianRupee, Loader2, MapPin, Send, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { rpc } from "@/lib/rpc";
import { cn } from "@/lib/utils";
import { EXP_LABEL, MODE_LABEL, STAGE_LABEL, TYPE_LABEL } from "../logic";
import type { Application, Company, Posting } from "../types";
import { CompanyMark, GRADIENT, INPUT, MatchRing, Notice, StageBadge } from "./bits";

export interface DetailProps {
  posting: Pick<Posting, "id" | "title" | "companyName" | "type" | "workMode" | "location" | "experience" | "skills" | "description" | "openings" | "deadline" | "publishedAt">;
  salary: string;
  company: Pick<Company, "name" | "website" | "about" | "location" | "size">;
  match: { score: number | null; matched: string[]; missing: string[] };
  application: Pick<Application, "id" | "stage" | "history" | "withdrawn" | "createdAt"> | null;
  saved: boolean;
  profileReady: boolean;
  isOwner: boolean;
  open: boolean;
}

export function JobDetail(p: DetailProps) {
  const { posting: j } = p;
  const [app, setApp] = useState(p.application);
  const [saved, setSaved] = useState(p.saved);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; profile?: boolean } | null>(null);
  const active = app && !app.withdrawn;

  async function applyNow() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await rpc("jobs.apply", j.id, note);
      if (res.ok) {
        const now = new Date().toISOString();
        setApp({ id: "new", stage: "applied", history: [{ stage: "applied", at: now }], createdAt: now });
        setMsg({ ok: true, text: "Application sent! Track it in My applications." });
      } else setMsg({ ok: false, text: res.error, profile: "needsProfile" in res && res.needsProfile });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong" });
    }
    setBusy(false);
  }

  const facts = [
    { icon: MapPin, label: j.workMode === "remote" ? "Remote" : `${j.location} · ${MODE_LABEL[j.workMode]}` },
    { icon: IndianRupee, label: p.salary },
    { icon: Briefcase, label: TYPE_LABEL[j.type] },
    { icon: GraduationCap, label: EXP_LABEL[j.experience] },
    { icon: Users, label: `${j.openings} opening${j.openings > 1 ? "s" : ""}` },
    { icon: CalendarClock, label: `Apply by ${new Date(`${j.deadline}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}` },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-5">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass relative overflow-hidden rounded-[28px] p-6">
          <div className="pointer-events-none absolute -top-24 -right-20 size-64 rounded-full bg-[#3d8bff]/20 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <CompanyMark name={j.companyName} size="lg" />
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-3xl font-bold tracking-tight">{j.title}</h1>
              <p className="mt-1 text-muted">{j.companyName}</p>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={async () => {
                setSaved((s) => !s);
                await rpc("jobs.save", j.id).catch(() => null);
              }}
              aria-pressed={saved}
              aria-label={saved ? "Unsave job" : "Save job"}
              className={cn("grid size-10 place-items-center rounded-xl ring-1", saved ? "bg-saffron/15 text-saffron ring-saffron/40" : "text-muted ring-line hover:text-fg")}
            >
              {saved ? <BookmarkCheck className="size-5" /> : <Bookmark className="size-5" />}
            </motion.button>
          </div>
          <div className="relative mt-5 grid gap-2 sm:grid-cols-2">
            {facts.map((f) => (
              <p key={f.label} className="flex items-center gap-2 text-sm">
                <f.icon className="size-4 text-muted" /> {f.label}
              </p>
            ))}
          </div>
        </motion.section>

        <section className="glass rounded-[26px] p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold">About the role</h2>
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-fg/85">{j.description}</p>
          <h3 className="mt-6 text-sm font-bold">Skills</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {j.skills.map((s) => (
              <span key={s} className={cn("rounded-lg px-2.5 py-1 text-xs font-medium", p.match.matched.includes(s) ? "bg-teal/15 text-teal" : "bg-fg/[0.06]")}>
                {p.match.matched.includes(s) && <Check className="mr-1 inline size-3" />}
                {s}
              </span>
            ))}
          </div>
        </section>

        <section className="glass rounded-[26px] p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <Building2 className="size-5 text-muted" /> About {p.company.name}
          </h2>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-muted">{p.company.about}</p>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span>{p.company.location}</span>
            <span>{p.company.size} people</span>
            {p.company.website && (
              <a href={p.company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-semibold text-[#6aa6ff]">
                Website <ExternalLink className="size-3" />
              </a>
            )}
          </p>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <section className="glass rounded-[26px] p-5">
          <div className="flex items-center gap-4">
            <MatchRing score={p.match.score} size={68} />
            <div>
              <p className="font-display text-lg font-bold">{p.match.score === null ? "Add skills to see your match" : p.match.score >= 70 ? "Strong match" : p.match.score >= 40 ? "Good match" : "Stretch role"}</p>
              <p className="text-xs text-muted">{p.match.score === null ? "Your profile has no skills yet." : `You have ${p.match.matched.length} of ${j.skills.length} skills.`}</p>
            </div>
          </div>
          {p.match.missing.length > 0 && p.match.score !== null && (
            <div className="mt-4 rounded-2xl bg-fg/[0.04] p-3">
              <p className="text-xs font-semibold">Close the gap</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.match.missing.slice(0, 6).map((s) => (
                  <Link key={s} href={`/courses?q=${encodeURIComponent(s)}`} className="rounded-lg px-2 py-1 text-xs ring-1 ring-line hover:bg-fg/5">
                    Learn {s} →
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="glass space-y-3 rounded-[26px] p-5">
          {p.isOwner ? (
            <Link href={`/jobs/recruit/${j.id}`} className={cn("block rounded-2xl py-3 text-center font-semibold text-white", GRADIENT)}>
              Manage applicants
            </Link>
          ) : active ? (
            <div>
              <p className="flex items-center gap-2 font-semibold">
                <BadgeCheck className="size-5 text-teal" /> You applied
              </p>
              <ol className="mt-4 space-y-3 border-l-2 border-line pl-4">
                {app!.history.map((h, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="relative">
                    <span className="absolute top-1 -left-[23px] size-3 rounded-full bg-[#3d8bff] ring-4 ring-bg" />
                    <StageBadge stage={h.stage} />
                    <p className="mt-1 text-xs text-muted">{new Date(h.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
                    {h.note && <p className="mt-1 text-sm">{h.note}</p>}
                  </motion.li>
                ))}
              </ol>
              <Link href="/jobs/applications" className="mt-4 block text-sm font-semibold text-[#6aa6ff]">
                All my applications →
              </Link>
            </div>
          ) : !p.open ? (
            <p className="text-sm text-muted">Applications for this job are closed.</p>
          ) : (
            <>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Note to the recruiter (optional)</span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} placeholder="Why you're a great fit, in 2–3 lines." className={INPUT} />
              </label>
              <button type="button" disabled={busy} onClick={applyNow} className={cn("flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white shadow-lg shadow-[#3d8bff]/25 disabled:opacity-60", GRADIENT)}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Apply in one click
              </button>
              <p className="text-center text-xs text-muted">{p.profileReady ? "Sends your profile and resume." : "You'll need skills and a resume in your profile."}</p>
            </>
          )}
          <Notice msg={msg} />
          {msg?.profile && (
            <Link href={`/jobs/profile?next=/jobs/${j.id}`} className="block rounded-xl py-2.5 text-center text-sm font-semibold ring-1 ring-line hover:bg-fg/5">
              Complete my profile
            </Link>
          )}
          {app?.withdrawn && <p className="text-xs text-muted">You withdrew an earlier application ({STAGE_LABEL[app.stage]}). You can apply again.</p>}
        </section>
      </aside>
    </div>
  );
}
