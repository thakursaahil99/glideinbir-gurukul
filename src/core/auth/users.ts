import { randomUUID } from "node:crypto";
import { readJson, updateJson } from "@/core/db/json-store";
import type { PublicUser, Role } from "./roles";

export interface UserRecord extends PublicUser {
  passwordHash: string;
}

const FILE = "users.json";

const parseUsers = (raw: unknown): UserRecord[] => (Array.isArray(raw) ? (raw as UserRecord[]) : []);

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function toPublic(user: UserRecord): PublicUser {
  const { passwordHash, ...rest } = user;
  void passwordHash;
  return rest;
}

/** The main admin from .env.local is created on first read and can never be locked out. */
export const isMainAdmin = (email: string) =>
  !!process.env.ADMIN_EMAIL && normalizeEmail(email) === normalizeEmail(process.env.ADMIN_EMAIL);

async function loadUsers(): Promise<UserRecord[]> {
  const users = parseUsers(await readJson(FILE));
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminEmail || !adminHash || users.some((u) => isMainAdmin(u.email))) return users;

  return updateJson(FILE, parseUsers, (current) => {
    if (current.some((u) => isMainAdmin(u.email))) return current;
    const now = new Date().toISOString();
    return [
      ...current,
      { id: randomUUID(), name: "Admin", email: normalizeEmail(adminEmail), passwordHash: adminHash, role: "admin", blocked: false, createdAt: now, updatedAt: now },
    ];
  });
}

export const listUsers = loadUsers;

export async function findUserByEmail(email: string) {
  const e = normalizeEmail(email);
  return (await loadUsers()).find((u) => u.email === e) ?? null;
}

export async function findUserById(id: string) {
  return (await loadUsers()).find((u) => u.id === id) ?? null;
}

export async function createUser(input: { name: string; email: string; passwordHash: string; role: Role }) {
  await loadUsers();
  const email = normalizeEmail(input.email);
  const now = new Date().toISOString();
  const user: UserRecord = { id: randomUUID(), ...input, email, blocked: false, createdAt: now, updatedAt: now };
  let duplicate = false;
  await updateJson(FILE, parseUsers, (users) => {
    duplicate = users.some((u) => u.email === email);
    return duplicate ? users : [...users, user];
  });
  if (duplicate) throw new Error("An account with this email already exists");
  return user;
}

export async function updateUser(id: string, patch: Partial<Pick<UserRecord, "name" | "role" | "blocked" | "passwordHash">>) {
  let updated: UserRecord | null = null;
  await updateJson(FILE, parseUsers, (users) =>
    users.map((u) => {
      if (u.id !== id) return u;
      // The main admin always stays an unblocked admin.
      const safe = isMainAdmin(u.email) ? { ...patch, role: "admin" as const, blocked: false } : patch;
      updated = { ...u, ...safe, updatedAt: new Date().toISOString() };
      return updated;
    }),
  );
  return updated;
}

export async function deleteUser(id: string) {
  await updateJson(FILE, parseUsers, (users) => users.filter((u) => u.id !== id || isMainAdmin(u.email)));
}
