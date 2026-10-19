"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, TextField } from "@/components/admin/fields";
import { rpc } from "@/lib/rpc";
import { cn, formatPaise } from "@/lib/utils";
import { REPORT_REASONS, type Payout, type Report, type Vendor } from "../types";

type Msg = { ok: boolean; text: string } | null;

/** Runs an admin call, shows its error inline and re-reads the page on success. */
function useAdminCall() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const call = async (key: string, job: () => Promise<{ ok: boolean; error?: string }>, okText: string) => {
    setBusy(key);
    setMsg(null);
    try {
      const res = await job();
      if (res.ok) {
        setMsg({ ok: true, text: okText });
        router.replace(`/admin/notes?updated=${Date.now()}`);
      } else setMsg({ ok: false, text: res.error ?? "Failed" });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed" });
    }
    setBusy(null);
  };
  return { busy, msg, call };
}

const MsgLine = ({ msg }: { msg: Msg }) => (msg ? <p className={cn("text-sm", msg.ok ? "text-teal" : "text-rose")}>{msg.text}</p> : null);

export function VendorQueue({ vendors }: { vendors: Vendor[] }) {
  const { busy, msg, call } = useAdminCall();
  const [notes, setNotes] = useState<Record<string, string>>({});
  if (!vendors.length) return <Card title="Seller applications" description="New applications show up here."><p className="text-sm text-muted">No sellers yet.</p></Card>;
  return (
    <Card title="Sellers" description="Approve applications, or suspend a store (its notes disappear from the marketplace; buyers keep access).">
      <MsgLine msg={msg} />
      <ul className="divide-y divide-line">
        {vendors.map((v) => (
          <li key={v.userId} className="space-y-2 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <b>{v.storeName}</b>
              <span className="text-xs text-muted">
                {v.name} · {v.subjects.join(", ")} · {v.payoutUpi}
              </span>
              <span className={cn("ml-auto rounded-full px-2 py-0.5 text-xs font-bold capitalize", v.status === "approved" ? "bg-teal/15 text-teal" : v.status === "pending" ? "bg-saffron/15 text-saffron" : "bg-rose/15 text-rose")}>{v.status}</span>
            </div>
            <p className="text-sm text-muted">{v.bio}</p>
            <div className="flex flex-wrap items-center gap-2">
              <input value={notes[v.userId] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [v.userId]: e.target.value }))} placeholder="Note to the seller (needed to reject / suspend)" aria-label={`Note for ${v.storeName}`} className="min-w-0 flex-1 rounded-lg bg-fg/[0.05] px-3 py-1.5 text-sm ring-1 ring-line outline-none" />
              {v.status !== "approved" && (
                <Button className="py-1.5" disabled={!!busy} onClick={() => call(`a${v.userId}`, () => rpc("notesAdmin.vendor", v.userId, "approved", notes[v.userId] ?? ""), `${v.storeName} approved`)}>
                  {busy === `a${v.userId}` && <Loader2 className="size-4 animate-spin" />} Approve
                </Button>
              )}
              {v.status === "pending" && (
                <Button variant="ghost" className="py-1.5" disabled={!!busy} onClick={() => call(`r${v.userId}`, () => rpc("notesAdmin.vendor", v.userId, "rejected", notes[v.userId] ?? ""), "Application rejected")}>
                  Reject
                </Button>
              )}
              {v.status === "approved" && (
                <Button variant="danger" className="py-1.5" disabled={!!busy} onClick={() => call(`s${v.userId}`, () => rpc("notesAdmin.vendor", v.userId, "suspended", notes[v.userId] ?? ""), "Store suspended")}>
                  Suspend
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export interface ReportGroup {
  noteId: string;
  title: string;
  vendorName: string;
  hidden: string | null;
  reports: Report[];
}

export function ReportQueue({ groups }: { groups: ReportGroup[] }) {
  const { busy, msg, call } = useAdminCall();
  const [reason, setReason] = useState<Record<string, string>>({});
  return (
    <Card title="Reports" description={`Notes flagged by learners. Three reports from different people hide a note automatically until you decide.`}>
      <MsgLine msg={msg} />
      {groups.length === 0 ? (
        <p className="text-sm text-muted">No open reports.</p>
      ) : (
        <ul className="divide-y divide-line">
          {groups.map((g) => (
            <li key={g.noteId} className="space-y-2 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/notes/${g.noteId}`} target="_blank" className="font-semibold underline-offset-2 hover:underline">
                  {g.title}
                </Link>
                <span className="text-xs text-muted">by {g.vendorName}</span>
                <span className="rounded-full bg-rose/15 px-2 py-0.5 text-xs font-bold text-rose">{g.reports.length} reports</span>
                {g.hidden && <span className="rounded-full bg-fg/10 px-2 py-0.5 text-xs font-bold">Hidden</span>}
              </div>
              <ul className="space-y-1 text-sm">
                {g.reports.map((r) => (
                  <li key={r.id} className="text-muted">
                    <b className="text-fg">{REPORT_REASONS[r.reason]}</b> · {r.userName}
                    {r.text && `: “${r.text}”`}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-2">
                <input value={reason[g.noteId] ?? ""} onChange={(e) => setReason((x) => ({ ...x, [g.noteId]: e.target.value }))} placeholder="Reason shown to the seller (to hide)" aria-label={`Hide reason for ${g.title}`} className="min-w-0 flex-1 rounded-lg bg-fg/[0.05] px-3 py-1.5 text-sm ring-1 ring-line outline-none" />
                <Button variant="danger" className="py-1.5" disabled={!!busy} onClick={() => call(`h${g.noteId}`, () => rpc("notesAdmin.moderate", g.noteId, "hide", reason[g.noteId] ?? ""), "Notes hidden")}>
                  Hide notes
                </Button>
                <Button variant="ghost" className="py-1.5" disabled={!!busy} onClick={() => call(`d${g.noteId}`, () => rpc("notesAdmin.moderate", g.noteId, g.hidden ? "restore" : "dismiss"), g.hidden ? "Restored and reports dismissed" : "Reports dismissed")}>
                  {g.hidden ? "Restore & dismiss" : "Dismiss"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function HiddenNotes({ notes }: { notes: { id: string; title: string; reason: string }[] }) {
  const { busy, msg, call } = useAdminCall();
  if (!notes.length) return null;
  return (
    <Card title="Hidden notes" description="Restore notes after the seller fixes them.">
      <MsgLine msg={msg} />
      <ul className="divide-y divide-line">
        {notes.map((n) => (
          <li key={n.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
            <span className="flex-1">
              <b>{n.title}</b> <span className="text-muted">· {n.reason}</span>
            </span>
            <Button variant="ghost" className="py-1.5" disabled={!!busy} onClick={() => call(`u${n.id}`, () => rpc("notesAdmin.moderate", n.id, "restore"), "Restored")}>
              Restore
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function PayoutQueue({ payouts }: { payouts: Payout[] }) {
  const { busy, msg, call } = useAdminCall();
  const [ref, setRef] = useState<Record<string, string>>({});
  const open = payouts.filter((p) => p.status === "requested");
  const done = payouts.filter((p) => p.status !== "requested").slice(0, 10);
  return (
    <Card title="Payout requests" description="Send the money to the seller's UPI from your bank, then record the transaction reference here.">
      <MsgLine msg={msg} />
      {open.length === 0 ? (
        <p className="text-sm text-muted">No pending payouts.</p>
      ) : (
        <ul className="divide-y divide-line">
          {open.map((p) => (
            <li key={p.id} className="space-y-2 py-3">
              <p className="text-sm">
                <b className="font-display text-lg">{formatPaise(p.amount)}</b> to <b>{p.upi}</b> · {p.vendorName} · {new Date(p.requestedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input value={ref[p.id] ?? ""} onChange={(e) => setRef((x) => ({ ...x, [p.id]: e.target.value }))} placeholder="UTR / reference (to mark paid) or reason (to reject)" aria-label={`Reference for payout to ${p.vendorName}`} className="min-w-0 flex-1 rounded-lg bg-fg/[0.05] px-3 py-1.5 text-sm ring-1 ring-line outline-none" />
                <Button className="py-1.5" disabled={!!busy} onClick={() => call(`p${p.id}`, () => rpc("notesAdmin.payout", p.id, { decision: "paid", reference: ref[p.id] ?? "", note: "" }), "Marked as paid")}>
                  {busy === `p${p.id}` && <Loader2 className="size-4 animate-spin" />} Mark paid
                </Button>
                <Button variant="ghost" className="py-1.5" disabled={!!busy} onClick={() => call(`x${p.id}`, () => rpc("notesAdmin.payout", p.id, { decision: "rejected", reference: "", note: ref[p.id] ?? "" }), "Rejected, money returned")}>
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-line pt-3 text-xs text-muted">
          {done.map((p) => (
            <li key={p.id}>
              {formatPaise(p.amount)} · {p.vendorName} · <span className="capitalize">{p.status}</span>
              {p.reference && ` · ref ${p.reference}`}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function NotesSettingsCard({ commission, minPayout }: { commission: number; minPayout: number }) {
  const { busy, msg, call } = useAdminCall();
  const [pct, setPct] = useState(String(commission));
  const [min, setMin] = useState(String(minPayout));
  return (
    <Card title="Marketplace settings" description="Commission is taken from every sale before the seller is paid.">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Commission (%)" type="number" min={0} max={90} value={pct} onChange={setPct} />
        <TextField label="Minimum payout (₹)" type="number" min={1} value={min} onChange={setMin} />
      </div>
      <MsgLine msg={msg} />
      <div className="flex flex-wrap gap-2">
        <Button className="w-fit" disabled={!!busy} onClick={() => call("settings", () => rpc("notesAdmin.settings", { commissionPercent: Number(pct), minPayoutRupees: Number(min) }), "Settings saved")}>
          {busy === "settings" && <Loader2 className="size-4 animate-spin" />} Save
        </Button>
        <Button variant="ghost" className="w-fit" disabled={!!busy} onClick={() => call("demo", async () => {
          const res = await rpc("notesAdmin.loadDemo");
          return res;
        }, "Demo notes loaded")}>
          {busy === "demo" && <Loader2 className="size-4 animate-spin" />} Load demo notes
        </Button>
      </div>
    </Card>
  );
}
