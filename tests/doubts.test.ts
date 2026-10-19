import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { livekitMeetUrl, livekitToken } from "@/core/video/livekit";
import { publish, subscribe } from "@/core/realtime/bus";
import { bill, canMove, dueTransition, eligibleTutors, holdFor, isTutorOnline } from "@/modules/doubts/logic";
import type { Doubt, TutorProfile } from "@/modules/doubts/types";

const NOW = Date.UTC(2026, 9, 19, 10, 0, 0);
const iso = (offsetSec: number) => new Date(NOW + offsetSec * 1000).toISOString();

const tutor = (id: string, extra: Partial<TutorProfile> = {}): TutorProfile => ({
  userId: id,
  name: `Tutor ${id}`,
  subjects: ["Physics"],
  ratePerMinute: 500,
  bio: "",
  online: true,
  lastSeen: iso(-10),
  updatedAt: iso(-100),
  ...extra,
});

const doubt = (extra: Partial<Doubt> = {}): Doubt => ({
  id: "d1",
  studentId: "s1",
  studentName: "Riya",
  subject: "Physics",
  text: "Why is the sky blue?",
  image: null,
  limitMin: 10,
  status: "requested",
  createdAt: iso(-30),
  expiresAt: iso(90),
  ...extra,
});

describe("eligibleTutors", () => {
  const all = [
    tutor("cheap", { ratePerMinute: 300 }),
    tutor("pricey", { ratePerMinute: 2000 }),
    tutor("chem", { subjects: ["Chemistry"] }),
    tutor("offline", { online: false }),
    tutor("stale", { lastSeen: iso(-120) }),
    tutor("s1"),
  ];

  it("keeps online, subject-matching, affordable tutors (cheapest first) and never the learner", () => {
    const ids = eligibleTutors(all, { subject: "Physics", limitMin: 10, balance: 10_000, studentId: "s1" }, NOW).map((t) => t.userId);
    expect(ids).toEqual(["cheap"]);
  });

  it("includes pricier tutors when the learner can afford the full hold", () => {
    const ids = eligibleTutors(all, { subject: "Physics", limitMin: 10, balance: 20_000, studentId: "s1" }, NOW).map((t) => t.userId);
    expect(ids).toEqual(["cheap", "pricey"]);
  });

  it("treats a toggled-on tutor with a stale heartbeat as offline", () => {
    expect(isTutorOnline(tutor("x", { lastSeen: iso(-91) }), NOW)).toBe(false);
    expect(isTutorOnline(tutor("x", { lastSeen: iso(-89) }), NOW)).toBe(true);
  });
});

describe("bill", () => {
  const s = { limitMin: 10, ratePerMinute: 500, hold: holdFor(500, 10) };

  it("charges per started minute and refunds the rest of the hold", () => {
    expect(bill({ ...s, startedAt: iso(0) }, NOW + 4 * 60_000 + 1_000)).toEqual({ minutes: 5, charged: 2500, refunded: 2500 });
  });

  it("caps at the session limit", () => {
    expect(bill({ ...s, startedAt: iso(0) }, NOW + 25 * 60_000)).toEqual({ minutes: 10, charged: 5000, refunded: 0 });
  });

  it("is free if the session never started or ended within the first minute", () => {
    expect(bill({ ...s, startedAt: undefined }, NOW)).toEqual({ minutes: 0, charged: 0, refunded: 5000 });
    expect(bill({ ...s, startedAt: iso(0) }, NOW + 59_000)).toEqual({ minutes: 0, charged: 0, refunded: 5000 });
  });

  it("charge + refund always equals the hold", () => {
    for (const sec of [61, 119, 120, 121, 333, 599, 600, 601, 9999]) {
      const b = bill({ ...s, startedAt: iso(0) }, NOW + sec * 1000);
      expect(b.charged + b.refunded).toBe(s.hold);
    }
  });
});

describe("dueTransition", () => {
  it("expires unaccepted requests after their deadline", () => {
    expect(dueTransition(doubt(), NOW)).toBeNull();
    expect(dueTransition(doubt(), NOW + 91_000)).toEqual({ to: "expired" });
  });

  it("completes sessions at the limit, billed at the limit time", () => {
    const d = doubt({ status: "in_progress", startedAt: iso(0), limitMin: 10 });
    expect(dueTransition(d, NOW + 9 * 60_000)).toBeNull();
    expect(dueTransition(d, NOW + 11 * 60_000)).toEqual({ to: "completed", at: NOW + 10 * 60_000 });
  });

  it("never touches finished doubts", () => {
    expect(dueTransition(doubt({ status: "completed", expiresAt: iso(-999) }), NOW)).toBeNull();
  });
});

describe("canMove", () => {
  it("lets each side make only its own moves", () => {
    expect(canMove("requested", "accepted", "tutor")).toBe(true);
    expect(canMove("requested", "accepted", "student")).toBe(false);
    expect(canMove("requested", "cancelled", "student")).toBe(true);
    expect(canMove("accepted", "in_progress", "tutor")).toBe(true);
    expect(canMove("accepted", "in_progress", "student")).toBe(false);
    expect(canMove("in_progress", "completed", "student")).toBe(true);
    expect(canMove("in_progress", "cancelled", "tutor")).toBe(false);
    expect(canMove("completed", "in_progress", "tutor")).toBe(false);
  });
});

describe("livekit token", () => {
  it("is an HS256 JWT with a room grant, signed with the secret", () => {
    const tok = livekitToken({ room: "doubt-d1", identity: "u1", name: "Riya" }, { key: "APIkey", secret: "s3cret" }, 1_000_000);
    const [h, p, sig] = tok.split(".");
    const payload = JSON.parse(Buffer.from(p!, "base64url").toString());
    expect(JSON.parse(Buffer.from(h!, "base64url").toString())).toEqual({ alg: "HS256", typ: "JWT" });
    expect(payload).toMatchObject({ iss: "APIkey", sub: "u1", name: "Riya", video: { room: "doubt-d1", roomJoin: true } });
    expect(payload.exp).toBeGreaterThan(payload.nbf);
    expect(sig).toBe(createHmac("sha256", "s3cret").update(`${h}.${p}`).digest("base64url"));
    expect(livekitMeetUrl(tok, "wss://x.livekit.cloud")).toContain("liveKitUrl=wss%3A%2F%2Fx.livekit.cloud");
  });
});

describe("realtime bus", () => {
  it("delivers to subscribers of a channel only, and stops after unsubscribe", () => {
    const got: string[] = [];
    const off = subscribe("doubt:a", (e) => got.push(`${e.type}:${e.data}`));
    publish("doubt:a", "message", "hi");
    publish("doubt:b", "message", "nope");
    off();
    publish("doubt:a", "message", "late");
    expect(got).toEqual(["message:hi"]);
  });

  it("a throwing listener doesn't stop the others", () => {
    const got: string[] = [];
    const a = subscribe("c", () => {
      throw new Error("boom");
    });
    const b = subscribe("c", (e) => got.push(e.type));
    publish("c", "x");
    a();
    b();
    expect(got).toEqual(["x"]);
  });
});
