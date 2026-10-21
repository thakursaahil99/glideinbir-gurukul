/**
 * Startup check of the environment (see `src/instrumentation.ts`).
 * Errors stop a production server from starting; warnings only get logged.
 * Pure, so it is unit-tested without touching process.env.
 */
export interface EnvReport {
  errors: string[];
  warnings: string[];
}

type Env = Record<string, string | undefined>;

const has = (env: Env, key: string) => !!env[key]?.trim();

/** Keys that only work together: some set and some missing is always a mistake. */
const GROUPS: { name: string; keys: string[] }[] = [
  { name: "Razorpay", keys: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"] },
  { name: "LiveKit", keys: ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"] },
  { name: "Adzuna", keys: ["ADZUNA_APP_ID", "ADZUNA_APP_KEY"] },
];

export function checkEnv(env: Env, production: boolean): EnvReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  // Secrets that would break sign-in at runtime: fatal in production, warned in dev.
  const fatal = production ? errors : warnings;

  if ((env.SESSION_SECRET?.length ?? 0) < 32) fatal.push("SESSION_SECRET must be at least 32 characters.");
  if (!has(env, "ADMIN_EMAIL")) fatal.push("ADMIN_EMAIL is missing: nobody can sign in as admin.");
  if (!env.ADMIN_PASSWORD_HASH?.startsWith("scrypt:"))
    fatal.push("ADMIN_PASSWORD_HASH must be a scrypt:<salt>:<hash> value (see .env.example).");

  for (const g of GROUPS) {
    const missing = g.keys.filter((k) => !has(env, k));
    if (missing.length > 0 && missing.length < g.keys.length)
      errors.push(`${g.name} is half configured: ${missing.join(", ")} missing.`);
  }

  const razorpay = has(env, "RAZORPAY_KEY_ID") && has(env, "RAZORPAY_KEY_SECRET");
  if (razorpay && !has(env, "RAZORPAY_WEBHOOK_SECRET"))
    warnings.push("RAZORPAY_WEBHOOK_SECRET is missing: payments only settle when the browser returns.");

  if (!production) return { errors, warnings };

  const appUrl = env.NEXT_PUBLIC_APP_URL ?? "";
  if (!/^https:\/\//.test(appUrl))
    warnings.push("NEXT_PUBLIC_APP_URL should be the public https URL (used in emails, sitemap and share cards).");
  if (!razorpay)
    warnings.push("Razorpay keys are missing: wallet top-ups are disabled (demo payments never run in production).");
  if (!has(env, "CRON_SECRET"))
    warnings.push("CRON_SECRET is missing: /api/cron/* refuse to run (mentorship reminders, job alerts).");
  if (!has(env, "RESEND_API_KEY")) warnings.push("RESEND_API_KEY is missing: emails are not sent.");
  if (!has(env, "LIVEKIT_URL"))
    warnings.push("LiveKit is not configured: doubt and mentorship video calls are unavailable.");
  if (!has(env, "JUDGE0_HOST") && env.CODE_LOCAL_RUNNER !== "1")
    warnings.push("No code runner: set JUDGE0_HOST (or CODE_LOCAL_RUNNER=1 for JavaScript only).");

  return { errors, warnings };
}
