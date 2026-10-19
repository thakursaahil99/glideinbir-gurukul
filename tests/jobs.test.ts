import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { canMove, cleanSkills, filterPostings, htmlToText, isOpen, matchScore, salaryText } from "@/modules/jobs/logic";
import { mapRemotive } from "@/modules/jobs/remotive";
import type { Application, Posting } from "@/modules/jobs/types";

const NOW = Date.UTC(2026, 9, 19, 10, 0, 0); // 19 Oct 2026, 15:30 IST

const posting = (extra: Partial<Posting> = {}): Posting => ({
  id: "p1",
  companyId: "c1",
  companyName: "Acme Labs",
  postedBy: "u",
  title: "Frontend Developer Intern",
  type: "internship",
  workMode: "hybrid",
  location: "Bengaluru",
  experience: "fresher",
  salaryMin: 15_000,
  salaryMax: 25_000,
  salaryUnit: "month",
  skills: ["React", "JavaScript", "CSS"],
  description: "Build delightful UIs with our design team.",
  openings: 2,
  deadline: "2026-10-31",
  status: "open",
  createdAt: "",
  updatedAt: "",
  ...extra,
});

describe("skill match", () => {
  it("scores the share of the job's skills you have, across aliases and case", () => {
    expect(matchScore(["React", "JavaScript", "CSS", "Node.js"], ["reactjs", "JS", "python"])).toEqual({ score: 50, matched: ["React", "JavaScript"], missing: ["CSS", "Node.js"] });
    expect(matchScore(["Python"], ["PYTHON"]).score).toBe(100);
    expect(matchScore([], ["Python"]).score).toBeNull();
  });
  it("cleans skill lists (trim, dedupe by meaning, cap length)", () => {
    expect(cleanSkills([" React ", "react.js", "JS", "javascript", "", "x".repeat(40)])).toEqual(["React", "JS"]);
  });
});

describe("salary text", () => {
  it("formats yearly in LPA and monthly in rupees", () => {
    expect(salaryText({ salaryMin: 600_000, salaryMax: 900_000, salaryUnit: "year" })).toBe("6–9 LPA");
    expect(salaryText({ salaryMin: 450_000, salaryMax: 450_000, salaryUnit: "year" })).toBe("4.5 LPA");
    expect(salaryText({ salaryMin: 15_000, salaryMax: 25_000, salaryUnit: "month" })).toBe("₹15,000–25,000/mo");
    expect(salaryText({ salaryMin: 0, salaryMax: 0, salaryUnit: "year" })).toBe("Not disclosed");
  });
});

describe("pipeline", () => {
  it("moves forward or to rejected, never back, and final stages stay final", () => {
    expect(canMove("applied", "shortlisted")).toBe(true);
    expect(canMove("applied", "interview")).toBe(true);
    expect(canMove("interview", "shortlisted")).toBe(false);
    expect(canMove("shortlisted", "rejected")).toBe(true);
    expect(canMove("hired", "rejected")).toBe(false);
    expect(canMove("rejected", "applied")).toBe(false);
    expect(canMove("applied", "applied")).toBe(false);
  });
});

describe("search and visibility", () => {
  const list = [posting(), posting({ id: "p2", title: "Data Analyst", type: "full-time", workMode: "remote", location: "Anywhere", skills: ["SQL", "Excel"], experience: "0-2" })];
  it("matches every query word across title, company, skills and location", () => {
    const f = { q: "", type: null, workMode: null, experience: null, location: "" };
    expect(filterPostings(list, { ...f, q: "react intern" }).map((p) => p.id)).toEqual(["p1"]);
    expect(filterPostings(list, { ...f, q: "sql" }).map((p) => p.id)).toEqual(["p2"]);
    expect(filterPostings(list, { ...f, type: "internship" }).map((p) => p.id)).toEqual(["p1"]);
    expect(filterPostings(list, { ...f, location: "remote" }).map((p) => p.id)).toEqual(["p2"]);
    expect(filterPostings(list, { ...f, location: "bengaluru" }).map((p) => p.id)).toEqual(["p1"]);
  });
  it("closes after the deadline day in IST", () => {
    expect(isOpen(posting({ deadline: "2026-10-19" }), NOW)).toBe(true);
    expect(isOpen(posting({ deadline: "2026-10-19" }), Date.UTC(2026, 9, 19, 19, 0))).toBe(false); // 00:30 IST on the 20th
    expect(isOpen(posting({ status: "draft" }), NOW)).toBe(false);
    expect(isOpen(posting({ hidden: { reason: "spam", at: "" } }), NOW)).toBe(false);
  });
});

