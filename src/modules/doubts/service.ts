import type { PublicUser } from "@/core/auth/roles";
import { notify } from "@/core/notifications/store";
import { publish } from "@/core/realtime/bus";
import { getSite } from "@/core/site/store";
import { WalletError } from "@/core/wallet/ledger";
import { walletTransfer } from "@/core/wallet/store";
import { formatPaise } from "@/lib/utils";
import { bill, dueTransition, firstName } from "./logic";
import { addMessage, getDoubtSettings, transition } from "./store";
import type { Doubt } from "./types";

/** System wallet that holds learners' money while a session runs. */
export const ESCROW_ID = "escrow:doubts";

export async function doubtsEnabled() {
  return (await getSite()).modules.find((m) => m.key === "doubts")?.enabled ?? false;
}

export const isTutorRole = (u: Pick<PublicUser, "role">) => u.role === "tutor" || u.role === "admin";

/** Realtime channels. */
export const doubtChannel = (id: string) => `doubt:${id}`;
export const subjectChannel = (subject: string) => `tutors:${subject}`;

export const mediaUrl = (d: Pick<Doubt, "id" | "image">) => (d.image ? `/api/doubts/media/${d.id}/${d.image}` : null);

/** What both sides of a doubt see. */
export function view(d: Doubt) {
  return {
    id: d.id,
    subject: d.subject,
    text: d.text,
    imageUrl: mediaUrl(d),
    limitMin: d.limitMin,
    status: d.status,
    createdAt: d.createdAt,
    expiresAt: d.expiresAt,
    studentId: d.studentId,
    studentName: firstName(d.studentName),
    tutorId: d.tutorId ?? null,
    tutorName: d.tutorName ?? null,
    ratePerMinute: d.ratePerMinute ?? null,
    hold: d.hold ?? null,
    acceptedAt: d.acceptedAt ?? null,
    startedAt: d.startedAt ?? null,
    endedAt: d.endedAt ?? null,
    endedBy: d.endedBy ?? null,
    cancelReason: d.cancelReason ?? null,
    billedMinutes: d.billedMinutes ?? null,
    charged: d.charged ?? null,
    refunded: d.refunded ?? null,
    rating: d.rating ?? null,
  };
}
export type DoubtView = ReturnType<typeof view>;

/** Tell everyone watching this doubt (and the tutor feed for its subject) that it changed. */
export function broadcast(d: Doubt) {
  publish(doubtChannel(d.id), "doubt", view(d));
  if (d.status !== "requested") publish(subjectChannel(d.subject), "gone", { id: d.id });
}

async function system(d: Doubt, text: string) {
  const m = await addMessage({ doubtId: d.id, senderId: "system", senderName: "Glideinbir", role: "system", text });
  publish(doubtChannel(d.id), "message", m);
}

/**
 * Ends a session (accepted or in progress) and settles money exactly once:
 * the status flip is the guard; ledger keys make the transfers idempotent.
 */
export async function endSession(id: string, endedAt: number, endedBy: NonNullable<Doubt["endedBy"]>, reason?: string) {
  const res = await transition(
    id,
    (d) => (d.status === "accepted" || d.status === "in_progress" ? null : "This session has already ended"),
    (d) => {
      const b = bill(d, endedAt);
      const startedProperly = d.status === "in_progress" && b.minutes > 0;
      return {
        ...d,
        status: startedProperly ? "completed" : "cancelled",
        endedAt: new Date(endedAt).toISOString(),
        endedBy,
        cancelReason: startedProperly ? undefined : (reason ?? (d.status === "accepted" ? "Ended before the session started" : "Ended within the first minute (free)")),
        billedMinutes: b.minutes,
        charged: b.charged,
        refunded: b.refunded,
      };
    },
  );
  if (!res.ok) return res;
  const d = (await settleMoney(res.doubt)) ?? res.doubt;
  broadcast(d);
  await system(d, d.status === "completed" ? `Session ended after ${d.billedMinutes} min. ${formatPaise(d.charged ?? 0)} charged, ${formatPaise(d.refunded ?? 0)} returned to the wallet.` : `Session closed. ${formatPaise(d.refunded ?? 0)} returned to the wallet.`);
  if (d.status === "completed") {
    await notify(d.studentId, { kind: "wallet", title: `Doubt session: ${formatPaise(d.charged ?? 0)}`, body: `${d.billedMinutes} min with ${d.tutorName}. ${formatPaise(d.refunded ?? 0)} returned. Rate the session!`, href: `/doubts/${d.id}` });
    await notify(d.tutorId!, { kind: "wallet", title: "Session payment received", body: `${d.billedMinutes} min with ${firstName(d.studentName)}.`, href: "/doubts/tutor" });
  }
  return { ok: true as const, doubt: d };
}

