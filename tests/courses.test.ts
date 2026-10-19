import { describe, expect, it } from "vitest";
import {
  canAccessLecture,
  certificateCode,
  filterCatalog,
  isWatched,
  parseCatalogQuery,
  parseYouTubeId,
  progressPercent,
  publishProblems,
  resumeLecture,
  slugify,
  uniqueSlug,
  type CatalogItem,
} from "@/modules/courses/logic";
import { CATEGORIES, LEVELS, type Course, type Lecture, type LectureProgress } from "@/modules/courses/types";

const lec = (id: string, extra: Partial<Lecture> = {}): Lecture => ({
  id,
  title: `Lecture ${id}`,
  durationSec: 100,
  video: { kind: "url", src: "https://example.com/v.mp4" },
  notes: null,
  preview: false,
  ...extra,
});

const course = (extra: Partial<Course> = {}): Course => ({
  id: "c1",
  slug: "physics",
  instructorId: "t1",
  title: "Physics basics",
  subtitle: "",
  description: "A long enough description for publishing checks.",
  category: "Engineering (JEE)",
  level: "beginner",
  language: "Hinglish",
  price: 49_900,
  colors: ["#ff8a00", "#5b47ff"],
  outcomes: [],
  sections: [
    { id: "s1", title: "One", lectures: [lec("a"), lec("b")] },
    { id: "s2", title: "Two", lectures: [lec("c"), lec("d")] },
  ],
  status: "published",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  publishedAt: "2026-01-01T00:00:00Z",
  ...extra,
});

const prog = (lectureId: string, completed: boolean, updatedAt = "2026-02-01T00:00:00Z"): LectureProgress => ({
  userId: "u1",
  courseId: "c1",
  lectureId,
  positionSec: 10,
  completed,
  updatedAt,
});

describe("slugs", () => {
  it("makes readable URL slugs", () => {
    expect(slugify("  Organic Chemistry: 30 Days!! ")).toBe("organic-chemistry-30-days");
    expect(slugify("!!!")).toBe("course");
  });

  it("never collides with existing slugs or reserved paths", () => {
    expect(uniqueSlug("Physics", new Set(["physics"]))).toBe("physics-2");
    expect(uniqueSlug("Physics", new Set(["physics", "physics-2"]))).toBe("physics-3");
    expect(uniqueSlug("My", new Set())).toBe("my-2");
    expect(uniqueSlug("Teach", new Set())).toBe("teach-2");
  });
});

describe("lecture access", () => {
  const paid = lec("x");
  const preview = lec("y", { preview: true });

  it("locks paid lectures for visitors who haven't bought", () => {
    expect(canAccessLecture(paid, { isOwnerOrAdmin: false, enrolled: false })).toBe(false);
  });

  it("opens previews to everyone", () => {
    expect(canAccessLecture(preview, { isOwnerOrAdmin: false, enrolled: false })).toBe(true);
  });

  it("opens everything to enrolled learners and the owner", () => {
    expect(canAccessLecture(paid, { isOwnerOrAdmin: false, enrolled: true })).toBe(true);
    expect(canAccessLecture(paid, { isOwnerOrAdmin: true, enrolled: false })).toBe(true);
  });
});

describe("progress", () => {
  it("counts completed lectures only, rounded down", () => {
    expect(progressPercent(course(), [])).toBe(0);
    expect(progressPercent(course(), [prog("a", true), prog("b", false)])).toBe(25);
    expect(progressPercent(course(), [prog("a", true), prog("b", true), prog("c", true)])).toBe(75);
    expect(progressPercent(course(), ["a", "b", "c", "d"].map((id) => prog(id, true)))).toBe(100);
  });

  it("ignores progress rows for lectures that were deleted", () => {
    expect(progressPercent(course(), [prog("gone", true)])).toBe(0);
  });

  it("is 0 for a course without lectures", () => {
    expect(progressPercent(course({ sections: [] }), [])).toBe(0);
  });

  it("resumes at the first unfinished lecture", () => {
    expect(resumeLecture(course(), [])?.id).toBe("a");
    expect(resumeLecture(course(), [prog("a", true), prog("b", true)])?.id).toBe("c");
  });

  it("resumes at the last-watched lecture once everything is done", () => {
    const rows = ["a", "b", "c", "d"].map((id, i) => prog(id, true, `2026-02-0${i + 1}T00:00:00Z`));
    rows[1]!.updatedAt = "2026-03-01T00:00:00Z";
    expect(resumeLecture(course(), rows)?.id).toBe("b");
  });

  it("treats 90% watched as complete", () => {
    expect(isWatched(89, 100)).toBe(false);
    expect(isWatched(90, 100)).toBe(true);
    expect(isWatched(5, 0)).toBe(false);
  });
});

