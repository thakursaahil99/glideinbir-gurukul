"use client";

import { KeyRound, Loader2, Search, ShieldBan, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/core/admin/actions";
import { rpc } from "@/lib/rpc";
import { ROLES, type PublicUser, type Role } from "@/core/auth/roles";
import { cn } from "@/lib/utils";
import { Button, Card, Select, TextField } from "./fields";

export function UsersManager({ users, currentId, mainAdminEmail }: { users: PublicUser[]; currentId: string; mainAdminEmail: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");

  const run = (id: string | null, job: () => Promise<ActionResult>, okText: string) => {
    setBusyId(id);
    startTransition(async () => {
      const res = await job();
      setMessage(res.ok ? { kind: "ok", text: okText } : { kind: "error", text: res.error ?? "Something went wrong" });
      setBusyId(null);
      // New URL = reliable re-fetch (a same-URL refresh after an action could be dropped).
      if (res.ok) router.replace(`/admin/users?updated=${Date.now()}`, { scroll: false });
    });
  };

  const q = query.trim().toLowerCase();
  const shown = users
    .filter((u) => roleFilter === "all" || u.role === roleFilter)
    .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.includes(q))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="grid gap-5">
      <AddUser onCreate={(input, done) => run(null, async () => {
        const res = await rpc("admin.createUser", input);
        if (res.ok) done();
        return res;
      }, `Created ${input.email}`)} pending={pending && busyId === null} />

      {message && (
        <p role="status" className={cn("rounded-2xl border p-3 text-sm", message.kind === "ok" ? "border-teal/40 bg-teal/10" : "border-rose/40 bg-rose/10")}>
          {message.text}
        </p>
      )}

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-56 flex-1 items-center gap-2 rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm">
            <Search className="size-4 text-muted" />
            <span className="sr-only">Search users</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" className="w-full bg-transparent outline-none placeholder:text-muted/60" />
          </label>
          <Select label="Role" value={roleFilter} options={["all", ...ROLES] as const} onChange={setRoleFilter} className="w-40" />
        </div>

        {shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">{users.length ? "No users match this search." : "No users yet."}</p>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((u) => {
              const locked = u.email === mainAdminEmail || u.id === currentId;
              const busy = pending && busyId === u.id;
              return (
                <li key={u.id} className={cn("flex flex-wrap items-center gap-3 py-3", u.blocked && "opacity-60")}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-saffron to-rose font-bold text-white uppercase">{u.name.charAt(0)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate font-semibold">
                      {u.name}
                      {u.email === mainAdminEmail && <span className="rounded-full bg-rose/15 px-2 py-0.5 text-[10px] font-bold text-rose uppercase">Main admin</span>}
                      {u.blocked && <span className="rounded-full bg-fg/10 px-2 py-0.5 text-[10px] font-bold uppercase">Blocked</span>}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {u.email} · joined {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>

                  <label className="sr-only" htmlFor={`role-${u.id}`}>
                    Role for {u.email}
                  </label>
                  <select
                    id={`role-${u.id}`}
                    value={u.role}
                    disabled={locked || busy}
                    onChange={(e) => run(u.id, () => rpc("admin.updateUser", { id: u.id, role: e.target.value }), `${u.email} is now ${e.target.value}`)}
                    className="rounded-xl border border-line bg-card px-3 py-2 text-sm capitalize disabled:opacity-50"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1">
                    {busy && <Loader2 className="size-4 animate-spin text-muted" />}
                    <RowBtn
                      label={u.blocked ? "Unblock" : "Block"}
                      disabled={locked || busy}
                      onClick={() => run(u.id, () => rpc("admin.updateUser", { id: u.id, blocked: !u.blocked }), `${u.email} ${u.blocked ? "unblocked" : "blocked"}`)}
                    >
                      {u.blocked ? <ShieldCheck className="size-4" /> : <ShieldBan className="size-4" />}
                    </RowBtn>
                    <RowBtn
                      label="Set new password"
                      disabled={busy}
                      onClick={() => {
                        const pw = prompt(`New password for ${u.email} (min 8 characters):`);
                        if (pw) run(u.id, () => rpc("admin.updateUser", { id: u.id, password: pw }), `Password updated for ${u.email}`);
                      }}
                    >
                      <KeyRound className="size-4" />
                    </RowBtn>
                    <RowBtn
                      label="Delete"
                      danger
                      disabled={locked || busy}
                      onClick={() => {
                        if (confirm(`Delete ${u.email}? This can't be undone.`)) run(u.id, () => rpc("admin.deleteUser", u.id), `Deleted ${u.email}`);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </RowBtn>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function RowBtn({ label, danger, children, ...props }: { label: string; danger?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "grid size-9 place-items-center rounded-xl border border-line text-muted disabled:opacity-30",
        danger ? "hover:bg-rose/10 hover:text-rose" : "hover:bg-fg/5 hover:text-fg",
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface NewUser {
  name: string;
  email: string;
  password: string;
  role: Role;
}

const EMPTY: NewUser = { name: "", email: "", password: "", role: "student" };

function AddUser({ onCreate, pending }: { onCreate: (u: NewUser, done: () => void) => void; pending: boolean }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<NewUser>(EMPTY);

  if (!open)
    return (
      <Button className="w-fit" onClick={() => setOpen(true)}>
        <UserPlus className="size-4" /> Add user
      </Button>
    );

  return (
    <Card title="Add user" description="Create an account for an instructor, tutor, mentor, vendor, recruiter or another admin.">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Full name" value={v.name} onChange={(x) => setV({ ...v, name: x })} maxLength={60} />
        <TextField label="Email" type="email" value={v.email} onChange={(x) => setV({ ...v, email: x })} maxLength={120} />
        <TextField label="Password" hint="Min 8 characters" type="password" autoComplete="new-password" value={v.password} onChange={(x) => setV({ ...v, password: x })} />
        <Select label="Role" value={v.role} options={ROLES} onChange={(x) => setV({ ...v, role: x })} />
      </div>
      <div className="flex gap-2">
        <Button
          disabled={pending}
          onClick={() =>
            onCreate(v, () => {
              setV(EMPTY);
              setOpen(false);
            })
          }
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} Create
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
