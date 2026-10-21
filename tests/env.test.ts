import { describe, expect, it } from "vitest";
import { checkEnv } from "@/core/config/env";

const BASE = {
  SESSION_SECRET: "x".repeat(32),
  ADMIN_EMAIL: "admin@example.com",
  ADMIN_PASSWORD_HASH: "scrypt:aa:bb",
};

const FULL_PROD = {
  ...BASE,
  NEXT_PUBLIC_APP_URL: "https://gurukul.example.com",
  RAZORPAY_KEY_ID: "rzp_test_1",
  RAZORPAY_KEY_SECRET: "s",
  RAZORPAY_WEBHOOK_SECRET: "w",
  CRON_SECRET: "c",
  RESEND_API_KEY: "r",
  LIVEKIT_URL: "wss://x.livekit.cloud",
  LIVEKIT_API_KEY: "k",
  LIVEKIT_API_SECRET: "s",
  JUDGE0_HOST: "judge0-ce.p.rapidapi.com",
};

describe("checkEnv", () => {
  it("passes a fully configured production env with no warnings", () => {
    expect(checkEnv(FULL_PROD, true)).toEqual({ errors: [], warnings: [] });
  });

  it("makes missing auth secrets fatal in production but only warnings in dev", () => {
    const env = { ...BASE, SESSION_SECRET: "short", ADMIN_PASSWORD_HASH: "plain" };
    expect(checkEnv(env, true).errors).toHaveLength(2);
    const dev = checkEnv(env, false);
    expect(dev.errors).toEqual([]);
    expect(dev.warnings).toHaveLength(2);
  });

  it("rejects half-configured integrations in any mode", () => {
    const { errors } = checkEnv({ ...BASE, LIVEKIT_URL: "wss://x", RAZORPAY_KEY_ID: "id" }, false);
    expect(errors.some((e) => e.startsWith("LiveKit"))).toBe(true);
    expect(errors.some((e) => e.startsWith("Razorpay"))).toBe(true);
  });

  it("warns about optional services only in production", () => {
    expect(checkEnv(BASE, false)).toEqual({ errors: [], warnings: [] });
    const { errors, warnings } = checkEnv(BASE, true);
    expect(errors).toEqual([]);
    expect(warnings.length).toBeGreaterThanOrEqual(5);
  });

  it("accepts CODE_LOCAL_RUNNER=1 instead of Judge0", () => {
    const rest = { ...FULL_PROD, JUDGE0_HOST: undefined };
    expect(checkEnv(rest, true).warnings).toEqual([
      "No code runner: set JUDGE0_HOST (or CODE_LOCAL_RUNNER=1 for JavaScript only).",
    ]);
    expect(checkEnv({ ...rest, CODE_LOCAL_RUNNER: "1" }, true).warnings).toEqual([]);
  });
});
