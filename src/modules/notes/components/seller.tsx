"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Banknote, CircleAlert, Eye, Hourglass, IndianRupee, Loader2, PackageOpen, Pencil, Plus, Settings2, ShoppingBag, Star, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { rpc } from "@/lib/rpc";
import { refreshSummary } from "@/lib/summary";
import { cn, formatPaise } from "@/lib/utils";
import { NOTE_SUBJECTS, type NoteItem, type NoteSubject, type Payout, type Vendor } from "../types";
import { GRADIENT, INPUT, NoteCover, Notice } from "./bits";

type Msg = { ok: boolean; text: string } | null;

/* ---------------- Onboarding ---------------- */

function StoreFields({ v, set }: { v: StoreForm; set: (f: StoreForm) => void }) {
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Store name</span>
        <input value={v.storeName} onChange={(e) => set({ ...v, storeName: e.target.value })} maxLength={50} placeholder="e.g. Ananya's Topper Notes" className={INPUT} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">About you</span>
        <textarea value={v.bio} onChange={(e) => set({ ...v, bio: e.target.value })} rows={3} maxLength={600} placeholder="Your scores, exams you cracked, how you make your notes…" className={INPUT} />
      </label>
      <div>
        <span className="mb-1.5 block text-sm font-semibold">Subjects you&apos;ll sell</span>
        <div className="flex flex-wrap gap-2">
          {NOTE_SUBJECTS.map((s) => {
            const on = v.subjects.includes(s);
            return (
              <button key={s} type="button" aria-pressed={on} onClick={() => set({ ...v, subjects: on ? v.subjects.filter((x) => x !== s) : [...v.subjects, s] })} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors", on ? "bg-[#00b89c]/20 text-[#2ee6c5] ring-[#00b89c]/50" : "ring-line hover:bg-fg/5")}>
                {s}
              </button>
            );
          })}
        </div>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">UPI id for payouts</span>
        <input value={v.payoutUpi} onChange={(e) => set({ ...v, payoutUpi: e.target.value })} maxLength={100} placeholder="yourname@okaxis" className={INPUT} />
        <span className="mt-1 block text-xs text-muted">Only you and the Glideinbir team can see this.</span>
      </label>
    </div>
  );
}

interface StoreForm {
  storeName: string;
  bio: string;
  subjects: NoteSubject[];
  payoutUpi: string;
}

export function VendorApply({ vendor }: { vendor: Vendor | null }) {
  const router = useRouter();
  const [form, setForm] = useState<StoreForm>({ storeName: vendor?.storeName ?? "", bio: vendor?.bio ?? "", subjects: vendor?.subjects ?? [], payoutUpi: vendor?.payoutUpi ?? "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const perks = [
    { icon: IndianRupee, title: "Earn on every sale", text: "Money lands in your wallet instantly. Withdraw to UPI anytime." },
    { icon: Eye, title: "Free preview sells", text: "Learners read your first pages before buying, so good notes convert." },
    { icon: Store, title: "Protected downloads", text: "Each copy is stamped with the buyer's name and email." },
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_440px]">
      <div className="space-y-4">
        <h2 className="font-display text-3xl font-bold tracking-tight">Turn your notes into income</h2>
        <p className="text-muted">Apply once. After a quick review by our team, you can upload PDFs, set your price and get paid.</p>
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
        {vendor?.status === "rejected" && (
          <p className="flex gap-2 rounded-2xl border border-rose/40 bg-rose/10 p-3 text-sm">
            <CircleAlert className="size-4 shrink-0 text-rose" /> Your last application wasn&apos;t approved{vendor.adminNote ? `: ${vendor.adminNote}` : "."} Update it and apply again.
          </p>
        )}
        <StoreFields v={form} set={setForm} />
        <Notice msg={msg} />
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            try {
              const res = await rpc("notesSell.apply", form);
              if (res.ok) router.replace(`/notes/sell?updated=${Date.now()}`);
              else setMsg({ ok: false, text: res.error });
            } catch (e) {
              setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong" });
            }
            setBusy(false);
          }}
          className={cn("flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white disabled:opacity-60", GRADIENT)}
        >
          {busy && <Loader2 className="size-4 animate-spin" />} Apply to sell
        </button>
      </section>
    </div>
  );
}