describe("publishProblems", () => {
  it("accepts a complete course", () => {
    expect(publishProblems(course())).toEqual([]);
  });

  it("flags missing pieces", () => {
    const bad = course({
      title: "Hi",
      description: "short",
      sections: [
        { id: "s1", title: "One", lectures: [lec("a", { video: null })] },
        { id: "s2", title: "Empty", lectures: [] },
      ],
    });
    const problems = publishProblems(bad);
    expect(problems).toHaveLength(4);
    expect(problems.join(" ")).toMatch(/title/);
    expect(problems.join(" ")).toMatch(/1 lecture has no video/);
  });

  it("requires at least one lecture", () => {
    expect(publishProblems(course({ sections: [] }))).toContain("Add at least one lecture");
  });
});

describe("parseYouTubeId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=42", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=x", "dQw4w9WgXcQ"],
    ["dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("reads %s", (input, id) => {
    expect(parseYouTubeId(input)).toBe(id);
  });

  it.each(["https://vimeo.com/123", "https://youtube.com/watch?v=short", "not a link", "https://evil.com/watch?v=dQw4w9WgXcQ"])("rejects %s", (input) => {
    expect(parseYouTubeId(input)).toBeNull();
  });
});

describe("catalog", () => {
  const item = (id: string, extra: Partial<Course>, students: number, rating: number, instructorName = "Asha"): CatalogItem => ({
    course: course({ id, ...extra }),
    stats: { students, rating, reviews: rating ? 3 : 0 },
    instructorName,
  });
  const items = [
    item("p", { title: "Physics", price: 49_900, level: "beginner", publishedAt: "2026-01-01" }, 10, 4.6),
    item("b", { title: "Biology", category: "Medical (NEET)", price: 0, level: "intermediate", publishedAt: "2026-03-01" }, 50, 3.2),
    item("c", { title: "Coding", category: "Programming", price: 99_900, level: "advanced", publishedAt: "2026-02-01" }, 5, 0, "Ravi"),
  ];
  const ids = (q: Parameters<typeof filterCatalog>[1]) => filterCatalog(items, q).map((i) => i.course.id);

  it("sorts by popularity by default", () => expect(ids({})).toEqual(["b", "p", "c"]));
  it("searches title and instructor", () => {
    expect(ids({ q: "phys" })).toEqual(["p"]);
    expect(ids({ q: "ravi" })).toEqual(["c"]);
  });
  it("filters by category, price, rating and level", () => {
    expect(ids({ category: "Programming" })).toEqual(["c"]);
    expect(ids({ price: "free" })).toEqual(["b"]);
    expect(ids({ price: "paid" })).toEqual(["p", "c"]);
    expect(ids({ minRating: 4 })).toEqual(["p"]);
    expect(ids({ level: "advanced" })).toEqual(["c"]);
  });
  it("sorts by price and recency", () => {
    expect(ids({ sort: "price-asc" })).toEqual(["b", "p", "c"]);
    expect(ids({ sort: "price-desc" })).toEqual(["c", "p", "b"]);
    expect(ids({ sort: "newest" })).toEqual(["b", "c", "p"]);
  });

  it("drops unknown search params", () => {
    const q = parseCatalogQuery({ category: "Hacking", price: "cheap", rating: "2", level: "god", sort: "random", q: "x".repeat(200) }, CATEGORIES, LEVELS);
    expect(q).toEqual({ q: "x".repeat(80), category: undefined, price: undefined, minRating: undefined, level: undefined, sort: undefined });
  });
});

describe("certificateCode", () => {
  it("has the GG-XXXX-XXXX shape without ambiguous characters", () => {
    for (let i = 0; i < 200; i++) expect(certificateCode()).toMatch(/^GG-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  });
});
