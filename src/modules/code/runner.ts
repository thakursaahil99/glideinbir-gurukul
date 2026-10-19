import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { clipShown, LANG_INFO, MAX_OUTPUT_BYTES, MAX_SHOWN_BYTES } from "./logic";
import type { Lang } from "./types";

/**
 * Executes untrusted code. Two back ends:
 *  - Judge0 CE (JUDGE0_HOST [+ JUDGE0_API_KEY]): all languages, real sandbox. The key never
 *    leaves the server; the browser only talks to our rpc route.
 *  - Local (JavaScript only): a separate Node process under the permission model (no file
 *    access beyond its own script, no child processes or workers), none of the server's env
 *    (on Windows libuv still adds a few system paths like TEMP and USERNAME), time, memory and
 *    output caps. It does NOT block network access, so it's on by default only in development;
 *    production needs CODE_LOCAL_RUNNER=1 to opt in.
 */

export interface RunJob {
  lang: Lang;
  code: string;
  inputs: string[];
  timeLimitMs: number;
  memoryLimitMb: number;
}

export interface RawResult {
  status: "ok" | "tle" | "runtime" | "compile" | "internal";
  stdout: string;
  stderr: string;
  timeMs: number;
}

const judge0Base = () => {
  const h = process.env.JUDGE0_HOST?.trim();
  if (!h) return null;
  return (h.startsWith("http") ? h : `https://${h}`).replace(/\/+$/, "");
};

const localAllowed = () => process.env.CODE_LOCAL_RUNNER === "1" || (process.env.NODE_ENV !== "production" && process.env.CODE_LOCAL_RUNNER !== "0");

export function runnerInfo() {
  if (judge0Base()) return { mode: "judge0" as const, langs: Object.keys(LANG_INFO) as Lang[] };
  if (localAllowed()) return { mode: "local" as const, langs: ["javascript"] as Lang[] };
  return { mode: "none" as const, langs: [] as Lang[] };
}

export async function execute(job: RunJob): Promise<RawResult[]> {
  const info = runnerInfo();
  if (!info.langs.includes(job.lang)) throw new RunnerUnavailable(info.mode === "local" ? `${LANG_INFO[job.lang].label} needs the Judge0 runner. Locally only JavaScript runs.` : "The code runner isn't set up yet (JUDGE0_HOST).");
  return info.mode === "judge0" ? judge0(job) : local(job);
}

export class RunnerUnavailable extends Error {}

/** Accepted runs keep their whole stdout (it's compared); everything else is trimmed for display. */
const clip = clipShown;

/* ---------------- Judge0 ---------------- */

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
const unb64 = (s: string | null | undefined) => (s ? Buffer.from(s, "base64").toString("utf8") : "");

function judge0Headers() {
  const key = process.env.JUDGE0_API_KEY?.trim();
  const base = judge0Base()!;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (key && base.includes("rapidapi")) {
    h["X-RapidAPI-Key"] = key;
    h["X-RapidAPI-Host"] = new URL(base).host;
  } else if (key) h["X-Auth-Token"] = key;
  return h;
}

interface Judge0Status {
  status?: { id: number; description: string };
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  time?: string | null;
}

