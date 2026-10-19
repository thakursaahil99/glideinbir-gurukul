import { randomUUID } from "node:crypto";
import type { PublicUser } from "@/core/auth/roles";
import { findUserById } from "@/core/auth/users";
import { emailLayout, sendEmail } from "@/core/notifications/email";
import { notify } from "@/core/notifications/store";
import { getSite } from "@/core/site/store";
import { commissionFor, WalletError } from "@/core/wallet/ledger";
import { getBalance, walletDebit, walletTransfer } from "@/core/wallet/store";
import { formatPaise } from "@/lib/utils";
import { AUTO_HIDE_REPORTS, isListed } from "./logic";
import { changeNote, changePayout, findPurchase, getNote, getNotesSettings, getVendor, insertPayout, insertPurchase, insertReport, listReports, nowIso, removePayout } from "./store";
import type { NoteItem, Payout, Report, Vendor } from "./types";

/** System wallet holding money a vendor asked to withdraw until an admin pays it out. */
export const PAYOUT_ESCROW_ID = "escrow:payouts";

export async function notesEnabled() {
  return (await getSite()).modules.find((m) => m.key === "notes")?.enabled ?? false;
}

/** The caller's vendor profile when it's approved (selling is profile-based, not role-based). */
export async function activeVendor(userId: string) {
  const v = await getVendor(userId);
  return v?.status === "approved" ? v : null;
}

export async function hasAccess(user: Pick<PublicUser, "id" | "role">, n: Pick<NoteItem, "id" | "vendorId">) {
  return n.vendorId === user.id || user.role === "admin" || !!(await findPurchase(user.id, n.id));
}

const appUrl = (p: string) => `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${p}`;

async function tell(userId: string, title: string, body: string, href: string, kind: "module" | "wallet" | "account" = "module", email = false) {
  await notify(userId, { kind, title, body, href });
  if (!email) return;
  const u = await findUserById(userId);
  if (u) await sendEmail({ to: u.email, subject: title, html: emailLayout(title, [body], { label: "Open Glideinbir", url: appUrl(href) }) });
}

/* ---------------- Buying ---------------- */

export type BuyResult = { ok: true; already?: boolean } | { ok: false; error: string; shortfall?: number };

export async function buyNote(user: PublicUser, noteId: string): Promise<BuyResult> {
  const n = await getNote(noteId);
  if (!n) return { ok: false, error: "Notes not found" };
  if (n.vendorId === user.id) return { ok: false, error: "These are your own notes" };
  if (await findPurchase(user.id, n.id)) return { ok: true, already: true };
  if (!isListed(n, await getVendor(n.vendorId))) return { ok: false, error: "These notes aren't on sale right now" };

  if (n.price > 0) {
    const { commissionBps } = await getNotesSettings();
    let paid: Awaited<ReturnType<typeof walletTransfer>>;
    try {
      // One key per learner + note: a double click or retry can never charge twice.
      paid = await walletTransfer({ from: user.id, to: n.vendorId, amount: n.price, commissionBps, key: `note:${n.id}:${user.id}`, note: `Notes: ${n.title}`, ref: `note:${n.id}` });
    } catch (e) {
      if (e instanceof WalletError && e.code === "INSUFFICIENT_FUNDS") return { ok: false, error: "Not enough wallet balance", shortfall: n.price - (await getBalance(user.id)) };
      if (e instanceof WalletError) return { ok: false, error: e.message };
      throw e;
    }
    if (!paid.duplicate) await tell(n.vendorId, `Sold: ${n.title}`, `${user.name.split(" ")[0]} bought your notes. You earned ${formatPaise(n.price - commissionFor(n.price, commissionBps))}.`, "/notes/sell", "wallet");
  }
  const rec = await insertPurchase({ id: randomUUID(), noteId: n.id, userId: user.id, price: n.price, createdAt: nowIso() });
  if (rec.ok) {
    await changeNote(n.id, () => null, (x) => ({ ...x, sales: x.sales + 1 }));
    await tell(user.id, `Added to your library: ${n.title}`, n.price ? `${formatPaise(n.price)} paid from your wallet. Download anytime.` : "Free notes. Download anytime.", "/notes/library");
  }
  return { ok: true };
}

/* ---------------- Reports ---------------- */

