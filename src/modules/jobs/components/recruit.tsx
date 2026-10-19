"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, Hourglass, Loader2, Megaphone, Pencil, Plus, Settings2, Sparkles, Target, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { rpc } from "@/lib/rpc";
import { cn } from "@/lib/utils";
import { STAGE_LABEL, TYPE_LABEL } from "../logic";
import type { Company, JobType, Stage } from "../types";
import { CompanyMark, GRADIENT, INPUT, Notice } from "./bits";

type CompanyForm = Pick<Company, "name" | "website" | "about" | "location" | "size">;
const SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"] as const;

function CompanyFields({ v, set }: { v: CompanyForm; set: (v: CompanyForm) => void }) {
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Company name</span>
        <input value={v.name} onChange={(e) => set({ ...v, name: e.target.value })} maxLength={80} className={INPUT} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Website</span>
          <input value={v.website} onChange={(e) => set({ ...v, website: e.target.value })} placeholder="https://…" className={INPUT} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Headquarters</span>
          <input value={v.location} onChange={(e) => set({ ...v, location: e.target.value })} placeholder="Pune" maxLength={80} className={INPUT} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Team size</span>
        <select value={v.size} onChange={(e) => set({ ...v, size: e.target.value })} className={INPUT}>
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s} people
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">About the company</span>
        <textarea value={v.about} onChange={(e) => set({ ...v, about: e.target.value })} rows={4} maxLength={1500} placeholder="What you build, culture, why people love working here." className={INPUT} />
      </label>
    </div>
  );
}

export function CompanyOnboarding({ company }: { company: Company | null }) {
  const [submitted, setSubmitted] = useState<Company | null>(null);
  const [v, setV] = useState<CompanyForm>({ name: company?.name ?? "", website: company?.website ?? "", about: company?.about ?? "", location: company?.location ?? "", size: company?.size ?? "11-50" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (submitted) return <CompanyPending company={submitted} />;
  const perks = [
    { icon: Users, title: "Reach motivated learners", text: "Students who are actively upskilling on Glideinbir." },
    { icon: Target, title: "Skill match on every applicant", text: "See at a glance how well each candidate fits." },
    { icon: Megaphone, title: "Simple pipeline", text: "Shortlist, interview and hire. Candidates are updated automatically." },
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_460px]">
      <div className="space-y-4">
        <h2 className="font-display text-3xl font-bold tracking-tight">Hire from Glideinbir</h2>
        <p className="text-muted">Create your company page. Once our team verifies it, you can post jobs and internships for free.</p>
        {perks.map((p, i) => (
          <motion.div key={p.title} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }} className="glass flex items-start gap-4 rounded-[22px] p-5">
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl text-white", GRADIENT)}>
              <p.icon className="size-5" />
            </span>
            <div>
              <p className="font-semibold">{p.title}</p>
              <p className="text-sm text-muted">{p.text}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <section className="glass space-y-4 rounded-[28px] p-6">
        {company?.status === "rejected" && (
          <p className="flex gap-2 rounded-2xl border border-rose/40 bg-rose/10 p-3 text-sm">
            <CircleAlert className="size-4 shrink-0 text-rose" /> Not approved{company.adminNote ? `: ${company.adminNote}` : "."} Update the details and submit again.
          </p>
        )}
        <CompanyFields v={v} set={setV} />
        <Notice msg={msg} />
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            try {
              const res = await rpc("recruit.company", v);
              // Show the pending state right here (a same-URL refresh isn't reliably committed).
              if (res.ok) setSubmitted({ ...(company ?? { id: "", ownerId: "", createdAt: "", updatedAt: "" }), ...v, status: "pending" });
              else setMsg({ ok: false, text: res.error });
            } catch (e) {
              setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong" });
            }
            setBusy(false);
          }}
          className={cn("flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white disabled:opacity-60", GRADIENT)}
        >
          {busy && <Loader2 className="size-4 animate-spin" />} Submit for verification
        </button>
      </section>
    </div>
  );
}

export function CompanyPending({ company }: { company: Company }) {
  const pending = company.status === "pending";
  return (
    <div className="glass mx-auto max-w-xl rounded-[28px] p-10 text-center">
      <motion.span animate={pending ? { rotate: [0, 180, 180, 360] } : {}} transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.4, 0.6, 1] }} className={cn("mx-auto grid size-16 place-items-center rounded-3xl text-white", pending ? GRADIENT : "bg-rose")}>
        {pending ? <Hourglass className="size-7" /> : <CircleAlert className="size-7" />}
      </motion.span>
      <p className="mt-4 font-display text-2xl font-bold">{pending ? "Verifying your company" : "Company page suspended"}</p>
      <p className="mt-2 text-sm text-muted">{pending ? `We're checking ${company.name}. You'll get a notification as soon as you can post jobs.` : company.adminNote || "Contact support for details."}</p>
    </div>
  );
}

