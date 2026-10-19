"use client";

import { LayoutGroup, motion } from "framer-motion";
import { ArrowLeft, ChevronRight, ExternalLink, FileText, Loader2, Rocket, Trash2, Undo2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { rpc } from "@/lib/rpc";
import { cn } from "@/lib/utils";
import { canMove, EXP_LABEL, MODE_LABEL, STAGE_LABEL, TYPE_LABEL } from "../logic";
import { EXPERIENCE, JOB_TYPES, WORK_MODES, type Application, type Posting, type Stage } from "../types";
import { ago, GRADIENT, INPUT, MatchRing, Notice, SkillInput } from "./bits";

type Candidate = Pick<Application, "id" | "userName" | "email" | "score" | "skills" | "coverNote" | "stage" | "createdAt"> & { matched: string[] };
type Msg = { ok: boolean; text: string } | null;

const COLUMNS: { stage: Stage; tint: string }[] = [
  { stage: "applied", tint: "from-[#3d8bff]/25" },
  { stage: "shortlisted", tint: "from-[#ffb800]/25" },
  { stage: "interview", tint: "from-[#c04dff]/25" },
  { stage: "hired", tint: "from-[#2ee6c5]/25" },
  { stage: "rejected", tint: "from-fg/10" },
];
const NEXT: Partial<Record<Stage, Stage>> = { applied: "shortlisted", shortlisted: "interview", interview: "hired" };

export function PostingWorkspace({ initial, candidates: initialCandidates, initialTab, serverNow }: { initial: Posting; candidates: Candidate[]; initialTab: "applicants" | "details"; serverNow: number }) {
  const [tab, setTab] = useState(initialTab);
  const [p, setP] = useState(initial);
  const [cands, setCands] = useState(initialCandidates);
  const [msg, setMsg] = useState<Msg>(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/jobs/recruit" className="flex items-center gap-2 text-sm font-semibold text-muted hover:text-fg">
          <ArrowLeft className="size-4" /> Recruiter hub
        </Link>
        <h1 className="font-display text-2xl font-bold">{p.title || "New job"}</h1>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", p.hidden ? "bg-rose/15 text-rose" : p.status === "open" ? "bg-teal/15 text-teal" : "bg-fg/10")}>{p.hidden ? "Hidden by review" : p.status === "open" ? "Live" : p.status === "closed" ? "Closed" : "Draft"}</span>
        {p.status === "open" && !p.hidden && (
          <Link href={`/jobs/${p.id}`} className="flex items-center gap-1 text-sm font-semibold text-[#6aa6ff]">
            View listing <ExternalLink className="size-3.5" />
          </Link>
        )}
        <div className="glass ml-auto inline-flex rounded-xl p-1">
          {(
            [
              ["applicants", `Applicants (${cands.length})`],
              ["details", "Job details"],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={cn("relative rounded-lg px-3 py-1.5 text-sm font-semibold", tab === k ? "text-white" : "text-muted")}>
              {tab === k && <motion.span layoutId="ws-tab" className={cn("absolute inset-0 rounded-lg", GRADIENT)} />}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
      </div>
      {p.hidden && <p className="rounded-2xl border border-rose/40 bg-rose/10 p-3 text-sm">Hidden from job seekers: {p.hidden.reason}</p>}
      <Notice msg={msg} />
      {tab === "applicants" ? <Pipeline cands={cands} setCands={setCands} setMsg={setMsg} serverNow={serverNow} /> : <Details p={p} setP={setP} setMsg={setMsg} hasApplicants={cands.length > 0} />}
    </div>
  );
}

function Pipeline({ cands, setCands, setMsg, serverNow }: { cands: Candidate[]; setCands: (f: (c: Candidate[]) => Candidate[]) => void; setMsg: (m: Msg) => void; serverNow: number }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<{ id: string; to: Stage } | null>(null);
  const [note, setNote] = useState("");

  const move = async (c: Candidate, to: Stage, withNote = "") => {
    setBusy(c.id);
    setMsg(null);
    const res = await rpc("recruit.move", c.id, { to, note: withNote }).catch(() => ({ ok: false as const, error: "Something went wrong" }));
    if (res.ok) {
      setCands((all) => all.map((x) => (x.id === c.id ? { ...x, stage: to } : x)));
      setMsg({ ok: true, text: `${c.userName} moved to ${STAGE_LABEL[to]}. They've been notified.` });
      setNoteFor(null);
      setNote("");
    } else setMsg({ ok: false, text: res.error });
    setBusy(null);
  };

  if (!cands.length)
    return (
      <div className="glass rounded-[24px] p-10 text-center">
        <p className="font-semibold">No applicants yet</p>
        <p className="text-sm text-muted">New applications appear here instantly, with a skill match score.</p>
      </div>
    );

  return (
    <LayoutGroup>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {COLUMNS.map((col) => {
          const list = cands.filter((c) => c.stage === col.stage).sort((a, b) => b.score - a.score);
          return (
            <section key={col.stage} className={cn("w-[280px] shrink-0 rounded-[22px] bg-gradient-to-b to-transparent p-3 ring-1 ring-line", col.tint)}>
              <p className="mb-3 flex items-center justify-between px-1 text-sm font-bold">
                {STAGE_LABEL[col.stage]} <span className="rounded-full bg-fg/10 px-2 text-xs tabular-nums">{list.length}</span>
              </p>
              <ul className="space-y-2">
                {list.map((c) => {
                  const next = NEXT[c.stage];
                  return (
                    <motion.li layout layoutId={`cand-${c.id}`} key={c.id} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="rounded-2xl bg-card-solid p-3 shadow-sm ring-1 ring-line">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{c.userName}</p>
                          <p className="truncate text-xs text-muted">{c.email}</p>
                          <p className="text-[11px] text-muted">{ago(c.createdAt, serverNow)}</p>
                        </div>
                        <MatchRing score={c.score} size={42} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {c.skills.slice(0, 6).map((s) => (
                          <span key={s} className={cn("rounded-md px-1.5 py-0.5 text-[11px]", c.matched.includes(s) ? "bg-teal/15 font-semibold text-teal" : "bg-fg/[0.06]")}>
                            {s}
                          </span>
                        ))}
                      </div>
                      {c.coverNote && <p className="mt-2 line-clamp-3 text-xs text-muted">“{c.coverNote}”</p>}
                      <div className="mt-3 flex items-center gap-1.5">
                        <a href={`/api/jobs/applications/${c.id}/resume`} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ring-1 ring-line hover:bg-fg/5">
                          <FileText className="size-3.5" /> Resume
                        </a>
                        {next && canMove(c.stage, next) && (
                          <button type="button" disabled={!!busy} onClick={() => (next === "interview" || next === "hired" ? setNoteFor({ id: c.id, to: next }) : move(c, next))} className={cn("ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-white disabled:opacity-50", GRADIENT)}>
                            {busy === c.id ? <Loader2 className="size-3.5 animate-spin" /> : <ChevronRight className="size-3.5" />} {STAGE_LABEL[next]}
                          </button>
                        )}
                        {canMove(c.stage, "rejected") && (
                          <button type="button" disabled={!!busy} onClick={() => move(c, "rejected")} aria-label={`Reject ${c.userName}`} className={cn("grid size-7 place-items-center rounded-lg text-muted ring-1 ring-line hover:text-rose disabled:opacity-50", !next && "ml-auto")}>
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                      {noteFor?.id === c.id && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 space-y-2 overflow-hidden">
                          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder={noteFor.to === "interview" ? "Interview details (date, time, link)" : "Message for the candidate (joining date, next steps)"} aria-label="Note for the candidate" className={cn(INPUT, "text-xs")} />
                          <div className="flex gap-1.5">
                            <button type="button" onClick={() => setNoteFor(null)} className="flex-1 rounded-lg py-1.5 text-xs font-semibold ring-1 ring-line">
                              Cancel
                            </button>
                            <button type="button" disabled={!!busy} onClick={() => move(c, noteFor.to, note)} className={cn("flex-1 rounded-lg py-1.5 text-xs font-semibold text-white", GRADIENT)}>
                              Move to {STAGE_LABEL[noteFor.to]}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </motion.li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

function Details({ p, setP, setMsg, hasApplicants }: { p: Posting; setP: (f: (p: Posting) => Posting) => void; setMsg: (m: Msg) => void; hasApplicants: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const set = (patch: Partial<Posting>) => setP((x) => ({ ...x, ...patch }));
  const payload = () => ({ title: p.title, type: p.type, workMode: p.workMode, location: p.location, experience: p.experience, salaryMin: p.salaryMin, salaryMax: p.salaryMax, salaryUnit: p.salaryUnit, skills: p.skills, description: p.description, openings: p.openings, deadline: p.deadline });

  const run = async (key: string, job: () => Promise<{ ok: boolean; error?: string }>, okText: string) => {
    setBusy(key);
    setMsg(null);
    try {
      const res = await job();
      setMsg(res.ok ? { ok: true, text: okText } : { ok: false, text: res.error ?? "Something went wrong" });
      return res.ok;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong" });
      return false;
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <section className="glass min-w-0 space-y-4 rounded-[26px] p-5 sm:p-6">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Job title</span>
          <input value={p.title} onChange={(e) => set({ title: e.target.value })} maxLength={100} placeholder="Frontend Developer Intern" className={INPUT} />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Type</span>
            <select value={p.type} onChange={(e) => set({ type: e.target.value as Posting["type"], salaryUnit: e.target.value === "internship" ? "month" : "year" })} className={INPUT}>
              {JOB_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Work mode</span>
            <select value={p.workMode} onChange={(e) => set({ workMode: e.target.value as Posting["workMode"] })} className={INPUT}>
              {WORK_MODES.map((t) => (
                <option key={t} value={t}>
                  {MODE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Experience</span>
            <select value={p.experience} onChange={(e) => set({ experience: e.target.value as Posting["experience"] })} className={INPUT}>
              {EXPERIENCE.map((t) => (
                <option key={t} value={t}>
                  {EXP_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Location</span>
          <input value={p.location} onChange={(e) => set({ location: e.target.value })} maxLength={80} className={INPUT} />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Min pay (₹/{p.salaryUnit === "year" ? "year" : "month"})</span>
            <input type="number" min={0} value={p.salaryMin} onChange={(e) => set({ salaryMin: Number(e.target.value) })} className={INPUT} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Max pay (₹/{p.salaryUnit === "year" ? "year" : "month"})</span>
            <input type="number" min={0} value={p.salaryMax} onChange={(e) => set({ salaryMax: Number(e.target.value) })} className={INPUT} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Openings</span>
            <input type="number" min={1} value={p.openings} onChange={(e) => set({ openings: Number(e.target.value) })} className={INPUT} />
          </label>
        </div>
        <p className="-mt-2 text-xs text-muted">Leave pay at 0 to show “Not disclosed”. Listings with pay get far more applicants.</p>
        <div>
          <span className="mb-1.5 block text-sm font-semibold">Skills needed</span>
          <SkillInput value={p.skills} onChange={(skills) => set({ skills })} suggestions={["JavaScript", "React", "Python", "SQL", "Excel", "Communication", "Java", "Figma"]} />
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Description</span>
          <textarea value={p.description} onChange={(e) => set({ description: e.target.value })} rows={10} maxLength={8000} placeholder={"What you'll do\n- …\n\nWho we're looking for\n- …\n\nPerks\n- …"} className={INPUT} />
        </label>
        <label className="block w-fit">
          <span className="mb-1.5 block text-sm font-semibold">Apply by</span>
          <input type="date" value={p.deadline} onChange={(e) => set({ deadline: e.target.value })} className={INPUT} />
        </label>
      </section>

      <aside className="glass h-fit space-y-2 rounded-[26px] p-5 lg:sticky lg:top-24">
        <button type="button" disabled={!!busy} onClick={() => run("save", () => rpc("recruit.save", p.id, payload()), "Saved")} className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold ring-1 ring-line hover:bg-fg/5 disabled:opacity-50">
          {busy === "save" && <Loader2 className="size-4 animate-spin" />} Save
        </button>
        {p.status !== "open" ? (
          <button
            type="button"
            disabled={!!busy}
            onClick={async () => {
              const ok = await run(
                "open",
                async () => {
                  const saved = await rpc("recruit.save", p.id, payload());
                  return saved.ok ? rpc("recruit.status", p.id, "open") : saved;
                },
                "Published! Your job is live for candidates.",
              );
              if (ok) set({ status: "open" });
            }}
            className={cn("flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50", GRADIENT)}
          >
            {busy === "open" ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />} {p.status === "closed" ? "Reopen" : "Publish"}
          </button>
        ) : (
          <button type="button" disabled={!!busy} onClick={async () => (await run("close", () => rpc("recruit.status", p.id, "closed"), "Closed. Existing applicants stay in your pipeline.")) && set({ status: "closed" })} className="flex w-full items-center justify-center gap-2 rounded-xl bg-fg/10 py-2.5 text-sm font-semibold disabled:opacity-50">
            <Undo2 className="size-4" /> Close applications
          </button>
        )}
        {!hasApplicants && (
          <button
            type="button"
            disabled={!!busy}
            onClick={async () => {
              if (window.confirm("Delete this job?") && (await run("del", () => rpc("recruit.delete", p.id), "Deleted"))) router.push("/jobs/recruit");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold text-rose hover:bg-rose/10"
          >
            <Trash2 className="size-4" /> Delete
          </button>
        )}
      </aside>
    </div>
  );
}