export function VendorStatusCard({ vendor }: { vendor: Vendor }) {
  const pending = vendor.status === "pending";
  return (
    <div className="glass mx-auto max-w-xl rounded-[28px] p-10 text-center">
      <motion.span animate={pending ? { rotate: [0, 180, 180, 360] } : {}} transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.4, 0.6, 1] }} className={cn("mx-auto grid size-16 place-items-center rounded-3xl text-white", pending ? GRADIENT : "bg-rose")}>
        {pending ? <Hourglass className="size-7" /> : <CircleAlert className="size-7" />}
      </motion.span>
      <p className="mt-4 font-display text-2xl font-bold">{pending ? "Application under review" : "Store suspended"}</p>
      <p className="mt-2 text-sm text-muted">{pending ? `We're checking "${vendor.storeName}". You'll get a notification and an email as soon as it's approved, usually within a day.` : vendor.adminNote || "Contact support for details."}</p>
    </div>
  );
}

/* ---------------- Dashboard ---------------- */

export interface DashboardProps {
  vendor: Vendor;
  notes: NoteItem[];
  coverUrls: Record<string, string | null>;
  stats: { earned: number; sold: number; balance: number; rating: number | null; ratings: number; minPayout: number };
  payouts: Payout[];
}

export function SellerDashboard(p: DashboardProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [settings, setSettings] = useState(false);
  const [store, setStore] = useState<StoreForm>({ storeName: p.vendor.storeName, bio: p.vendor.bio, subjects: p.vendor.subjects, payoutUpi: p.vendor.payoutUpi });
  const [amount, setAmount] = useState(String(Math.floor(p.stats.balance / 100)));
  // Kept locally: a same-URL refresh right after a mutation isn't reliably committed here.
  const [payouts, setPayouts] = useState(p.payouts);
  const [balance, setBalance] = useState(p.stats.balance);
  const pendingPayout = payouts.find((x) => x.status === "requested");

  const run = async (key: string, job: () => Promise<{ ok: boolean; error?: string }>, okText: string, after?: () => void) => {
    setBusy(key);
    setMsg(null);
    try {
      const res = await job();
      if (res.ok) {
        setMsg({ ok: true, text: okText });
        after?.();
      } else setMsg({ ok: false, text: res.error ?? "Something went wrong" });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong" });
    }
    setBusy(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: IndianRupee, label: "Earned from notes", value: formatPaise(p.stats.earned), tint: "text-teal" },
          { icon: ShoppingBag, label: "Copies sold", value: String(p.stats.sold), tint: "text-[#7ddc5a]" },
          { icon: Banknote, label: "Withdrawable", value: formatPaise(balance), tint: "text-primary" },
          { icon: Star, label: p.stats.ratings ? `Rating (${p.stats.ratings})` : "No ratings yet", value: p.stats.rating ? p.stats.rating.toFixed(1) : "—", tint: "text-saffron" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="glass rounded-[24px] p-5">
            <s.icon className={cn("size-5", s.tint)} />
            <p className="mt-3 font-display text-2xl font-bold tabular-nums sm:text-3xl">{s.value}</p>
            <p className="text-sm text-muted">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <Notice msg={msg} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="glass min-w-0 rounded-[28px] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold">Your notes</h2>
            <button type="button" disabled={!!busy} onClick={() => run("new", async () => {
              const res = await rpc("notesSell.create");
              if (res.ok) router.push(`/notes/sell/${res.id}`);
              return res;
            }, "Opening the editor…")} className={cn("flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60", GRADIENT)}>
              {busy === "new" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} New notes
            </button>
          </div>
          {p.notes.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-line p-8 text-center">
              <PackageOpen className="mx-auto size-8 text-muted" />
              <p className="mt-2 font-semibold">Upload your first notes</p>
              <p className="text-sm text-muted">A PDF, a title and a price. That&apos;s it.</p>
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-line">
              {p.notes.map((n) => (
                <li key={n.id} className="flex items-center gap-4 py-3">
                  <NoteCover title={n.title} subject={n.subject} pages={n.pages} coverUrl={p.coverUrls[n.id] ?? null} mini className="aspect-[3/4] w-12 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{n.title}</p>
                    <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className={cn("rounded-full px-2 py-0.5 font-bold", n.hidden ? "bg-rose/15 text-rose" : n.status === "published" ? "bg-teal/15 text-teal" : "bg-fg/10")}>{n.hidden ? "Hidden by review" : n.status === "published" ? "Live" : "Draft"}</span>
                      {n.price ? formatPaise(n.price) : "Free"} · {n.sales} sold · {n.pages || "no"} pages
                    </p>
                    {n.hidden && <p className="mt-0.5 text-xs text-rose">{n.hidden.reason}</p>}
                  </div>
                  <Link href={`/notes/sell/${n.id}`} aria-label={`Edit ${n.title}`} className="grid size-9 place-items-center rounded-xl ring-1 ring-line hover:bg-fg/5">
                    <Pencil className="size-4" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-5">
          <section className="glass space-y-3 rounded-[28px] p-5">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold">
              <Banknote className="size-5 text-teal" /> Withdraw to UPI
            </h3>
            {pendingPayout ? (
              <p className="rounded-2xl bg-fg/[0.05] p-3 text-sm">
                {formatPaise(pendingPayout.amount)} requested to <b>{pendingPayout.upi}</b>. We&apos;ll send it within 2 working days.
              </p>
            ) : (
              <>
                <div className="flex gap-2">
                  <label className="flex flex-1 items-center gap-1 rounded-xl bg-fg/[0.05] px-3 ring-1 ring-line">
                    <span className="text-muted">₹</span>
                    <span className="sr-only">Amount</span>
                    <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-transparent py-2.5 text-sm outline-none" />
                  </label>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() =>
                      run(
                        "payout",
                        async () => {
                          const res = await rpc("notesSell.payout", Number(amount));
                          if (res.ok) {
                            setPayouts((x) => [res.payout, ...x]);
                            setBalance((b) => b - res.payout.amount);
                          }
                          return res;
                        },
                        "Payout requested. We'll notify you when it's sent.",
                        refreshSummary,
                      )
                    }
                    className="flex items-center gap-2 rounded-xl bg-fg px-4 text-sm font-semibold text-bg disabled:opacity-50"
                  >
                    {busy === "payout" && <Loader2 className="size-4 animate-spin" />} Request
                  </button>
                </div>
                <p className="text-xs text-muted">
                  Minimum {formatPaise(p.stats.minPayout)} · to {p.vendor.payoutUpi}
                </p>
              </>
            )}
            {payouts.length > 0 && (
              <ul className="space-y-1.5 border-t border-line pt-3 text-xs">
                {payouts.slice(0, 5).map((x) => (
                  <li key={x.id} className="flex items-center justify-between gap-2">
                    <span className="text-muted">{new Date(x.requestedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    <span className="font-semibold tabular-nums">{formatPaise(x.amount)}</span>
                    <span className={cn("rounded-full px-2 py-0.5 font-bold capitalize", x.status === "paid" ? "bg-teal/15 text-teal" : x.status === "rejected" ? "bg-rose/15 text-rose" : "bg-saffron/15 text-saffron")}>{x.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="glass rounded-[28px] p-5">
            <button type="button" onClick={() => setSettings((s) => !s)} className="flex w-full items-center gap-2 font-display text-lg font-bold">
              <Settings2 className="size-5 text-muted" /> Store settings
            </button>
            <AnimatePresence>
              {settings && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="space-y-4 pt-4">
                    <StoreFields v={store} set={setStore} />
                    <button type="button" disabled={!!busy} onClick={() => run("store", () => rpc("notesSell.updateStore", store), "Store updated")} className={cn("flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60", GRADIENT)}>
                      {busy === "store" && <Loader2 className="size-4 animate-spin" />} Save store
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </aside>
      </div>
    </div>
  );
}
