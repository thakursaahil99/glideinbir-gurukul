"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, CreditCard, Info, Layers, UserRound, Wallet } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import type { Notification, NotificationKind } from "@/core/notifications/store";
import { refreshSummary } from "@/lib/summary";
import { cn } from "@/lib/utils";
import { rpc } from "@/lib/rpc";

const ICON: Record<NotificationKind, typeof Bell> = { info: Info, wallet: Wallet, payment: CreditCard, account: UserRound, module: Layers };
const TINT: Record<NotificationKind, string> = {
  info: "bg-primary/15 text-primary",
  wallet: "bg-teal/15 text-teal",
  payment: "bg-saffron/15 text-saffron",
  account: "bg-rose/15 text-rose",
  module: "bg-primary/15 text-primary",
};

function ago(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function NotificationsView({ items: initialItems }: { items: Notification[] }) {
  const [pending, start] = useTransition();
  // Marked read locally right away, then the header badge re-syncs.
  const [items, setItems] = useState(initialItems);
  const unread = items.filter((n) => !n.read).length;

  const read = (ids: string[] | "all") => {
    setItems((list) => list.map((n) => (ids === "all" || ids.includes(n.id) ? { ...n, read: true } : n)));
    start(async () => {
      await rpc("notifications.markRead", ids);
      refreshSummary();
    });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-muted">{unread ? `${unread} unread` : "You're all caught up"}</p>
        </div>
        {unread > 0 && (
          <button
            onClick={() => read("all")}
            disabled={pending}
            className="glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            <CheckCheck className="size-4" /> Mark all read
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="glass mt-8 rounded-[28px] px-6 py-16 text-center">
          <motion.span
            animate={{ rotate: [0, -12, 12, -6, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2 }}
            className="mx-auto grid size-14 place-items-center rounded-2xl bg-fg/5"
          >
            <Bell className="size-6 text-muted" />
          </motion.span>
          <p className="mt-4 font-semibold">Nothing here yet</p>
          <p className="mt-1 text-sm text-muted">Payments, bookings and results will show up here.</p>
        </motion.div>
      ) : (
        <ul className="mt-8 space-y-2">
          <AnimatePresence initial={false}>
            {items.map((n, i) => {
              const Icon = ICON[n.kind];
              const body = (
                <>
                  <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", TINT[n.kind])}>
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{n.title}</span>
                    <span className="block text-sm text-muted">{n.body}</span>
                    <span className="mt-1 block text-xs text-muted" suppressHydrationWarning>
                      {ago(n.createdAt)}
                    </span>
                  </span>
                  {!n.read && <span className="mt-2 size-2.5 shrink-0 rounded-full bg-rose" aria-label="Unread" />}
                </>
              );
              const cls = cn("glass flex items-start gap-4 rounded-[22px] p-4 transition-colors", !n.read && "ring-1 ring-primary/30");
              return (
                <motion.li key={n.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}>
                  {n.href ? (
                    <Link href={n.href} onClick={() => !n.read && read([n.id])} className={cn(cls, "hover:bg-fg/[0.04]")}>
                      {body}
                    </Link>
                  ) : (
                    <button type="button" onClick={() => !n.read && read([n.id])} className={cn(cls, "w-full text-left")}>
                      {body}
                    </button>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
