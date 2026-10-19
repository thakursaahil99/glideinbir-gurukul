"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "@/components/admin/fields";
import { rpc } from "@/lib/rpc";
import { cn } from "@/lib/utils";
import type { Company } from "../types";

type Msg = { ok: boolean; text: string } | null;

function useCall() {
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
        router.replace(`/admin/jobs?updated=${Date.now()}`);
      } else setMsg({ ok: false, text: res.error ?? "Failed" });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed" });
    }
    setBusy(null);
  };
  return { busy, msg, call };
}
const Line = ({ msg }: { msg: Msg }) => (msg ? <p className={cn("text-sm", msg.ok ? "text-teal" : "text-rose")}>{msg.text}</p> : null);

export function CompanyQueue({ companies }: { companies: (Company & { jobs: number })[] }) {
  const { busy, msg, call } = useCall();
  const [note, setNote] = useState<Record<string, string>>({});
  return (
    <Card title="Companies" description="Verify recruiters before they can post. Suspending a company hides all its jobs.">
      <Line msg={msg} />
      {companies.length === 0 ? (
        <p className="text-sm text-muted">No companies yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {companies.map((c) => (
            <li key={c.id} className="space-y-2 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <b>{c.name}</b>
                <span className="text-xs text-muted">
                  {c.location} · {c.size} · {c.jobs} jobs {c.website && `· ${c.website}`}
                </span>
                <span className={cn("ml-auto rounded-full px-2 py-0.5 text-xs font-bold capitalize", c.status === "approved" ? "bg-teal/15 text-teal" : c.status === "pending" ? "bg-saffron/15 text-saffron" : "bg-rose/15 text-rose")}>{c.status}</span>
              </div>
              <p className="line-clamp-2 text-sm text-muted">{c.about}</p>
              <div className="flex flex-wrap items-center gap-2">
                <input value={note[c.id] ?? ""} onChange={(e) => setNote((n) => ({ ...n, [c.id]: e.target.value }))} placeholder="Reason (needed to reject / suspend)" aria-label={`Note for ${c.name}`} className="min-w-0 flex-1 rounded-lg bg-fg/[0.05] px-3 py-1.5 text-sm ring-1 ring-line outline-none" />
                {c.status !== "approved" && (
                  <Button className="py-1.5" disabled={!!busy} onClick={() => call(`a${c.id}`, () => rpc("jobsAdmin.company", c.id, "approved", ""), `${c.name} approved`)}>
                    {busy === `a${c.id}` && <Loader2 className="size-4 animate-spin" />} Approve
                  </Button>
                )}
                {c.status === "pending" && (
                  <Button variant="ghost" className="py-1.5" disabled={!!busy} onClick={() => call(`r${c.id}`, () => rpc("jobsAdmin.company", c.id, "rejected", note[c.id] ?? ""), "Rejected")}>
                    Reject
                  </Button>
                )}
                {c.status === "approved" && (
                  <Button variant="danger" className="py-1.5" disabled={!!busy} onClick={() => call(`s${c.id}`, () => rpc("jobsAdmin.company", c.id, "suspended", note[c.id] ?? ""), "Suspended")}>
                    Suspend
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function PostingModeration({ postings }: { postings: { id: string; title: string; companyName: string; status: string; hidden: string | null; applicants: number }[] }) {
  const { busy, msg, call } = useCall();
  const [reason, setReason] = useState<Record<string, string>>({});
  return (
    <Card title="Job postings" description="Hide misleading or spammy jobs. The recruiter sees your reason.">
      <Line msg={msg} />
      {postings.length === 0 ? (
        <p className="text-sm text-muted">No jobs posted yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {postings.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
              <span className="min-w-0 flex-1">
                <b>{p.title || "Untitled"}</b> <span className="text-muted">· {p.companyName} · {p.status} · {p.applicants} applicants</span>
                {p.hidden && <span className="ml-2 text-xs text-rose">Hidden: {p.hidden}</span>}
              </span>
              {p.hidden ? (
                <Button variant="ghost" className="py-1.5" disabled={!!busy} onClick={() => call(`u${p.id}`, () => rpc("jobsAdmin.moderate", p.id, "restore"), "Restored")}>
                  Restore
                </Button>
              ) : (
                <>
                  <input value={reason[p.id] ?? ""} onChange={(e) => setReason((r) => ({ ...r, [p.id]: e.target.value }))} placeholder="Reason" aria-label={`Hide reason for ${p.title}`} className="w-40 rounded-lg bg-fg/[0.05] px-3 py-1.5 text-sm ring-1 ring-line outline-none" />
                  <Button variant="danger" className="py-1.5" disabled={!!busy} onClick={() => call(`h${p.id}`, () => rpc("jobsAdmin.moderate", p.id, "hide", reason[p.id] ?? ""), "Hidden")}>
                    Hide
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function ExternalSync({ count, syncedAt }: { count: number; syncedAt: string | null }) {
  const { busy, msg, call } = useCall();
  return (
    <Card title="Remote jobs (Remotive)" description="Live remote listings from Remotive's public API, refreshed every 8 hours. Their terms: credit Remotive, link to their job page, no signup wall (they're also on the public /remote-jobs page), at most ~4 fetches a day.">
      <p className="text-sm">
        <b>{count}</b> listings · last sync {syncedAt ? new Date(syncedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "never"}
      </p>
      <Line msg={msg} />
      <Button
        variant="ghost"
        className="w-fit"
        disabled={!!busy}
        onClick={() =>
          call(
            "sync",
            async () => {
              const res = await rpc("jobsAdmin.sync");
              return res;
            },
            "Synced",
          )
        }
      >
        {busy === "sync" && <Loader2 className="size-4 animate-spin" />} Sync now
      </Button>
    </Card>
  );
}
