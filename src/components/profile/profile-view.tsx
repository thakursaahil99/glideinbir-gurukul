"use client";

import { motion } from "framer-motion";
import { Check, CircleAlert, KeyRound, Loader2, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Card, TextField } from "@/components/admin/fields";
import type { PublicUser } from "@/core/auth/roles";
import type { ProfileResult } from "@/core/profile/actions";
import { cn, formatPaise } from "@/lib/utils";
import { rpc } from "@/lib/rpc";

function Status({ res }: { res: ProfileResult | null }) {
  if (!res) return null;
  return (
    <p role="status" className={cn("flex items-center gap-2 rounded-xl border p-3 text-sm", res.ok ? "border-teal/40 bg-teal/10" : "border-rose/40 bg-rose/10")}>
      {res.ok ? <Check className="size-4 text-teal" /> : <CircleAlert className="size-4 text-rose" />}
      {res.ok ? "Saved" : res.error}
    </p>
  );
}

export function ProfileView({ user, balance }: { user: PublicUser; balance: number }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [nameRes, setNameRes] = useState<ProfileResult | null>(null);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwRes, setPwRes] = useState<ProfileResult | null>(null);
  const [savingName, startName] = useTransition();
  const [savingPw, startPw] = useTransition();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass relative flex flex-wrap items-center gap-5 overflow-hidden rounded-[28px] p-6 sm:p-8"
      >
        <div aria-hidden className="absolute -top-20 -right-20 size-64 animate-aurora rounded-full bg-primary/20 blur-3xl" />
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 14 }}
          className="relative grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-saffron via-rose to-primary font-display text-3xl font-bold text-white uppercase"
        >
          {user.name.charAt(0)}
        </motion.span>
        <div className="relative min-w-0 flex-1">
          <h1 className="truncate font-display text-3xl font-bold tracking-tight">{user.name}</h1>
          <p className="truncate text-muted">{user.email}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-primary/15 px-2.5 py-1 font-semibold text-primary capitalize">{user.role}</span>
            <span className="rounded-full border border-line px-2.5 py-1 text-muted">
              Joined {new Date(user.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
            </span>
          </div>
        </div>
        <Link href="/wallet" className="relative flex items-center gap-2 rounded-2xl bg-teal/15 px-4 py-3 font-semibold">
          <Wallet className="size-5 text-teal" /> {formatPaise(balance)}
        </Link>
      </motion.div>

      <Card title="Personal details" description="Your name appears on certificates, bookings and reviews.">
        <TextField label="Full name" value={name} onChange={setName} maxLength={60} autoComplete="name" />
        <TextField label="Email" value={user.email} onChange={() => {}} disabled hint="Contact support to change" />
        <Status res={nameRes} />
        <Button
          className="w-fit"
          disabled={savingName || name.trim() === user.name}
          onClick={() =>
            startName(async () => {
              const res = await rpc("profile.update", { name });
              setNameRes(res);
              // New URL = reliable re-fetch (a same-URL refresh after an action could be dropped).
              if (res.ok) router.replace(`/profile?updated=${Date.now()}`, { scroll: false });
            })
          }
        >
          {savingName && <Loader2 className="size-4 animate-spin" />} Save changes
        </Button>
      </Card>

      <Card title="Password" description="Use at least 8 characters.">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            startPw(async () => {
              const res = await rpc("profile.password", pw);
              setPwRes(res);
              if (res.ok) setPw({ current: "", next: "", confirm: "" });
            });
          }}
        >
          <TextField label="Current password" type="password" autoComplete="current-password" value={pw.current} onChange={(v) => setPw({ ...pw, current: v })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="New password" type="password" autoComplete="new-password" value={pw.next} onChange={(v) => setPw({ ...pw, next: v })} />
            <TextField label="Confirm new password" type="password" autoComplete="new-password" value={pw.confirm} onChange={(v) => setPw({ ...pw, confirm: v })} />
          </div>
          <Status res={pwRes} />
          <Button type="submit" className="w-fit" disabled={savingPw || !pw.current || !pw.next}>
            {savingPw ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Change password
          </Button>
        </form>
      </Card>
    </div>
  );
}
