"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, Bookmark, BookmarkCheck, Briefcase, ExternalLink, Globe2, IndianRupee, Loader2, MapPin, Search, SlidersHorizontal, UserRoundPen } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { rpc } from "@/lib/rpc";
import { cn } from "@/lib/utils";
import { EXP_LABEL, filterPostings, matchesQuery, MODE_LABEL, normSkill, TYPE_LABEL, type JobFilters } from "../logic";
import { EXPERIENCE, JOB_TYPES, WORK_MODES, type Experience, type ExternalJob, type JobType, type Stage, type WorkMode } from "../types";
import { ago, CompanyMark, GRADIENT, MatchRing, Notice, StageBadge } from "./bits";

export interface PostingCard {
  id: string;
  title: string;
  companyName: string;
  type: JobType;
  workMode: WorkMode;
  location: string;
  experience: Experience;
  salary: string;
  skills: string[];
  description: string;
  publishedAt: string;
  deadline: string;
  score: number | null;
  applied: Stage | null;
}

type Source = "india" | "internal" | "remote";
const PAGE = 20;

export interface SearchProps {
  postings: PostingCard[];
  remote: ExternalJob[];
  remoteSyncedAt: string | null;
  india: { configured: boolean; cities: readonly string[]; categories: { tag: string; label: string }[] };
  saved: string[];
  mySkills: string[];
  hasProfile: boolean;
  isAdmin: boolean;
  serverNow: number;
}

