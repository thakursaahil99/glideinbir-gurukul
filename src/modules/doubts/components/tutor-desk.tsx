"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, CircleAlert, IndianRupee, Loader2, Radio, Star, Timer, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { rpc } from "@/lib/rpc";
import { cn, formatPaise } from "@/lib/utils";
import type { FeedItem } from "../actions";
import type { DoubtView } from "../service";
import { SUBJECTS, type Subject, type TutorProfile } from "../types";
import { mmss, StatusBadge, useNow } from "./bits";

export interface DeskProps {
  profile: TutorProfile | null;
  requests: FeedItem[];
  active: DoubtView[];
  stats: { earned: number; sessions: number; rating: number | null; ratings: number };
  reviews: { stars: number; text: string; name: string; at: string }[];
  serverNow: number;
}

export function TutorDesk(p: DeskProps) {
  const router = useRouter();
  const now = useNow(p.serverNow);
  const [profile, setProfile] = useState(p.profile);
  const [requests, setRequests] = useState(p.requests);
  const [active, setActive] = useState(p.active);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const online = !!profile?.online;

  const reload = useCallback(async () => {
    try {
      const res = await rpc("doubtsTutor.feed");
      if (res.ok) {
        setProfile(res.profile);
        setRequests(res.requests);
        setActive(res.active);
      }
    } catch {}
  }, []);

  // Live feed while online. The open connection is also the "I'm here" heartbeat.
  useEffect(() => {
    if (!online) return;
    const es = new EventSource("/api/doubts/stream?feed=1");
    es.addEventListener("hello", () => void reload());
    es.addEventListener("request", () => void reload());
    es.addEventListener("gone", (e) => {
      const { id } = JSON.parse((e as MessageEvent).data) as { id: string };
      setRequests((r) => r.filter((x) => x.id !== id));
    });
    const poll = setInterval(reload, 10_000);
    return () => {
      es.close();
      clearInterval(poll);
    };
  }, [online, reload]);

  const run = async (key: string, job: () => Promise<{ ok: boolean; error?: string }>, okText?: string) => {
    setBusy(key);
    setMsg(null);
    try {
      const res = await job();
      setMsg(res.ok ? (okText ? { ok: true, text: okText } : null) : { ok: false, text: res.error ?? "Something went wrong" });
      return res.ok;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong" });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const visible = requests.filter((r) => Date.parse(r.expiresAt) > now);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: IndianRupee, label: "Earned from doubts", value: formatPaise(p.stats.earned), tint: "text-teal" },
          { icon: Timer, label: "Sessions completed", value: String(p.stats.sessions), tint: "text-primary" },
          { icon: Star, label: p.stats.ratings ? `Rating (${p.stats.ratings})` : "No ratings yet", value: p.stats.rating ? p.stats.rating.toFixed(1) : "—", tint: "text-saffron" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="glass rounded-[24px] p-5">
            <s.icon className={cn("size-5", s.tint)} />
            <p className="mt-3 font-display text-3xl font-bold tabular-nums">{s.value}</p>
            <p className="text-sm text-muted">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {msg && (
          <motion.p role="status" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn("flex items-center gap-2 rounded-2xl border p-3 text-sm", msg.ok ? "border-teal/40 bg-teal/10" : "border-rose/40 bg-rose/10")}>
            {msg.ok ? <Check className="size-4 text-teal" /> : <CircleAlert className="size-4 text-rose" />} {msg.text}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {/* Online switch */}
          <div className={cn("relative overflow-hidden rounded-[28px] p-6 transition-colors", online ? "bg-gradient-to-r from-teal/25 to-primary/20 ring-1 ring-teal/40" : "glass")}>
            <div className="flex flex-wrap items-center gap-4">
              <span className="relative grid size-14 place-items-center">
                {online && <span className="absolute inset-0 animate-ping-slow rounded-full bg-teal/40" />}
                <span className={cn("relative grid size-14 place-items-center rounded-full", online ? "bg-teal text-black" : "bg-fg/10 text-muted")}>
                  <Radio className="size-6" />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-2xl font-bold">{online ? "You're online" : "You're offline"}</p>
                <p className="text-sm text-muted">{online ? "New doubts in your subjects appear below instantly. Keep this page open." : profile ? "Go online to start receiving doubts." : "Save your tutor profile first."}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={online}
                aria-label="Online"
                disabled={!profile || busy === "online"}
                onClick={async () => {
                  const next = !online;
                  if (await run("online", () => rpc("doubtsTutor.online", next))) setProfile((x) => (x ? { ...x, online: next } : x));
                }}
                className={cn("relative h-9 w-16 rounded-full transition-colors disabled:opacity-40", online ? "bg-teal" : "bg-fg/20")}
              >
                <motion.span layout className={cn("absolute top-1 size-7 rounded-full bg-white shadow", online ? "right-1" : "left-1")} />
              </button>
            </div>
          </div>

          {active.map((d) => (
            <Link key={d.id} href={`/doubts/${d.id}`} className="glass flex items-center gap-4 rounded-[22px] p-4 ring-1 ring-primary/40">
              <StatusBadge status={d.status} />
              <span className="min-w-0 flex-1 truncate text-sm">
                <b>{d.studentName}</b> · {d.subject}: {d.text}
              </span>
              <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                Open <ArrowRight className="size-4" />
              </span>
            </Link>
          ))}

          <div>
            <p className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
              Live requests {online && <span className="size-2 animate-pulse rounded-full bg-teal" />}
            </p>
            {!online ? (
              <p className="glass rounded-[22px] p-6 text-center text-sm text-muted">Go online to see requests.</p>
            ) : visible.length === 0 ? (
              <div className="glass rounded-[22px] p-8 text-center">
                <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }} className="mx-auto grid size-12 place-items-center rounded-full bg-fg/5">
                  <Zap className="size-5 text-saffron" />
                </motion.span>
                <p className="mt-3 text-sm text-muted">Waiting for doubts in {profile?.subjects.join(", ")}…</p>
              </div>
            ) : (
              <ul className="space-y-3">
                <AnimatePresence initial={false}>
                  {visible.map((r) => {
                    const left = Math.ceil((Date.parse(r.expiresAt) - now) / 1000);
                    return (
                      <motion.li key={r.id} layout initial={{ opacity: 0, x: -30, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 30 }} className="glass rounded-[22px] p-5">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full bg-[#ff5e3a]/15 px-2.5 py-0.5 font-bold text-[#ff7a5c]">{r.subject}</span>
                          <span className="text-muted">
                            {r.studentName} · up to {r.limitMin} min · you earn up to {formatPaise((profile?.ratePerMinute ?? 0) * r.limitMin)}
                          </span>
                          <span className={cn("ml-auto font-mono font-bold tabular-nums", left <= 30 ? "text-rose" : "text-muted")}>{mmss(left)}</span>
                        </div>
                        <p className="mt-3 line-clamp-4 text-sm whitespace-pre-wrap">{r.text}</p>
                        {r.imageUrl && <p className="mt-2 text-xs text-muted">📎 Has an image</p>}
                        <div className="mt-4 flex items-center gap-2">
                          {!r.affordable && <span className="text-xs text-rose">Learner&apos;s balance is too low for your rate</span>}
                          <Link href={`/doubts/${r.id}`} className="ml-auto rounded-xl border border-line px-3.5 py-2 text-sm font-semibold hover:bg-fg/5">
                            Preview
                          </Link>
                          <button
                            type="button"
                            disabled={!!busy || !r.affordable || active.length > 0}
                            onClick={async () => {
                              if (await run(r.id, () => rpc("doubtsTutor.accept", r.id))) router.push(`/doubts/${r.id}`);
                              else void reload();
                            }}
                            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ffb800] to-[#ff5e3a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                          >
                            {busy === r.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Accept
                          </button>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <ProfileForm profile={profile} onSaved={reload} run={run} busy={busy} />
          <div className="glass rounded-[24px] p-5">
            <p className="font-display font-bold">Recent ratings</p>
            {p.reviews.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Ratings from learners show up here.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {p.reviews.map((r, i) => (
                  <li key={i} className="text-sm">
                    <p className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={cn("size-3.5", n <= r.stars ? "fill-saffron text-saffron" : "text-fg/20")} />
                      ))}
                      <span className="ml-2 text-xs text-muted">{r.name}</span>
                    </p>
                    {r.text && <p className="mt-1">{r.text}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileForm({ profile, onSaved, run, busy }: { profile: TutorProfile | null; onSaved: () => void; run: (k: string, j: () => Promise<{ ok: boolean; error?: string }>, ok?: string) => Promise<boolean>; busy: string | null }) {
  const [subjects, setSubjects] = useState<Subject[]>(profile?.subjects ?? []);
  const [rate, setRate] = useState(String((profile?.ratePerMinute ?? 1000) / 100));
  const [bio, setBio] = useState(profile?.bio ?? "");
  return (
    <div className="glass rounded-[24px] p-5">
      <p className="font-display font-bold">Your tutor profile</p>
      <p className="mt-3 text-sm font-semibold">Subjects</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SUBJECTS.map((s) => {
          const on = subjects.includes(s);
          return (
            <button key={s} type="button" aria-pressed={on} onClick={() => setSubjects((x) => (on ? x.filter((y) => y !== s) : [...x, s]))} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", on ? "border-transparent bg-fg text-bg" : "border-line text-muted")}>
              {s}
            </button>
          );
        })}
      </div>
      <label htmlFor="rate" className="mt-4 block text-sm font-semibold">
        Rate (₹ per minute)
      </label>
      <input id="rate" type="number" min={1} max={100} step={0.5} value={rate} onChange={(e) => setRate(e.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
      <label htmlFor="bio" className="mt-4 block text-sm font-semibold">
        Short bio
      </label>
      <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} rows={2} placeholder="IIT Delhi, 3 years teaching JEE Physics" className="mt-1.5 w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
      <button
        type="button"
        disabled={busy === "profile"}
        onClick={async () => {
          if (await run("profile", () => rpc("doubtsTutor.profile", { subjects, rateRupees: Number(rate), bio }), "Profile saved")) onSaved();
        }}
        className="mt-4 flex items-center gap-2 rounded-xl bg-fg px-4 py-2.5 text-sm font-semibold text-bg"
      >
        {busy === "profile" && <Loader2 className="size-4 animate-spin" />} Save profile
      </button>
    </div>
  );
}
