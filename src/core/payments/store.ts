import { readJson, updateJson } from "@/core/db/json-store";

export type PaymentStatus = "created" | "paid" | "failed";
export type PaymentProvider = "razorpay" | "demo";

export interface PaymentRecord {
  /** Our id; for Razorpay it is the order id. */
  orderId: string;
  userId: string;
  provider: PaymentProvider;
  purpose: "wallet_recharge";
  /** Paise, fixed on the server when the order was created. Never taken from the client later. */
  amount: number;
  status: PaymentStatus;
  paymentId?: string;
  createdAt: string;
  updatedAt: string;
}

const FILE = "payments.json";
const parse = (raw: unknown): PaymentRecord[] => (Array.isArray(raw) ? (raw as PaymentRecord[]) : []);

export async function createPayment(p: Omit<PaymentRecord, "status" | "createdAt" | "updatedAt">) {
  const now = new Date().toISOString();
  const rec: PaymentRecord = { ...p, status: "created", createdAt: now, updatedAt: now };
  await updateJson(FILE, parse, (all) => [...all, rec]);
  return rec;
}

export async function findPayment(orderId: string) {
  return parse(await readJson(FILE)).find((p) => p.orderId === orderId) ?? null;
}

export async function markPayment(orderId: string, patch: { status: PaymentStatus; paymentId?: string }) {
  await updateJson(FILE, parse, (all) =>
    all.map((p) => (p.orderId === orderId && p.status !== "paid" ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p)),
  );
}

/** Newest first; all users when `userId` is omitted (admin). */
export async function listPayments(userId?: string, limit = 50) {
  return parse(await readJson(FILE))
    .filter((p) => !userId || p.userId === userId)
    .reverse()
    .slice(0, limit);
}
