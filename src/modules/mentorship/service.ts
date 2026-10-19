import { randomUUID } from "node:crypto";
import type { PublicUser } from "@/core/auth/roles";
import { findUserById } from "@/core/auth/users";
import { emailLayout, sendEmail } from "@/core/notifications/email";
import { notify } from "@/core/notifications/store";
import { getSite } from "@/core/site/store";
import { WalletError } from "@/core/wallet/ledger";
import { walletTransfer } from "@/core/wallet/store";
import { formatPaise } from "@/lib/utils";
import { cancelSplit, dueReminders, findSlot, firstName, fmtWhen, holdsSlot, isDue, rescheduleBlock, type Range } from "./logic";
import { claimSlot, getMentorshipSettings, listBookings, releaseSlot, transition } from "./store";
import type { Booking, MentorProfile } from "./types";

/** System wallet that holds learners' money until the session is over. */
export const ESCROW_ID = "escrow:mentorship";

export async function mentorshipEnabled() {
  return (await getSite()).modules.find((m) => m.key === "mentorship")?.enabled ?? false;
}

export const isMentorRole = (u: Pick<PublicUser, "role">) => u.role === "mentor" || u.role === "admin";

/** Times a mentor is already taken (from a list that may include other mentors). */
export const busyOf = (all: Booking[], mentorId: string, exceptId?: string): Range[] => all.filter((b) => b.mentorId === mentorId && b.id !== exceptId && holdsSlot(b));

/* ---------------- Messages to people ---------------- */

const appUrl = (path: string) => `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${path}`;

async function tell(userId: string, title: string, body: string, href: string, emailToo = true) {
  await notify(userId, { kind: "module", title, body, href });
  if (!emailToo) return;
  const u = await findUserById(userId);
  if (u) await sendEmail({ to: u.email, subject: title, html: emailLayout(title, [body], { label: "Open session", url: appUrl(href) }) });
}

const roomHref = (b: Booking) => `/mentorship/bookings/${b.id}`;

/* ---------------- Money ---------------- */

/** Pays out a finished booking from escrow exactly once (ledger keys make retries safe). */
async function settleMoney(b: Booking): Promise<Booking> {
  if (b.paidOut || b.status === "confirmed") return b;
  if ((b.payout ?? 0) > 0)
    await walletTransfer({ from: ESCROW_ID, to: b.mentorId, amount: b.payout!, commissionBps: b.commissionBps, key: `mentor:${b.id}:pay`, note: `Mentorship session with ${firstName(b.studentName)}`, ref: `mentor:${b.id}` });
  if ((b.refund ?? 0) > 0)
    await walletTransfer({ from: ESCROW_ID, to: b.studentId, amount: b.refund!, commissionBps: 0, key: `mentor:${b.id}:refund`, note: `Refund: session with ${b.mentorName}`, ref: `mentor:${b.id}` });
  const marked = await transition(b.id, () => null, (x) => ({ ...x, paidOut: true }));
  return marked.booking ?? b;
}

/**
 * Applies time-based rules the first time anyone looks: completes ended sessions
 * (paying the mentor), retries interrupted payouts and sends due reminders.
 * Also run for every booking by /api/cron/mentorship so reminders go out on time.
 */
export async function settle(b: Booking, now = Date.now()): Promise<Booking> {
  if (isDue(b, now)) {
    const res = await transition(b.id, (x) => (isDue(x, now) ? null : "changed"), (x) => ({ ...x, status: "completed", payout: x.price, refund: 0 }));
    if (!res.ok) return res.booking ?? b;
    const done = await settleMoney(res.booking);
    await tell(done.studentId, `How was your session with ${done.mentorName}?`, "Leave quick feedback. It helps other learners pick the right mentor.", roomHref(done), false);
    await notify(done.mentorId, { kind: "wallet", title: "Session payment released", body: `Your session with ${firstName(done.studentName)} is complete. Earnings are in your wallet.`, href: "/mentorship/mentor" });
    return done;
  }
  if (b.status !== "confirmed") return b.paidOut ? b : settleMoney(b);

  for (const kind of dueReminders(b, now)) {
    const res = await transition(b.id, (x) => (x.status === "confirmed" && !x.reminders[kind] && x.start === b.start ? null : "sent"), (x) => ({ ...x, reminders: { ...x.reminders, [kind]: new Date(now).toISOString() } }));
    if (!res.ok) continue;
    b = res.booking;
    const when = kind === "h24" ? "tomorrow" : "in 15 minutes";
    await tell(b.studentId, `Reminder: session with ${b.mentorName} ${when}`, `${fmtWhen(b.start)}. Join from Glideinbir when the room opens (10 minutes before).`, roomHref(b));
    await tell(b.mentorId, `Reminder: session with ${firstName(b.studentName)} ${when}`, `${fmtWhen(b.start)}. Agenda: ${b.agenda}`, roomHref(b));
  }
  return b;
}

