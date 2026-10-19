import { randomUUID } from "node:crypto";
import type { Course, Lecture, Section } from "./types";

/**
 * Sample courses for an empty catalog. Videos are short public test clips
 * (Blender open movies via test-videos.co.uk, CC-BY; MDN's CC0 flower clip),
 * so everything plays without uploads. Flagged `demo`, shown with a Demo badge.
 */
const TV = "https://test-videos.co.uk/vids";
const CLIPS = {
  blazes: { src: `${TV}/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4`, sec: 10 },
  escapes: { src: `${TV}/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4`, sec: 10 },
  joyrides: { src: `${TV}/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4`, sec: 10 },
  meltdowns: { src: `${TV}/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4`, sec: 10 },
  fun: { src: `${TV}/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4`, sec: 10 },
  flower: { src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", sec: 5 },
};

const lec = (title: string, clip: keyof typeof CLIPS, preview = false): Lecture => ({
  id: randomUUID(),
  title,
  durationSec: CLIPS[clip].sec,
  video: { kind: "url", src: CLIPS[clip].src },
  notes: null,
  preview,
});
const sec = (title: string, lectures: Lecture[]): Section => ({ id: randomUUID(), title, lectures });

type DemoSeed = Pick<Course, "slug" | "title" | "subtitle" | "description" | "category" | "level" | "language" | "price" | "colors" | "outcomes" | "sections">;

function seeds(): DemoSeed[] {
  return [
    {
      slug: "demo-physics-foundations",
      title: "Physics Foundations for JEE (Demo)",
      subtitle: "Kinematics, vectors and Newton's laws, built from first principles.",
      description:
        "A demo course that shows how a full Glideinbir course works: sections, free previews, resume-where-you-left-off, progress tracking and a certificate at 100%. The videos are short sample clips.",
      category: "Engineering (JEE)",
      level: "beginner",
      language: "Hinglish",
      price: 49_900,
      colors: ["#ff8a00", "#ff4d6d"],
      outcomes: ["Break any motion into vector components", "Solve projectile problems quickly", "Apply Newton's laws with free-body diagrams"],
      sections: [
        sec("Motion in a straight line", [lec("Welcome and how to use this course", "flower", true), lec("Displacement vs distance", "blazes"), lec("Graphs of motion", "escapes")]),
        sec("Vectors and projectiles", [lec("Vector components", "joyrides"), lec("Projectile motion", "meltdowns")]),
        sec("Newton's laws", [lec("Free-body diagrams", "fun")]),
      ],
    },
    {
      slug: "demo-python-zero-to-hero",
      title: "Python: Zero to Hero (Demo)",
      subtitle: "Start coding today. Variables to functions in one weekend.",
      description:
        "A free demo course. Learn the basics of Python step by step, then take the progress all the way to 100% to see the certificate flow. The videos are short sample clips.",
      category: "Programming",
      level: "beginner",
      language: "English",
      price: 0,
      colors: ["#2ee6c5", "#5b47ff"],
      outcomes: ["Write and run Python scripts", "Use lists, loops and functions", "Read and fix simple errors"],
      sections: [
        sec("First steps", [lec("Installing Python", "flower", true), lec("Variables and types", "blazes")]),
        sec("Control flow", [lec("If, else and loops", "escapes")]),
      ],
    },
    {
      slug: "demo-neet-biology-crash-course",
      title: "NEET Biology Crash Course (Demo)",
      subtitle: "High-yield cell biology and genetics, revised fast.",
      description:
        "A paid demo course for testing purchases with the wallet or Razorpay. Includes a free preview lecture so you can try before you buy. The videos are short sample clips.",
      category: "Medical (NEET)",
      level: "intermediate",
      language: "Hinglish",
      price: 99_900,
      colors: ["#c04dff", "#ff4da6"],
      outcomes: ["Revise cell structure in record time", "Crack Mendelian genetics questions", "Avoid the most common NEET traps"],
      sections: [
        sec("Cell biology", [lec("Cell organelles at a glance", "joyrides", true), lec("Cell division", "meltdowns")]),
        sec("Genetics", [lec("Mendel's laws", "fun"), lec("Pedigree analysis", "escapes")]),
      ],
    },
  ];
}

export function demoCourses(instructorId: string, takenSlugs: Set<string>): Course[] {
  const now = new Date().toISOString();
  return seeds()
    .filter((s) => !takenSlugs.has(s.slug))
    .map((s) => ({ ...s, id: randomUUID(), instructorId, status: "published", demo: true, createdAt: now, updatedAt: now, publishedAt: now }));
}