describe("remote feed", () => {
  it("keeps only safe https links and reduces HTML to text", () => {
    const j = mapRemotive({ id: 7, url: "https://remotive.com/remote-jobs/dev/x-7", title: " Dev ", company_name: "Co", company_logo: "http://insecure/logo", tags: ["python", "Python", "ai"], job_type: "full_time", publication_date: "2026-10-17T16:04:29", description: "<p>Hi <b>there</b></p><script>alert(1)</script><ul><li>One &amp; two</li></ul>" })!;
    expect(j).toMatchObject({ id: "remotive:7", title: "Dev", logo: null, type: "full-time", tags: ["python", "ai"] });
    expect(j.publishedAt).toBe("2026-10-17T16:04:29.000Z");
    expect(j.excerpt).toBe("Hi there\nOne & two");
    expect(mapRemotive({ id: 8, url: "javascript:alert(1)", title: "x", company_name: "y" })).toBeNull();
  });
  it("htmlToText strips tags and scripts", () => {
    expect(htmlToText("<style>p{}</style><p>a</p><br>b&nbsp;c")).toBe("a\nb c");
  });
});

describe("applications store", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "gg-jobs-"));
  let store: typeof import("@/modules/jobs/store");
  beforeAll(async () => {
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    vi.resetModules();
    store = await import("@/modules/jobs/store");
  });
  afterAll(() => {
    vi.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });
  const app = (id: string, extra: Partial<Application> = {}): Application => ({ id, postingId: "p1", companyId: "c1", userId: "u1", userName: "Riya", email: "r@x.in", resume: true, coverNote: "", score: 60, skills: [], stage: "applied", history: [], createdAt: "", updatedAt: "", ...extra });

  it("allows one live application per person per job, even with double clicks", async () => {
    const res = await Promise.all(Array.from({ length: 10 }, (_, i) => store.insertApplication(app(`a${i}`))));
    expect(res.filter((r) => r.ok)).toHaveLength(1);
  });
  it("lets you apply again after withdrawing", async () => {
    const first = (await store.listApplications())[0]!;
    await store.changeApplication(first.id, () => null, (a) => ({ ...a, withdrawn: true }));
    expect((await store.insertApplication(app("again"))).ok).toBe(true);
  });
  it("saving a job toggles", async () => {
    expect(await store.toggleSaved("u1", "p1")).toBe(true);
    expect(await store.toggleSaved("u1", "p1")).toBe(false);
  });
});

describe("Adzuna search", () => {
  const sample = {
    count: 18432,
    results: [
      { id: 123, title: "React <strong>Developer</strong> Intern", description: "Build UIs &amp; more", created: "2026-10-18T09:00:00Z", redirect_url: "https://www.adzuna.in/land/ad/123", company: { display_name: "Acme" }, location: { display_name: "Bengaluru, Karnataka" }, category: { label: "IT Jobs", tag: "it-jobs" }, salary_min: 300000, salary_max: 450000, salary_is_predicted: "1", contract_time: "full_time" },
      { id: 124, title: "Bad link", redirect_url: "http://insecure.example/x" },
    ],
  };
  let calls: string[] = [];

  beforeAll(() => {
    process.env.ADZUNA_APP_ID = "test-id";
    process.env.ADZUNA_APP_KEY = "test-key";
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(String(url));
      return new Response(JSON.stringify(sample), { status: 200, headers: { "Content-Type": "application/json" } });
    });
  });
  afterAll(() => {
    vi.unstubAllGlobals();
    delete process.env.ADZUNA_APP_ID;
    delete process.env.ADZUNA_APP_KEY;
  });

  it("maps results safely and drops non-https links", async () => {
    const { mapAdzuna } = await import("@/modules/jobs/adzuna");
    const j = mapAdzuna(sample.results[0]!)!;
    expect(j).toMatchObject({ id: "adzuna:123", source: "adzuna", title: "React Developer Intern", company: "Acme", category: "IT", type: "internship", location: "Bengaluru, Karnataka", salary: "3–4.5 LPA (est.)", excerpt: "Build UIs & more" });
    expect(mapAdzuna(sample.results[1]!)).toBeNull();
  });

  it("builds the right query, keeps the key server-side and caches repeats", async () => {
    const { searchAdzuna } = await import("@/modules/jobs/adzuna");
    calls = [];
    const page = await searchAdzuna({ q: "React", where: "Pune", category: "it-jobs", type: "internship", page: 2 });
    expect(page.count).toBe(18432);
    expect(page.jobs).toHaveLength(1);
    const u = new URL(calls[0]!);
    expect(u.pathname).toBe("/v1/api/jobs/in/search/2");
    expect(u.searchParams.get("what")).toBe("react intern");
    expect(u.searchParams.get("where")).toBe("Pune");
    expect(u.searchParams.get("category")).toBe("it-jobs");
    expect(JSON.stringify(page)).not.toContain("test-key");
    await searchAdzuna({ q: "react", where: "Pune", category: "it-jobs", type: "internship", page: 2 });
    expect(calls).toHaveLength(1); // served from cache
    await searchAdzuna({ q: "", where: "India", category: "not-a-real-tag", type: null, page: 1 });
    const u2 = new URL(calls[1]!);
    expect(u2.searchParams.has("where")).toBe(false);
    expect(u2.searchParams.has("category")).toBe(false);
  });
});
