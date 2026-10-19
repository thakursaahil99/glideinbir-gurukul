import { DEFAULT_MODULES } from "@/core/module-registry";
import type { SiteContent } from "./schema";

/** Shipped content. The admin panel overrides any section; reset restores these. */
export const DEFAULT_SITE: SiteContent = {
  brand: {
    name: "Glideinbir Gurukul",
    footerBlurb: "A modern gurukul for the internet generation. Learn. Soar. Grow.",
    madeIn: "Made with care in India 🇮🇳",
    announcement: { enabled: false, text: "Admissions open for the new batch!", href: "/signup" },
  },
  hero: {
    badgeTag: "NEW",
    badge: "7 learning worlds · 1 login · 1 wallet",
    words: ["Learn.", "Soar.", "Grow."],
    intro:
      "**Glideinbir Gurukul** is your modern gurukul: courses, mock tests, toppers' notes, instant doubt solving, mentors, coding practice and jobs, all under one sky.",
    primaryCta: "Start learning free",
    secondaryCta: "Explore modules",
    footnote: "Free to start. Built for **JEE, NEET, UPSC, coding** & more.",
  },
  marquee: {
    rowA: ["JEE", "NEET", "UPSC", "SSC", "GATE", "CAT", "Banking", "Class 10", "Class 12", "CUET"],
    rowB: ["DSA", "Web Dev", "Python", "Java", "System Design", "Placements", "Interviews", "Internships", "Aptitude"],
  },
  modulesSection: {
    eyebrow: "Seven worlds, one gurukul",
    title: "Everything a learner needs, under one sky.",
    sub: "Each module runs on its own, yet shares one login, one wallet and one profile. Switch from a mock test to a mentor call without missing a beat.",
  },
  stats: [
    { value: 7, prefix: "", suffix: "", label: "learning modules" },
    { value: 1, prefix: "", suffix: "", label: "login and wallet for all" },
    { value: 60, prefix: "<", suffix: "s", label: "target doubt-match time" },
    { value: 5, prefix: "", suffix: "", label: "coding languages" },
  ],
  journey: {
    eyebrow: "The flight path",
    title: "From first login to first offer.",
    sub: "Glideinbir is built like a flight: take off, learn the winds, soar through practice and grow into your career.",
    quote: "विद्या ददाति विनयम्",
    quoteMeaning: "Knowledge gives humility.",
    steps: [
      {
        kicker: "Take off",
        title: "One sign-up. One wallet.",
        body: "Create your profile once. Your wallet works across every module, so a recharge pays for a course, a test or a tutor.",
      },
      {
        kicker: "Learn",
        title: "Build roots with courses and notes.",
        body: "Structured video courses with progress tracking, plus toppers' notes with free preview pages before you buy.",
      },
      {
        kicker: "Soar",
        title: "Test yourself, get unstuck fast.",
        body: "Timed mock tests with real ranks, a live tutor for any doubt in about a minute, and coding problems with instant verdicts.",
      },
      {
        kicker: "Grow",
        title: "Find mentors, then land the role.",
        body: "Book 1-on-1 time with mentors, then apply to jobs and internships matched to the skills you've proven.",
      },
    ],
  },
  personas: {
    eyebrow: "Made for every role",
    title: "Whoever you are, there's a sky for you.",
    sub: "One account can hold many roles. Learn in the morning, tutor in the evening.",
    roles: [
      { role: "Students", line: "Learn anything, test everything.", perks: ["Courses & certificates", "Mock tests with ranks", "Instant doubt help", "Jobs matched to skills"] },
      { role: "Tutors", line: "Go online, solve doubts, earn.", perks: ["Realtime doubt requests", "Live video sessions", "Per-minute earnings", "Ratings that build trust"] },
      { role: "Instructors", line: "Teach once, reach thousands.", perks: ["Course builder", "Test series creator", "CSV question import", "Earnings dashboard"] },
      { role: "Mentors", line: "Share your journey, 1-on-1.", perks: ["Weekly availability", "Paid slots in IST", "Auto reminders", "Session feedback"] },
      { role: "Note sellers", line: "Turn great notes into income.", perks: ["Upload PDF notes", "Free preview pages", "Secure downloads", "Payout requests"] },
      { role: "Recruiters", line: "Hire from proven learners.", perks: ["Post jobs & internships", "Skill match scores", "Hiring pipeline", "Company profile"] },
    ],
  },
  cta: {
    kicker: "उड़ान भरो",
    title: "Ready to spread",
    highlight: "your wings?",
    body: "Join Glideinbir Gurukul free. Pick a module, top up your wallet only when you need to, and start your flight today.",
    primary: "Create free account",
    secondary: "Peek at the dashboard",
  },
  dashboard: { greetingName: "learner", tagline: "Where will you fly today?" },
  modules: DEFAULT_MODULES,
};
