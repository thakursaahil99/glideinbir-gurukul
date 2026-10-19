import { describe, expect, it } from "vitest";
import {
  evaluate,
  importQuestionsCsv,
  isCorrect,
  isExpired,
  parseCsv,
  publicQuestion,
  publishProblems,
  remainingSec,
  standing,
  uniqueSlug,
  CSV_TEMPLATE,
} from "@/modules/tests/logic";
import type { Answer, Question, Test } from "@/modules/tests/types";

const q = (id: string, extra: Partial<Question> = {}): Question => ({
  id,
  type: "single",
  text: `Question ${id}`,
  image: null,
  options: [
    { id: `${id}a`, text: "A" },
    { id: `${id}b`, text: "B" },
    { id: `${id}c`, text: "C" },
  ],
  correct: [`${id}b`],
  numeric: null,
  marks: 4,
  negative: 1,
  topic: "Kinematics",
  explanation: "because",
  ...extra,
});

const pick = (...ids: string[]): Answer => ({ selected: ids, value: null });
const num = (value: number | null): Answer => ({ selected: [], value });

const test = (questions: Question[]): Pick<Test, "sections"> => ({ sections: [{ id: "s", title: "Physics", questions }] });

describe("isCorrect", () => {
  it("single choice", () => {
    expect(isCorrect(q("1"), pick("1b"))).toBe(true);
    expect(isCorrect(q("1"), pick("1a"))).toBe(false);
  });

  it("multiple choice needs the exact set (no partial credit, no extras)", () => {
    const m = q("2", { type: "multiple", correct: ["2a", "2c"] });
    expect(isCorrect(m, pick("2a", "2c"))).toBe(true);
    expect(isCorrect(m, pick("2c", "2a"))).toBe(true);
    expect(isCorrect(m, pick("2a"))).toBe(false);
    expect(isCorrect(m, pick("2a", "2b", "2c"))).toBe(false);
  });

  it("numeric with tolerance and float noise", () => {
    const n = q("3", { type: "numeric", options: [], correct: [], numeric: { value: 0.3, tolerance: 0 } });
    expect(isCorrect(n, num(0.1 + 0.2))).toBe(true);
    expect(isCorrect(n, num(0.31))).toBe(false);
    const t = q("4", { type: "numeric", options: [], correct: [], numeric: { value: 3.14, tolerance: 0.01 } });
    expect(isCorrect(t, num(3.15))).toBe(true);
    expect(isCorrect(t, num(3.16))).toBe(false);
    expect(isCorrect(t, num(null))).toBe(false);
  });
});

describe("evaluate", () => {
  const n = q("n", { type: "numeric", options: [], correct: [], numeric: { value: 10, tolerance: 0 }, negative: 0, topic: "Algebra" });
  const qs = [q("1"), q("2"), q("3"), n];

  it("scores +marks, -negative, and 0 for skipped", () => {
    const r = evaluate(test(qs), { "1": pick("1b"), "2": pick("2a"), n: num(10) }, { "1": 30, "2": 12.6, n: 40 });
    expect(r.score).toBe(4 - 1 + 0 + 4);
    expect(r.maxScore).toBe(16);
    expect([r.correct, r.wrong, r.skipped]).toEqual([2, 1, 1]);
    expect(r.accuracy).toBe(66.7);
    expect(r.timeTakenSec).toBe(30 + 13 + 40);
    expect(r.questions.find((x) => x.questionId === "2")).toMatchObject({ outcome: "wrong", marks: -1 });
  });

  it("treats an empty selection or a blank numeric as skipped (no negative)", () => {
    const r = evaluate(test(qs), { "1": pick(), n: num(null) }, {});
    expect(r.skipped).toBe(4);
    expect(r.score).toBe(0);
    expect(r.accuracy).toBe(0);
  });

  it("breaks results down by topic", () => {
    const r = evaluate(test(qs), { "1": pick("1b"), n: num(9) }, {});
    expect(r.topics).toEqual([
      { topic: "Algebra", correct: 0, wrong: 1, skipped: 0, score: 0, max: 4 },
      { topic: "Kinematics", correct: 1, wrong: 0, skipped: 2, score: 4, max: 12 },
    ]);
  });

  it("can go negative", () => {
    expect(evaluate(test([q("1")]), { "1": pick("1a") }, {}).score).toBe(-1);
  });
});

describe("standing", () => {
  it("ranks with ties and computes percentile", () => {
    const scores = [80, 72, 72, 50, 10];
    expect(standing(80, scores)).toEqual({ rank: 1, percentile: 100, total: 5 });
    expect(standing(72, scores)).toEqual({ rank: 2, percentile: 80, total: 5 });
    expect(standing(10, scores)).toEqual({ rank: 5, percentile: 20, total: 5 });
  });

  it("a lone candidate is rank 1, 100th percentile", () => {
    expect(standing(12, [12])).toEqual({ rank: 1, percentile: 100, total: 1 });
  });
});

