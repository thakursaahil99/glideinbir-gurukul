import { describe, expect, it } from "vitest";
import {
  PLATFORM_ID,
  WalletError,
  balanceOf,
  commissionFor,
  credit,
  debit,
  emptyWallet,
  transfer,
  type LedgerContext,
  type WalletState,
} from "@/core/wallet/ledger";

let n = 0;
const ctx: LedgerContext = { now: () => "2026-10-17T00:00:00.000Z", newId: () => `id-${++n}` };
const funded = (userId: string, amount: number): WalletState =>
  credit(emptyWallet(), { userId, amount, key: `seed:${userId}`, note: "seed" }, ctx).state;

describe("credit", () => {
  it("adds to the balance and records balanceAfter", () => {
    const r = credit(emptyWallet(), { userId: "u1", amount: 50_000, key: "k1", note: "Recharge" }, ctx);
    expect(balanceOf(r.state, "u1")).toBe(50_000);
    expect(r.entries[0]).toMatchObject({ type: "credit", amount: 50_000, balanceAfter: 50_000 });
    expect(r.duplicate).toBe(false);
  });

  it("is idempotent: the same key never credits twice (webhook + callback)", () => {
    const first = credit(emptyWallet(), { userId: "u1", amount: 10_000, key: "recharge:order_1", note: "x" }, ctx);
    const again = credit(first.state, { userId: "u1", amount: 10_000, key: "recharge:order_1", note: "x" }, ctx);
    expect(again.duplicate).toBe(true);
    expect(again.state).toBe(first.state);
    expect(balanceOf(again.state, "u1")).toBe(10_000);
  });

  it.each([0, -100, 10.5, Number.NaN, 2_000_000_000])("rejects invalid amount %s", (amount) => {
    expect(() => credit(emptyWallet(), { userId: "u1", amount, key: `bad:${amount}`, note: "x" }, ctx)).toThrow(WalletError);
  });
});

describe("debit", () => {
  it("subtracts from the balance", () => {
    const r = debit(funded("u1", 1_000), { userId: "u1", amount: 400, key: "d1", note: "Course" }, ctx);
    expect(balanceOf(r.state, "u1")).toBe(600);
    expect(r.entries[0]).toMatchObject({ amount: -400, balanceAfter: 600 });
  });

  it("never lets the balance go negative", () => {
    const s = funded("u1", 1_000);
    expect(() => debit(s, { userId: "u1", amount: 1_001, key: "d2", note: "x" }, ctx)).toThrow(/Not enough balance/);
    expect(balanceOf(s, "u1")).toBe(1_000);
  });

  it("allows spending the exact balance", () => {
    const r = debit(funded("u1", 1_000), { userId: "u1", amount: 1_000, key: "d3", note: "x" }, ctx);
    expect(balanceOf(r.state, "u1")).toBe(0);
  });

  it("is idempotent", () => {
    const first = debit(funded("u1", 1_000), { userId: "u1", amount: 300, key: "d4", note: "x" }, ctx);
    const again = debit(first.state, { userId: "u1", amount: 300, key: "d4", note: "x" }, ctx);
    expect(again.duplicate).toBe(true);
    expect(balanceOf(again.state, "u1")).toBe(700);
  });
});

describe("commissionFor", () => {
  it("rounds down to whole paise", () => {
    expect(commissionFor(10_000, 2_000)).toBe(2_000); // 20% of ₹100
    expect(commissionFor(999, 1_500)).toBe(149); // 149.85 → 149
    expect(commissionFor(1, 2_000)).toBe(0);
    expect(commissionFor(5_000, 0)).toBe(0);
  });

  it("rejects out-of-range basis points", () => {
    expect(() => commissionFor(100, -1)).toThrow(WalletError);
    expect(() => commissionFor(100, 10_001)).toThrow(WalletError);
    expect(() => commissionFor(100, 12.5)).toThrow(WalletError);
  });
});

describe("transfer with commission", () => {
  it("splits payer → seller + platform and conserves money", () => {
    const s = funded("student", 50_000);
    const r = transfer(s, { from: "student", to: "tutor", amount: 20_000, commissionBps: 2_000, key: "t1", note: "Doubt session" }, ctx);
    expect(balanceOf(r.state, "student")).toBe(30_000);
    expect(balanceOf(r.state, "tutor")).toBe(16_000);
    expect(balanceOf(r.state, PLATFORM_ID)).toBe(4_000);
    expect(r.entries.reduce((sum, e) => sum + e.amount, 0)).toBe(0);
    expect(new Set(r.entries.map((e) => e.idempotencyKey))).toEqual(new Set(["t1"]));
  });

  it("writes no platform leg when commission is zero", () => {
    const r = transfer(funded("a", 1_000), { from: "a", to: "b", amount: 1_000, commissionBps: 0, key: "t2", note: "x" }, ctx);
    expect(r.entries).toHaveLength(2);
  });

  it("is all-or-nothing when the payer can't afford it", () => {
    const s = funded("a", 500);
    expect(() => transfer(s, { from: "a", to: "b", amount: 600, commissionBps: 1_000, key: "t3", note: "x" }, ctx)).toThrow(/Not enough balance/);
    expect(s.entries).toHaveLength(1);
  });

  it("refuses a self-transfer", () => {
    expect(() => transfer(funded("a", 500), { from: "a", to: "a", amount: 100, commissionBps: 0, key: "t4", note: "x" }, ctx)).toThrow(/same wallet/);
  });

  it("is idempotent", () => {
    const first = transfer(funded("a", 1_000), { from: "a", to: "b", amount: 500, commissionBps: 1_000, key: "t5", note: "x" }, ctx);
    const again = transfer(first.state, { from: "a", to: "b", amount: 500, commissionBps: 1_000, key: "t5", note: "x" }, ctx);
    expect(again.duplicate).toBe(true);
    expect(balanceOf(again.state, "a")).toBe(500);
  });

  it("computes balanceAfter per user across legs", () => {
    const r = transfer(funded("a", 1_000), { from: "a", to: "b", amount: 1_000, commissionBps: 1_000, key: "t6", note: "x" }, ctx);
    expect(r.entries.map((e) => [e.userId, e.balanceAfter])).toEqual([
      ["a", 0],
      ["b", 900],
      [PLATFORM_ID, 100],
    ]);
  });
});
