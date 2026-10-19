import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PublicUser } from "./roles";
import { SESSION_COOKIE, verifySession } from "./session";
import { findUserById, toPublic } from "./users";

/** The signed-in user, re-checked against the store so blocks and role changes apply immediately. */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await findUserById(session.uid);
  return user && !user.blocked ? toPublic(user) : null;
}

export async function requireUser(next = "/dashboard"): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/login?next=/admin");
  return user;
}
