import { describe, expect, it } from "vitest";
import { starterCourses } from "@/modules/courses/starter";
import { evaluate } from "@/modules/tests/logic";
import { starterTests } from "@/modules/tests/starter";
import type { Answer } from "@/modules/tests/types";

describe("starter courses", () => {
  const courses = starterCourses("team", new Set());
  it("are free, published and made of YouTube lectures with real ids and durations", () => {
    expect(courses.length).toBeGreaterThanOrEqual(6);
    for (const c of courses) {
      expect(c.price).toBe(0);
      expect(c.status).toBe("published");
      expect(c.demo).toBeUndefined();
      const lectures = c.sections.flatMap((s) => s.lectures);
      expect(lectures.length).toBeGreaterThan(0);
      expect(lectures.some((l) => l.preview)).toBe(true);
      for (const l of lectures) {
        expect(l.video?.kind).toBe("youtube");
        expect(l.video?.src).toMatch(/^[\w-]{11}$/);
        expect(l.durationSec).toBeGreaterThan(60);
      }
      // Credit to the creator is part of every description.
      expect(c.description).toMatch(/Videos?: /);
    }
  });
  it("skips slugs that already exist", () => {
    expect(starterCourses("team", new Set(courses.map((c) => c.slug)))).toHaveLength(0);
  });
});

describe("starter tests", () => {
  const tests = starterTests("team", new Set());
  it("mix free tests with paid next-level sets", () => {
    expect(tests.filter((t) => t.price === 0).length).toBeGreaterThanOrEqual(5);
    expect(tests.filter((t) => t.price > 0).length).toBeGreaterThanOrEqual(1);
  });
  it("every question is well formed and its key scores full marks", () => {
    for (const t of tests) {
      const qs = t.sections.flatMap((s) => s.questions);
      expect(qs.length).toBeGreaterThanOrEqual(8);
      const answers: Record<string, Answer> = {};
      for (const q of qs) {
        expect(q.explanation.length).toBeGreaterThan(5);
        if (q.type === "numeric") {
          expect(Number.isFinite(q.numeric?.value)).toBe(true);
          answers[q.id] = { selected: [], value: q.numeric!.value };
        } else {
          expect(q.options.length).toBe(4);
          expect(q.correct.length).toBeGreaterThanOrEqual(1);
          for (const id of q.correct) expect(q.options.some((o) => o.id === id)).toBe(true);
          if (q.type === "single") expect(q.correct).toHaveLength(1);
          answers[q.id] = { selected: q.correct, value: null };
        }
      }
      const r = evaluate(t, answers, {});
      expect(r.score).toBe(r.maxScore);
    }
  });
});
