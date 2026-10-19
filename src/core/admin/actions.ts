"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/core/auth/current";
import { hashPassword, verifyPassword } from "@/core/auth/password";
import { ROLES } from "@/core/auth/roles";
import { createUser, deleteUser, findUserById, isMainAdmin, updateUser } from "@/core/auth/users";
import { DEFAULT_SITE } from "@/core/site/defaults";
import { SITE_SECTIONS, siteSchema, type SiteSection } from "@/core/site/schema";
import { saveSiteSection } from "@/core/site/store";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const fail = (error: string): ActionResult => ({ ok: false, error });

function firstIssue(e: z.ZodError) {
  const issue = e.issues[0];
  if (!issue) return "Invalid input";
  const where = issue.path.filter((p) => typeof p !== "symbol").join(" › ");
  return where ? `${where}: ${issue.message}` : issue.message;
}

const refreshSite = () => revalidatePath("/", "layout");

/* ---------------- Site content ---------------- */

export async function saveSectionAction(section: SiteSection, value: unknown): Promise<ActionResult> {
  await requireAdmin();
  if (!SITE_SECTIONS.includes(section)) return fail("Unknown section");
  const parsed = siteSchema.shape[section].safeParse(value);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  await saveSiteSection(section, parsed.data as never);
  refreshSite();
  return { ok: true };
}

export async function resetSectionAction(section: SiteSection): Promise<ActionResult> {
  await requireAdmin();
  if (!SITE_SECTIONS.includes(section)) return fail("Unknown section");
  await saveSiteSection(section, DEFAULT_SITE[section]);
  refreshSite();
  return { ok: true };
}

/* ---------------- Users ---------------- */

const newUserSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(120),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  role: z.enum(ROLES),
});

export async function createUserAction(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = newUserSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  try {
    const { password, ...rest } = parsed.data;
    await createUser({ ...rest, passwordHash: await hashPassword(password) });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not create user");
  }
  revalidatePath("/admin/users");
  return { ok: true };
}

const userPatchSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(60).optional(),
  role: z.enum(ROLES).optional(),
  blocked: z.boolean().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128).optional(),
});

export async function updateUserAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = userPatchSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { id, password, ...patch } = parsed.data;

  const target = await findUserById(id);
  if (!target) return fail("User not found");
  if (isMainAdmin(target.email) && (patch.role !== undefined || patch.blocked !== undefined))
    return fail("The main admin's role and access can't be changed");
  if (id === admin.id && (patch.blocked || (patch.role && patch.role !== "admin")))
    return fail("You can't block or demote yourself");

  await updateUser(id, { ...patch, ...(password ? { passwordHash: await hashPassword(password) } : {}) });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function deleteUserAction(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const target = await findUserById(id);
  if (!target) return fail("User not found");
  if (isMainAdmin(target.email) || target.id === admin.id) return fail("This account can't be deleted");
  await deleteUser(id);
  revalidatePath("/admin/users");
  return { ok: true };
}

/* ---------------- Own account ---------------- */

const passwordChangeSchema = z
  .object({
    current: z.string().min(1, "Enter your current password").max(128),
    next: z.string().min(8, "New password must be at least 8 characters").max(128),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "New passwords don't match", path: ["confirm"] });

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const me = await findUserById(admin.id);
  if (!me || !(await verifyPassword(parsed.data.current, me.passwordHash))) return fail("Current password is wrong");
  await updateUser(me.id, { passwordHash: await hashPassword(parsed.data.next) });
  return { ok: true };
}
