"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireUser } from "@/core/auth/current";
import { rateLimit } from "@/core/security/rate-limit";
import { MAX_RECHARGE_RUPEES, MIN_RECHARGE_RUPEES } from "./limits";
import { createRazorpayOrder, demoPaymentsAllowed, razorpayConfigured, verifyPaymentSignature } from "./razorpay";
import { settleRecharge } from "./settle";
import { createPayment, findPayment, markPayment } from "./store";

export type RechargeOrder =
  | { ok: true; mode: "razorpay"; orderId: string; amount: number; keyId: string; name: string; email: string }
  | { ok: true; mode: "demo"; orderId: string; amount: number }
  | { ok: false; error: string };

const amountSchema = z
  .number()
  .int("Enter a whole rupee amount")
  .min(MIN_RECHARGE_RUPEES, `Minimum recharge is ₹${MIN_RECHARGE_RUPEES}`)
  .max(MAX_RECHARGE_RUPEES, `Maximum recharge is ₹${MAX_RECHARGE_RUPEES.toLocaleString("en-IN")}`);

export async function createRechargeOrderAction(rupees: unknown): Promise<RechargeOrder> {
  const user = await requireUser("/wallet");
  const parsed = amountSchema.safeParse(rupees);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid amount" };
  if (!rateLimit(`recharge:${user.id}`, 10, 60_000).ok) return { ok: false, error: "Too many attempts. Wait a minute and try again." };

  const amount = parsed.data * 100;

  if (razorpayConfigured()) {
    try {
      const order = await createRazorpayOrder(amount, `w_${user.id.slice(0, 8)}_${Date.now()}`);
      await createPayment({ orderId: order.id, userId: user.id, provider: "razorpay", purpose: "wallet_recharge", amount });
      return { ok: true, mode: "razorpay", orderId: order.id, amount, keyId: process.env.RAZORPAY_KEY_ID!, name: user.name, email: user.email };
    } catch (e) {
      console.error("[payments] order create failed", e);
      return { ok: false, error: "Could not reach the payment gateway. Try again." };
    }
  }

  if (demoPaymentsAllowed()) {
    const orderId = `demo_${randomUUID()}`;
    await createPayment({ orderId, userId: user.id, provider: "demo", purpose: "wallet_recharge", amount });
    return { ok: true, mode: "demo", orderId, amount };
  }

  return { ok: false, error: "Payments aren't set up yet. Please try again later." };
}

const verifySchema = z.object({
  orderId: z.string().min(1).max(64),
  paymentId: z.string().min(1).max(64),
  signature: z.string().regex(/^[a-f0-9]{64}$/),
});

/** Called by Razorpay Checkout's success handler. The signature is checked here, never trusted from the client. */
export async function verifyRechargeAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser("/wallet");
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success || !razorpayConfigured()) return { ok: false, error: "Invalid payment response" };
  const { orderId, paymentId, signature } = parsed.data;

  const payment = await findPayment(orderId);
  if (!payment || payment.userId !== user.id || payment.provider !== "razorpay") return { ok: false, error: "Order not found" };
  if (!verifyPaymentSignature(orderId, paymentId, signature, process.env.RAZORPAY_KEY_SECRET!)) {
    await markPayment(orderId, { status: "failed", paymentId });
    return { ok: false, error: "Payment could not be verified" };
  }

  const res = await settleRecharge(orderId, paymentId);
  return res;
}

/** Local-dev only: completes a demo order without a gateway. Refused on production or when Razorpay is configured. */
export async function confirmDemoRechargeAction(orderId: unknown): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser("/wallet");
  if (!demoPaymentsAllowed() || typeof orderId !== "string") return { ok: false, error: "Demo payments are disabled" };
  const payment = await findPayment(orderId);
  if (!payment || payment.userId !== user.id || payment.provider !== "demo" || payment.status !== "created")
    return { ok: false, error: "Order not found" };
  const res = await settleRecharge(orderId, `demo_pay_${Date.now()}`);
  return res;
}

/** Checkout closed or failed: keep the record honest. */
export async function cancelRechargeAction(orderId: unknown) {
  const user = await requireUser("/wallet");
  if (typeof orderId !== "string") return;
  const payment = await findPayment(orderId);
  if (payment && payment.userId === user.id && payment.status === "created") await markPayment(orderId, { status: "failed" });
}
