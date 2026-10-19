"use client";

import { animate, AnimatePresence, motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Check, CircleAlert, FlaskConical, Loader2, Plus, ShieldCheck, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { topUpWallet } from "@/core/payments/checkout-client";
import { refreshSummary } from "@/lib/summary";
import { MAX_RECHARGE_RUPEES, MIN_RECHARGE_RUPEES, RECHARGE_PRESETS } from "@/core/payments/limits";
import type { LedgerEntry } from "@/core/wallet/ledger";
import { cn, formatPaise } from "@/lib/utils";

type Mode = "razorpay" | "demo" | "off";

const TYPE_LABEL: Record<LedgerEntry["type"], string> = {
  credit: "Recharge",
  debit: "Payment",
  refund: "Refund",
  payout: "Payout",
  transfer_in: "Received",
  transfer_out: "Paid",
  commission: "Commission",
  adjustment: "Adjustment",
};

export function WalletView({ balance, entries, mode }: { balance: number; entries: LedgerEntry[]; mode: Mode }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <BalanceCard balance={balance} />
        <History entries={entries} />
      </div>
      <Recharge mode={mode} />
    </div>
  );
}

function BalanceCard({ balance }: { balance: number }) {
  const [shown, setShown] = useState(balance);
  const prev = useRef(balance);
  useEffect(() => {
    const c = animate(prev.current, balance, { duration: 1.2, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setShown(Math.round(v)) });
    prev.current = balance;
    return () => c.stop();
  }, [balance]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#5b47ff] via-[#a64dff] to-[#ff4d6d] p-7 text-white sm:p-9"
    >
      <div className="absolute -right-12 -bottom-12 size-52 rounded-full border-[28px] border-white/10" />
      <div className="absolute -top-10 right-16 size-28 rounded-full border-[16px] border-white/10" />
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.18)_50%,transparent_70%)]"
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 3 }}
      />
      <p className="relative flex items-center gap-2 text-sm text-white/80">
        <Wallet className="size-4" /> Gurukul Wallet
      </p>
      <p className="relative mt-3 font-display text-6xl font-bold tracking-tight tabular-nums sm:text-7xl" aria-live="polite">
        {formatPaise(shown)}
      </p>
      <p className="relative mt-2 flex items-center gap-1.5 text-xs text-white/75">
        <ShieldCheck className="size-3.5" /> One balance for courses, tests, notes, doubts, mentors and more
      </p>
    </motion.div>
  );
}

