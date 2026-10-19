/**
 * Pure wallet ledger logic: no I/O, so it is easy to test and to port to
 * Postgres functions later. All money is integer paise. The ledger is
 * append-only; a balance is always the sum of a user's entries.
 */

/** System account that collects platform commission. */
export const PLATFORM_ID = "platform";

/** ₹1,00,00,000 per single movement: a sanity ceiling, not a business limit. */
export const MAX_AMOUNT_PAISE = 1_000_000_000;

export const ENTRY_TYPES = ["credit", "debit", "refund", "payout", "transfer_in", "transfer_out", "commission", "adjustment"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export interface LedgerEntry {
  id: string;
  userId: string;
  type: EntryType;
  /** Signed paise: positive adds to the balance, negative takes from it. */
  amount: number;
  /** Balance of `userId` right after this entry. */
  balanceAfter: number;
  /** Same key on every leg of one operation; a repeat of the key is a no-op. */
  idempotencyKey: string;
  note: string;
  /** Optional pointer to what caused it (payment id, course id, booking id…). */
  ref?: string;
  createdAt: string;
}

export interface WalletState {
  entries: LedgerEntry[];
}

export interface LedgerContext {
  now: () => string;
  newId: () => string;
}

export type WalletErrorCode = "INVALID_AMOUNT" | "INSUFFICIENT_FUNDS" | "SAME_ACCOUNT" | "INVALID_COMMISSION";

export class WalletError extends Error {
  constructor(
    public readonly code: WalletErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WalletError";
  }
}

export interface LedgerResult {
  state: WalletState;
  entries: LedgerEntry[];
  /** True when the idempotency key was already used: nothing new was written. */
  duplicate: boolean;
}

export const emptyWallet = (): WalletState => ({ entries: [] });

export function assertAmount(amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > MAX_AMOUNT_PAISE)
    throw new WalletError("INVALID_AMOUNT", "Amount must be a positive whole number of paise");
}

export function balanceOf(state: WalletState, userId: string): number {
  let sum = 0;
  for (const e of state.entries) if (e.userId === userId) sum += e.amount;
  return sum;
}

export function entriesFor(state: WalletState, userId: string): LedgerEntry[] {
  return state.entries.filter((e) => e.userId === userId);
}

function existing(state: WalletState, key: string): LedgerResult | null {
  const found = state.entries.filter((e) => e.idempotencyKey === key);
  return found.length ? { state, entries: found, duplicate: true } : null;
}

/** Appends legs in order, computing each leg's balanceAfter against the running state. */
function append(
  state: WalletState,
  legs: Omit<LedgerEntry, "id" | "balanceAfter" | "createdAt">[],
  ctx: LedgerContext,
): LedgerResult {
  const createdAt = ctx.now();
  const running = new Map<string, number>();
  const written: LedgerEntry[] = legs.map((leg) => {
    const before = running.get(leg.userId) ?? balanceOf(state, leg.userId);
    const balanceAfter = before + leg.amount;
    running.set(leg.userId, balanceAfter);
    return { ...leg, id: ctx.newId(), balanceAfter, createdAt };
  });
  return { state: { entries: [...state.entries, ...written] }, entries: written, duplicate: false };
}

interface MoveInput {
  userId: string;
  amount: number;
  key: string;
  note: string;
  ref?: string;
}

/** Money in: recharge, refund, admin top-up. */
export function credit(
  state: WalletState,
  input: MoveInput & { type?: Extract<EntryType, "credit" | "refund" | "adjustment"> },
  ctx: LedgerContext,
): LedgerResult {
  const dup = existing(state, input.key);
  if (dup) return dup;
  assertAmount(input.amount);
  return append(
    state,
    [{ userId: input.userId, type: input.type ?? "credit", amount: input.amount, idempotencyKey: input.key, note: input.note, ref: input.ref }],
    ctx,
  );
}

/** Money out: a purchase, payout or admin deduction. Never goes below zero. */
export function debit(
  state: WalletState,
  input: MoveInput & { type?: Extract<EntryType, "debit" | "payout" | "adjustment"> },
  ctx: LedgerContext,
): LedgerResult {
  const dup = existing(state, input.key);
  if (dup) return dup;
  assertAmount(input.amount);
  if (balanceOf(state, input.userId) < input.amount) throw new WalletError("INSUFFICIENT_FUNDS", "Not enough balance in the wallet");
  return append(
    state,
    [{ userId: input.userId, type: input.type ?? "debit", amount: -input.amount, idempotencyKey: input.key, note: input.note, ref: input.ref }],
    ctx,
  );
}

/** Commission in paise for `amount` at `bps` basis points (100 bps = 1%), rounded down. */
export function commissionFor(amount: number, bps: number): number {
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) throw new WalletError("INVALID_COMMISSION", "Commission must be 0–10000 basis points");
  return Math.floor((amount * bps) / 10_000);
}

/**
 * Student pays a seller (instructor, tutor, mentor, vendor). The payer is
 * debited in full, the seller gets the amount minus commission, and the
 * platform account gets the commission. All legs land together or not at all.
 */
export function transfer(
  state: WalletState,
  input: { from: string; to: string; amount: number; commissionBps: number; key: string; note: string; ref?: string },
  ctx: LedgerContext,
): LedgerResult {
  const dup = existing(state, input.key);
  if (dup) return dup;
  assertAmount(input.amount);
  if (input.from === input.to) throw new WalletError("SAME_ACCOUNT", "Can't transfer to the same wallet");
  if (balanceOf(state, input.from) < input.amount) throw new WalletError("INSUFFICIENT_FUNDS", "Not enough balance in the wallet");

  const fee = commissionFor(input.amount, input.commissionBps);
  const base = { idempotencyKey: input.key, note: input.note, ref: input.ref };
  const legs: Omit<LedgerEntry, "id" | "balanceAfter" | "createdAt">[] = [
    { ...base, userId: input.from, type: "transfer_out", amount: -input.amount },
    { ...base, userId: input.to, type: "transfer_in", amount: input.amount - fee },
  ];
  if (fee > 0) legs.push({ ...base, userId: PLATFORM_ID, type: "commission", amount: fee });
  return append(state, legs, ctx);
}
