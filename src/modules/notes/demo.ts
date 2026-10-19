import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { PublicUser } from "@/core/auth/roles";
import { NOTES_DIR } from "./media";
import { changeVendor, getVendor, insertNote, insertVendor, listNotes, nowIso } from "./store";
import type { NoteItem, NoteSubject } from "./types";

interface DemoNote {
  title: string;
  subject: NoteSubject;
  tags: string[];
  price: number;
  previewPages: number;
  description: string;
  accent: [number, number, number];
  chapters: { title: string; points: string[] }[];
}

const DEMO: DemoNote[] = [
  {
    title: "JEE Physics: Rotational Motion Formula Sheet + Solved PYQs",
    subject: "JEE",
    tags: ["Physics", "Mechanics", "PYQ"],
    price: 4900,
    previewPages: 2,
    description: "Every formula of rotational motion on clean, colour-coded pages, followed by 40 solved JEE Main and Advanced questions with shortcuts. Made for last-month revision.",
    accent: [0.36, 0.28, 1],
    chapters: [
      { title: "Moment of inertia", points: ["Ring about axis: I = MR^2", "Disc about axis: I = MR^2 / 2", "Solid sphere: I = 2MR^2 / 5", "Parallel axis: I = Icm + Md^2", "Perpendicular axis (laminas): Iz = Ix + Iy"] },
      { title: "Torque and angular momentum", points: ["Torque = r x F, |T| = rF sin(theta)", "L = I w for a rigid body about a fixed axis", "dL/dt = net external torque", "No external torque => L is conserved"] },
      { title: "Rolling without slipping", points: ["v = R w at the contact point condition", "KE = (1/2) M v^2 (1 + k^2 / R^2)", "a = g sin(theta) / (1 + k^2 / R^2) on an incline", "Friction does no work in pure rolling"] },
      { title: "Solved PYQ patterns", points: ["Find I of composite bodies by adding parts", "Use energy conservation for rolling bodies", "Angular impulse = change in angular momentum", "Toppling vs sliding: compare torque about the edge"] },
    ],
  },
  {
    title: "NEET Biology: Human Physiology One-Shot Notes",
    subject: "NEET",
    tags: ["Biology", "Physiology", "NCERT"],
    price: 7900,
    previewPages: 2,
    description: "NCERT line-by-line human physiology in one place: digestion, breathing, circulation, excretion, locomotion, neural and chemical control, with diagrams-to-remember and 150 MCQs.",
    accent: [0, 0.72, 0.61],
    chapters: [
      { title: "Digestion and absorption", points: ["Salivary amylase starts starch digestion (pH 6.8)", "Pepsinogen -> pepsin activated by HCl", "Bile emulsifies fats; contains no enzymes", "Villi and microvilli increase absorptive area"] },
      { title: "Breathing and exchange of gases", points: ["Tidal volume ~ 500 mL", "Vital capacity = IRV + TV + ERV", "O2 carried mostly as oxyhaemoglobin", "CO2 carried mostly as bicarbonate"] },
      { title: "Body fluids and circulation", points: ["SA node is the pacemaker", "Cardiac output = stroke volume x heart rate", "Lub = AV valves close, Dub = semilunar valves close", "Double circulation separates oxygenated blood"] },
      { title: "Excretion and neural control", points: ["Nephron: glomerulus filters ~180 L/day", "ADH increases water reabsorption", "Resting potential ~ -70 mV", "Synapse: neurotransmitter crosses the cleft"] },
    ],
  },
  {
    title: "DSA Patterns in C++: Interview Cheat Sheet",
    subject: "Coding",
    tags: ["DSA", "C++", "Interviews"],
    price: 0,
    previewPages: 2,
    description: "Fourteen problem-solving patterns that cover most coding interviews: two pointers, sliding window, binary search on answer, BFS/DFS templates, DP states and more, with C++ snippets.",
    accent: [1, 0.3, 0.43],
    chapters: [
      { title: "Two pointers and sliding window", points: ["Sorted array + pair sum -> two pointers", "Longest substring with condition -> expand right, shrink left", "Keep counts in an array or unordered_map", "Window size fixed -> add right, drop left"] },
      { title: "Binary search on the answer", points: ["Monotonic yes/no check over a range", "lo = min answer, hi = max answer", "while (lo < hi) mid = lo + (hi - lo) / 2", "Classic: koko bananas, ship packages"] },
      { title: "Graphs", points: ["BFS for shortest path in unweighted graphs", "DFS with visited[] for components", "Topological sort with indegree queue", "Dijkstra with priority_queue<pair<int,int>>"] },
    ],
  },
  {
    title: "Class 10 Maths: All Formulas in One Place",
    subject: "Class 10",
    tags: ["Maths", "Board exam", "Formula sheet"],
    price: 0,
    previewPages: 3,
    description: "Every Class 10 maths formula you need for the board exam: real numbers, polynomials, quadratics, AP, triangles, coordinate geometry, trigonometry, mensuration and statistics. Print it and stick it on your wall.",
    accent: [0.24, 0.55, 1],
    chapters: [
      { title: "Algebra", points: ["HCF(a, b) x LCM(a, b) = a x b", "Quadratic ax^2 + bx + c = 0: x = (-b +/- sqrt(D)) / 2a, D = b^2 - 4ac", "D > 0: two real roots, D = 0: equal roots, D < 0: no real roots", "Sum of roots = -b/a, product of roots = c/a", "AP: an = a + (n - 1)d, Sn = n/2 [2a + (n - 1)d]"] },
      { title: "Coordinate geometry", points: ["Distance = sqrt((x2 - x1)^2 + (y2 - y1)^2)", "Section formula (m:n): ((m x2 + n x1)/(m + n), (m y2 + n y1)/(m + n))", "Mid-point: ((x1 + x2)/2, (y1 + y2)/2)"] },
      { title: "Trigonometry", points: ["sin^2 A + cos^2 A = 1", "1 + tan^2 A = sec^2 A, 1 + cot^2 A = cosec^2 A", "sin 30 = 1/2, sin 45 = 1/sqrt2, sin 60 = sqrt3/2", "tan A = sin A / cos A"] },
      { title: "Mensuration & statistics", points: ["Circle: area = pi r^2, circumference = 2 pi r", "Sector area = (theta/360) x pi r^2", "Cylinder volume = pi r^2 h, cone = (1/3) pi r^2 h, sphere = (4/3) pi r^3", "Mean (direct) = sum(f x) / sum(f)", "Empirical relation: 3 Median = Mode + 2 Mean"] },
    ],
  },
  {
    title: "Python Cheat Sheet for Beginners",
    subject: "Coding",
    tags: ["Python", "Cheat sheet"],
    price: 0,
    previewPages: 2,
    description: "Syntax you look up again and again: strings, lists, dicts, loops, functions, files and common errors, on a few clean pages. Pairs with the free Python course.",
    accent: [0.18, 0.9, 0.77],
    chapters: [
      { title: "Basics", points: ["print(\"Hello\"), name = input()", "Types: int, float, str, bool, None", "f-strings: f\"Hi {name}, you are {age}\"", "// floor division, % remainder, ** power"] },
      { title: "Collections", points: ["List: nums = [1, 2, 3]; nums.append(4); nums[-1]", "Slicing: nums[1:3], nums[::-1] reverses", "Dict: marks = {\"maths\": 95}; marks.get(\"sci\", 0)", "Set: unique = set(items)"] },
      { title: "Control flow & functions", points: ["for i in range(5): ...", "while x > 0: ...", "def area(r): return 3.14 * r * r", "try: ... except ValueError: ..."] },
      { title: "Files & common errors", points: ["with open(\"a.txt\") as f: data = f.read()", "IndentationError: mixed spaces and tabs", "TypeError: adding str and int, use str() or int()", "IndexError: index past the end of a list"] },
    ],
  },
  {
    title: "Indian Polity Quick Revision (UPSC / SSC)",
    subject: "UPSC",
    tags: ["Polity", "Constitution", "Static GK"],
    price: 0,
    previewPages: 3,
    description: "The Constitution in quick bullets: making of the Constitution, Preamble, Fundamental Rights and Duties, DPSP, Parliament and the President. Built for last-minute prelims and SSC revision.",
    accent: [1, 0.54, 0],
    chapters: [
      { title: "Making of the Constitution", points: ["Constituent Assembly first met on 9 December 1946", "Adopted 26 November 1949, in force 26 January 1950", "Dr B. R. Ambedkar chaired the Drafting Committee", "Dr Rajendra Prasad was President of the Constituent Assembly"] },
      { title: "Fundamental Rights (Part III)", points: ["Right to equality: Articles 14-18 (Art. 17 abolishes untouchability)", "Right to freedom: Articles 19-22 (Art. 21: life and personal liberty)", "Against exploitation: 23-24; religion: 25-28; cultural and educational: 29-30", "Constitutional remedies: Article 32"] },
      { title: "DPSP and Duties", points: ["Directive Principles: Part IV, Articles 36-51, not enforceable in courts", "Fundamental Duties: Part IVA, Article 51A, added by the 42nd Amendment (1976)", "There are 11 Fundamental Duties today (the 11th added in 2002)"] },
      { title: "Union government", points: ["President: Article 52, elected by an electoral college", "Parliament = President + Lok Sabha + Rajya Sabha (Article 79)", "Money Bills can be introduced only in the Lok Sabha (Article 110)", "Emergency provisions: Articles 352 (national), 356 (state), 360 (financial)"] },
    ],
  },
  {
    title: "SSC Quant Shortcuts: 60 Tricks That Save Time",
    subject: "SSC & Banking",
    tags: ["Quant", "Shortcuts", "SSC CGL"],
    price: 2_900,
    previewPages: 2,
    description: "Percentages, profit and loss, time and work, speed, averages and simplification shortcuts with solved examples, the tricks toppers use to finish quant early.",
    accent: [1, 0.72, 0],
    chapters: [
      { title: "Percentages", points: ["x% of y = y% of x (e.g. 8% of 50 = 50% of 8 = 4)", "Successive change a% then b%: a + b + ab/100", "If price rises r%, cut consumption by r/(100 + r) x 100% to keep spend same"] },
      { title: "Profit, loss and discount", points: ["Profit% = (SP - CP)/CP x 100", "Two articles sold at same SP, one at x% gain and one at x% loss: net loss = x^2/100 %", "Successive discounts a% and b%: a + b - ab/100"] },
      { title: "Time, work and speed", points: ["A in a days, B in b days: together ab/(a + b) days", "km/h to m/s: multiply by 5/18", "Average speed for equal distances: 2xy/(x + y)", "Train crossing a pole: time = length / speed"] },
      { title: "Averages and numbers", points: ["Average of first n natural numbers = (n + 1)/2", "Sum of first n natural numbers = n(n + 1)/2", "Divisibility by 3 and 9: sum of digits", "Squares ending in 5: 35^2 = (3 x 4) then 25 = 1225"] },
    ],
  },
];