describe("timer", () => {
  const deadline = new Date(Date.UTC(2026, 0, 1, 10, 0, 0)).toISOString();
  const at = (s: number) => Date.parse(deadline) + s * 1000;

  it("counts down and stops at zero", () => {
    expect(remainingSec({ deadline }, at(-90))).toBe(90);
    expect(remainingSec({ deadline }, at(10))).toBe(0);
  });

  it("allows a short grace period after the deadline", () => {
    expect(isExpired({ deadline }, at(3))).toBe(false);
    expect(isExpired({ deadline }, at(6))).toBe(true);
  });
});

describe("publicQuestion", () => {
  it("never carries the answer or explanation", () => {
    const p = publicQuestion(q("1", { type: "numeric", numeric: { value: 5, tolerance: 0 } }));
    expect(p).not.toHaveProperty("correct");
    expect(p).not.toHaveProperty("numeric");
    expect(p).not.toHaveProperty("explanation");
    expect(JSON.stringify(p)).not.toContain("because");
  });
});

describe("publishProblems", () => {
  const base: Test = {
    id: "t",
    slug: "t",
    instructorId: "i",
    title: "Physics mock",
    description: "",
    exam: "JEE Main",
    durationMin: 30,
    price: 0,
    colors: ["#000000", "#ffffff"],
    instructions: [],
    sections: [{ id: "s", title: "Physics", questions: [q("1")] }],
    status: "draft",
    createdAt: "",
    updatedAt: "",
  };

  it("accepts a complete test", () => expect(publishProblems(base)).toEqual([]));

  it("flags bad questions with their location", () => {
    const bad = { ...base, sections: [{ id: "s", title: "Physics", questions: [q("1", { correct: [] }), q("2", { type: "single", correct: ["2a", "2b"] })] }] };
    expect(publishProblems(bad)).toEqual(["Physics Q1 needs a correct option", "Physics Q2 must have exactly one correct option"]);
  });
});

describe("CSV", () => {
  it("parses quotes, commas and newlines inside fields", () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\n1,"two\nlines",3\n')).toEqual([
      ["a", "b, c", 'say "hi"'],
      ["1", "two\nlines", "3"],
    ]);
  });

  it("imports the bundled template", () => {
    let n = 0;
    const r = importQuestionsCsv(CSV_TEMPLATE, () => `id${++n}`);
    expect(r.errors).toEqual([]);
    expect(r.sections.map((s) => [s.title, s.questions.length])).toEqual([
      ["Physics", 2],
      ["Maths", 1],
    ]);
    const [single, multiple] = r.sections[0]!.questions;
    expect(single!.options.map((o) => o.text)).toEqual(["2", "4", "5", "8"]);
    expect(single!.correct).toEqual([single!.options[2]!.id]);
    expect(multiple!.correct).toEqual([multiple!.options[0]!.id, multiple!.options[2]!.id]);
    expect(r.sections[1]!.questions[0]).toMatchObject({ type: "numeric", numeric: { value: 144, tolerance: 0 }, negative: 0 });
  });

  it("reports bad rows by line and keeps the good ones", () => {
    const csv = ["type,question,option_a,option_b,correct", "single,Q1,x,y,B", "single,Q2,x,y,E", "weird,Q3,x,y,A", "numeric,Q4,,,abc"].join("\n");
    let n = 0;
    const r = importQuestionsCsv(csv, () => `id${++n}`);
    expect(r.sections[0]!.questions).toHaveLength(1);
    expect(r.errors).toEqual([
      "Line 3: correct must be option letters like C or A;C",
      "Line 4: type must be single, multiple or numeric",
      "Line 5: numeric answer must look like 42 or 3.14|0.01",
    ]);
  });

  it("rejects a file without the required columns", () => {
    expect(importQuestionsCsv("foo,bar\n1,2", () => "x").errors[0]).toMatch(/Header must include/);
  });
});

describe("demo tests", () => {
  it("are publishable and their answer keys are right", async () => {
    const { demoTests } = await import("@/modules/tests/demo");
    const tests = demoTests("admin", new Set());
    expect(tests).toHaveLength(2);
    for (const t of tests) expect(publishProblems(t)).toEqual([]);

    // Answering every question with its key must score full marks.
    for (const t of tests) {
      const answers: Record<string, Answer> = {};
      for (const s of t.sections) for (const x of s.questions) answers[x.id] = x.type === "numeric" ? num(x.numeric!.value) : pick(...x.correct);
      const r = evaluate(t, answers, {});
      expect(r.score).toBe(r.maxScore);
      expect(r.wrong).toBe(0);
    }
    const jee = tests[0]!;
    const accel = jee.sections[0]!.questions[0]!;
    expect(accel.options.find((o) => o.id === accel.correct[0])!.text).toBe("4 m/s²");
  });
});

describe("slugs", () => {
  it("avoid reserved paths", () => {
    expect(uniqueSlug("My", new Set())).toBe("my-2");
    expect(uniqueSlug("Mock 1", new Set(["mock-1"]))).toBe("mock-1-2");
  });
});
