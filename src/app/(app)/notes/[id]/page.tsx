import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/core/auth/current";
import { getBalance } from "@/core/wallet/store";
import { NotesTabs } from "@/modules/notes/components/bits";
import { NoteDetail } from "@/modules/notes/components/note-detail";
import { isListed } from "@/modules/notes/logic";
import { UUID_RE } from "@/modules/notes/media";
import { toCard } from "@/modules/notes/queries";
import { activeVendor, hasAccess } from "@/modules/notes/service";
import { getNote, getVendor, listNotes, listReviews } from "@/modules/notes/store";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const n = UUID_RE.test(id) ? await getNote(id) : null;
  return { title: n?.status === "published" ? n.title : "Notes" };
}

export default async function NotePage({ params }: Props) {
  const user = await requireUser("/notes");
  const { id } = await params;
  const n = UUID_RE.test(id) ? await getNote(id) : null;
  if (!n) notFound();
  const [vendor, access, reviews, balance, all, me] = await Promise.all([getVendor(n.vendorId), hasAccess(user, n), listReviews(), getBalance(user.id), listNotes(), activeVendor(user.id)]);
  // Unlisted notes stay readable for the seller, admins and existing buyers only.
  if (!isListed(n, vendor) && !access) notFound();
  const mine = reviews.filter((r) => r.noteId === n.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const listedByVendor = all.filter((x) => x.vendorId === n.vendorId && isListed(x, vendor)).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/notes" className="flex items-center gap-2 text-sm font-semibold text-muted hover:text-fg">
          <ArrowLeft className="size-4" /> All notes
        </Link>
        <NotesTabs canSell={!!me} />
      </div>
      <NoteDetail
        note={{ ...toCard(n, reviews), description: n.description, bytes: n.bytes, hidden: n.hidden || vendor?.status !== "approved" ? (n.hidden?.reason ?? "Seller unavailable") : null }}
        vendor={{ storeName: vendor?.storeName ?? n.vendorName, bio: vendor?.bio ?? "", notes: listedByVendor }}
        access={n.vendorId === user.id ? "seller" : access ? "owned" : "none"}
        balance={balance}
        reviews={mine.map((r) => ({ name: r.name, stars: r.stars, text: r.text, createdAt: r.createdAt }))}
        reviewed={mine.some((r) => r.userId === user.id)}
      />
    </div>
  );
}