const rgbOf = ([r, g, b]: [number, number, number]) => rgb(r, g, b);

/** A real multi-page PDF so preview, page counts and watermarks work end to end. */
export async function buildDemoPdf(d: Pick<DemoNote, "title" | "subject" | "accent" | "chapters">, author: string) {
  const doc = await PDFDocument.create();
  doc.setTitle(d.title);
  doc.setAuthor(author);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const W = 595;
  const H = 842;
  const wrap = (text: string, size: number, max: number, f = font) => {
    const lines: string[] = [];
    let line = "";
    for (const word of text.split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (f.widthOfTextAtSize(next, size) > max && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };

  const cover = doc.addPage([W, H]);
  cover.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgbOf(d.accent) });
  cover.drawRectangle({ x: 0, y: 0, width: W, height: 260, color: rgb(0.07, 0.06, 0.18) });
  cover.drawText(d.subject.toUpperCase(), { x: 48, y: H - 90, size: 14, font: bold, color: rgb(1, 1, 1), opacity: 0.8 });
  wrap(d.title, 34, W - 96, bold).forEach((l, i) => cover.drawText(l, { x: 48, y: H - 170 - i * 42, size: 34, font: bold, color: rgb(1, 1, 1) }));
  cover.drawText(`by ${author}`, { x: 48, y: 170, size: 16, font, color: rgb(1, 1, 1) });
  cover.drawText("Glideinbir Gurukul · Learn. Soar. Grow.", { x: 48, y: 140, size: 11, font, color: rgb(0.8, 0.8, 0.9) });

  // Two pages per chapter: summary + practice, so page counts look like real notes.
  let pageNo = 2;
  for (const [ci, ch] of d.chapters.entries()) {
    for (const kind of ["Key ideas", "Practice & tips"]) {
      const p = doc.addPage([W, H]);
      p.drawRectangle({ x: 0, y: H - 70, width: W, height: 70, color: rgbOf(d.accent) });
      p.drawText(`${ci + 1}. ${ch.title}`, { x: 40, y: H - 45, size: 20, font: bold, color: rgb(1, 1, 1) });
      p.drawText(kind, { x: 40, y: H - 110, size: 15, font: bold, color: rgb(0.1, 0.1, 0.2) });
      let y = H - 145;
      const lines = kind === "Key ideas" ? ch.points : ch.points.map((pt, i) => `Q${i + 1}. Explain or apply: ${pt}. Hint: start from the definition and check units.`);
      for (const pt of lines) {
        for (const [li, l] of wrap(pt, 12, W - 110).entries()) {
          if (li === 0) p.drawCircle({ x: 48, y: y + 4, size: 2.5, color: rgbOf(d.accent) });
          p.drawText(l, { x: 60, y, size: 12, font, color: rgb(0.15, 0.15, 0.22) });
          y -= 20;
        }
        y -= 8;
      }
      p.drawRectangle({ x: 40, y: 90, width: W - 80, height: 70, color: rgb(0.95, 0.95, 0.99), borderColor: rgbOf(d.accent), borderWidth: 1 });
      p.drawText("Remember", { x: 54, y: 136, size: 11, font: bold, color: rgbOf(d.accent) });
      p.drawText(`Revise "${ch.title}" twice this week and attempt the practice set untimed first.`, { x: 54, y: 114, size: 10, font, color: rgb(0.2, 0.2, 0.3) });
      p.drawText(`${pageNo}`, { x: W - 50, y: 40, size: 10, font, color: rgb(0.5, 0.5, 0.6) });
      pageNo++;
    }
  }
  return { bytes: await doc.save(), pages: doc.getPageCount() };
}

