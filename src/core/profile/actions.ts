"use server";

import { z } from "zod";
import { requireUser } from "@/core/auth/current";
import { hashPassword, verifyPassword } from "@/core/auth/password";
import { findUserById, updateUser } from "@/core/auth/users";
import { notify } from "@/core/notifications/store";
import { rateLimit } from "@/core/security/rate-limit";

export interface ProfileResult {
  ok: boolean;
  error?: string;
}

const nameSchema = z.object({ name: z.string().trim().min(2, "Name is too short").max(60, "Name is too long") });

export async function updateProfileAction(input: unknown): Promise<ProfileResult> {
  const user = await requireUser("/profile");
  const parsed = nameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  await updateUser(user.id, { name: parsed.data.name });
  return { ok: true };
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password").max(128),
    next: z.string().min(8, "New password must be at least 8 characters").max(128),
    confirm: z.string().max(128),
  })
  .refine((v) => v.next === v.confirm, { message: "New passwords don't match" });

export async function changeMyPasswordAction(input: unknown): Promise<ProfileResult> {
  const user = await requireUser("/profile");
  if (!rateLimit(`pw:${user.id}`, 5, 15 * 60_000).ok) return { ok: false, error: "Too many attempts. Try again in a few minutes." };
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const me = await findUserById(user.id);
  if (!me || !(await verifyPassword(parsed.data.current, me.passwordHash))) return { ok: false, error: "Current password is wrong" };
  await updateUser(me.id, { passwordHash: await hashPassword(parsed.data.next) });
  await notify(me.id, { kind: "account", title: "Password changed", body: "If this wasn't you, contact support right away.", href: "/profile" });
  return { ok: true };
}