/** Settles every booking that still has something pending. Returns how many changed. */
export async function sweep(now = Date.now()) {
  let changed = 0;
  for (const b of await listBookings()) {
    if (b.status !== "confirmed" && b.paidOut) continue;
    const after = await settle(b, now);
    if (after !== b) changed++;
  }
  return changed;
}

/* ---------------- Book, cancel, reschedule ---------------- */

export async function book(student: PublicUser, mentor: MentorProfile, start: string, agenda: string) {
  const now = Date.now();
  const slot = findSlot(mentor, start, busyOf(await listBookings(), mentor.userId), now);
  if (!slot) return { ok: false as const, error: "That slot isn't available any more. Pick another one." };
  const { commissionBps } = await getMentorshipSettings();
  const iso = new Date(now).toISOString();
  const booking: Booking = {
    id: randomUUID(),
    mentorId: mentor.userId,
    mentorName: mentor.name,
    studentId: student.id,
    studentName: student.name,
    start: slot.start,
    end: slot.end,
    price: mentor.price,
    commissionBps,
    agenda,
    status: "confirmed",
    createdAt: iso,
    updatedAt: iso,
    scheduledAt: iso,
    reschedules: 0,
    reminders: {},
  };
  // Re-check inside the write queue (buffers included), then take the money.
  const claim = await claimSlot(booking, (all) => (findSlot(mentor, slot.start, busyOf(all, mentor.userId), now) ? null : "Someone just booked this slot. Pick another one."));
  if (!claim.ok) return claim;
  try {
    await walletTransfer({ from: student.id, to: ESCROW_ID, amount: booking.price, commissionBps: 0, key: `mentor:${booking.id}:hold`, note: `Mentorship with ${mentor.name} (${fmtWhen(booking.start)})`, ref: `mentor:${booking.id}` });
  } catch (e) {
    await releaseSlot(booking.id);
    if (e instanceof WalletError) return { ok: false as const, error: `Add money to your wallet: this session costs ${formatPaise(booking.price)}.`, booking: null };
    throw e;
  }
  await tell(student.id, `Booked: ${mentor.name}, ${fmtWhen(booking.start)}`, `${formatPaise(booking.price)} is held safely until the session is done. Free cancellation up to 24 hours before.`, roomHref(booking));
  await tell(mentor.userId, `New booking from ${firstName(student.name)}`, `${fmtWhen(booking.start)}. Agenda: ${agenda}`, roomHref(booking));
  return claim;
}

export async function cancel(b: Booking, by: "student" | "mentor" | "admin", reason: string) {
  const now = Date.now();
  const res = await transition(
    b.id,
    (x) => (x.status !== "confirmed" ? "This session can't be cancelled now" : Date.parse(x.start) <= now && by !== "admin" ? "This session has already started" : null),
    (x) => ({ ...x, status: "cancelled", cancelledAt: new Date(now).toISOString(), cancelledBy: by, cancelReason: reason, ...cancelSplit(x, by, now) }),
  );
  if (!res.ok) return res;
  const done = await settleMoney(res.booking);
  const refundText = done.refund ? `${formatPaise(done.refund)} has been refunded to the wallet.` : "No refund: it was cancelled less than 24 hours before the start.";
  if (by !== "student") await tell(done.studentId, `Session with ${done.mentorName} cancelled`, `${fmtWhen(done.start)} was cancelled${by === "admin" ? " by the Glideinbir team" : ` by ${done.mentorName}`}. ${refundText}${reason ? ` Reason: ${reason}` : ""}`, roomHref(done));
  else await tell(done.studentId, `You cancelled your session with ${done.mentorName}`, refundText, roomHref(done), false);
  if (by !== "mentor") await tell(done.mentorId, `${firstName(done.studentName)}'s session was cancelled`, `${fmtWhen(done.start)} is free again.${done.payout ? " You still get paid for this late cancellation." : ""}`, "/mentorship/mentor");
  return { ok: true as const, booking: done };
}

export async function reschedule(b: Booking, mentor: MentorProfile, start: string, by: "student" | "mentor") {
  const now = Date.now();
  const block = rescheduleBlock(b, by, now);
  if (block) return { ok: false as const, error: block, booking: b };
  let slot: Range | null = null;
  const res = await transition(
    b.id,
    (x, all) => {
      const err = rescheduleBlock(x, by, now);
      if (err) return err;
      slot = findSlot(mentor, start, busyOf(all, mentor.userId, x.id), now);
      return slot ? null : "That slot isn't available any more. Pick another one.";
    },
    (x) => ({ ...x, start: slot!.start, end: slot!.end, scheduledAt: new Date(now).toISOString(), reschedules: x.reschedules + (by === "student" ? 1 : 0), reminders: {} }),
  );
  if (!res.ok) return res;
  const nb = res.booking;
  const other = by === "student" ? nb.mentorId : nb.studentId;
  const who = by === "student" ? firstName(nb.studentName) : nb.mentorName;
  await tell(other, `Session moved to ${fmtWhen(nb.start)}`, `${who} moved your session from ${fmtWhen(b.start)} to ${fmtWhen(nb.start)}.`, roomHref(nb));
  return res;
}
