"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CalendarDays, CalendarOff, Eye, IndianRupee, Loader2, Plus, Sparkles, Star, Trash2, Users, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { rpc } from "@/lib/rpc";
import { cn, formatPaise } from "@/lib/utils";
import { fmtDay, fmtTime, fmtWhen, istDate, slotsAhead, weeklyError } from "../logic";
import type { Review } from "../queries";
import { BUFFERS, SESSION_LENGTHS, WEEKDAYS, type AvailabilityWindow, type Booking, type MentorProfile } from "../types";
import { Avatar, countdown, GRADIENT, Notice, Stars, useNow } from "./bits";

export interface StudioProps {
  profile: MentorProfile | null;
  name: string;
  userId: string;
  upcoming: Booking[];
  stats: { earned: number; sessions: number; rating: number | null; ratings: number };
  reviews: Review[];
  serverNow: number;
}

const INPUT = "w-full rounded-xl bg-fg/[0.05] px-3 py-2.5 text-sm ring-1 ring-line outline-none placeholder:text-muted focus:ring-[#ff4da6]/60";

/** Monday first, the way people plan a week. */
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const PRESETS: { label: string; windows: AvailabilityWindow[] }[] = [
  { label: "Weekday evenings", windows: [1, 2, 3, 4, 5].map((day) => ({ day, start: "18:00", end: "21:00" })) },
  { label: "Weekend mornings", windows: [6, 0].map((day) => ({ day, start: "09:00", end: "13:00" })) },
  { label: "Office hours", windows: [1, 2, 3, 4, 5].map((day) => ({ day, start: "10:00", end: "17:00" })) },
];

