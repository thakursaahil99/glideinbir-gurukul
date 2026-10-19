import { AdminHeading } from "@/components/admin/admin-shell";
import { WalletsManager } from "@/components/admin/wallets-manager";
import { listUsers } from "@/core/auth/users";
import { razorpayConfigured } from "@/core/payments/razorpay";
import { listPayments } from "@/core/payments/store";
import { PLATFORM_ID } from "@/core/wallet/ledger";
import { getBalances } from "@/core/wallet/store";
import { cn, formatPaise } from "@/lib/utils";

export const metadata = { title: "Wallets & payments" };

const STATUS_CLS = { paid: "bg-teal/15 text-teal", created: "bg-saffron/15 text-saffron", failed: "bg-rose/15 text-rose" } as const;

export default async function AdminWalletsPage() {
  const [users, balances, payments] = await Promise.all([listUsers(), getBalances(), listPayments(undefined, 30)]);
  const emailOf = new Map(users.map((u) => [u.id, u.email]));
  const rows = users
    .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, balance: balances.get(u.id) ?? 0 }))
    .sort((a, b) => b.balance - a.balance);
  const held = rows.reduce((s, r) => s + r.balance, 0);
  const paid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);

  const stats = [
    { label: "Held in user wallets", value: formatPaise(held) },
    { label: "Platform commission", value: formatPaise(balances.get(PLATFORM_ID) ?? 0) },
    { label: "Recharges (last 30 orders)", value: formatPaise(paid) },
  ];

  return (
    <>
      <AdminHeading
        title="Wallets & payments"
        sub={razorpayConfigured() ? "Razorpay is connected (test mode keys are free)." : "Razorpay keys aren't set: recharges run in demo mode on local dev and are disabled in production."}
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-[24px] p-5">
            <p className="font-display text-3xl font-bold tracking-tight tabular-nums">{s.value}</p>
            <p className="mt-1 text-sm text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <WalletsManager rows={rows} />

      <section className="glass mt-5 rounded-[24px] p-5 sm:p-6">
        <h3 className="font-display text-lg font-bold">Recent payments</h3>
        {payments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No payments yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs text-muted uppercase">
                <tr>
                  <th className="pb-2 font-semibold">User</th>
                  <th className="pb-2 font-semibold">Amount</th>
                  <th className="pb-2 font-semibold">Provider</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {payments.map((p) => (
                  <tr key={p.orderId}>
                    <td className="py-2.5">{emailOf.get(p.userId) ?? "deleted user"}</td>
                    <td className="py-2.5 font-semibold tabular-nums">{formatPaise(p.amount)}</td>
                    <td className="py-2.5 capitalize">{p.provider}</td>
                    <td className="py-2.5">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize", STATUS_CLS[p.status])}>{p.status}</span>
                    </td>
                    <td className="py-2.5 text-muted">
                      {new Date(p.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
