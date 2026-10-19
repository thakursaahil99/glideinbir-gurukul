import { randomUUID } from "node:crypto";
import { readJson, updateJson } from "@/core/db/json-store";

export const NOTIFICATION_KINDS = ["info", "wallet", "payment", "account", "module"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export interface Notification {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** In-app link the notification opens. */
  href?: string;
  read: boolean;
  createdAt: string;
}

const FILE = "notifications.json";
/** Oldest notifications beyond this per user are dropped. */
const KEEP_PER_USER = 200;

const parse = (raw: unknown): Notification[] => (Array.isArray(raw) ? (raw as Notification[]) : []);

function trim(all: Notification[], userId: string) {
  const mine = all.filter((n) => n.userId === userId);
  if (mine.length <= KEEP_PER_USER) return all;
  const drop = new Set(mine.slice(0, mine.length - KEEP_PER_USER).map((n) => n.id));
  return all.filter((n) => !drop.has(n.id));
}

export async function notify(userId: string, input: { kind: NotificationKind; title: string; body: string; href?: string }) {
  const n: Notification = { id: randomUUID(), userId, ...input, read: false, createdAt: new Date().toISOString() };
  await updateJson(FILE, parse, (all) => trim([...all, n], userId));
  return n;
}

/** Newest first. */
export async function listNotifications(userId: string, limit = 100) {
  return parse(await readJson(FILE))
    .filter((n) => n.userId === userId)
    .reverse()
    .slice(0, limit);
}

export async function unreadCount(userId: string) {
  return parse(await readJson(FILE)).filter((n) => n.userId === userId && !n.read).length;
}

/** Only ever touches the caller's own rows. */
export async function markRead(userId: string, ids: string[] | "all") {
  await updateJson(FILE, parse, (all) =>
    all.map((n) => (n.userId === userId && !n.read && (ids === "all" || ids.includes(n.id)) ? { ...n, read: true } : n)),
  );
}
