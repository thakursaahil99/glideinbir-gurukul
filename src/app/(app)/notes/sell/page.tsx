import { requireUser } from "@/core/auth/current";
import { listEntries, getBalance } from "@/core/wallet/store";
import { NotesTabs } from "@/modules/notes/components/bits";
import { SellerDashboard, VendorApply, VendorStatusCard } from "@/modules/notes/components/seller";
import { ratingOf } from "@/modules/notes/logic";
import { coverUrl } from "@/modules/notes/queries";
import { getNotesSettings, getVendor, listNotes, listPayouts, listReviews } from "@/modules/notes/store";

export const metadata = { title: "Sell notes" };

export default async function SellPage() {
  const user = await requireUser("/notes/sell");
  const vendor = await getVendor(user.id);
  const approved = vendor?.status === "approved";

  let body: React.ReactNode;
  if (!vendor || vendor.status === "rejected") body = <VendorApply vendor={vendor} />;
  else if (!approved) body = <VendorStatusCard vendor={vendor} />;
  else {
    const [all, reviews, payouts, entries, balance, settings] = await Promise.all([listNotes(), listReviews(), listPayouts(), listEntries(user.id, 10_000), getBalance(user.id), getNotesSettings()]);
    const notes = all.filter((n) => n.vendorId === user.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const ids = new Set(notes.map((n) => n.id));
    const r = ratingOf(reviews.filter((x) => ids.has(x.noteId)));
    body = (
      <SellerDashboard
        vendor={vendor}
        notes={notes}
        coverUrls={Object.fromEntries(notes.map((n) => [n.id, coverUrl(n)]))}
        stats={{
          earned: entries.filter((e) => e.type === "transfer_in" && e.ref?.startsWith("note:")).reduce((s, e) => s + e.amount, 0),
          sold: notes.reduce((s, n) => s + n.sales, 0),
          balance,
          rating: r.avg,
          ratings: r.count,
          minPayout: settings.minPayout,
        }}
        payouts={payouts.filter((p) => p.vendorId === user.id).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Notes Marketplace</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">{approved ? vendor.storeName : "Sell your notes"}</h1>
        </div>
        <NotesTabs canSell={approved} />
      </div>
      {body}
    </div>
  );
}
