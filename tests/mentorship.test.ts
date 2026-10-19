import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { cancelSplit, dueReminders, findSlot, fmtWhen, istDate, istToMs, istWeekday, phaseOf, rescheduleBlock, slotsAhead, slotsOn, weeklyError } from "@/modules/mentorship/logic";
import type { Booking, MentorProfile } from "@/modules/mentorship/types";

/** Monday 19 Oct 2026, 15:30 IST. */
const NOW = Date.UTC(2026, 9, 19, 10, 0, 0);
const H = 3600_000;
const at = (date: string, hhmm: string) => new Date(istToMs(date, hhmm)).toISOString();

const mentor = (extra: Partial<MentorProfile> = {}): MentorProfile => ({
  userId: "m1",
  name: "Priya Sharma",
  headline: "SDE-2",
  bio: "",
  expertise: ["DSA"],
  sessionMin: 45,
  bufferMin: 15,
  price: 49_900,
  weekly: [{ day: 2, start: "18:00", end: "21:00" }], // Tuesdays
  leaves: [],
  published: true,
  createdAt: "",
  updatedAt: "",
  ...extra,
});

const booking = (extra: Partial<Booking> = {}): Booking => ({
  id: "b1",
  mentorId: "m1",
  mentorName: "Priya",
  studentId: "s1",
  studentName: "Riya Verma",
  start: at("2026-10-27", "18:00"),
  end: at("2026-10-27", "18:45"),
  price: 49_900,
  commissionBps: 2000,
  agenda: "Resume review please",
  status: "confirmed",
  createdAt: new Date(NOW).toISOString(),
  updatedAt: new Date(NOW).toISOString(),
  scheduledAt: new Date(NOW).toISOString(),
  reschedules: 0,
  reminders: {},
  ...extra,
});

describe("IST time helpers", () => {
  it("converts IST wall-clock to UTC (+05:30, no DST)", () => {
    expect(at("2026-10-20", "18:00")).toBe("2026-10-20T12:30:00.000Z");
    expect(at("2026-10-20", "00:15")).toBe("2026-10-19T18:45:00.000Z");
  });
  it("takes the IST date, not the UTC date, near midnight", () => {
    expect(istDate(Date.UTC(2026, 9, 19, 19, 0))).toBe("2026-10-20"); // 00:30 IST next day
    expect(istWeekday("2026-10-19")).toBe(1);
    expect(fmtWhen(at("2026-10-20", "18:00"))).toMatch(/6:00\s?pm IST/i);
  });
});

describe("slots", () => {
  it("steps by session + buffer inside each opening", () => {
    const s = slotsOn(mentor(), "2026-10-20", [], NOW).map((x) => x.start);
    // 18:00–18:45, 19:00–19:45, 20:00–20:45 (20:45+ wouldn't fit before 21:00 with a 45 min session after buffer)
    expect(s).toEqual([at("2026-10-20", "18:00"), at("2026-10-20", "19:00"), at("2026-10-20", "20:00")]);
  });
  it("only offers the right weekday, skips leave days and short notice", () => {
    expect(slotsOn(mentor(), "2026-10-21", [], NOW)).toEqual([]); // Wednesday
    expect(slotsOn(mentor({ leaves: ["2026-10-20"] }), "2026-10-20", [], NOW)).toEqual([]);
    const lateNow = istToMs("2026-10-20", "17:30");
    expect(slotsOn(mentor(), "2026-10-20", [], lateNow).map((x) => x.start)).toEqual([at("2026-10-20", "20:00")]); // 18:00 and 19:00 < 2h away
  });
  it("hides slots that overlap a booking, including its buffer", () => {
    const busy = [{ start: at("2026-10-20", "19:00"), end: at("2026-10-20", "19:45") }];
    expect(slotsOn(mentor(), "2026-10-20", busy, NOW).map((x) => x.start)).toEqual([at("2026-10-20", "18:00"), at("2026-10-20", "20:00")]);
    const tight = mentor({ sessionMin: 30, bufferMin: 0, weekly: [{ day: 2, start: "18:00", end: "19:30" }] });
    const busy2 = [{ start: at("2026-10-20", "18:30"), end: at("2026-10-20", "19:00") }];
    expect(slotsOn(tight, "2026-10-20", busy2, NOW).map((x) => x.start)).toEqual([at("2026-10-20", "18:00"), at("2026-10-20", "19:00")]);
  });
  it("covers three weeks ahead", () => {
    const days = slotsAhead(mentor(), [], NOW);
    expect(days).toHaveLength(21);
    expect(days.filter((d) => d.slots.length).map((d) => d.date)).toEqual(["2026-10-20", "2026-10-27", "2026-11-03"]);
  });
  it("findSlot accepts only real, free slots", () => {
    const p = mentor();
    expect(findSlot(p, at("2026-10-20", "19:00"), [], NOW)?.end).toBe(at("2026-10-20", "19:45"));
    expect(findSlot(p, at("2026-10-20", "19:10"), [], NOW)).toBeNull(); // off the grid
    expect(findSlot(p, at("2026-10-21", "19:00"), [], NOW)).toBeNull(); // not an opening
    expect(findSlot(p, at("2026-10-20", "19:00"), [{ start: at("2026-10-20", "19:00"), end: at("2026-10-20", "19:45") }], NOW)).toBeNull();
    expect(findSlot(p, "nonsense", [], NOW)).toBeNull();
    expect(findSlot(p, at("2026-12-29", "18:00"), [], NOW)).toBeNull(); // beyond the booking window
  });
});

