import { describe, expect, it } from "vitest";
import { DEMO_SOLVERS } from "@/modules/code/demo";
import { bumpStreak, liveStreak, normalize, outputsMatch, overall, slugify } from "@/modules/code/logic";
import { execute, runnerInfo } from "@/modules/code/runner";

const NOW = Date.UTC(2026, 9, 19, 10, 0, 0); // 19 Oct 2026, 15:30 IST
const DAY = 86_400_000;

describe("output comparison", () => {
  it("ignores trailing spaces, CRLF and trailing blank lines only", () => {
    expect(normalize("1 2  \r\n3\n\n\n")).toBe("1 2\n3");
    expect(outputsMatch("YES\nNO\n", "YES\r\nNO")).toBe(true);
    expect(outputsMatch("1  2", "1 2")).toBe(false);
    expect(outputsMatch("\n5", "5")).toBe(false);
  });
  it("overall verdict is the first failure", () => {
    expect(overall([{ verdict: "accepted" }, { verdict: "accepted" }])).toEqual({ verdict: "accepted", passed: 2, firstFail: -1 });
    expect(overall([{ verdict: "accepted" }, { verdict: "time_limit" }, { verdict: "wrong_answer" }])).toEqual({ verdict: "time_limit", passed: 1, firstFail: 1 });
  });
  it("slugs are URL-safe", () => {
    expect(slugify("Two Sum: Indices!")).toBe("two-sum-indices");
    expect(slugify("!!!")).toBe("problem");
  });
});

describe("daily streak (IST)", () => {
  it("counts consecutive days, resets after a gap, keeps the best", () => {
    let s = bumpStreak(null, "u", NOW);
    expect(s).toMatchObject({ current: 1, best: 1 });
    s = bumpStreak(s, "u", NOW + 2 * 3600_000); // same day
    expect(s.current).toBe(1);
    s = bumpStreak(s, "u", NOW + DAY);
    s = bumpStreak(s, "u", NOW + 2 * DAY);
    expect(s).toMatchObject({ current: 3, best: 3 });
    s = bumpStreak(s, "u", NOW + 5 * DAY);
    expect(s).toMatchObject({ current: 1, best: 3 });
    expect(s.days).toHaveLength(4);
  });
  it("uses the Indian day boundary, not UTC", () => {
    const lateNight = Date.UTC(2026, 9, 19, 18, 45); // 00:15 IST on the 20th
    const s = bumpStreak(bumpStreak(null, "u", NOW), "u", lateNight);
    expect(s.current).toBe(2);
  });
  it("shows 0 once a day is missed", () => {
    const s = bumpStreak(null, "u", NOW);
    expect(liveStreak(s, NOW + DAY)).toBe(1);
    expect(liveStreak(s, NOW + 2 * DAY)).toBe(0);
  });
});

describe("demo problems", () => {
  it("reference solutions answer the samples", () => {
    expect(DEMO_SOLVERS["pair-with-target-sum"]!("4 9\n2 7 11 15")).toBe("0 1");
    expect(DEMO_SOLVERS["reverse-the-words"]!("  hello   world  ")).toBe("world hello");
    expect(DEMO_SOLVERS["balanced-brackets"]!("3\n()[]{}\n([)]\n{[()()]}")).toBe("YES\nNO\nYES");
    expect(DEMO_SOLVERS["maximum-subarray-sum"]!("9\n-2 1 -3 4 -1 2 1 -5 4")).toBe("6");
    expect(DEMO_SOLVERS["count-the-islands"]!("4 5\n##..#\n#...#\n..#..\n.....")).toBe("3");
    expect(DEMO_SOLVERS["longest-increasing-subsequence"]!("8\n10 9 2 5 3 7 101 18")).toBe("4");
    expect(DEMO_SOLVERS["fizzbuzz"]!("15").split("\n").slice(-1)[0]).toBe("FizzBuzz");
    expect(DEMO_SOLVERS["sum-of-digits"]!("12345")).toBe("15");
    expect(DEMO_SOLVERS["palindrome-check"]!("3\nlevel\ngurukul\nmadam")).toBe("YES\nNO\nYES");
    expect(DEMO_SOLVERS["second-largest-number"]!("3\n5 5 5")).toBe("NONE");
    expect(DEMO_SOLVERS["second-largest-number"]!("5\n4 9 2 9 7")).toBe("7");
  });
});

