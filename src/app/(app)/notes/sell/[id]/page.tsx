import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/core/auth/current";
import { NoteEditor } from "@/modules/notes/components/note-editor";
import { UUID_RE } from "@/modules/notes/media";
import { coverUrl } from "@/modules/notes/queries";
import { activeVendor } from "@/modules/notes/service";
import { getNote } from "@/modules/notes/store";

export const metadata = { title: "Edit notes" };

export default async function EditNotePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("/notes/sell");
  if (!(await activeVendor(user.id))) redirect("/notes/sell");
  const { id } = await params;
  const n = UUID_RE.test(id) ? await getNote(id) : null;
  if (!n || n.vendorId !== user.id) notFound();
  return (
    <div className="mx-auto max-w-6xl">
      <NoteEditor key={n.id} initial={n} initialCoverUrl={coverUrl(n)} />
    </div>
  );
}
