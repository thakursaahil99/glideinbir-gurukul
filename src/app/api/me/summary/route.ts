import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/current";
import { unreadCount } from "@/core/notifications/store";
import { getBalance } from "@/core/wallet/store";

/** Header numbers (wallet balance, unread notifications) for the signed-in user. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const [balance, unread] = await Promise.all([getBalance(user.id), unreadCount(user.id)]);
  return NextResponse.json({ balance, unread }, { headers: { "Cache-Control": "private, no-store" } });
}