export function Studio(p: StudioProps) {
  const now = useNow(p.serverNow);
  const init = p.profile;
  const [headline, setHeadline] = useState(init?.headline ?? "");
  const [bio, setBio] = useState(init?.bio ?? "");
  const [expertise, setExpertise] = useState<string[]>(init?.expertise ?? []);
  const [topic, setTopic] = useState("");
  const [sessionMin, setSessionMin] = useState(init?.sessionMin ?? 45);
  const [bufferMin, setBufferMin] = useState(init?.bufferMin ?? 15);
  const [price, setPrice] = useState(String((init?.price ?? 49900) / 100));
  const [weekly, setWeekly] = useState<AvailabilityWindow[]>(init?.weekly ?? []);
  const [leaves, setLeaves] = useState<string[]>(init?.leaves ?? []);
  const [leaveInput, setLeaveInput] = useState("");
  const [published, setPublished] = useState(init?.published ?? false);
  const [saved, setSaved] = useState(!!init);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const scheduleError = weeklyError(weekly, sessionMin);
  const preview = useMemo(() => {
    if (scheduleError) return [];
    return slotsAhead({ weekly, leaves, sessionMin, bufferMin }, p.upcoming, p.serverNow).flatMap((d) => d.slots);
  }, [weekly, leaves, sessionMin, bufferMin, p.upcoming, p.serverNow, scheduleError]);

  const setWindow = (i: number, patch: Partial<AvailabilityWindow>) => setWeekly((all) => all.map((w, j) => (j === i ? { ...w, ...patch } : w)));
  const addWindow = (day: number) =>
    setWeekly((all) => {
      const last = all.filter((w) => w.day === day).sort((a, b) => a.end.localeCompare(b.end)).at(-1);
      const startH = last ? Math.min(22, Number(last.end.slice(0, 2)) + 1) : 18;
      return [...all, { day, start: `${String(startH).padStart(2, "0")}:00`, end: `${String(Math.min(23, startH + 2)).padStart(2, "0")}:${startH + 2 > 23 ? "59" : "00"}` }];
    });
  const addTopic = () => {
    const t = topic.trim();
    if (t.length >= 2 && !expertise.includes(t) && expertise.length < 8) setExpertise((x) => [...x, t]);
    setTopic("");
  };

  async function save(nextPublished = published) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await rpc("mentorStudio.save", { headline, bio, expertise, sessionMin, bufferMin, priceRupees: Number(price), weekly, leaves, published: nextPublished });
      if (res.ok) {
        setPublished(nextPublished);
        setSaved(true);
        setMsg({ ok: true, text: nextPublished ? "Saved. Your calendar is live for learners." : "Saved. Your profile is hidden from learners." });
      } else setMsg({ ok: false, text: res.error });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong" });
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { icon: IndianRupee, label: "Earned", value: formatPaise(p.stats.earned), tint: "text-teal" },
          { icon: CalendarDays, label: "Upcoming", value: String(p.upcoming.length), tint: "text-[#ff4da6]" },
          { icon: Users, label: "Sessions done", value: String(p.stats.sessions), tint: "text-primary" },
          { icon: Star, label: p.stats.ratings ? `Rating (${p.stats.ratings})` : "No ratings yet", value: p.stats.rating ? p.stats.rating.toFixed(1) : "—", tint: "text-saffron" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="glass rounded-[24px] p-5">
            <s.icon className={cn("size-5", s.tint)} />
            <p className="mt-3 font-display text-3xl font-bold tabular-nums">{s.value}</p>
            <p className="text-sm text-muted">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          {/* Upcoming */}
          <section className="glass rounded-[28px] p-5 sm:p-6">
            <h2 className="font-display text-xl font-bold">Upcoming sessions</h2>
            {p.upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-muted">{published ? "No bookings yet. They'll show up here the moment a learner books." : "Go live to start taking bookings."}</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {p.upcoming.map((b) => {
                  const ms = Date.parse(b.start) - now;
                  return (
                    <li key={b.id}>
                      <Link href={`/mentorship/bookings/${b.id}`} className="flex items-center gap-3 rounded-2xl bg-fg/[0.04] p-3 ring-1 ring-line transition-colors hover:bg-fg/[0.07]">
                        <Avatar name={b.studentName} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {b.studentName} · {fmtWhen(b.start)}
                          </p>
                          <p className="truncate text-xs text-muted">{b.agenda}</p>
                        </div>
                        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums", ms < 15 * 60_000 ? "bg-[#ff4da6]/15 text-[#ff6fb8]" : "bg-fg/[0.06] text-muted")}>{ms > 0 ? `in ${countdown(ms)}` : "now"}</span>
                        <ArrowRight className="size-4 text-muted" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Weekly availability */}
          <section className="glass rounded-[28px] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold">Weekly availability</h2>
                <p className="text-sm text-muted">Your openings every week, in IST. Learners only see slots that are still free.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {PRESETS.map((pr) => (
                <button key={pr.label} type="button" onClick={() => setWeekly((all) => [...all.filter((w) => !pr.windows.some((x) => x.day === w.day)), ...pr.windows])} className="flex items-center gap-1.5 rounded-full bg-fg/[0.05] px-3 py-1.5 text-xs font-semibold ring-1 ring-line hover:bg-fg/[0.09]">
                  <Sparkles className="size-3.5 text-[#ff4da6]" /> {pr.label}
                </button>
              ))}
              {weekly.length > 0 && (
                <button type="button" onClick={() => setWeekly([])} className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted hover:text-rose">
                  Clear all
                </button>
              )}
            </div>

            <div className="mt-5 divide-y divide-line">
              {ORDER.map((day) => {
                const rows = weekly.map((w, i) => ({ w, i })).filter((x) => x.w.day === day);
                return (
                  <div key={day} className="flex flex-wrap items-start gap-3 py-3">
                    <span className={cn("w-12 pt-2 text-sm font-bold", rows.length ? "" : "text-muted")}>{WEEKDAYS[day]}</span>
                    <div className="min-w-0 flex-1 space-y-2">
                      {rows.length === 0 && <p className="pt-2 text-sm text-muted">Unavailable</p>}
                      <AnimatePresence initial={false}>
                        {rows.map(({ w, i }) => (
                          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2">
                            <input type="time" step={900} value={w.start} onChange={(e) => setWindow(i, { start: e.target.value })} aria-label={`${WEEKDAYS[day]} from`} className="rounded-xl bg-fg/[0.05] px-3 py-2 text-sm tabular-nums ring-1 ring-line outline-none focus:ring-[#ff4da6]/60" />
                            <span className="text-muted">–</span>
                            <input type="time" step={900} value={w.end} onChange={(e) => setWindow(i, { end: e.target.value })} aria-label={`${WEEKDAYS[day]} until`} className="rounded-xl bg-fg/[0.05] px-3 py-2 text-sm tabular-nums ring-1 ring-line outline-none focus:ring-[#ff4da6]/60" />
                            <button type="button" onClick={() => setWeekly((all) => all.filter((_, j) => j !== i))} aria-label="Remove opening" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-rose/10 hover:text-rose">
                              <Trash2 className="size-4" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                    <button type="button" onClick={() => addWindow(day)} aria-label={`Add opening on ${WEEKDAYS[day]}`} className="mt-1 grid size-8 place-items-center rounded-lg ring-1 ring-line hover:bg-fg/5">
                      <Plus className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            {scheduleError && <p className="mt-2 text-sm text-rose">{scheduleError}</p>}
          </section>

          {/* Leaves */}
          <section className="glass rounded-[28px] p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold">
              <CalendarOff className="size-5 text-[#ff4da6]" /> Days off
            </h2>
            <p className="text-sm text-muted">No slots are offered on these dates. Existing bookings stay as they are.</p>
            <div className="mt-4 flex gap-2">
              <input type="date" value={leaveInput} min={istDate(p.serverNow)} onChange={(e) => setLeaveInput(e.target.value)} aria-label="Day off" className="rounded-xl bg-fg/[0.05] px-3 py-2 text-sm ring-1 ring-line outline-none" />
              <button
                type="button"
                disabled={!leaveInput}
                onClick={() => {
                  setLeaves((l) => [...new Set([...l, leaveInput])].sort());
                  setLeaveInput("");
                }}
                className="rounded-xl bg-fg px-4 py-2 text-sm font-semibold text-bg disabled:opacity-40"
              >
                Add
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {leaves
                .filter((d) => d >= istDate(p.serverNow))
                .map((d) => (
                  <span key={d} className="flex items-center gap-1 rounded-full bg-[#ff4da6]/12 py-1 pr-1 pl-3 text-xs font-semibold text-[#ff6fb8]">
                    {fmtDay(`${d}T06:30:00Z`)}
                    <button type="button" onClick={() => setLeaves((l) => l.filter((x) => x !== d))} aria-label={`Remove ${d}`} className="grid size-5 place-items-center rounded-full hover:bg-[#ff4da6]/20">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
            </div>
          </section>
        </div>

        {/* Profile + publish */}
        <aside className="space-y-5">
          <section className="glass space-y-4 rounded-[28px] p-5">
            <div className="flex items-center gap-3">
              <Avatar name={p.name} />
              <div>
                <p className="font-display text-lg font-bold">{p.name}</p>
                {saved && (
                  <Link href={`/mentorship/${p.userId}`} className="flex items-center gap-1 text-xs font-semibold text-[#ff6fb8]">
                    <Eye className="size-3.5" /> View public page
                  </Link>
                )}
              </div>
            </div>
            <Field label="Headline">
              <input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={90} placeholder="SDE-2 at a product startup · ex-IIT" className={INPUT} />
            </Field>
            <Field label="About you">
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={800} placeholder="What you can help with, your journey, who you'd love to mentor." className={INPUT} />
            </Field>
            <Field label="Topics" group>
              <div className="flex flex-wrap gap-1.5">
                {expertise.map((t) => (
                  <span key={t} className="flex items-center gap-1 rounded-lg bg-fg/[0.06] py-0.5 pr-1 pl-2 text-xs">
                    {t}
                    <button type="button" onClick={() => setExpertise((x) => x.filter((y) => y !== t))} aria-label={`Remove ${t}`}>
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTopic();
                  }
                }}
                onBlur={addTopic}
                maxLength={30}
                placeholder="Type a topic and press Enter"
                aria-label="Add a topic"
                className={cn(INPUT, "mt-2")}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Session">
                <select value={sessionMin} onChange={(e) => setSessionMin(Number(e.target.value))} className={INPUT}>
                  {SESSION_LENGTHS.map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Break after">
                <select value={bufferMin} onChange={(e) => setBufferMin(Number(e.target.value))} className={INPUT}>
                  {BUFFERS.map((m) => (
                    <option key={m} value={m}>
                      {m ? `${m} min` : "None"}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Price per session (₹)">
              <input type="number" min={49} value={price} onChange={(e) => setPrice(e.target.value)} className={INPUT} />
            </Field>
          </section>

          <section className={cn("space-y-3 rounded-[28px] p-5", published ? "bg-gradient-to-br from-[#c04dff]/20 to-[#ff4da6]/15 ring-1 ring-[#ff4da6]/40" : "glass")}>
            <p className="text-sm">
              <b className="font-display text-2xl">{preview.length}</b> <span className="text-muted">bookable slots in the next 3 weeks</span>
            </p>
            {preview.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {preview.slice(0, 6).map((s) => (
                  <span key={s.start} className="rounded-lg bg-fg/[0.06] px-2 py-1 text-xs tabular-nums">
                    {fmtDay(s.start)} {fmtTime(s.start)}
                  </span>
                ))}
                {preview.length > 6 && <span className="px-1 py-1 text-xs text-muted">+{preview.length - 6} more</span>}
              </div>
            )}
            <Notice msg={msg} />
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={() => save()} className="flex-1 rounded-xl border border-line py-2.5 text-sm font-semibold hover:bg-fg/5 disabled:opacity-50">
                Save
              </button>
              <button type="button" disabled={busy} onClick={() => save(!published)} className={cn("flex flex-[1.4] items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50", published ? "bg-fg/10" : cn(GRADIENT, "text-white"))}>
                {busy && <Loader2 className="size-4 animate-spin" />} {published ? "Hide profile" : "Save & go live"}
              </button>
            </div>
          </section>

          {p.reviews.length > 0 && (
            <section className="glass rounded-[28px] p-5">
              <h3 className="font-display text-lg font-bold">Recent feedback</h3>
              <ul className="mt-3 space-y-3">
                {p.reviews.map((r) => (
                  <li key={r.at} className="text-sm">
                    <Stars value={r.stars} />
                    {r.text && <p className="mt-1">“{r.text}”</p>}
                    <p className="text-xs text-muted">{r.name}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children, group }: { label: string; children: React.ReactNode; group?: boolean }) {
  const Tag = group ? "div" : "label";
  return (
    <Tag className="block">
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-muted uppercase">{label}</span>
      {children}
    </Tag>
  );
}
