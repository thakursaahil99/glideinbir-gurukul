import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/core/auth/current";
import { getDoubtAction } from "@/modules/doubts/actions";
import { DoubtRoom } from "@/modules/doubts/components/room";

export const metadata: Metadata = { title: "Doubt session" };

export default async function DoubtRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/doubts/${id}`);
  // Same access rules as the live API: learner, assigned tutor, or a tutor peeking at an open request.
  const res = await getDoubtAction(id);
  if (!res.ok) notFound();
  return <DoubtRoom initial={{ doubt: res.doubt, messages: res.messages }} role={res.role} meId={user.id} tutorsOnline={res.tutorsOnline} serverNow={Date.now()} />;
}
