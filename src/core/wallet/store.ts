import { randomUUID } from "node:crypto";
import { readJson, updateJson } from "@/core/db/json-store";
import {
  balanceOf,
  credit,
  debit,
  emptyWallet,
  entriesFor,
  transfer,
  type LedgerContext,
  type LedgerResult,
  type WalletState,
} from "./ledger";

/**
 * Wallet persistence. Every write runs inside the store's single write queue,
 * so a check (e.g. "enough balance?") and its write can't interleave with
 * another request: the JSON-store equivalent of a Postgres transaction.
 */
const FILE = "wallet.json";

const parse = (raw: unknown): WalletState =>
  raw && typeof raw === "object" && Array.isArray((raw as WalletState).entries) ? (raw as WalletState) : emptyWallet();

const ctx: LedgerContext = { now: () => new Date().toISOString(), newId: randomUUID };

async function run(op: (s: WalletState) => LedgerResult): Promise<LedgerResult> {
  let result: LedgerResult | undefined;
  await updateJson(FILE, parse, (state) => {
    result = op(state);
    return result.state;
  });
  return result!;
}

const load = async () => parse(await readJson(FILE));

export async function getBalance(userId: string) {
  return balanceOf(await load(), userId);
}

export async function getBalances(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const e of (await load()).entries) map.set(e.userId, (map.get(e.userId) ?? 0) + e.amount);
  return map;
}

/** Newest first. */
export async function listEntries(userId: string, limit = 50) {
  return entriesFor(await load(), userId).reverse().slice(0, limit);
}

export async function listRecentEntries(limit = 30) {
  return (await load()).entries.slice(-limit).reverse();
}

export const walletCredit = (input: Parameters<typeof credit>[1]) => run((s) => credit(s, input, ctx));
export const walletDebit = (input: Parameters<typeof debit>[1]) => run((s) => debit(s, input, ctx));
export const walletTransfer = (input: Parameters<typeof transfer>[1]) => run((s) => transfer(s, input, ctx));
