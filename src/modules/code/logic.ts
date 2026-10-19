import type { CaseResult, Difficulty, Lang, Streak, Verdict } from "./types";

export const LANG_INFO: Record<Lang, { label: string; monaco: string; judge0: number }> = {
  javascript: { label: "JavaScript", monaco: "javascript", judge0: 63 },
  python: { label: "Python 3", monaco: "python", judge0: 71 },
  cpp: { label: "C++ 17", monaco: "cpp", judge0: 54 },
  java: { label: "Java", monaco: "java", judge0: 62 },
  php: { label: "PHP", monaco: "php", judge0: 68 },
};

/** Read-all-input templates used when a problem has no starter for a language. */
export const DEFAULT_STARTER: Record<Lang, string> = {
  javascript: `const lines = require("fs").readFileSync(0, "utf8").trim().split("\\n");\n\n// Your code here\nconsole.log(lines[0]);\n`,
  python: `import sys\n\nlines = sys.stdin.read().strip().split("\\n")\n\n# Your code here\nprint(lines[0])\n`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    // Your code here\n    return 0;\n}\n`,
  java: `import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        // Your code here\n    }\n}\n`,
  php: `<?php\n$lines = explode("\\n", trim(stream_get_contents(STDIN)));\n\n// Your code here\necho $lines[0], PHP_EOL;\n`,
};

export const MAX_CODE_BYTES = 64 * 1024;
/** Custom input on Run. */
export const MAX_INPUT_BYTES = 64 * 1024;
/** One stored test case (input or expected output). */
export const MAX_TEST_BYTES = 1_000_000;
/** A program may print this much (big tests have big answers); more is an error. */
export const MAX_OUTPUT_BYTES = 4_000_000;
/** What we keep for display (consoles, stored failures). */
export const MAX_SHOWN_BYTES = 64 * 1024;

export const clipShown = (s: string) => (s.length > MAX_SHOWN_BYTES ? `${s.slice(0, MAX_SHOWN_BYTES)}
… (output truncated)` : s);

/** Trailing spaces on each line and trailing blank lines never decide a verdict. */
export const normalize = (s: string) =>
  s
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");

export const outputsMatch = (got: string, expected: string) => normalize(got) === normalize(expected);

/** Overall verdict = the first non-accepted test's verdict (tests run in order). */
export function overall(results: Pick<CaseResult, "verdict">[]): { verdict: Verdict; passed: number; firstFail: number } {
  const firstFail = results.findIndex((r) => r.verdict !== "accepted");
  return { verdict: firstFail < 0 ? "accepted" : results[firstFail]!.verdict, passed: results.filter((r) => r.verdict === "accepted").length, firstFail };
}

export const VERDICT_INFO: Record<Verdict, { label: string; short: string; tone: "good" | "bad" | "warn" }> = {
  accepted: { label: "Accepted", short: "AC", tone: "good" },
  wrong_answer: { label: "Wrong Answer", short: "WA", tone: "bad" },
  time_limit: { label: "Time Limit Exceeded", short: "TLE", tone: "warn" },
  runtime_error: { label: "Runtime Error", short: "RE", tone: "bad" },
  compile_error: { label: "Compile Error", short: "CE", tone: "warn" },
  internal_error: { label: "Judge Error", short: "IE", tone: "warn" },
};

export const POINTS: Record<Difficulty, number> = { easy: 10, medium: 25, hard: 50 };

/** India has no DST: IST is always UTC+05:30. */
export const istDate = (ms: number) => new Date(ms + 330 * 60_000).toISOString().slice(0, 10);
const dayBefore = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/**
 * Daily streak after an accepted submission at `now`: same day keeps it, the next day
 * extends it, a gap restarts it at 1.
 */
export function bumpStreak(s: Streak | null, userId: string, now: number): Streak {
  const today = istDate(now);
  if (!s) return { userId, current: 1, best: 1, lastDay: today, days: [today] };
  if (s.lastDay === today) return s;
  const current = s.lastDay === dayBefore(today) ? s.current + 1 : 1;
  return { userId, current, best: Math.max(s.best, current), lastDay: today, days: [...s.days, today].slice(-120) };
}

/** A streak that missed yesterday shows as 0 until the next accepted submission. */
export function liveStreak(s: Streak | null, now: number) {
  if (!s) return 0;
  const today = istDate(now);
  return s.lastDay === today || s.lastDay === dayBefore(today) ? s.current : 0;
}

export const slugify = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60) || "problem";
