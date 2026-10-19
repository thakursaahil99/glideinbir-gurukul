import { randomUUID } from "node:crypto";
import type { Course, Lecture, Section } from "./types";

/**
 * Free starter courses so a new catalog is never empty. Every lecture is an embedded
 * YouTube video from the creator's official channel (Harvard CS50, Khan Academy, Abdul Bari,
 * freeCodeCamp), played through YouTube's own player, with credit in the description.
 * Video ids were checked against YouTube's oEmbed endpoint (real and embeddable).
 */

const dur = (t: string) => t.split(":").reduce((s, p) => s * 60 + Number(p), 0);
const yt = (title: string, id: string, length: string, preview = false): Lecture => ({ id: randomUUID(), title, durationSec: dur(length), video: { kind: "youtube", src: id }, notes: null, preview });
const sec = (title: string, lectures: Lecture[]): Section => ({ id: randomUUID(), title, lectures });

type Seed = Pick<Course, "slug" | "title" | "subtitle" | "description" | "category" | "level" | "language" | "price" | "colors" | "outcomes" | "sections">;

function seeds(): Seed[] {
  return [
    {
      slug: "python-programming-harvard-cs50p",
      title: "Python Programming for Beginners",
      subtitle: "Harvard's CS50P lectures: functions, loops, exceptions, libraries and files.",
      description:
        "Learn Python from zero with Harvard University's CS50's Introduction to Programming with Python, taught by David J. Malan. Watch each lecture, then practise in our Coding Practice section.\n\nVideos: CS50 (Harvard University) on YouTube, shared under CC BY-NC-SA 4.0.",
      category: "Programming",
      level: "beginner",
      language: "English",
      price: 0,
      colors: ["#2ee6c5", "#5b47ff"],
      outcomes: ["Write Python programs with functions and variables", "Use conditionals and loops confidently", "Handle errors with exceptions", "Use libraries and read/write files"],
      sections: [
        sec("Getting started", [yt("Functions and variables", "JP7ITIXGpHk", "1:45:38", true), yt("Conditionals", "_b6NgY_pMdw", "56:08")]),
        sec("Core skills", [yt("Loops", "-7xg8pGcP6w", "1:20:47"), yt("Exceptions", "LW7g1169v7w", "44:36")]),
        sec("Going further", [yt("Libraries", "MztLZWibctI", "1:17:29"), yt("File I/O", "KD-Yoel6EVQ", "1:32:25")]),
      ],
    },
    {
      slug: "class-9-physics-motion",
      title: "Physics: Motion Made Simple (Class 9 / JEE Foundation)",
      subtitle: "Distance, displacement, speed, velocity, acceleration and motion graphs.",
      description:
        "The base of all mechanics, explained visually. Perfect for Class 9 boards and as a foundation for JEE and NEET physics. Finish with our free JEE Main mini mock.\n\nVideos: Khan Academy and Khan Academy India on YouTube (CC BY-NC-SA).",
      category: "Engineering (JEE)",
      level: "beginner",
      language: "English",
      price: 0,
      colors: ["#ff8a00", "#ff4d6d"],
      outcomes: ["Tell distance from displacement", "Read position–time and velocity–time graphs", "Work with acceleration in numericals"],
      sections: [
        sec("Describing motion", [yt("Introduction to physics", "uIojjqSm0m4", "9:29", true), yt("Distance and displacement", "vQCkYm3v3aA", "4:14"), yt("Instantaneous speed and velocity", "pfTTHx9kCHk", "4:38")]),
        sec("Acceleration and graphs", [yt("Acceleration", "TAtCs9ifRRY", "8:36"), yt("Velocity–time graphs", "yB3KxVSxK54", "7:22"), yt("Why distance is the area under a v–t graph", "d-_eqgj5-K8", "9:26")]),
      ],
    },
    {
      slug: "class-10-maths-real-numbers-quadratics",
      title: "Class 10 Maths: Real Numbers & Quadratic Equations",
      subtitle: "Euclid's division algorithm, standard form, factoring and the quadratic formula.",
      description:
        "Two of the highest-scoring Class 10 board chapters, step by step with worked examples.\n\nVideos: Khan Academy and Khan Academy India on YouTube (CC BY-NC-SA).",
      category: "School (6–12)",
      level: "beginner",
      language: "English",
      price: 0,
      colors: ["#3d8bff", "#2ee6c5"],
      outcomes: ["Find HCF with Euclid's division algorithm", "Write quadratics in standard form", "Solve quadratics by factoring and by the formula"],
      sections: [
        sec("Real numbers", [yt("Intro to Euclid's division algorithm", "H1AE2Se8A5E", "8:18", true), yt("Euclid's division algorithm visualised", "qgcgZISJlEc", "10:00"), yt("Worked example", "i_GSGCboDb8", "4:25")]),
        sec("Quadratic equations", [yt("Standard form", "okiOrsRie2k", "5:36"), yt("Introduction to the quadratic equation", "IWigvJcCAJ0", "9:15"), yt("Solving by factoring", "2ZzuZvz33X0", "6:22"), yt("Using the quadratic formula", "i7idZfS8t8w", "16:32")]),
      ],
    },
    {
      slug: "neet-biology-cell-unit-of-life",
      title: "NEET Biology: Cell — The Unit of Life",
      subtitle: "NCERT Class 11 chapter: cell theory, prokaryotes, eukaryotes and organelles.",
      description:
        "A complete NCERT-aligned walk through the cell chapter that appears in every NEET paper. Pair it with our free NEET biology quiz.\n\nVideos: Khan Academy India on YouTube (CC BY-NC-SA).",
      category: "Medical (NEET)",
      level: "beginner",
      language: "English",
      price: 0,
      colors: ["#00b89c", "#7ddc5a"],
      outcomes: ["State cell theory", "Compare prokaryotic and eukaryotic cells", "Explain the membrane, nucleus, ER and Golgi"],
      sections: [
        sec("Cell basics", [yt("Cell theory", "kI6B1QOHKOI", "7:41", true), yt("Prokaryotic cells", "7Wekk1D_QN8", "9:00"), yt("Prokaryotic vs eukaryotic cells", "QOR9is_nQJ8", "6:00")]),
        sec("Inside the cell", [yt("Cell membrane", "Rwa8ynMf5WM", "14:45"), yt("Nucleus", "XSocI9zhs44", "7:00"), yt("Endoplasmic reticulum and Golgi bodies", "NcqXQFQBEJU", "16:00"), yt("Chromosomes", "j9B_R6cTA_s", "5:47")]),
      ],
    },
    {
      slug: "algorithms-foundations-abdul-bari",
      title: "Algorithms Foundations: Big-O and Analysis",
      subtitle: "What an algorithm is and how to measure it, the start of every DSA journey.",
      description:
        "Before you grind problems, learn how to reason about speed. Then solve our free coding problems and watch your solutions pass the large hidden tests.\n\nVideos: Abdul Bari on YouTube.",
      category: "Programming",
      level: "intermediate",
      language: "English",
      price: 0,
      colors: ["#5b47ff", "#00c2ff"],
      outcomes: ["Explain what makes an algorithm", "Use Big-O, Omega and Theta", "Compare growth rates of functions"],
      sections: [
        sec("Introduction", [yt("Introduction to algorithms", "0IAPZzGSbME", "11:49", true)]),
        sec("Asymptotic notations", [yt("Big-O, Omega and Theta, part 1", "A03oI0znAoc", "15:46"), yt("Big-O, Omega and Theta, part 2", "Nd0XDY-jVHs", "10:07"), yt("Properties of asymptotic notations", "NI4OKSvGAgM", "11:58"), yt("Asymptotic notations simplified", "ddsP7NecEBk", "22:44")]),
      ],
    },
    {
      slug: "web-development-html-css",
      title: "Web Development: HTML & CSS",
      subtitle: "Build and style your first website from scratch.",
      description:
        "Three complete, beginner-friendly tutorials: HTML structure, building a full site, and CSS styling.\n\nVideos: freeCodeCamp.org on YouTube.",
      category: "Programming",
      level: "beginner",
      language: "English",
      price: 0,
      colors: ["#ff4d6d", "#c04dff"],
      outcomes: ["Write semantic HTML pages", "Build a multi-section website", "Style layouts with CSS"],
      sections: [
        sec("HTML", [yt("Learn HTML: full tutorial", "kUMe1FH4CHE", "4:07:30", true), yt("Build a website with HTML", "pQN-pnXPaVg", "2:02:32")]),
        sec("CSS", [yt("CSS: full course", "OXGznpKZ_sA", "11:08:10")]),
      ],
    },
  ];
}

/** Starter courses not yet in the catalog (matched by slug), authored by `instructorId`. */
export function starterCourses(instructorId: string, takenSlugs: Set<string>): Course[] {
  const now = new Date().toISOString();
  return seeds()
    .filter((s) => !takenSlugs.has(s.slug))
    .map((s) => ({ ...s, id: randomUUID(), instructorId, status: "published", createdAt: now, updatedAt: now, publishedAt: now }));
}