/**
 * Moves escrowed money: charge to the tutor (minus commission), the rest back to the
 * learner, then marks the doubt paid out. Ledger keys make a retry safe.
 */
async function settleMoney(d: Doubt): Promise<Doubt | null> {
  if (d.paidOut || !(d.hold ?? 0)) return d;
  const { commissionBps } = await getDoubtSettings();
  if (d.tutorId && (d.charged ?? 0) > 0)
    await walletTransfer({ from: ESCROW_ID, to: d.tutorId, amount: d.charged!, commissionBps, key: `doubt:${d.id}:pay`, note: `Doubt session: ${d.subject}`, ref: `doubt:${d.id}` });
  if ((d.refunded ?? 0) > 0)
    await walletTransfer({ from: ESCROW_ID, to: d.studentId, amount: d.refunded!, commissionBps: 0, key: `doubt:${d.id}:refund`, note: `Refund: doubt session (${d.subject})`, ref: `doubt:${d.id}` });
  const marked = await transition(d.id, () => null, (x) => ({ ...x, paidOut: true }));
  return marked.doubt;
}

/** Applies time-based rules (expiry, session limit) the first time anyone looks. */
export async function settle(d: Doubt): Promise<Doubt> {
  // Finish any payout interrupted mid-way (e.g. by a restart).
  if ((d.status === "completed" || d.status === "cancelled") && (d.hold ?? 0) > 0 && !d.paidOut) return (await settleMoney(d)) ?? d;
  const due = dueTransition(d);
  if (!due) return d;
  if (due.to === "expired") {
    const res = await transition(d.id, (x) => (x.status === "requested" ? null : "changed"), (x) => ({ ...x, status: "expired" }));
    if (res.ok) {
      broadcast(res.doubt);
      await notify(d.studentId, { kind: "module", title: "No tutor was free in time", body: `Your ${d.subject} doubt expired after 2 minutes. Nothing was charged. Try again!`, href: "/doubts" });
      return res.doubt;
    }
    return res.doubt ?? d;
  }
  const res = await endSession(d.id, due.at, "limit");
  return res.doubt ?? d;
}

/** Accept: claim atomically, then hold rate × limit in escrow. If the hold fails, the claim is undone. */
export async function acceptDoubt(id: string, tutor: { id: string; name: string; ratePerMinute: number }) {
  const claim = await transition(
    id,
    (d) => {
      if (d.studentId === tutor.id) return "You can't accept your own doubt";
      if (d.status !== "requested") return "Another tutor already took this doubt";
      if (Date.now() > Date.parse(d.expiresAt)) return "This request has expired";
      return null;
    },
    (d) => ({ ...d, status: "accepted", tutorId: tutor.id, tutorName: tutor.name, ratePerMinute: tutor.ratePerMinute, hold: tutor.ratePerMinute * d.limitMin, acceptedAt: new Date().toISOString() }),
  );
  if (!claim.ok) return claim;
  const d = claim.doubt;
  try {
    await walletTransfer({ from: d.studentId, to: ESCROW_ID, amount: d.hold!, commissionBps: 0, key: `doubt:${d.id}:hold`, note: `Held for doubt session (${d.subject}, up to ${d.limitMin} min)`, ref: `doubt:${d.id}` });
  } catch (e) {
    if (!(e instanceof WalletError)) throw e;
    const undo = await transition(d.id, (x) => (x.status === "accepted" && x.tutorId === tutor.id ? null : "changed"), (x) => ({ ...x, status: "cancelled", cancelReason: "The learner's wallet balance was too low", hold: 0 }));
    if (undo.ok) broadcast(undo.doubt);
    return { ok: false as const, error: "The learner's balance is too low for this session", doubt: undo.doubt };
  }
  broadcast(d);
  await system(d, `${tutor.name} accepted your doubt. ${formatPaise(d.hold!)} is held from your wallet; you only pay for the minutes you use (${formatPaise(tutor.ratePerMinute)}/min).`);
  await notify(d.studentId, { kind: "module", title: `${tutor.name} accepted your doubt`, body: `Open the session to chat. Rate ${formatPaise(tutor.ratePerMinute)}/min.`, href: `/doubts/${d.id}` });
  return claim;
}
