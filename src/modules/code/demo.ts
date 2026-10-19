import { randomUUID } from "node:crypto";
import type { PublicUser } from "@/core/auth/roles";
import { insertProblem, listProblems, nowIso, replaceTests } from "./store";
import type { Difficulty, Lang } from "./types";

/** Deterministic pseudo-random numbers so demo tests are the same on every machine. */
function rng(seed: number) {
  let s = seed >>> 0;
  return (max: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s % max;
  };
}

interface Demo {
  title: string;
  slug: string;
  difficulty: Difficulty;
  tags: string[];
  timeLimitMs: number;
  statement: string;
  starter: Partial<Record<Lang, string>>;
  /** [input, explanation?] — expected output comes from `solve`. */
  samples: [string, string?][];
  hidden: string[];
  solve: (input: string) => string;
}

const nums = (line: string | undefined) => (line ?? "").trim().split(/\s+/).filter(Boolean).map(Number);

const DEMOS: Demo[] = [
  {
    title: "FizzBuzz",
    slug: "fizzbuzz",
    difficulty: "easy",
    tags: ["Basics", "Loops"],
    timeLimitMs: 2000,
    statement: `Print the numbers from **1 to n**, one per line, but:

- print \`Fizz\` instead of multiples of 3,
- \`Buzz\` instead of multiples of 5,
- \`FizzBuzz\` instead of multiples of both.

### Input
One integer \`n\` (1 ≤ n ≤ 10^5).

### Output
\`n\` lines.`,
    starter: {
      javascript: `const n = Number(require("fs").readFileSync(0, "utf8").trim());\nconst out = [];\nfor (let i = 1; i <= n; i++) {\n  // push "Fizz", "Buzz", "FizzBuzz" or the number\n}\nconsole.log(out.join("\\n"));\n`,
      python: `n = int(input())\nfor i in range(1, n + 1):\n    # print Fizz, Buzz, FizzBuzz or i\n    pass\n`,
    },
    samples: [["5"], ["15", "15 is a multiple of both 3 and 5."]],
    hidden: ["1", "3", "30", "100000"],
    solve: (input) => {
      const n = Number(input.trim());
      const out: string[] = [];
      for (let i = 1; i <= n; i++) out.push(i % 15 === 0 ? "FizzBuzz" : i % 3 === 0 ? "Fizz" : i % 5 === 0 ? "Buzz" : String(i));
      return out.join("\n");
    },
  },
  {
    title: "Sum of Digits",
    slug: "sum-of-digits",
    difficulty: "easy",
    tags: ["Math", "Strings"],
    timeLimitMs: 2000,
    statement: `Given a non-negative integer with up to **1000 digits**, print the sum of its digits.

> The number can be far bigger than 64-bit integers, so read it as text.

### Input
One line with the number.

### Output
The sum of its digits.`,
    starter: {
      javascript: `const s = require("fs").readFileSync(0, "utf8").trim();\n\n// Print the sum of the digits of s\n`,
      python: `s = input().strip()\n\n# Print the sum of the digits of s\n`,
    },
    samples: [["12345", "1 + 2 + 3 + 4 + 5 = 15"], ["0"]],
    hidden: ["9", "1000000000000000000", "9".repeat(1000), "1234567890".repeat(100)],
    solve: (input) => String([...input.trim()].reduce((s, c) => s + Number(c), 0)),
  },
  {
    title: "Palindrome Check",
    slug: "palindrome-check",
    difficulty: "easy",
    tags: ["Strings", "Two pointers"],
    timeLimitMs: 2000,
    statement: `A word is a **palindrome** if it reads the same forwards and backwards. For each word, print **YES** or **NO**.

### Input
- Line 1: \`t\`, the number of words
- Next \`t\` lines: one lowercase word each (length 1 to 10^5)

### Output
\`t\` lines, each YES or NO.`,
    starter: {
      javascript: `const lines = require("fs").readFileSync(0, "utf8").split("\\n");\nconst t = Number(lines[0]);\nconst out = [];\nfor (let i = 1; i <= t; i++) {\n  const w = lines[i].trim();\n  // push "YES" or "NO"\n}\nconsole.log(out.join("\\n"));\n`,
    },
    samples: [["3\nlevel\ngurukul\nmadam"]],
    hidden: ["1\na", "2\nab\naa", `1\n${"ab".repeat(25_000)}${"ba".repeat(25_000)}`, `1\n${"x".repeat(49_999)}y`],
    solve: (input) => {
      const lines = input.split("\n");
      const t = Number(lines[0]);
      return Array.from({ length: t }, (_, i) => {
        const w = (lines[i + 1] ?? "").trim();
        return w === [...w].reverse().join("") ? "YES" : "NO";
      }).join("\n");
    },
  },
  {
    title: "Second Largest Number",
    slug: "second-largest-number",
    difficulty: "easy",
    tags: ["Arrays"],
    timeLimitMs: 2000,
    statement: `Print the **second largest distinct** value in the array, or \`NONE\` if there isn't one (all values equal).

### Input
- Line 1: \`n\` (1 ≤ n ≤ 10^5)
- Line 2: \`n\` integers (|a[i]| ≤ 10^9)

### Output
The second largest distinct value, or NONE.`,
    starter: {},
    samples: [["5\n4 9 2 9 7", "The largest is 9; the next distinct value is 7."], ["3\n5 5 5"]],
    hidden: (() => {
      const r = rng(5);
      return ["1\n42", "2\n-3 -7", "4\n1000000000 -1000000000 0 1000000000", `100000\n${Array.from({ length: 100_000 }, () => r(2_000_000_001) - 1_000_000_000).join(" ")}`];
    })(),
    solve: (input) => {
      const a = nums(input.split("\n")[1]);
      let top = -Infinity;
      for (const x of a) if (x > top) top = x;
      let second = -Infinity;
      for (const x of a) if (x < top && x > second) second = x;
      return second === -Infinity ? "NONE" : String(second);
    },
  },
  {
    title: "Pair With Target Sum",
    slug: "pair-with-target-sum",
    difficulty: "easy",
    tags: ["Arrays", "Hash map"],
    timeLimitMs: 2000,
    statement: `Given an array of **n** integers and a number **target**, find two different positions \`i < j\` such that \`a[i] + a[j] = target\`.

Exactly one such pair exists. Print \`i j\` (0-based).

### Input
- Line 1: \`n\` and \`target\`
- Line 2: \`n\` integers

### Output
Two integers \`i j\`.

### Constraints
- 2 ≤ n ≤ 10^5
- -10^9 ≤ a[i], target ≤ 10^9`,
    starter: {
      javascript: `const [first, second] = require("fs").readFileSync(0, "utf8").trim().split("\\n");\nconst [n, target] = first.split(" ").map(Number);\nconst a = second.split(" ").map(Number);\n\n// Print i and j\n`,
      python: `import sys\n\ndata = sys.stdin.read().split("\\n")\nn, target = map(int, data[0].split())\na = list(map(int, data[1].split()))\n\n# Print i and j\n`,
    },
    samples: [["4 9\n2 7 11 15", "a[0] + a[1] = 2 + 7 = 9"], ["3 6\n3 2 4"]],
    hidden: (() => {
      const r = rng(7);
      const out = ["2 0\n-5 5", "5 -3\n1 -1 -2 8 4"];
      const n = 100_000;
      // All odd and ≥ 7, so no two of them can sum to 6: the 2 + 4 pair is the only answer.
      const a = Array.from({ length: n }, () => 2 * r(1_000_000) + 7);
      a[n - 2] = 2;
      a[n - 1] = 4; // the only even pair
      out.push(`${n} 6\n${a.join(" ")}`);
      return out;
    })(),
    solve: (input) => {
      const [first, second] = input.split("\n");
      const target = nums(first)[1]!;
      const a = nums(second);
      const seen = new Map<number, number>();
      for (let j = 0; j < a.length; j++) {
        const i = seen.get(target - a[j]!);
        if (i !== undefined) return `${i} ${j}`;
        if (!seen.has(a[j]!)) seen.set(a[j]!, j);
      }
      return "";
    },
  },
  {
    title: "Reverse the Words",
    slug: "reverse-the-words",
    difficulty: "easy",
    tags: ["Strings"],
    timeLimitMs: 2000,
    statement: `A sentence has words separated by one or more spaces. Print the words in **reverse order**, separated by a single space.

### Input
One line with the sentence (at least one word).

### Output
The words in reverse order.`,
    starter: {
      javascript: `const line = require("fs").readFileSync(0, "utf8").replace(/\\r?\\n$/, "");\n\n// Print the reversed sentence\n`,
      python: `import sys\n\nline = sys.stdin.readline().rstrip("\\n")\n\n# Print the reversed sentence\n`,
    },
    samples: [["learn soar grow"], ["  hello   world  ", "Extra spaces disappear."]],
    hidden: ["single", "a b c d e f g", Array.from({ length: 5000 }, (_, i) => `w${i}`).join("   ")],
    solve: (input) => input.trim().split(/\s+/).reverse().join(" "),
  },
  {
    title: "Balanced Brackets",
    slug: "balanced-brackets",
    difficulty: "easy",
    tags: ["Stack", "Strings"],
    timeLimitMs: 2000,
    statement: `For each string of brackets \`()[]{}\`, print **YES** if it is balanced and **NO** otherwise.

### Input
- Line 1: \`t\`, the number of strings
- Next \`t\` lines: one string each (length 1 to 10^5)

### Output
\`t\` lines, each YES or NO.`,
    starter: {
      javascript: `const lines = require("fs").readFileSync(0, "utf8").split("\\n");\nconst t = Number(lines[0]);\nconst out = [];\nfor (let i = 1; i <= t; i++) {\n  const s = lines[i].trim();\n  // decide YES / NO\n}\nconsole.log(out.join("\\n"));\n`,
    },
    samples: [["3\n()[]{}\n([)]\n{[()()]}"]],
    hidden: ["2\n(\n)", "1\n" + "(".repeat(50_000) + ")".repeat(50_000), "4\n{}\n{[}]\n(((\n[()]{}"],
    solve: (input) => {
      const lines = input.split("\n");
      const t = Number(lines[0]);
      const pair: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
      const out: string[] = [];
      for (let i = 1; i <= t; i++) {
        const st: string[] = [];
        let ok = true;
        for (const c of (lines[i] ?? "").trim()) {
          if ("([{".includes(c)) st.push(c);
          else if (st.pop() !== pair[c]) {
            ok = false;
            break;
          }
        }
        out.push(ok && st.length === 0 ? "YES" : "NO");
      }
      return out.join("\n");
    },
  },
  {
    title: "Maximum Subarray Sum",
    slug: "maximum-subarray-sum",
    difficulty: "medium",
    tags: ["Dynamic programming", "Arrays"],
    timeLimitMs: 2000,
    statement: `Find the largest sum of a **non-empty contiguous** subarray.

### Input
- Line 1: \`n\`
- Line 2: \`n\` integers

### Output
The maximum subarray sum.

### Constraints
- 1 ≤ n ≤ 10^5
- -10^4 ≤ a[i] ≤ 10^4

> Tip: an O(n²) solution won't pass the large hidden test.`,
    starter: {},
    samples: [["9\n-2 1 -3 4 -1 2 1 -5 4", "The subarray 4 -1 2 1 has the largest sum, 6."], ["3\n-3 -1 -2"]],
    hidden: (() => {
      const r = rng(42);
      return ["1\n5", "5\n-1 -2 -3 -4 -5", `100000\n${Array.from({ length: 100_000 }, () => r(20_001) - 10_000).join(" ")}`];
    })(),
    solve: (input) => {
      const a = nums(input.split("\n")[1]);
      let best = -Infinity;
      let cur = 0;
      for (const x of a) {
        cur = Math.max(x, cur + x);
        best = Math.max(best, cur);
      }
      return String(best);
    },
  },
  {
    title: "Count the Islands",
    slug: "count-the-islands",
    difficulty: "medium",
    tags: ["Graphs", "BFS"],
    timeLimitMs: 2000,
    statement: `A map has \`r\` rows and \`c\` columns of \`#\` (land) and \`.\` (water). Land cells touching **up, down, left or right** form one island. Count the islands.

### Input
- Line 1: \`r c\`
- Next \`r\` lines: the map

### Output
The number of islands.

### Constraints
- 1 ≤ r, c ≤ 500`,
    starter: {},
    samples: [["4 5\n##..#\n#...#\n..#..\n.....", "Three islands: top-left, right edge, and the middle cell."]],
    hidden: (() => {
      const r = rng(99);
      const big = Array.from({ length: 500 }, () => Array.from({ length: 500 }, () => (r(100) < 45 ? "#" : ".")).join("")).join("\n");
      return ["1 1\n.", "1 1\n#", "3 3\n#.#\n.#.\n#.#", `500 500\n${big}`];
    })(),
    solve: (input) => {
      const lines = input.split("\n");
      const [R, C] = nums(lines[0]) as [number, number];
      const g = lines.slice(1, R + 1).map((l) => l.split(""));
      let count = 0;
      const stack: number[] = [];
      for (let i = 0; i < R; i++)
        for (let j = 0; j < C; j++) {
          if (g[i]![j] !== "#") continue;
          count++;
          g[i]![j] = ".";
          stack.push(i * C + j);
          while (stack.length) {
            const v = stack.pop()!;
            const y = Math.floor(v / C);
            const x = v % C;
            for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
              const ny = y + dy;
              const nx = x + dx;
              if (ny >= 0 && ny < R && nx >= 0 && nx < C && g[ny]![nx] === "#") {
                g[ny]![nx] = ".";
                stack.push(ny * C + nx);
              }
            }
          }
        }
      return String(count);
    },
  },
  {
    title: "Longest Increasing Subsequence",
    slug: "longest-increasing-subsequence",
    difficulty: "hard",
    tags: ["Dynamic programming", "Binary search"],
    timeLimitMs: 2000,
    statement: `Find the length of the longest **strictly increasing** subsequence (not necessarily contiguous).

### Input
- Line 1: \`n\`
- Line 2: \`n\` integers

### Output
The length of the LIS.

### Constraints
- 1 ≤ n ≤ 10^5
- |a[i]| ≤ 10^6

> The big hidden test needs O(n log n).`,
    starter: {},
    samples: [["8\n10 9 2 5 3 7 101 18", "One LIS is 2 3 7 101."], ["4\n7 7 7 7"]],
    hidden: (() => {
      const r = rng(2024);
      return ["1\n-4", "6\n1 2 3 4 5 6", "6\n6 5 4 3 2 1", `100000\n${Array.from({ length: 100_000 }, () => r(2_000_001) - 1_000_000).join(" ")}`];
    })(),
    solve: (input) => {
      const a = nums(input.split("\n")[1]);
      const tails: number[] = [];
      for (const x of a) {
        let lo = 0;
        let hi = tails.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (tails[mid]! < x) lo = mid + 1;
          else hi = mid;
        }
        tails[lo] = x;
      }
      return String(tails.length);
    },
  },
];

/** Adds the demo problems (idempotent by slug), authored by the admin. */
export async function loadDemoProblems(admin: PublicUser) {
  const existing = new Set((await listProblems()).map((p) => p.slug));
  let added = 0;
  for (const d of DEMOS) {
    if (existing.has(d.slug)) continue;
    const id = randomUUID();
    const now = nowIso();
    await insertProblem({ id, slug: d.slug, title: d.title, statement: d.statement, difficulty: d.difficulty, tags: d.tags, starter: d.starter, timeLimitMs: d.timeLimitMs, memoryLimitMb: 256, status: "published", authorId: admin.id, authorName: admin.name, createdAt: now, updatedAt: now });
    await replaceTests(id, [
      ...d.samples.map(([input, explanation]) => ({ id: randomUUID(), problemId: id, input, output: d.solve(input), sample: true, explanation })),
      ...d.hidden.map((input) => ({ id: randomUUID(), problemId: id, input, output: d.solve(input), sample: false })),
    ]);
    added++;
  }
  return added;
}

/** Exposed for tests: the reference solutions. */
export const DEMO_SOLVERS = Object.fromEntries(DEMOS.map((d) => [d.slug, d.solve]));
