import { AdminHeading } from "@/components/admin/admin-shell";
import { getBalance } from "@/core/wallet/store";
import { formatPaise } from "@/lib/utils";
import { HiddenNotes, NotesSettingsCard, PayoutQueue, ReportQueue, VendorQueue, type ReportGroup } from "@/modules/notes/components/admin-notes";
import { PAYOUT_ESCROW_ID } from "@/modules/notes/service";
import { getNotesSettings, listNotes, listPayouts, listPurchases, listReports, listVendors } from "@/modules/notes/store";

export const metadata = { title: "Notes" };

const ORDER = { pending: 0, approved: 1, suspended: 2, rejected: 3 } as const;

export default async function AdminNotesPage() {
  const [vendors, notes, reports, payouts, purchases, settings, escrow] = await Promise.all([listVendors(), listNotes(), listReports(), listPayouts(), listPurchases(), getNotesSettings(), getBalance(PAYOUT_ESCROW_ID)]);
  const byId = new Map(notes.map((n) => [n.id, n]));
  const groups: ReportGroup[] = [];
  for (const r of reports.filter((x) => x.status === "open")) {
    let g = groups.find((x) => x.noteId === r.noteId);
    if (!g) {
      const n = byId.get(r.noteId);
      g = { noteId: r.noteId, title: n?.title ?? "Deleted notes", vendorName: n?.vendorName ?? "—", hidden: n?.hidden?.reason ?? null, reports: [] };
      groups.push(g);
    }
    g.reports.push(r);
  }
  groups.sort((a, b) => b.reports.length - a.reports.length);
  const stats = [
    { label: "Live sellers", value: String(vendors.filter((v) => v.status === "approved").length) },
    { label: "Notes listed", value: String(notes.filter((n) => n.status === "published" && !n.hidden).length) },
    { label: "Sales value", value: formatPaise(purchases.reduce((s, p) => s + p.price, 0)) },
    { label: "Payouts waiting", value: formatPaise(escrow) },
  ];

  return (
    <>
      <AdminHeading title="Notes Marketplace" sub="Approve sellers, moderate reported notes and pay out seller earnings." />
      <div className="mb-5 grid gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-[24px] p-5">
            <p className="font-display text-3xl font-bold tabular-nums">{s.value}</p>
            <p className="mt-1 text-sm text-muted">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-5">
        <VendorQueue vendors={[...vendors].sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.appliedAt.localeCompare(a.appliedAt))} />
        <ReportQueue groups={groups} />
        <PayoutQueue payouts={[...payouts].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))} />
        <HiddenNotes notes={notes.filter((n) => n.hidden && !groups.some((g) => g.noteId === n.id)).map((n) => ({ id: n.id, title: n.title, reason: n.hidden!.reason }))} />
        <NotesSettingsCard commission={settings.commissionBps / 100} minPayout={settings.minPayout / 100} />
      </div>
    </>
  );
}
