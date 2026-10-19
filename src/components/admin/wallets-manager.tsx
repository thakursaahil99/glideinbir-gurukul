"use client";

import { Loader2, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn, formatPaise } from "@/lib/utils";
import { Button, Card, Select, TextField } from "./fields";
import { rpc } from "@/lib/rpc";

export interface WalletRow {
  id: string;
  name: string;
  email: string;
  role: string;
  balance: number;
}

export function WalletsManager({ rows }: { rows: WalletRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [userId, setUserId] = useState(rows[0]?.id ?? "");
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [rupees, setRupees] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [query, setQuery] = useState("");

  const target = rows.find((r) => r.id === userId);
  const q = query.trim().toLowerCase();
  const shown = rows.filter((r) => !q || r.name.toLowerCase().includes(q) || r.email.includes(q));

  const submit = () =>
    start(async () => {
      const res = await rpc("admin.adjustWallet", { userId, direction, rupees: Number(rupees), reason, requestId: crypto.randomUUID() });
      setMsg(res.ok ? { ok: true, text: `${direction === "credit" ? "Credited" : "Debited"} ₹${rupees} for ${target?.email}` } : { ok: false, text: res.error ?? "Failed" });
      if (res.ok) {
        setRupees("");
        setReason("");
        // New URL = reliable re-fetch (a same-URL refresh after an action could be dropped).
        router.replace(`/admin/wallets?updated=${Date.now()}`, { scroll: false });
      }
    });

  return (
    <div className="grid gap-5">
      <Card title="Manual adjustment" description="Adds a labelled ledger entry and notifies the user. Balances are never edited directly.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="adj-user" className="mb-1.5 block text-sm font-semibold">
              User
            </label>
            <select
              id="adj-user"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm"
            >
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} · {r.email} ({formatPaise(r.balance)})
                </option>
              ))}
            </select>
          </div>
          <Select label="Direction" value={direction} options={["credit", "debit"] as const} onChange={setDirection} />
          <TextField label="Amount (₹)" type="number" min={1} value={rupees} onChange={setRupees} />
          <TextField label="Reason" hint="Shown to the user" value={reason} onChange={setReason} maxLength={140} />
        </div>
        {msg && (
          <p role="status" className={cn("rounded-xl border p-3 text-sm", msg.ok ? "border-teal/40 bg-teal/10" : "border-rose/40 bg-rose/10")}>
            {msg.text}
          </p>
        )}
        <Button className="w-fit" disabled={pending || !userId || !rupees || !reason} onClick={submit} variant={direction === "debit" ? "danger" : "primary"}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : direction === "credit" ? <Plus className="size-4" /> : <Minus className="size-4" />}
          {direction === "credit" ? "Credit wallet" : "Debit wallet"}
        </Button>
      </Card>

      <Card title="Balances">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or email"
          aria-label="Search wallets"
          className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary"
        />
        <ul className="divide-y divide-line">
          {shown.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-3 text-sm">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-saffron to-rose font-bold text-white uppercase">{r.name.charAt(0)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{r.name}</span>
                <span className="block truncate text-xs text-muted">
                  {r.email} · <span className="capitalize">{r.role}</span>
                </span>
              </span>
              <span className="font-semibold tabular-nums">{formatPaise(r.balance)}</span>
            </li>
          ))}
          {shown.length === 0 && <li className="py-8 text-center text-muted">No users match.</li>}
        </ul>
      </Card>
    </div>
  );
}