async function judge0(job: RunJob): Promise<RawResult[]> {
  const base = judge0Base()!;
  const headers = judge0Headers();
  const cpu = Math.max(0.5, job.timeLimitMs / 1000);
  const submissions = job.inputs.map((stdin) => ({
    language_id: LANG_INFO[job.lang].judge0,
    source_code: b64(job.code),
    stdin: b64(stdin),
    cpu_time_limit: cpu,
    wall_time_limit: cpu * 3 + 1,
    // JVMs need headroom over the problem's limit.
    memory_limit: Math.max(32_768, job.memoryLimitMb * 1024 * (job.lang === "java" ? 2 : 1)),
  }));
  const res = await fetch(`${base}/submissions/batch?base64_encoded=true`, { method: "POST", headers, body: JSON.stringify({ submissions }), signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Judge0 responded ${res.status}`);
  const tokens = ((await res.json()) as { token?: string }[]).map((t) => t.token);
  if (tokens.some((t) => !t)) throw new Error("Judge0 refused a submission");

  const deadline = Date.now() + 40_000;
  for (;;) {
    await new Promise((r) => setTimeout(r, 800));
    const poll = await fetch(`${base}/submissions/batch?tokens=${tokens.join(",")}&base64_encoded=true&fields=status,stdout,stderr,compile_output,message,time`, { headers, signal: AbortSignal.timeout(15_000) });
    if (!poll.ok) throw new Error(`Judge0 responded ${poll.status}`);
    const { submissions: subs } = (await poll.json()) as { submissions: Judge0Status[] };
    if (subs.every((s) => (s.status?.id ?? 1) > 2)) return subs.map(fromJudge0);
    if (Date.now() > deadline) throw new Error("Judge0 took too long");
  }
}

function fromJudge0(s: Judge0Status): RawResult {
  const id = s.status?.id ?? 13;
  const timeMs = Math.round(Number(s.time ?? 0) * 1000);
  const stdout = unb64(s.stdout);
  const stderr = clip(unb64(s.stderr) || unb64(s.message));
  if (id === 3 || id === 4) return { status: "ok", stdout, stderr, timeMs };
  if (id === 5) return { status: "tle", stdout, stderr, timeMs };
  if (id === 6) return { status: "compile", stdout: "", stderr: clip(unb64(s.compile_output)), timeMs: 0 };
  if (id >= 7 && id <= 12) return { status: "runtime", stdout, stderr: stderr || s.status?.description || "Runtime error", timeMs };
  return { status: "internal", stdout, stderr: stderr || s.status?.description || "Judge error", timeMs };
}

/* ---------------- Local JavaScript sandbox ---------------- */

const MAX_PARALLEL = 4;
let running = 0;
const waiting: (() => void)[] = [];
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL) await new Promise<void>((r) => waiting.push(r));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

async function local(job: RunJob): Promise<RawResult[]> {
  const dir = path.join(tmpdir(), "gg-code", randomUUID());
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, "main.js");
  await fs.writeFile(file, job.code);
  try {
    return await Promise.all(job.inputs.map((stdin) => slot(() => runNode(file, stdin, job))));
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/** Node's own startup isn't the learner's fault. */
const STARTUP_ALLOWANCE_MS = 400;

function runNode(file: string, stdin: string, job: RunJob): Promise<RawResult> {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.execPath, ["--permission", `--allow-fs-read=${file}`, `--max-old-space-size=${Math.max(16, job.memoryLimitMb)}`, "--disallow-code-generation-from-strings", file], {
      cwd: path.dirname(file),
      env: { SystemRoot: process.env.SystemRoot ?? "", NODE_OPTIONS: "" } as unknown as NodeJS.ProcessEnv,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let out = "";
    let err = "";
    let killedFor: "tle" | "output" | null = null;
    const kill = (why: "tle" | "output") => {
      if (killedFor) return;
      killedFor = why;
      child.kill("SIGKILL");
    };
    const timer = setTimeout(() => kill("tle"), job.timeLimitMs + STARTUP_ALLOWANCE_MS);
    child.stdout.on("data", (d: Buffer) => {
      out += d.toString("utf8");
      if (out.length > MAX_OUTPUT_BYTES) kill("output");
    });
    child.stderr.on("data", (d: Buffer) => {
      if (err.length < MAX_SHOWN_BYTES) err += d.toString("utf8");
    });
    child.stdin.on("error", () => {});
    child.stdin.end(stdin);
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ status: "internal", stdout: "", stderr: e.message, timeMs: 0 });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const timeMs = Math.max(0, Date.now() - started - 60);
      // Hide the temp path from error messages.
      const stderr = clip(err.split(file).join("main.js").split(path.dirname(file)).join("."));
      if (killedFor === "tle") return resolve({ status: "tle", stdout: clip(out), stderr, timeMs: job.timeLimitMs });
      if (killedFor === "output") return resolve({ status: "runtime", stdout: clip(out), stderr: "Output limit exceeded", timeMs });
      if (code === 0) return resolve({ status: "ok", stdout: out, stderr, timeMs });
      if (/SyntaxError/.test(stderr) && !/at .*main\.js:\d+:\d+\)?\n\s+at /.test(stderr)) return resolve({ status: "compile", stdout: "", stderr, timeMs: 0 });
      resolve({ status: "runtime", stdout: clip(out), stderr: stderr || `Exited with code ${code}`, timeMs });
    });
  });
}