describe("local JavaScript runner", () => {
  const job = (code: string, inputs: string[], timeLimitMs = 1500) => execute({ lang: "javascript", code, inputs, timeLimitMs, memoryLimitMb: 128 });

  it("is the local mode in tests and only runs JavaScript", async () => {
    expect(runnerInfo()).toEqual({ mode: "local", langs: ["javascript"] });
    await expect(execute({ lang: "python", code: "print(1)", inputs: [""], timeLimitMs: 1000, memoryLimitMb: 64 })).rejects.toThrow(/Judge0/);
  });

  it("reads stdin and prints, one process per test", async () => {
    const res = await job(`const [a, b] = require("fs").readFileSync(0, "utf8").trim().split(" ").map(Number); console.log(a + b);`, ["2 3", "10 -4"]);
    expect(res.map((r) => [r.status, r.stdout.trim()])).toEqual([
      ["ok", "5"],
      ["ok", "6"],
    ]);
  });

  it("reports runtime errors, syntax errors and time limits", async () => {
    const [rte] = await job(`null.x;`, [""]);
    expect(rte!.status).toBe("runtime");
    expect(rte!.stderr).toMatch(/TypeError/);
    expect(rte!.stderr).not.toMatch(/gg-code/); // temp path hidden
    const [ce] = await job(`let = ;`, [""]);
    expect(ce!.status).toBe("compile");
    const [tle] = await job(`while (true) {}`, [""], 500);
    expect(tle!.status).toBe("tle");
  }, 20_000);

  it("sandbox: no file access, no child processes, no eval, no app secrets", async () => {
    process.env.GG_TEST_SECRET = "top-secret";
    const [r] = await job(
      `const out = [];
for (const [n, f] of [["read", () => require("fs").readFileSync(process.execPath)], ["write", () => require("fs").writeFileSync("x.txt", "1")], ["spawn", () => require("child_process").execSync("echo hi")], ["eval", () => eval("1+1")]]) {
  try { f(); out.push(n + ":allowed"); } catch (e) { out.push(n + ":blocked"); }
}
out.push("secret:" + (process.env.GG_TEST_SECRET ?? "none"));
console.log(out.join(" "));`,
      [""],
    );
    expect(r!.status).toBe("ok");
    expect(r!.stdout.trim()).toBe("read:blocked write:blocked spawn:blocked eval:blocked secret:none");
    delete process.env.GG_TEST_SECRET;
  }, 20_000);

  it("keeps big but legitimate output whole (FizzBuzz 100000 ≈ 600 KB)", async () => {
    const [r] = await job(`const n = 100000, out = []; for (let i = 1; i <= n; i++) out.push(i % 15 === 0 ? "FizzBuzz" : i % 3 === 0 ? "Fizz" : i % 5 === 0 ? "Buzz" : i); console.log(out.join("\\n"));`, [""], 3000);
    expect(r!.status).toBe("ok");
    expect(r!.stdout.length).toBeGreaterThan(500_000);
    expect(r!.stdout.trim().endsWith("Buzz")).toBe(true);
  }, 20_000);

  it("caps runaway output", async () => {
    const [r] = await job(`const s = "x".repeat(1000); for (;;) console.log(s);`, [""], 3000);
    expect(r!.status === "runtime" || r!.status === "tle").toBe(true);
    expect(r!.stdout.length).toBeLessThan(80_000);
  }, 20_000);
});