function History({ entries }: { entries: LedgerEntry[] }) {
  return (
    <section className="glass rounded-[28px] p-5 sm:p-6">
      <h2 className="font-display text-lg font-bold">Transactions</h2>
      {entries.length === 0 ? (
        <div className="py-12 text-center">
          <p className="font-semibold">No transactions yet</p>
          <p className="mt-1 text-sm text-muted">Your first recharge will show up here.</p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {entries.map((e, i) => {
            const incoming = e.amount > 0;
            return (
              <motion.li
                key={e.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i, 10) * 0.04 }}
                className="flex items-center gap-3 py-3"
              >
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", incoming ? "bg-teal/15 text-teal" : "bg-rose/15 text-rose")}>
                  {incoming ? <ArrowDownLeft className="size-5" /> : <ArrowUpRight className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{e.note || TYPE_LABEL[e.type]}</p>
                  <p className="text-xs text-muted">
                    {TYPE_LABEL[e.type]} ·{" "}
                    {new Date(e.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn("font-semibold tabular-nums", incoming ? "text-teal" : "text-rose")}>
                    {incoming ? "+" : "−"}
                    {formatPaise(Math.abs(e.amount))}
                  </p>
                  <p className="text-[11px] text-muted tabular-nums">Bal {formatPaise(e.balanceAfter)}</p>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Recharge({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [rupees, setRupees] = useState<number>(500);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const valid = Number.isInteger(rupees) && rupees >= MIN_RECHARGE_RUPEES && rupees <= MAX_RECHARGE_RUPEES;

  const done = (ok: boolean, text: string) => {
    setStatus({ kind: ok ? "ok" : "error", text });
    // A new URL forces fresh balance + history. A same-URL router.refresh() right
    // after a server action was intermittently not committed.
    if (ok) {
      router.replace(`/wallet?updated=${Date.now()}`, { scroll: false });
      refreshSummary(); // header balance lives in the layout, which a page navigation doesn't re-render
    }
  };

  const pay = () =>
    start(async () => {
      setStatus(null);
      const res = await topUpWallet(rupees);
      done(res.ok, res.message);
    });

  return (
    <motion.section
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
      className="glass h-fit rounded-[28px] p-5 sm:p-6 lg:sticky lg:top-24"
    >
      <h2 className="font-display text-lg font-bold">Add money</h2>
      <p className="mt-1 text-sm text-muted">
        ₹{MIN_RECHARGE_RUPEES} to ₹{MAX_RECHARGE_RUPEES.toLocaleString("en-IN")} per recharge.
      </p>

      {mode === "demo" && (
        <p className="mt-4 flex gap-2 rounded-2xl border border-saffron/40 bg-saffron/10 p-3 text-xs">
          <FlaskConical className="size-4 shrink-0 text-saffron" />
          <span>
            <b>Demo mode.</b> Razorpay keys aren&apos;t set, so recharges are simulated. This only works in local development.
          </span>
        </p>
      )}
      {mode === "off" && (
        <p className="mt-4 flex gap-2 rounded-2xl border border-rose/40 bg-rose/10 p-3 text-xs">
          <CircleAlert className="size-4 shrink-0 text-rose" /> Payments aren&apos;t available right now.
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2">
        {RECHARGE_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setRupees(p)}
            className={cn(
              "relative rounded-2xl border px-3 py-3 font-display text-lg font-bold transition-colors",
              rupees === p ? "border-transparent text-white" : "border-line hover:bg-fg/5",
            )}
          >
            {rupees === p && <motion.span layoutId="preset" className="absolute inset-0 rounded-2xl bg-gradient-to-r from-saffron via-rose to-primary" />}
            <span className="relative">₹{p.toLocaleString("en-IN")}</span>
          </button>
        ))}
      </div>

      <label htmlFor="amount" className="mt-4 block text-sm font-semibold">
        Or enter an amount
      </label>
      <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-line bg-card px-4 focus-within:border-primary">
        <span className="font-display text-xl font-bold text-muted">₹</span>
        <input
          id="amount"
          type="number"
          inputMode="numeric"
          min={MIN_RECHARGE_RUPEES}
          max={MAX_RECHARGE_RUPEES}
          value={Number.isFinite(rupees) ? rupees : ""}
          onChange={(e) => setRupees(e.target.valueAsNumber)}
          className="w-full bg-transparent py-3 font-display text-xl font-bold outline-none"
        />
      </div>

      <button
        type="button"
        onClick={pay}
        disabled={!valid || pending || mode === "off"}
        className="group mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-saffron via-rose to-primary bg-[length:200%_100%] py-4 font-semibold text-white transition-[background-position] duration-700 hover:bg-right disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-5 animate-spin" /> : <Plus className="size-5" />}
        {valid ? `Add ${formatPaise(rupees * 100)}` : "Enter a valid amount"}
      </button>

      <AnimatePresence>
        {status && (
          <motion.p
            role="status"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "mt-4 flex items-center gap-2 rounded-2xl border p-3 text-sm",
              status.kind === "ok" ? "border-teal/40 bg-teal/10" : "border-rose/40 bg-rose/10",
            )}
          >
            {status.kind === "ok" ? <Check className="size-4 text-teal" /> : <CircleAlert className="size-4 text-rose" />}
            {status.text}
          </motion.p>
        )}
      </AnimatePresence>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted">
        <ShieldCheck className="size-3.5" /> Payments verified on our server · secured by Razorpay
      </p>
    </motion.section>
  );
}
