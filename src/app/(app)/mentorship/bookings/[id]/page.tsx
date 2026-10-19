import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/core/auth/current";
import { SessionRoom } from "@/modules/mentorship/components/session-room";
import { settle } from "@/modules/mentorship/service";
import { getBooking } from "@/modules/mentorship/store";

export const metadata = { title: "Mentorship session" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ booked?: string }> };

export default async function SessionPage({ params, searchParams }: Props) {
  const user = await requireUser("/mentorship/bookings");
  const { id } = await params;
  const raw = /^[0-9a-f-]{36}$/.test(id) ? await getBooking(id) : null;
  if (!raw || (raw.studentId !== user.id && raw.mentorId !== user.id)) notFound();
  const b = await settle(raw);
  const { booked } = await searchParams;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/mentorship/bookings" className="flex w-fit items-center gap-2 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> My sessions
      </Link>
      <SessionRoom key={b.id} initial={b} role={b.studentId === user.id ? "student" : "mentor"} serverNow={Date.now()} justBooked={booked === "1"} />
    </div>
  );
}
