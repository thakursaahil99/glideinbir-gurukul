import { randomUUID } from "node:crypto";
import { INSTRUCTIONS, multiple, numeric, single } from "./demo";
import type { Test, TestSection } from "./types";

/**
 * Starter tests so a new catalog is never empty: six free tests to try the platform
 * and two paid practice sets as the "next level". Original questions, each with a
 * worked explanation.
 */

type Seed = Pick<Test, "slug" | "title" | "description" | "exam" | "durationMin" | "price" | "colors" | "instructions" | "sections">;
const section = (title: string, questions: TestSection["questions"]): TestSection => ({ id: randomUUID(), title, questions });

function seeds(): Seed[] {
  return [
    {
      slug: "jee-main-mini-mock",
      title: "JEE Main Mini Mock",
      description: "Free 9-question warm-up across Physics, Chemistry and Maths with JEE marking (+4/−1). See your rank, percentile and full solutions.",
      exam: "JEE Main",
      durationMin: 15,
      price: 0,
      colors: ["#5b47ff", "#00c2ff"],
      instructions: INSTRUCTIONS,
      sections: [
        section("Physics", [
          single("A car accelerates uniformly from rest to 20 m/s in 5 s. What is its acceleration?", ["2 m/s²", "4 m/s²", "5 m/s²", "10 m/s²"], 1, "Kinematics", "a = (v − u) / t = (20 − 0) / 5 = 4 m/s²."),
          single("What is the SI unit of force?", ["Joule", "Newton", "Watt", "Pascal"], 1, "Units", "1 newton = 1 kg·m/s²."),
          numeric("A net force of 10 N acts on a 2 kg block. What is its acceleration in m/s²?", 5, "Newton's laws", "a = F / m = 10 / 2 = 5 m/s²."),
        ]),
        section("Chemistry", [
          single("What is the atomic number of carbon?", ["4", "6", "8", "12"], 1, "Atomic structure", "Carbon has 6 protons, so its atomic number is 6 (12 is its mass number)."),
          multiple("Which of these are noble gases?", ["Helium", "Nitrogen", "Argon", "Oxygen"], [0, 2], "Periodic table", "Helium and argon are in group 18; nitrogen and oxygen are not."),
          numeric("What is the molar mass of water (H₂O) in g/mol? Use H = 1, O = 16.", 18, "Mole concept", "2 × 1 + 16 = 18 g/mol."),
        ]),
        section("Maths", [
          single("If 2x + 3 = 11, what is x?", ["3", "4", "5", "7"], 1, "Algebra", "2x = 11 − 3 = 8, so x = 4."),
          numeric("What is the derivative of x³ evaluated at x = 2?", 12, "Calculus", "d/dx x³ = 3x², and 3 × 2² = 12."),
          single("sin²θ + cos²θ equals:", ["0", "1", "2", "tan θ"], 1, "Trigonometry", "This is the Pythagorean identity: sin²θ + cos²θ = 1 for every θ."),
        ]),
      ],
    },
    {
      slug: "neet-biology-cell-quiz",
      title: "NEET Biology: Cell — The Unit of Life Quiz",
      description: "Free 10-question NCERT quiz on the cell chapter (+4/−1). Watch the free course first, then test yourself.",
      exam: "NEET",
      durationMin: 10,
      price: 0,
      colors: ["#00b89c", "#7ddc5a"],
      instructions: INSTRUCTIONS,
      sections: [
        section("Biology", [
          single("Cell theory was formulated by:", ["Watson and Crick", "Schleiden and Schwann", "Robert Hooke and Leeuwenhoek", "Darwin and Wallace"], 1, "Cell theory", "Schleiden (1838, plants) and Schwann (1839, animals) proposed cell theory."),
          single("Who explained that new cells arise only from pre-existing cells (omnis cellula e cellula)?", ["Robert Brown", "Rudolf Virchow", "Theodor Schwann", "Robert Hooke"], 1, "Cell theory", "Rudolf Virchow (1855) completed cell theory with this idea."),
          single("Which organelle is called the powerhouse of the cell?", ["Golgi apparatus", "Ribosome", "Mitochondrion", "Lysosome"], 2, "Organelles", "Mitochondria make most of the cell's ATP through aerobic respiration."),
          single("Ribosomes of prokaryotic cells are of the type:", ["80S", "70S", "60S", "90S"], 1, "Prokaryotes", "Prokaryotes have 70S ribosomes (50S + 30S); eukaryotic cytoplasm has 80S."),
          single("Which of these is NOT bound by a membrane?", ["Lysosome", "Ribosome", "Mitochondrion", "Golgi apparatus"], 1, "Organelles", "Ribosomes are made of RNA and protein and have no membrane."),
          single("The fluid mosaic model of the plasma membrane was proposed by:", ["Singer and Nicolson", "Danielli and Davson", "Watson and Crick", "Robertson"], 0, "Cell membrane", "Singer and Nicolson proposed the fluid mosaic model in 1972."),
          multiple("Which of these are present in a typical prokaryotic cell?", ["Ribosomes", "Plasma membrane", "Nuclear envelope", "Mitochondria"], [0, 1], "Prokaryotes", "Prokaryotes have ribosomes and a plasma membrane but no nuclear envelope or membrane-bound organelles like mitochondria."),
          single("Proteins are synthesised on:", ["Ribosomes", "Lysosomes", "Centrioles", "Vacuoles"], 0, "Organelles", "Ribosomes translate mRNA into protein."),
          single("The Golgi apparatus mainly:", ["Makes ATP", "Packages and secretes materials", "Stores genetic material", "Digests old organelles"], 1, "Organelles", "Golgi bodies modify, package and dispatch proteins and lipids."),
          numeric("How many chromosomes does a normal human somatic (body) cell have?", 46, "Chromosomes", "Human somatic cells are diploid: 23 pairs = 46 chromosomes."),
        ]),
      ],
    },
    {
      slug: "class-10-maths-quick-check",
      title: "Class 10 Maths Quick Check: Real Numbers & Quadratics",
      description: "Free 10 board-style questions on two high-scoring chapters, with step-by-step solutions.",
      exam: "School (6–12)",
      durationMin: 15,
      price: 0,
      colors: ["#3d8bff", "#2ee6c5"],
      instructions: INSTRUCTIONS,
      sections: [
        section("Maths", [
          numeric("Using Euclid's division algorithm, what is the HCF of 96 and 404?", 4, "Real numbers", "404 = 96 × 4 + 20; 96 = 20 × 4 + 16; 20 = 16 × 1 + 4; 16 = 4 × 4 + 0. So HCF = 4."),
          numeric("What is the LCM of 6 and 20?", 60, "Real numbers", "6 = 2 × 3 and 20 = 2² × 5, so LCM = 2² × 3 × 5 = 60."),
          single("Which of these numbers is irrational?", ["√2", "0.25", "22/7", "√16"], 0, "Real numbers", "√2 can't be written as p/q. 0.25 = 1/4, 22/7 is a fraction and √16 = 4."),
          single("The decimal expansion of 13/8 is:", ["Terminating", "Non-terminating repeating", "Non-terminating non-repeating", "Cannot be decided"], 0, "Real numbers", "The denominator 8 = 2³ has only the prime factor 2, so the decimal terminates (1.625)."),
          single("For two positive integers a and b, HCF(a, b) × LCM(a, b) equals:", ["a + b", "a × b", "a − b", "a ÷ b"], 1, "Real numbers", "This identity holds for any two positive integers."),
          single("The roots of x² − 5x + 6 = 0 are:", ["2 and 3", "−2 and −3", "1 and 6", "−1 and 6"], 0, "Quadratic equations", "x² − 5x + 6 = (x − 2)(x − 3), so x = 2 or 3."),
          numeric("What is the discriminant of 2x² − 4x + 3 = 0?", -8, "Quadratic equations", "D = b² − 4ac = 16 − 24 = −8."),
          single("If the discriminant of a quadratic equation is negative, it has:", ["Two distinct real roots", "Two equal real roots", "No real roots", "Exactly one real root"], 2, "Quadratic equations", "D < 0 means the square root in the formula isn't real, so there are no real roots."),
          numeric("What is the sum of the roots of 3x² − 6x + 2 = 0?", 2, "Quadratic equations", "Sum of roots = −b/a = 6/3 = 2."),
          numeric("What is the product of the roots of x² + 7x + 10 = 0?", 10, "Quadratic equations", "Product of roots = c/a = 10/1 = 10 (the roots are −2 and −5)."),
        ]),
      ],
    },
    {
      slug: "ssc-banking-reasoning-quant-starter",
      title: "SSC & Banking Starter: Reasoning + Quant",
      description: "Free 10-question speed test with SSC-style marking (+2/−0.5). Series, coding, directions, percentages and more.",
      exam: "SSC",
      durationMin: 10,
      price: 0,
      colors: ["#ffb800", "#ff5e3a"],
      instructions: INSTRUCTIONS,
      sections: [
        section("Reasoning", [
          numeric("Find the next number: 3, 9, 27, 81, ?", 243, "Series", "Each term is multiplied by 3: 81 × 3 = 243.", 0, 2),
          single("Which is the odd one out?", ["Triangle", "Square", "Circle", "Pentagon"], 2, "Classification", "A circle isn't a polygon; the others are made of straight sides.", 2, 0.5),
          single("If MONDAY is coded as NPOEBZ, how is FRIDAY coded?", ["GSJEBZ", "GSJECZ", "HSJEBZ", "GTJEBZ"], 0, "Coding-decoding", "Each letter moves one step forward: F→G, R→S, I→J, D→E, A→B, Y→Z.", 2, 0.5),
          single("Pointing to a man, Riya says, “He is the son of my mother's only son.” How is the man related to Riya?", ["Brother", "Nephew", "Cousin", "Son"], 1, "Blood relations", "Her mother's only son is Riya's brother; his son is Riya's nephew.", 2, 0.5),
          numeric("A man walks 5 km north, then 3 km east, then 5 km south. How many km is he from the start?", 3, "Directions", "The north and south walks cancel out, leaving 3 km east.", 0, 2),
        ]),
        section("Quant", [
          numeric("What is 20% of 150?", 30, "Percentage", "150 × 20/100 = 30.", 0, 2),
          numeric("A 120 m long train passes a pole in 6 seconds. What is its speed in km/h?", 72, "Speed", "120/6 = 20 m/s, and 20 × 18/5 = 72 km/h.", 0, 2),
          numeric("What is the simple interest (in ₹) on ₹2000 at 5% per annum for 3 years?", 300, "Interest", "SI = P × R × T / 100 = 2000 × 5 × 3 / 100 = 300.", 0, 2),
          numeric("What is the average of 10, 20, 30, 40 and 50?", 30, "Averages", "Sum 150 ÷ 5 = 30.", 0, 2),
          single("If a : b = 2 : 3 and b : c = 4 : 5, then a : c is:", ["8 : 15", "2 : 5", "6 : 5", "4 : 15"], 0, "Ratio", "a : b : c = 8 : 12 : 15, so a : c = 8 : 15.", 2, 0.5),
        ]),
      ],
    },
    {
      slug: "python-basics-quiz",
      title: "Python Basics Quiz",
      description: "Free 8-question check on Python fundamentals: types, operators, lists and functions. Great after the free Python course.",
      exam: "Programming",
      durationMin: 10,
      price: 0,
      colors: ["#2ee6c5", "#5b47ff"],
      instructions: INSTRUCTIONS,
      sections: [
        section("Python", [
          single("What does print(type(3.0)) show?", ["<class 'int'>", "<class 'float'>", "<class 'str'>", "<class 'double'>"], 1, "Types", "3.0 has a decimal point, so it's a float. Python has no 'double' type."),
          numeric('What is len("Gurukul")?', 7, "Strings", "G-u-r-u-k-u-l has 7 characters."),
          numeric("What does print(7 // 2) print?", 3, "Operators", "// is floor division: 7 ÷ 2 = 3.5, floored to 3."),
          single("Which of these creates a list?", ["[1, 2, 3]", "(1, 2, 3)", "{1, 2, 3}", '"1, 2, 3"'], 0, "Lists", "Square brackets make a list; parentheses make a tuple and braces a set."),
          numeric("What does print(2 ** 3) print?", 8, "Operators", "** is exponentiation: 2³ = 8."),
          numeric("x = [1, 2, 3]; x.append(4). What is len(x) now?", 4, "Lists", "append adds one element to the end, so the list has 4 items."),
          single("Which keyword defines a function in Python?", ["func", "function", "def", "define"], 2, "Functions", "Functions start with def, e.g. def greet(name): …"),
          multiple("Which of these types are immutable?", ["tuple", "list", "str", "dict"], [0, 2], "Types", "Tuples and strings can't be changed after creation; lists and dicts can."),
        ]),
      ],
    },
    {
      slug: "general-awareness-india-basics",
      title: "General Awareness: India Basics",
      description: "Free 10 questions on the Constitution, economy, geography and science, the static GK every UPSC, SSC and banking aspirant needs.",
      exam: "UPSC",
      durationMin: 8,
      price: 0,
      colors: ["#ff8a00", "#ff4d6d"],
      instructions: INSTRUCTIONS,
      sections: [
        section("General awareness", [
          single("The Constitution of India came into force on:", ["15 August 1947", "26 November 1949", "26 January 1950", "2 October 1950"], 2, "Polity", "It was adopted on 26 November 1949 and came into force on 26 January 1950 (Republic Day)."),
          single("Who is called the chief architect of the Indian Constitution?", ["Jawaharlal Nehru", "B. R. Ambedkar", "Rajendra Prasad", "Sardar Patel"], 1, "Polity", "Dr B. R. Ambedkar chaired the Drafting Committee."),
          single("Fundamental Rights are listed in which Part of the Constitution?", ["Part II", "Part III", "Part IV", "Part V"], 1, "Polity", "Part III (Articles 12–35) contains the Fundamental Rights."),
          single("Which Article of the Constitution abolishes untouchability?", ["Article 14", "Article 17", "Article 21", "Article 32"], 1, "Polity", "Article 17 abolishes untouchability and forbids its practice."),
          numeric("How many states does India have?", 28, "Polity", "India has 28 states and 8 union territories (since 2020)."),
          single("The Reserve Bank of India was established in:", ["1935", "1947", "1949", "1969"], 0, "Economy", "RBI was set up on 1 April 1935 and nationalised in 1949."),
          single("Which is the longest river in India?", ["Godavari", "Brahmaputra", "Ganga", "Yamuna"], 2, "Geography", "The Ganga flows about 2,525 km, the longest river within India."),
          single("What is the national animal of India?", ["Lion", "Elephant", "Tiger", "Peacock"], 2, "General", "The Bengal tiger is India's national animal (the peacock is the national bird)."),
          single("Which planet is known as the Red Planet?", ["Venus", "Mars", "Jupiter", "Mercury"], 1, "Science", "Iron oxide on its surface makes Mars look red."),
          single("In August 2023, Chandrayaan-3 landed near the Moon's:", ["North pole", "Equator", "South pole", "Far side centre"], 2, "Science & tech", "India became the first country to land near the lunar south pole."),
        ]),
      ],
    },
    {
      slug: "jee-main-practice-set-1",
      title: "JEE Main Practice Set 1: Mechanics, Algebra & Basics",
      description: "Next level after the free mini mock: 15 JEE-pattern questions in 30 minutes with numerical-value questions, ranks and detailed solutions.",
      exam: "JEE Main",
      durationMin: 30,
      price: 4_900,
      colors: ["#5b47ff", "#c04dff"],
      instructions: INSTRUCTIONS,
      sections: [
        section("Physics", [
          numeric("A ball is thrown straight up at 20 m/s. Taking g = 10 m/s², what maximum height (in m) does it reach?", 20, "Kinematics", "h = u² / 2g = 400 / 20 = 20 m."),
          numeric("For the same ball, how many seconds does it take to reach the top?", 2, "Kinematics", "t = u / g = 20 / 10 = 2 s."),
          numeric("A projectile is launched at 45° with speed 20 m/s (g = 10 m/s²). What is its horizontal range in m?", 40, "Projectile motion", "R = u² sin 2θ / g = 400 × sin 90° / 10 = 40 m."),
          numeric("A constant 10 N force moves a body 5 m along its direction. How much work (in J) is done?", 50, "Work & energy", "W = F × s × cos 0° = 10 × 5 = 50 J."),
          numeric("What is the kinetic energy (in J) of a 2 kg body moving at 3 m/s?", 9, "Work & energy", "KE = ½mv² = ½ × 2 × 9 = 9 J."),
          single("Which of these is a vector quantity?", ["Speed", "Mass", "Displacement", "Time"], 2, "Vectors", "Displacement has both magnitude and direction."),
        ]),
        section("Chemistry", [
          numeric("What is the pH of pure water at 25 °C?", 7, "Ionic equilibrium", "[H⁺] = 10⁻⁷ M, so pH = 7."),
          single("Avogadro's number is approximately:", ["6.022 × 10²³", "3.0 × 10⁸", "1.6 × 10⁻¹⁹", "9.8 × 10²³"], 0, "Mole concept", "Nₐ ≈ 6.022 × 10²³ particles per mole."),
          numeric("How many moles are there in 36 g of water (molar mass 18 g/mol)?", 2, "Mole concept", "n = 36 / 18 = 2 mol."),
        ]),
        section("Maths", [
          numeric("If f(x) = x² + 1, what is f(3)?", 10, "Functions", "f(3) = 9 + 1 = 10."),
          numeric("Evaluate ∫₀¹ 2x dx.", 1, "Integration", "∫2x dx = x²; from 0 to 1 that is 1 − 0 = 1."),
          numeric("In how many ways can the letters of the word CAT be arranged?", 6, "Permutations", "3 distinct letters: 3! = 6."),
          numeric("What is log₁₀ 1000?", 3, "Logarithms", "10³ = 1000, so the log is 3."),
          numeric("What is sin 30° + cos 60°?", 1, "Trigonometry", "½ + ½ = 1."),
          numeric("What is the distance between the points (0, 0) and (3, 4)?", 5, "Coordinate geometry", "√(3² + 4²) = √25 = 5."),
        ]),
      ],
    },
    {
      slug: "ssc-cgl-tier-1-practice-set",
      title: "SSC CGL Tier-1 Practice Set",
      description: "Next level after the free starter: 12 mixed questions (quant, reasoning, English) in 15 minutes with SSC marking.",
      exam: "SSC",
      durationMin: 15,
      price: 2_900,
      colors: ["#ffb800", "#c04dff"],
      instructions: INSTRUCTIONS,
      sections: [
        section("Quantitative aptitude", [
          numeric("What is 25% of 480?", 120, "Percentage", "480 ÷ 4 = 120.", 0, 2),
          numeric("An item bought for ₹400 is sold for ₹500. What is the profit percentage?", 25, "Profit & loss", "Profit 100 on cost 400 = 25%.", 0, 2),
          numeric("A finishes a job in 10 days and B in 15 days. In how many days do they finish it together?", 6, "Time & work", "1/10 + 1/15 = 1/6 of the job per day, so 6 days.", 0, 2),
          numeric("What is the average of the first 10 natural numbers?", 5.5, "Averages", "(1 + 10) / 2 = 5.5.", 0, 2),
          numeric("If 3x − 7 = 11, what is x?", 6, "Algebra", "3x = 18, so x = 6.", 0, 2),
          numeric("What is the square root of 1764?", 42, "Number system", "42 × 42 = 1764.", 0, 2),
          numeric("At 60 km/h, how many hours does it take to cover 150 km?", 2.5, "Speed", "150 ÷ 60 = 2.5 hours.", 0, 2),
        ]),
        section("Reasoning", [
          numeric("Find the next number: 1, 4, 9, 16, 25, ?", 36, "Series", "These are squares: 6² = 36.", 0, 2),
          single("Which number is the odd one out?", ["17", "19", "21", "23"], 2, "Classification", "21 = 3 × 7 is not prime; the others are.", 2, 0.5),
        ]),
        section("English", [
          single("Choose the synonym of ABUNDANT:", ["Plentiful", "Scarce", "Tiny", "Rare"], 0, "Vocabulary", "Abundant means existing in large quantities: plentiful.", 2, 0.5),
          single("Choose the antonym of ANCIENT:", ["Old", "Modern", "Antique", "Archaic"], 1, "Vocabulary", "Ancient means very old; the opposite is modern.", 2, 0.5),
          single("Choose the correctly spelt word:", ["Acommodate", "Accomodate", "Accommodate", "Acomodate"], 2, "Spelling", "Accommodate has a double c and a double m.", 2, 0.5),
        ]),
      ],
    },
  ];
}

/** Starter tests not yet in the catalog (matched by slug), authored by `instructorId`. */
export function starterTests(instructorId: string, takenSlugs: Set<string>): Test[] {
  const now = new Date().toISOString();
  return seeds()
    .filter((s) => !takenSlugs.has(s.slug))
    .map((s) => ({ ...s, id: randomUUID(), instructorId, status: "published", createdAt: now, updatedAt: now, publishedAt: now }));
}