export interface PostingRow {
  id: string;
  title: string;
  type: JobType;
  status: "draft" | "open" | "closed";
  hidden: string | null;
  deadline: string;
  counts: Record<Stage, number>;
  total: number;
}

export function RecruiterDashboard({ company, postings }: { company: Company; postings: PostingRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState<CompanyForm>({ name: company.name, website: company.website, about: company.about, location: company.location, size: company.size });
  const totals = postings.reduce((s, p) => ({ apps: s.apps + p.total, open: s.open + (p.status === "open" && !p.hidden ? 1 : 0), hired: s.hired + p.counts.hired }), { apps: 0, open: 0, hired: 0 });

  return (
    <div className="space-y-6">
      <div className="glass flex flex-wrap items-center gap-4 rounded-[26px] p-5">
        <CompanyMark name={company.name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl font-bold">{company.name}</p>
          <p className="text-sm text-muted">
            {company.location} · {company.size} people
          </p>
        </div>
        {[
          ["Open jobs", totals.open],
          ["Applicants", totals.apps],
          ["Hired", totals.hired],
        ].map(([l, n]) => (
          <div key={l} className="px-3 text-center">
            <p className="font-display text-2xl font-bold tabular-nums">{n}</p>
            <p className="text-xs text-muted">{l}</p>
          </div>
        ))}
        <button type="button" onClick={() => setEdit((e) => !e)} aria-label="Company settings" className="grid size-10 place-items-center rounded-xl ring-1 ring-line hover:bg-fg/5">
          <Settings2 className="size-4" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {edit && (
          <motion.section initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="glass space-y-4 rounded-[26px] p-5">
              <CompanyFields v={v} set={setV} />
              <button
                type="button"
                disabled={!!busy}
                onClick={async () => {
                  setBusy("company");
                  const res = await rpc("recruit.updateCompany", v).catch(() => ({ ok: false as const, error: "Something went wrong" }));
                  setMsg(res.ok ? { ok: true, text: "Company page updated" } : { ok: false, text: res.error });
                  setBusy(null);
                }}
                className={cn("rounded-xl px-5 py-2.5 text-sm font-semibold text-white", GRADIENT)}
              >
                Save company
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <Notice msg={msg} />

      <section className="glass rounded-[26px] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold">Your jobs</h2>
          <button
            type="button"
            disabled={!!busy}
            onClick={async () => {
              setBusy("new");
              const res = await rpc("recruit.create").catch(() => ({ ok: false as const, error: "Something went wrong" }));
              if (res.ok) return router.push(`/jobs/recruit/${res.id}?tab=details`);
              setMsg({ ok: false, text: res.error });
              setBusy(null);
            }}
            className={cn("flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60", GRADIENT)}
          >
            {busy === "new" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Post a job
          </button>
        </div>
        {postings.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line p-8 text-center">
            <Sparkles className="mx-auto size-7 text-muted" />
            <p className="mt-2 font-semibold">Post your first job or internship</p>
            <p className="text-sm text-muted">It&apos;s free. Add the skills you need and we&apos;ll show each applicant&apos;s match.</p>
          </div>
        ) : (
          <ul className="mt-5 divide-y divide-line">
            {postings.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/jobs/recruit/${p.id}`} className="font-semibold hover:text-[#6aa6ff]">
                    {p.title || "Untitled job"}
                  </Link>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className={cn("rounded-full px-2 py-0.5 font-bold", p.hidden ? "bg-rose/15 text-rose" : p.status === "open" ? "bg-teal/15 text-teal" : "bg-fg/10")}>{p.hidden ? "Hidden by review" : p.status === "open" ? "Live" : p.status === "closed" ? "Closed" : "Draft"}</span>
                    {TYPE_LABEL[p.type]} · apply by {p.deadline}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {(["applied", "shortlisted", "interview", "hired"] as Stage[]).map((s) => (
                    <span key={s} title={STAGE_LABEL[s]} className="min-w-12 rounded-lg bg-fg/[0.05] px-2 py-1 text-center">
                      <span className="block font-display text-sm font-bold tabular-nums">{p.counts[s]}</span>
                      <span className="block text-[10px] text-muted">{STAGE_LABEL[s]}</span>
                    </span>
                  ))}
                </div>
                <Link href={`/jobs/recruit/${p.id}`} aria-label={`Manage ${p.title}`} className="grid size-9 place-items-center rounded-xl ring-1 ring-line hover:bg-fg/5">
                  <Pencil className="size-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
