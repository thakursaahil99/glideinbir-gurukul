"use server";

import { z } from "zod";
import { requireAdmin } from "@/core/auth/current";
import { findUserById } from "@/core/auth/users";
import { notify } from "@/core/notifications/store";
import { WalletError } from "@/core/wallet/ledger";
import { walletCredit, walletDebit } from "@/core/wallet/store";
import { formatPaise } from "@/lib/utils";

const adjustSchema = z.object({
  userId: z.string().uuid(),
  direction: z.enum(["credit", "debit"]),
  rupees: z.number().positive("Enter an amount").max(100_000, "Max ₹1,00,000 per adjustment"),
  reason: z.string().trim().min(3, "Add a short reason").max(140),
  /** Generated once per form submit on the client, so a double-click can't apply twice. */
  requestId: z.string().uuid(),
});

/** Manual correction by an admin. Always a separate, labelled ledger entry: balances are never edited. */
export async function adjustWalletAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  const parsed = adjustSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const { userId, direction, rupees, reason, requestId } = parsed.data;

  const amount = Math.round(rupees * 100);
  const target = await findUserById(userId);
  if (!target) return { ok: false, error: "User not found" };

  const move = { userId, amount, type: "adjustment" as const, key: `adj:${admin.id}:${requestId}`, note: reason, ref: `admin:${admin.email}` };
  try {
    const res = direction === "credit" ? await walletCredit(move) : await walletDebit(move);
    if (!res.duplicate)
      await notify(userId, {
        kind: "wallet",
        title: `${direction === "credit" ? "+" : "−"}${formatPaise(amount)} wallet adjustment`,
        body: reason,
        href: "/wallet",
      });
  } catch (e) {
    if (e instanceof WalletError) return { ok: false, error: e.message };
    throw e;
  }
  return { ok: true };
}
