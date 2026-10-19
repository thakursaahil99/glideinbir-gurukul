import {
  BookOpen,
  BriefcaseBusiness,
  CalendarClock,
  Code2,
  NotebookPen,
  Timer,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ModuleConfig, ModuleKey } from "@/core/site/schema";

export type { ModuleKey } from "@/core/site/schema";

export interface ModuleDef extends ModuleConfig {
  href: `/${string}`;
  icon: LucideIcon;
}

/** Code-owned parts of each module: route and icon. Everything else is admin-editable. */
const STATIC: Record<ModuleKey, { href: `/${string}`; icon: LucideIcon }> = {
  courses: { href: "/courses", icon: BookOpen },
  tests: { href: "/tests", icon: Timer },
  notes: { href: "/notes", icon: NotebookPen },
  doubts: { href: "/doubts", icon: Zap },
  mentorship: { href: "/mentorship", icon: CalendarClock },
  code: { href: "/code", icon: Code2 },
  jobs: { href: "/jobs", icon: BriefcaseBusiness },
};

/**
 * Default content for the seven modules. Live values come from the admin panel
 * (site.modules); order of the array is the display order everywhere.
 * Modules never import each other; they only use /core.
 */
export const DEFAULT_MODULES: ModuleConfig[] = [
  {
    key: "courses",
    name: "Courses",
    tagline: "Watch, practise, get certified",
    description: "Video courses with resume-where-you-left, progress tracking and verifiable certificates.",
    style: "Udemy style",
    colors: ["#ff8a00", "#ff4d6d"],
    enabled: true,
    phase: 2,
    features: ["Sections & lectures", "Resume playback", "Progress %", "PDF certificates", "Reviews"],
  },
  {
    key: "tests",
    name: "Test Series",
    tagline: "Mock tests with real ranks",
    description: "Timed tests, negative marking, server-side evaluation, rank, percentile and topic analysis.",
    style: "Testbook style",
    colors: ["#5b47ff", "#00c2ff"],
    enabled: true,
    phase: 3,
    features: ["Server timer", "Question palette", "Auto submit", "Rank & percentile", "Solutions"],
  },
  {
    key: "notes",
    name: "Notes Marketplace",
    tagline: "Toppers' notes, secure downloads",
    description: "Multi-vendor PDF notes with free preview pages, signed-URL downloads and vendor payouts.",
    style: "Marketplace",
    colors: ["#00b89c", "#7ddc5a"],
    enabled: true,
    phase: 6,
    features: ["Vendor onboarding", "Preview pages", "Signed downloads", "Payouts"],
  },
  {
    key: "doubts",
    name: "Instant Doubts",
    tagline: "A tutor in under a minute",
    description: "Post a doubt, the first online tutor accepts, then chat and video live. Pay per session.",
    style: "Uber style",
    colors: ["#ffb800", "#ff5e3a"],
    enabled: true,
    phase: 4,
    features: ["Realtime matching", "Live video", "Per-minute billing", "Ratings"],
  },
  {
    key: "mentorship",
    name: "Mentorship",
    tagline: "Book 1-on-1 with mentors",
    description: "Pick a slot in IST, pay, and join the call. No double bookings, reminders included.",
    style: "Calendly style",
    colors: ["#c04dff", "#ff4da6"],
    enabled: true,
    phase: 5,
    features: ["Weekly availability", "IST slots", "Reminders", "Refund rules"],
  },
  {
    key: "code",
    name: "Coding Practice",
    tagline: "Solve, submit, climb",
    description: "Monaco editor, five languages, hidden test cases, verdicts, streaks and a leaderboard.",
    style: "LeetCode style",
    colors: ["#2ee6c5", "#5b47ff"],
    enabled: true,
    phase: 7,
    features: ["Monaco editor", "Run & submit", "Verdicts", "Streaks", "Leaderboard"],
  },
  {
    key: "jobs",
    name: "Jobs & Internships",
    tagline: "From learner to hired",
    description: "One-click apply, skill match score, recruiter pipelines and job alerts.",
    style: "Naukri style",
    colors: ["#3d8bff", "#2ee6c5"],
    enabled: true,
    phase: 8,
    features: ["Skill match", "One-click apply", "Pipeline", "Alerts"],
  },
];

export const resolveModules = (configs: ModuleConfig[]): ModuleDef[] =>
  configs.map((c) => ({ ...c, ...STATIC[c.key] }));

export const moduleIcon = (key: ModuleKey) => STATIC[key].icon;