export async function reportNote(user: PublicUser, n: NoteItem, reason: Report["reason"], text: string) {
  const res = await insertReport({ id: randomUUID(), noteId: n.id, userId: user.id, userName: user.name, reason, text, status: "open", createdAt: nowIso() });
  if (!res.ok) return res;
  const open = new Set((await listReports()).filter((r) => r.noteId === n.id && r.status === "open").map((r) => r.userId));
  if (open.size >= AUTO_HIDE_REPORTS) {
    const hid = await changeNote(n.id, (x) => (x.hidden ? "already" : null), (x) => ({ ...x, hidden: { reason: `Hidden automatically after ${open.size} reports, pending review`, at: nowIso(), by: "reports" } }));
    if (hid.ok) await tell(n.vendorId, `"${n.title}" is under review`, "Several learners reported these notes. They're hidden from the marketplace until our team reviews them.", "/notes/sell", "module", true);
  }
  return res;
}

/* ---------------- Payouts ---------------- */

/** Moves the amount out of the vendor's spendable balance into escrow, then records the request. */
export async function requestPayout(v: Vendor, amount: number): Promise<{ ok: true; payout: Payout } | { ok: false; error: string }> {
  const { minPayout } = await getNotesSettings();
  if (amount < minPayout) return { ok: false, error: `The minimum payout is ${formatPaise(minPayout)}` };
  if (!v.payoutUpi) return { ok: false, error: "Add your UPI id first" };
  const p: Payout = { id: randomUUID(), vendorId: v.userId, vendorName: v.storeName, amount, upi: v.payoutUpi, status: "requested", requestedAt: nowIso() };
  const rec = await insertPayout(p);
  if (!rec.ok) return { ok: false, error: rec.error };
  try {
    await walletTransfer({ from: v.userId, to: PAYOUT_ESCROW_ID, amount, commissionBps: 0, key: `payout:${p.id}:hold`, note: `Payout request to ${v.payoutUpi}`, ref: `payout:${p.id}` });
  } catch (e) {
    await removePayout(p.id);
    if (e instanceof WalletError && e.code === "INSUFFICIENT_FUNDS") return { ok: false, error: `You can withdraw up to ${formatPaise(await getBalance(v.userId))}` };
    throw e;
  }
  return { ok: true, payout: p };
}

/** Admin: money sent (leaves the platform) or request rejected (money returns to the vendor). */
export async function decidePayout(id: string, decision: "paid" | "rejected", reference: string, note: string) {
  const res = await changePayout(id, (p) => (p.status !== "requested" ? "This payout was already processed" : null), (p) => ({ ...p, status: decision, processedAt: nowIso(), reference: reference || undefined, note: note || undefined }));
  if (!res.ok) return res;
  const p = res.value;
  if (decision === "paid") {
    await walletDebit({ userId: PAYOUT_ESCROW_ID, amount: p.amount, type: "payout", key: `payout:${p.id}:paid`, note: `Paid to ${p.upi}${reference ? ` (ref ${reference})` : ""}`, ref: `payout:${p.id}` });
    await tell(p.vendorId, `Payout of ${formatPaise(p.amount)} sent`, `Sent to ${p.upi}${reference ? `. Reference: ${reference}` : ""}.`, "/notes/sell", "wallet", true);
  } else {
    await walletTransfer({ from: PAYOUT_ESCROW_ID, to: p.vendorId, amount: p.amount, commissionBps: 0, key: `payout:${p.id}:return`, note: "Payout request rejected: money returned", ref: `payout:${p.id}` });
    await tell(p.vendorId, "Payout request rejected", `${formatPaise(p.amount)} is back in your wallet.${note ? ` Reason: ${note}` : ""}`, "/notes/sell", "wallet", true);
  }
  return res;
}

export async function vendorDecisionNotice(v: Vendor) {
  if (v.status === "approved") await tell(v.userId, "You're approved to sell notes!", `Your store "${v.storeName}" is live. Upload your first notes now.`, "/notes/sell", "account", true);
  else if (v.status === "rejected") await tell(v.userId, "Seller application not approved", v.adminNote || "Your application wasn't approved this time.", "/notes/sell", "account", true);
  else if (v.status === "suspended") await tell(v.userId, "Your notes store is suspended", v.adminNote || "Contact support for details.", "/notes/sell", "account", true);
}