/** Adds the admin as an approved seller and three demo notes (idempotent by title). */
export async function loadDemoNotes(admin: PublicUser) {
  const storeName = "Glideinbir Originals";
  const v = await getVendor(admin.id);
  if (!v) await insertVendor({ userId: admin.id, name: admin.name, storeName, bio: "Hand-made revision notes from the Glideinbir team, checked by toppers.", subjects: ["JEE", "NEET", "Coding"], payoutUpi: "glideinbir@okaxis", status: "approved", appliedAt: nowIso(), reviewedAt: nowIso(), updatedAt: nowIso() });
  else if (v.status !== "approved") await changeVendor(admin.id, () => null, (x) => ({ ...x, status: "approved" }));
  const vendorName = (await getVendor(admin.id))!.storeName;
  const existing = new Set((await listNotes()).map((n) => n.title));
  let added = 0;
  for (const d of DEMO) {
    if (existing.has(d.title)) continue;
    const id = randomUUID();
    const file = `${randomUUID()}.pdf`;
    const { bytes, pages } = await buildDemoPdf(d, vendorName);
    await fs.mkdir(path.join(NOTES_DIR, id), { recursive: true });
    await fs.writeFile(path.join(NOTES_DIR, id, file), bytes);
    const now = nowIso();
    const note: NoteItem = { id, vendorId: admin.id, vendorName, title: d.title, description: d.description, subject: d.subject, tags: d.tags, price: d.price, previewPages: d.previewPages, file, pages, bytes: bytes.byteLength, cover: null, status: "published", sales: 0, createdAt: now, updatedAt: now };
    await insertNote(note);
    added++;
  }
  return added;
}
