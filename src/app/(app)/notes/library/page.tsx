import { requireUser } from "@/core/auth/current";
import { NotesTabs } from "@/modules/notes/components/bits";
import { Library } from "@/modules/notes/components/library";
import { libraryOf } from "@/modules/notes/queries";
import { activeVendor } from "@/modules/notes/service";

export const metadata = { title: "My library" };

export default async function LibraryPage() {
  const user = await requireUser("/notes/library");
  const [items, vendor] = await Promise.all([libraryOf(user.id), activeVendor(user.id)]);
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Notes Marketplace</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">My library</h1>
        </div>
        <NotesTabs canSell={!!vendor} />
      </div>
      <Library items={items} />
    </div>
  );
}
