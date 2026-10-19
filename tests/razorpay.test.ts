import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { demoPaymentsAllowed, verifyPaymentSignature, verifyWebhookSignature } from "@/core/payments/razorpay";

const SECRET = "test_secret_123";

describe("verifyPaymentSignature", () => {
  const sign = (o: string, p: string) => createHmac("sha256", SECRET).update(`${o}|${p}`).digest("hex");

  it("accepts the HMAC of order_id|payment_id", () => {
    expect(verifyPaymentSignature("order_A", "pay_B", sign("order_A", "pay_B"), SECRET)).toBe(true);
  });

  it("rejects a signature for a different payment, a different secret, or junk", () => {
    expect(verifyPaymentSignature("order_A", "pay_C", sign("order_A", "pay_B"), SECRET)).toBe(false);
    expect(verifyPaymentSignature("order_A", "pay_B", sign("order_A", "pay_B"), "other")).toBe(false);
    expect(verifyPaymentSignature("order_A", "pay_B", "short", SECRET)).toBe(false);
  });
});

describe("verifyWebhookSignature", () => {
  it("checks the HMAC of the raw body", () => {
    const body = JSON.stringify({ event: "payment.captured" });
    const sig = createHmac("sha256", SECRET).update(body).digest("hex");
    expect(verifyWebhookSignature(body, sig, SECRET)).toBe(true);
    expect(verifyWebhookSignature(body + " ", sig, SECRET)).toBe(false);
  });
});

describe("demoPaymentsAllowed", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is never allowed in production", () => {
    vi.stubEnv("RAZORPAY_KEY_ID", "");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(demoPaymentsAllowed()).toBe(false);
  });

  it("is off once real keys are configured", () => {
    vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_x");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "s");
    vi.stubEnv("NODE_ENV", "development");
    expect(demoPaymentsAllowed()).toBe(false);
  });

  it("is on in local dev without keys", () => {
    vi.stubEnv("RAZORPAY_KEY_ID", "");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(demoPaymentsAllowed()).toBe(true);
  });
});
