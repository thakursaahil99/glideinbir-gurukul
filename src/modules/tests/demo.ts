import { randomUUID } from "node:crypto";
import type { Question, Test } from "./types";

/** Sample tests for an empty catalog. Flagged `demo` and shown with a Demo badge. */

export const single = (text: string, options: string[], correctIndex: number, topic: string, explanation: string, marks = 4, negative = 1): Question => {
  const opts = options.map((t) => ({ id: randomUUID(), text: t }));
  return { id: randomUUID(), type: "single", text, image: null, options: opts, correct: [opts[correctIndex]!.id], numeric: null, marks, negative, topic, explanation };
};

export const multiple = (text: string, options: string[], correctIdx: number[], topic: string, explanation: string, marks = 4, negative = 2): Question => {
  const opts = options.map((t) => ({ id: randomUUID(), text: t }));
  return { id: randomUUID(), type: "multiple", text, image: null, options: opts, correct: correctIdx.map((i) => opts[i]!.id), numeric: null, marks, negative, topic, explanation };
};

export const numeric = (text: string, value: number, topic: string, explanation: string, tolerance = 0, marks = 4): Question => ({
  id: randomUUID(),
  type: "numeric",
  text,
  image: null,
  options: [],
  correct: [],
  numeric: { value, tolerance },
  marks,
  negative: 0,
  topic,
  explanation,
});

type Seed = Pick<Test, "slug" | "title" | "description" | "exam" | "durationMin" | "price" | "colors" | "instructions" | "sections">;

export const INSTRUCTIONS = [
  "Correct answers earn the marks shown on each question; wrong answers lose the negative marks shown.",
  "Numeric questions have no negative marking.",
  "Use “Mark for review” to come back to a question. You can change answers until you submit.",
  "The test submits automatically when the timer reaches zero.",
];

function seeds(): Seed[] {
  return [
    {
      slug: "demo-jee-main-mini-mock",
      title: "JEE Main Mini Mock (Demo)",
      description: "A free 9-question demo across Physics, Chemistry and Maths. Try the timer, palette, auto-submit, rank and solutions.",
      exam: "JEE Main",
      durationMin: 15,
      price: 0,
      colors: ["#5b47ff", "#00c2ff"],
      instructions: INSTRUCTIONS,
      sections: [
        {
          id: randomUUID(),
          title: "Physics",
          questions: [
            single("A car accelerates uniformly from rest to 20 m/s in 5 s. What is its acceleration?", ["2 m/s²", "4 m/s²", "5 m/s²", "10 m/s²"], 1, "Kinematics", "a = (v − u) / t = (20 − 0) / 5 = 4 m/s²."),
            single("What is the SI unit of force?", ["Joule", "Newton", "Watt", "Pascal"], 1, "Units", "1 newton = 1 kg·m/s²."),
            numeric("A net force of 10 N acts on a 2 kg block. What is its acceleration in m/s²?", 5, "Newton's laws", "a = F / m = 10 / 2 = 5 m/s²."),
          ],
        },
        {
          id: randomUUID(),
          title: "Chemistry",
          questions: [
            single("What is the atomic number of carbon?", ["4", "6", "8", "12"], 1, "Atomic structure", "Carbon has 6 protons, so its atomic number is 6 (12 is its mass number)."),
            multiple("Which of these are noble gases?", ["Helium", "Nitrogen", "Argon", "Oxygen"], [0, 2], "Periodic table", "Helium and argon are in group 18; nitrogen and oxygen are not."),
            numeric("What is the molar mass of water (H₂O) in g/mol? Use H = 1, O = 16.", 18, "Mole concept", "2 × 1 + 16 = 18 g/mol."),
          ],
        },
        {
          id: randomUUID(),
          title: "Maths",
          questions: [
            single("If 2x + 3 = 11, what is x?", ["3", "4", "5", "7"], 1, "Algebra", "2x = 11 − 3 = 8, so x = 4."),
            numeric("What is the derivative of x³ evaluated at x = 2?", 12, "Calculus", "d/dx x³ = 3x², and 3 × 2² = 12."),
            single("sin²θ + cos²θ equals:", ["0", "1", "2", "tan θ"], 1, "Trigonometry", "This is the Pythagorean identity: sin²θ + cos²θ = 1 for every θ."),
          ],
        },
      ],
    },
    {
      slug: "demo-ssc-reasoning-speed-test",
      title: "SSC Reasoning Speed Test (Demo)",
      description: "A paid 5-minute demo to try buying a test with the wallet. Five quick reasoning questions.",
      exam: "SSC",
      durationMin: 5,
      price: 4_900,
      colors: ["#c04dff", "#ff4da6"],
      instructions: INSTRUCTIONS,
      sections: [
        {
          id: randomUUID(),
          title: "Reasoning",
          questions: [
            single("Find the next number: 2, 6, 12, 20, 30, ?", ["36", "40", "42", "44"], 2, "Series", "The gaps are 4, 6, 8, 10, so the next gap is 12: 30 + 12 = 42.", 2, 0.5),
            single("If CAT is coded as DBU, how is DOG coded?", ["DPH", "EPH", "EOH", "FQI"], 1, "Coding-decoding", "Each letter moves one step forward: D→E, O→P, G→H.", 2, 0.5),
            single("Which is the odd one out?", ["Apple", "Mango", "Carrot", "Banana"], 2, "Classification", "Carrot is a vegetable; the others are fruits.", 2, 0.5),
            numeric("A is twice as old as B. In 10 years, A will be 1.5 times as old as B. What is B's present age in years?", 10, "Ages", "A = 2B and 2B + 10 = 1.5(B + 10), so 0.5B = 5 and B = 10.", 0, 2),
            multiple("Which of these numbers are prime?", ["21", "23", "27", "29"], [1, 3], "Number system", "21 = 3 × 7 and 27 = 3 × 9; 23 and 29 have no other divisors.", 2, 1),
          ],
        },
      ],
    },
  ];
}

export function demoTests(instructorId: string, takenSlugs: Set<string>): Test[] {
  const now = new Date().toISOString();
  return seeds()
    .filter((s) => !takenSlugs.has(s.slug))
    .map((s) => ({ ...s, id: randomUUID(), instructorId, status: "published", demo: true, createdAt: now, updatedAt: now, publishedAt: now }));
}