describe("weekly schedule validation", () => {
  it("rejects overlaps and openings shorter than a session", () => {
    expect(weeklyError([{ day: 1, start: "18:00", end: "21:00" }], 60)).toBeNull();
    expect(weeklyError([{ day: 1, start: "18:00", end: "18:30" }], 45)).toMatch(/at least one 45-minute/);
    expect(weeklyError([{ day: 1, start: "21:00", end: "18:00" }], 30)).not.toBeNull();
    expect(
      weeklyError(
        [
          { day: 1, start: "18:00", end: "20:00" },
          { day: 1, start: "19:00", end: "21:00" },
        ],
        30,
      ),
    ).toMatch(/overlap/);
  });
});

describe("refund and reschedule rules", () => {
  const start = NOW + 48 * H;
  const b = booking({ start: new Date(start).toISOString(), end: new Date(start + 45 * 60_000).toISOString() });
  it("learner: full refund >24h ahead, none after", () => {
    expect(cancelSplit(b, "student", NOW)).toEqual({ refund: 49_900, payout: 0 });
    expect(cancelSplit(b, "student", start - 23 * H)).toEqual({ refund: 0, payout: 49_900 });
  });
  it("mentor or admin cancelling always refunds in full", () => {
    expect(cancelSplit(b, "mentor", start - H)).toEqual({ refund: 49_900, payout: 0 });
    expect(cancelSplit(b, "admin", start - H)).toEqual({ refund: 49_900, payout: 0 });
  });
  it("learner moves: only >24h ahead, at most twice; mentor any time before start", () => {
    expect(rescheduleBlock(b, "student", NOW)).toBeNull();
    expect(rescheduleBlock(b, "student", start - 2 * H)).toMatch(/24 hours/);
    expect(rescheduleBlock({ ...b, reschedules: 2 }, "student", NOW)).toMatch(/at most 2/);
    expect(rescheduleBlock(b, "mentor", start - 2 * H)).toBeNull();
    expect(rescheduleBlock(b, "mentor", start + 1)).toMatch(/started/);
    expect(rescheduleBlock({ ...b, status: "cancelled" }, "mentor", NOW)).not.toBeNull();
  });
});

describe("phases and reminders", () => {
  const start = NOW + 30 * H;
  const b = booking({ start: new Date(start).toISOString(), end: new Date(start + 45 * 60_000).toISOString() });
  it("opens the room 10 min early and closes 15 min after the end", () => {
    expect(phaseOf(b, start - 11 * 60_000)).toBe("upcoming");
    expect(phaseOf(b, start - 10 * 60_000)).toBe("open");
    expect(phaseOf(b, start + 59 * 60_000)).toBe("open");
    expect(phaseOf(b, start + 61 * 60_000)).toBe("ended");
    expect(phaseOf({ ...b, status: "cancelled" }, start)).toBe("ended");
  });
  it("sends the 24h reminder once, then the 15 min one", () => {
    expect(dueReminders(b, NOW)).toEqual([]);
    expect(dueReminders(b, start - 24 * H)).toEqual(["h24"]);
    expect(dueReminders({ ...b, reminders: { h24: "x" } }, start - 20 * H)).toEqual([]);
    expect(dueReminders({ ...b, reminders: { h24: "x" } }, start - 10 * 60_000)).toEqual(["m15"]);
    expect(dueReminders({ ...b, reminders: { h24: "x", m15: "y" } }, start - 5 * 60_000)).toEqual([]);
  });
  it("skips the 24h reminder for sessions booked less than a day ahead", () => {
    const soon = booking({ start: new Date(NOW + 5 * H).toISOString(), end: new Date(NOW + 5.75 * H).toISOString() });
    expect(dueReminders(soon, NOW + H)).toEqual([]);
    expect(dueReminders(soon, NOW + 5 * H - 60_000)).toEqual(["m15"]);
  });
});

describe("booking store (no double booking)", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "gg-mentor-"));
  let store: typeof import("@/modules/mentorship/store");
  beforeAll(async () => {
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    vi.resetModules();
    store = await import("@/modules/mentorship/store");
  });
  afterAll(() => {
    vi.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });

  it("lets exactly one of many concurrent claims for a slot win", async () => {
    const results = await Promise.all(Array.from({ length: 25 }, (_, i) => store.claimSlot(booking({ id: `race-${i}`, studentId: `s${i}` }))));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const loser = results.find((r) => !r.ok);
    expect(loser && !loser.ok && loser.error).toMatch(/just booked/);
    expect((await store.listBookings()).filter((b) => b.status === "confirmed")).toHaveLength(1);
  });

  it("stops a learner double-booking themselves with another mentor", async () => {
    const winner = (await store.listBookings())[0]!;
    const res = await store.claimSlot(booking({ id: "other-mentor", mentorId: "m2", studentId: winner.studentId }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/already have a session/);
  });

  it("frees the slot after a cancel and refuses a reschedule onto a taken time", async () => {
    const winner = (await store.listBookings())[0]!;
    const later = booking({ id: "later", studentId: "s99", start: at("2026-10-27", "19:00"), end: at("2026-10-27", "19:45") });
    expect((await store.claimSlot(later)).ok).toBe(true);
    const clash = await store.transition("later", () => null, (b) => ({ ...b, start: winner.start, end: winner.end }));
    expect(clash.ok).toBe(false);
    await store.transition(winner.id, () => null, (b) => ({ ...b, status: "cancelled" }));
    const moved = await store.transition("later", () => null, (b) => ({ ...b, start: winner.start, end: winner.end }));
    expect(moved.ok).toBe(true);
  });
});
