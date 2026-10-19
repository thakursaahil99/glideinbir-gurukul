import type { Metadata } from "next";
import { requireUser } from "@/core/auth/current";
import { getSite } from "@/core/site/store";
import { NotesTabs } from "@/modules/notes/components/bits";
import { Marketplace } from "@/modules/notes/components/marketplace";
import { marketplace } from "@/modules/notes/queries";
import { activeVendor } from "@/modules/notes/service";
import { listPurchases } from "@/modules/notes/store";
import { ensureStarterContent } from "@/app/starter-content";

export async function generateMetadata(): Promise<Metadata> {
  const { modules } = await getSite();
  return { title: modules.find((m) => m.key === "notes")?.name ?? "Notes Marketplace" };
}

export default async function NotesPage() {
  const user = await requireUser("/notes");
  // Layout and page render in parallel: make sure starter content exists before reading.
  await ensureStarterContent();
  const [notes, purchases, vendor] = await Promise.all([marketplace(), listPurchases(), activeVendor(user.id)]);
  const owned = purchases.filter((p) => p.userId === user.id).map((p) => p.noteId);
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Notes Marketplace</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Toppers&apos; notes, <span className="bg-gradient-to-r from-[#00b89c] to-[#7ddc5a] bg-clip-text text-transparent">one tap away</span>
          </h1>
          <p className="mt-2 max-w-xl text-muted">Preview the first pages free. Buy once, download anytime.</p>
        </div>
        <NotesTabs canSell={!!vendor} />
      </div>
      <Marketplace notes={notes} owned={owned} />
    </div>
  );
}
