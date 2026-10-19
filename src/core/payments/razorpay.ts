import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay over plain REST (no SDK). Test-mode keys are free.
 * Docs: order create → checkout → verify `order_id|payment_id` HMAC on the server.
 */
export const razorpayConfigured = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

/**
 * Demo recharges (no real gateway) are allowed only when Razorpay isn't set up
 * AND we're not in production, so they can never mint money on a live site.
 */
export const demoPaymentsAllowed = () => !razorpayConfigured() && process.env.NODE_ENV !== "production";

function safeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Signature Razorpay Checkout returns after a successful payment. */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** `X-Razorpay-Signature` on webhooks: HMAC of the raw request body. */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

export async function createRazorpayOrder(amountPaise: number, receipt: string): Promise<{ id: string; amount: number; currency: string }> {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Razorpay order failed (${res.status})`);
  return res.json();
}
