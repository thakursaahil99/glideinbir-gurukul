import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/core/payments/razorpay";
import { settleRecharge } from "@/core/payments/settle";

/**
 * Razorpay webhook (Dashboard → Webhooks → `payment.captured`, `order.paid`).
 * Backup path for when the browser closes before the checkout callback runs.
 * Idempotent: the ledger key is the order id.
 */
export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });

  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature, secret)) return NextResponse.json({ error: "Bad signature" }, { status: 401 });

  let event: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  if ((event.event === "payment.captured" || event.event === "order.paid") && payment?.order_id && payment.id) {
    const res = await settleRecharge(payment.order_id, payment.id);
    // Unknown orders (e.g. from another app on the same account) are acknowledged, not retried.
    if (!res.ok) console.warn(`[webhook] ${res.error}: ${payment.order_id}`);
  }
  return NextResponse.json({ received: true });
}