export function JobSearch(p: SearchProps) {
  const [f, setF] = useState<JobFilters>({ q: "", type: null, workMode: null, experience: null, location: "" });
  const [category, setCategory] = useState<string | null>(null);
  const [source, setSource] = useState<Source>(p.india.configured ? "india" : p.postings.length ? "internal" : "remote");
  const [sort, setSort] = useState<"match" | "new">(p.mySkills.length ? "match" : "new");
  const [saved, setSaved] = useState(() => new Set(p.saved));
  const [limit, setLimit] = useState(PAGE);
  const [showFilters, setShowFilters] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const mine = useMemo(() => new Set(p.mySkills.map(normSkill)), [p.mySkills]);

  const internal = useMemo(() => filterPostings(p.postings, f).sort((a, b) => (sort === "match" ? (b.score ?? -1) - (a.score ?? -1) : 0) || b.publishedAt.localeCompare(a.publishedAt)), [p.postings, f, sort]);
  const remote = useMemo(
    () =>
      p.remote
        .filter((j) => (!f.q || matchesQuery(`${j.title} ${j.company} ${j.tags.join(" ")} ${j.category}`, f.q)) && (!f.type || j.type === f.type) && (!f.workMode || f.workMode === "remote") && (!f.location || /remote|worldwide|anywhere/i.test(f.location) || j.location.toLowerCase().includes(f.location.toLowerCase())))
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    [p.remote, f],
  );

  const toggleSave = async (id: string, snapshot?: { title: string; company: string; url: string; source: "adzuna" | "remotive" }) => {
    setSaved((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    try {
      const res = await rpc("jobs.save", id, snapshot);
      if (!res.ok) setMsg({ ok: false, text: res.error });
    } catch {}
  };

  const set = (patch: Partial<JobFilters>) => {
    setF((x) => ({ ...x, ...patch }));
    setLimit(PAGE);
  };
  const chip = (active: boolean) => cn("rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors", active ? "bg-[#3d8bff]/20 text-fg ring-[#3d8bff]/60" : "text-muted ring-line hover:text-fg");

  return (
    <div className="space-y-5">
      {!p.hasProfile && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-3 rounded-[22px] bg-gradient-to-r from-[#3d8bff]/20 to-[#2ee6c5]/15 p-4 ring-1 ring-[#3d8bff]/40">
          <UserRoundPen className="size-5 text-[#6aa6ff]" />
          <p className="flex-1 text-sm">
            <b>Add your skills and resume</b> to see your match score and apply in one click to jobs posted on Glideinbir.
          </p>
          <Link href="/jobs/profile" className={cn("rounded-xl px-4 py-2 text-sm font-semibold text-white", GRADIENT)}>
            Set up profile
          </Link>
        </motion.div>
      )}

      <div className="glass flex flex-col gap-2 rounded-[22px] p-2 sm:flex-row">
        <label className="flex flex-1 items-center gap-2 px-3">
          <Search className="size-4 text-muted" />
          <span className="sr-only">Search jobs</span>
          <input value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="Role, skill or company (e.g. react developer)" className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted" />
        </label>
        <label className="flex items-center gap-2 border-line px-3 sm:border-l">
          <MapPin className="size-4 text-muted" />
          <span className="sr-only">Location</span>
          <input value={f.location} onChange={(e) => set({ location: e.target.value })} placeholder="City (e.g. Pune)" className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted sm:w-40" />
        </label>
        <button type="button" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters} className="flex items-center justify-center gap-2 rounded-xl bg-fg/[0.06] px-4 py-2.5 text-sm font-semibold hover:bg-fg/10">
          <SlidersHorizontal className="size-4" /> Filters
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="glass space-y-3 rounded-[22px] p-4">
              {(
                [
                  ["Type", JOB_TYPES, TYPE_LABEL, "type"],
                  ["Work mode", WORK_MODES, MODE_LABEL, "workMode"],
                  ["Experience", EXPERIENCE, EXP_LABEL, "experience"],
                ] as const
              ).map(([label, values, names, key]) => (
                <div key={key} className="flex flex-wrap items-center gap-2">
                  <span className="w-24 text-xs font-semibold text-muted uppercase">{label}</span>
                  {values.map((v) => (
                    <button key={v} type="button" aria-pressed={f[key] === v} onClick={() => set({ [key]: f[key] === v ? null : v } as Partial<JobFilters>)} className={chip(f[key] === v)}>
                      {(names as Record<string, string>)[v]}
                    </button>
                  ))}
                </div>
              ))}
              <p className="text-xs text-muted">Work mode and experience apply to jobs posted on Glideinbir.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["india", "Across India"],
            ["internal", `On Glideinbir (${internal.length})`],
            ["remote", `Remote worldwide (${remote.length})`],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setSource(k)} className={cn("relative rounded-full px-3.5 py-1.5 text-xs font-bold", source === k ? "text-white" : "text-muted ring-1 ring-line hover:text-fg")}>
            {source === k && <motion.span layoutId="job-source" className={cn("absolute inset-0 rounded-full", GRADIENT)} />}
            <span className="relative">{label}</span>
          </button>
        ))}
        {source === "internal" && (
          <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-muted">
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value as "match" | "new")} className="rounded-lg bg-fg/[0.05] px-2 py-1.5 ring-1 ring-line outline-none">
              <option value="match">Best match</option>
              <option value="new">Newest</option>
            </select>
          </label>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const res = await rpc("jobs.alert", { query: f.q.trim(), type: f.type, workMode: f.workMode });
              setMsg(res.ok ? { ok: true, text: "Alert saved. We'll email you new matching jobs posted on Glideinbir once a day." } : { ok: false, text: res.error });
            } catch (e) {
              setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong" });
            }
            setBusy(false);
          }}
          className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#6aa6ff] ring-1 ring-[#3d8bff]/40 hover:bg-[#3d8bff]/10", source !== "internal" && "ml-auto")}
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Bell className="size-3.5" />} Alert me
        </button>
      </div>

      <Notice msg={msg} />

      {source === "india" && <IndiaJobs f={f} category={category} setCategory={setCategory} setLocation={(location) => set({ location })} india={p.india} isAdmin={p.isAdmin} saved={saved} toggleSave={toggleSave} serverNow={p.serverNow} />}

      {source === "internal" && (
        <section className="space-y-3">
          {internal.length === 0 ? (
            <div className="glass rounded-[24px] p-10 text-center">
              <Briefcase className="mx-auto size-8 text-muted" />
              <p className="mt-3 font-semibold">{p.postings.length ? "No jobs match these filters" : "Companies are just starting to post here"}</p>
              <p className="text-sm text-muted">Jobs posted on Glideinbir get a skill match and one-click apply.</p>
              <button type="button" onClick={() => setSource(p.india.configured ? "india" : "remote")} className={cn("mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white", GRADIENT)}>
                {p.india.configured ? "Browse jobs across India" : "See remote jobs"}
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {internal.map((j, i) => (
                <motion.li key={j.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
                  <div className="glass group relative flex gap-4 rounded-[22px] p-5 transition-transform hover:-translate-y-0.5">
                    <CompanyMark name={j.companyName} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/jobs/${j.id}`} className="font-display text-lg leading-tight font-bold after:absolute after:inset-0 group-hover:text-[#6aa6ff]">
                        {j.title}
                      </Link>
                      <p className="text-sm text-muted">{j.companyName}</p>
                      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5" /> {j.workMode === "remote" ? "Remote" : `${j.location} · ${MODE_LABEL[j.workMode]}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <IndianRupee className="size-3.5" /> {j.salary}
                        </span>
                        <span>{TYPE_LABEL[j.type]}</span>
                        <span>{EXP_LABEL[j.experience]}</span>
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {j.skills.slice(0, 8).map((s) => (
                          <span key={s} className={cn("rounded-lg px-2 py-0.5 text-xs", mine.has(normSkill(s)) ? "bg-teal/15 font-semibold text-teal" : "bg-fg/[0.06]")}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="relative z-10 flex flex-col items-end justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <MatchRing score={j.score} />
                        <SaveButton saved={saved.has(j.id)} onClick={() => toggleSave(j.id)} />
                      </div>
                      {j.applied ? <StageBadge stage={j.applied} /> : <span className="text-xs text-muted">{ago(j.publishedAt, p.serverNow)}</span>}
                    </div>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </section>
      )}

      {source === "remote" && (
        <section className="space-y-3">
          <p className="flex items-center gap-2 text-xs text-muted">
            <Globe2 className="size-4" /> Live listings from
            <a href="https://remotive.com" target="_blank" rel="noopener" className="font-semibold text-fg underline">
              Remotive
            </a>
            {p.remoteSyncedAt && `· updated ${ago(p.remoteSyncedAt, p.serverNow).toLowerCase()}`}. Apply on their site.
          </p>
          {remote.length === 0 ? (
            <p className="glass rounded-[22px] p-8 text-center text-sm text-muted">{p.remote.length ? "No remote jobs match these filters." : "Remote listings are loading. Check back in a few minutes."}</p>
          ) : (
            <ExternalGrid jobs={remote.slice(0, limit)} saved={saved} toggleSave={toggleSave} mine={mine} serverNow={p.serverNow} />
          )}
          {remote.length > limit && (
            <div className="text-center">
              <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="rounded-xl px-5 py-2.5 text-sm font-semibold ring-1 ring-line hover:bg-fg/5">
                Show more ({remote.length - limit} left)
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* ---------------- Across India (live search) ---------------- */

function IndiaJobs({ f, category, setCategory, setLocation, india, isAdmin, saved, toggleSave, serverNow }: { f: JobFilters; category: string | null; setCategory: (c: string | null) => void; setLocation: (c: string) => void; india: SearchProps["india"]; isAdmin: boolean; saved: Set<string>; toggleSave: (id: string, snap?: { title: string; company: string; url: string; source: "adzuna" | "remotive" }) => void; serverNow: number }) {
  const [jobs, setJobs] = useState<ExternalJob[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const load = useCallback(
    async (pageNo: number) => {
      if (!india.configured) return;
      const my = ++seq.current;
      setLoading(true);
      setError(null);
      try {
        const res = await rpc("jobs.search", { q: f.q, where: f.location, category, type: f.type, page: pageNo });
        if (my !== seq.current) return; // a newer search started
        if (!res.ok) setError(res.error);
        else {
          setCount(res.count);
          setPage(pageNo);
          setJobs((prev) => (pageNo === 1 ? res.jobs : [...prev, ...res.jobs.filter((j) => !prev.some((x) => x.id === j.id))]));
        }
      } catch (e) {
        if (my === seq.current) setError(e instanceof Error ? e.message : "Search failed");
      }
      if (my === seq.current) setLoading(false);
    },
    [india.configured, f.q, f.location, f.type, category],
  );

  // New search 400 ms after typing stops.
  useEffect(() => {
    const t = setTimeout(() => void load(1), 400);
    return () => clearTimeout(t);
  }, [load]);

  if (!india.configured)
    return (
      <div className="glass rounded-[24px] p-8 text-center">
        <Globe2 className="mx-auto size-9 text-[#6aa6ff]" />
        <p className="mt-3 font-display text-xl font-bold">Lakhs of live jobs across India, coming soon</p>
        <p className="mx-auto mt-1 max-w-lg text-sm text-muted">{isAdmin ? "Add ADZUNA_APP_ID and ADZUNA_APP_KEY to .env.local (free at developer.adzuna.com) and restart: every city and category fills up with real listings." : "We're connecting a live job feed for every Indian city. Meanwhile, see jobs posted on Glideinbir and remote roles."}</p>
      </div>
    );

  const where = f.location.trim() || "India";
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {["", ...india.cities].map((c) => {
          const active = (c || "") === f.location.trim();
          return (
            <button key={c || "all"} type="button" onClick={() => setLocation(c)} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold ring-1", active ? "bg-[#3d8bff]/20 ring-[#3d8bff]/60" : "text-muted ring-line hover:text-fg")}>
              {c || "All India"}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[{ tag: "", label: "All categories" }, ...india.categories].map((c) => {
          const active = (category ?? "") === c.tag;
          return (
            <button key={c.tag || "all"} type="button" onClick={() => setCategory(c.tag || null)} className={cn("relative rounded-full px-3 py-1.5 text-xs font-semibold", active ? "text-white" : "bg-fg/[0.05] text-muted hover:text-fg")}>
              {active && <motion.span layoutId="adz-cat" className={cn("absolute inset-0 rounded-full", GRADIENT)} />}
              <span className="relative">{c.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="font-display text-xl font-bold">
          {count === null ? (
            "Searching…"
          ) : (
            <>
              <motion.span key={count} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="tabular-nums">
                {count.toLocaleString("en-IN")}
              </motion.span>{" "}
              jobs in {where}
            </>
          )}
        </p>
        <a href="https://www.adzuna.in" target="_blank" rel="noopener" className="text-xs font-semibold text-muted hover:text-fg">
          Jobs by <span className="text-fg">Adzuna</span>
        </a>
      </div>

      {error && <p className="rounded-xl bg-rose/10 p-3 text-sm text-rose">{error}</p>}
      {count === 0 && !loading && <p className="glass rounded-[22px] p-8 text-center text-sm text-muted">No jobs for this search. Try another city or fewer words.</p>}
      <ExternalGrid jobs={jobs} saved={saved} toggleSave={toggleSave} mine={new Set()} serverNow={serverNow} />
      {loading && (
        <p className="flex items-center justify-center gap-2 py-4 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" /> Loading jobs…
        </p>
      )}
      {!loading && count !== null && jobs.length < count && page < 30 && (
        <div className="text-center">
          <button type="button" onClick={() => load(page + 1)} className="rounded-xl px-5 py-2.5 text-sm font-semibold ring-1 ring-line hover:bg-fg/5">
            Load more ({(count - jobs.length).toLocaleString("en-IN")} more)
          </button>
        </div>
      )}
    </section>
  );
}

function ExternalGrid({ jobs, saved, toggleSave, mine, serverNow }: { jobs: ExternalJob[]; saved: Set<string>; toggleSave: (id: string, snap?: { title: string; company: string; url: string; source: "adzuna" | "remotive" }) => void; mine: Set<string>; serverNow: number }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {jobs.map((j, i) => (
        <motion.li key={j.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i % PAGE, 10) * 0.03 }} className="glass flex flex-col rounded-[22px] p-4">
          <div className="flex gap-3">
            <CompanyMark name={j.company} logo={j.logo} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 leading-snug font-semibold">{j.title}</p>
              <p className="truncate text-xs text-muted">
                {j.company} · {j.location}
              </p>
            </div>
            <SaveButton saved={saved.has(j.id)} onClick={() => toggleSave(j.id, { title: j.title, company: j.company, url: j.url, source: j.source })} />
          </div>
          {j.excerpt && <p className="mt-2 line-clamp-2 text-xs text-muted">{j.excerpt}</p>}
          {j.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {j.tags.slice(0, 5).map((t) => (
                <span key={t} className={cn("rounded-md px-1.5 py-0.5 text-[11px]", mine.has(normSkill(t)) ? "bg-teal/15 font-semibold text-teal" : "bg-fg/[0.06]")}>
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-muted">
            <span className="truncate">{[j.type && j.type.replace(/^\w/, (c) => c.toUpperCase()), j.salary, ago(j.publishedAt, serverNow)].filter(Boolean).join(" · ")}</span>
            <a href={j.url} target="_blank" rel="noopener" className="flex shrink-0 items-center gap-1 rounded-lg bg-fg/[0.06] px-2.5 py-1.5 font-semibold text-fg hover:bg-fg/10">
              Apply <ExternalLink className="size-3.5" />
            </a>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}

function SaveButton({ saved, onClick }: { saved: boolean; onClick: () => void }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.85 }} onClick={onClick} aria-pressed={saved} aria-label={saved ? "Unsave job" : "Save job"} className={cn("relative z-10 grid size-9 shrink-0 place-items-center rounded-xl ring-1 transition-colors", saved ? "bg-saffron/15 text-saffron ring-saffron/40" : "text-muted ring-line hover:text-fg")}>
      {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
    </motion.button>
  );
}
