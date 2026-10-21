import { checkEnv } from "@/core/config/env";

/** Runs once when the server starts: refuse to boot production with broken config. */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const production = process.env.NODE_ENV === "production";
  const { errors, warnings } = checkEnv(process.env, production);
  for (const w of warnings) console.warn(`[env] ${w}`);
  if (errors.length === 0) return;
  for (const e of errors) console.error(`[env] ${e}`);
  if (production) throw new Error(`Invalid environment (${errors.length} problem${errors.length > 1 ? "s" : ""}), see the [env] lines above.`);
}
