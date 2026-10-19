"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { emailLayout, sendEmail } from "@/core/notifications/email";
import { notify } from "@/core/notifications/store";
import { clientIp, rateLimit } from "@/core/security/rate-limit";
import { hashPassword, verifyPassword } from "./password";
import type { Role } from "./roles";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession } from "./session";
import { createUser, findUserByEmail } from "./users";

export interface AuthState {
  error?: string;
  /** Echoed back so the form keeps what was typed (never the password). */
  name?: string;
  email?: string;
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email").max(120);
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(128);

const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password").max(128) });
const signupSchema = z.object({ name: z.string().trim().min(2, "Enter your name").max(60), email: emailSchema, password: passwordSchema });

/** Only same-site relative paths, never `//evil.com`. */
function safeNext(next: FormDataEntryValue | null, role: Role) {
  const fallback = role === "admin" ? "/admin" : "/dashboard";
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.startsWith("/admin") && role !== "admin") return "/dashboard";
  return next;
}

async function startSession(uid: string, role: Role) {
  (await cookies()).set(SESSION_COOKIE, await signSession(uid, role), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function loginAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const echo = { email: str(form.get("email")) };
  const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { ...echo, error: parsed.error.issues[0]?.message };

  // Per IP and per account, so neither spraying many accounts nor hammering one works.
  const ip = await clientIp();
  const byIp = rateLimit(`login:ip:${ip}`, 20, 15 * 60_000);
  const byEmail = rateLimit(`login:email:${parsed.data.email}`, 8, 15 * 60_000);
  if (!byIp.ok || !byEmail.ok)
    return { ...echo, error: `Too many login attempts. Try again in ${Math.ceil(Math.max(byIp.retryAfterSec, byEmail.retryAfterSec) / 60)} min.` };

  const user = await findUserByEmail(parsed.data.email);
  const ok = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
  if (!user || !ok) return { ...echo, error: "Wrong email or password" };
  if (user.blocked) return { ...echo, error: "This account has been blocked. Contact support." };

  await startSession(user.id, user.role);
  redirect(safeNext(form.get("next"), user.role));
}

export async function signupAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const echo = { name: str(form.get("name")), email: str(form.get("email")) };
  const parsed = signupSchema.safeParse({ name: form.get("name"), email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { ...echo, error: parsed.error.issues[0]?.message };
  if (!rateLimit(`signup:ip:${await clientIp()}`, 5, 60 * 60_000).ok)
    return { ...echo, error: "Too many sign-ups from this network. Try again later." };

  let userId: string;
  try {
    const user = await createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      role: "student",
    });
    userId = user.id;
  } catch (e) {
    return { ...echo, error: e instanceof Error ? e.message : "Could not create account" };
  }

  await notify(userId, {
    kind: "account",
    title: `Welcome aboard, ${parsed.data.name.split(" ")[0]}!`,
    body: "Your wallet is ready. Top it up once and use it across every module.",
    href: "/wallet",
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  void sendEmail({
    to: parsed.data.email,
    subject: "Welcome to Glideinbir Gurukul",
    html: emailLayout(`Namaste, ${parsed.data.name}!`, ["Your account is ready.", "One login and one wallet work across all seven learning worlds."], {
      label: "Open your dashboard",
      url: `${appUrl}/dashboard`,
    }),
  });

  await startSession(userId, "student");
  redirect("/dashboard");
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
