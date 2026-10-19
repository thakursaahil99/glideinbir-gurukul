import { notify } from "@/core/notifications/store";
import { walletCredit } from "@/core/wallet/store";
import { formatPaise } from "@/lib/utils";
import { findPayment, markPayment } from "./store";

/**
 * Credit a paid recharge to the wallet. Safe to call from both the checkout
 * callback and the webhook: the ledger key is the order id, so a second call
 * finds the existing entry and changes nothing.
 */
export async function settleRecharge(orderId: string, paymentId: string): Promise<{ ok: boolean; amount?: number; error?: string }> {
  const payment = await findPayment(orderId);
  if (!payment) return { ok: false, error: "Unknown order" };

  const result = await walletCredit({
    userId: payment.userId,
    amount: payment.amount,
    key: `recharge:${orderId}`,
    note: payment.provider === "demo" ? "Wallet recharge (demo)" : "Wallet recharge",
    ref: paymentId,
  });
  await markPayment(orderId, { status: "paid", paymentId });

  if (!result.duplicate)
    await notify(payment.userId, {
      kind: "payment",
      title: `${formatPaise(payment.amount)} added to your wallet`,
      body: `Recharge successful. New balance: ${formatPaise(result.entries[0]!.balanceAfter)}.`,
      href: "/wallet",
    });
  return { ok: true, amount: payment.amount };
}
