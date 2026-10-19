import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { findUserById } from "@/core/auth/users";
import { notify } from "@/core/notifications/store";
import { progressPercent } from "./logic";
import { issueCertificate, listProgress } from "./store";
import type { Certificate, Course } from "./types";

/** Issues the certificate the moment a learner reaches 100%. Safe to call repeatedly. */
export async function maybeIssueCertificate(userId: string, course: Course): Promise<Certificate | null> {
  if (progressPercent(course, await listProgress(userId, course.id)) < 100) return null;
  const [learner, instructor] = await Promise.all([findUserById(userId), findUserById(course.instructorId)]);
  if (!learner) return null;
  const { cert, created } = await issueCertificate({
    courseId: course.id,
    userId,
    userName: learner.name,
    courseTitle: course.title,
    instructorName: instructor?.name ?? "Glideinbir Gurukul",
  });
  if (created)
    await notify(userId, {
      kind: "module",
      title: `Certificate earned: ${course.title}`,
      body: `You completed every lecture. Verification code ${cert.code}.`,
      href: "/courses/my",
    });
  return cert;
}

const hexRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

/** Standard fonts only cover Latin-1; replace anything else so drawing never throws. */
const latin1 = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");

/** A4 landscape certificate. */
export async function certificatePdf(cert: Certificate, verifyUrl: string, colors: [string, string] = ["#ff8a00", "#5b47ff"]) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Certificate ${cert.code}`);
  pdf.setAuthor("Glideinbir Gurukul");
  const page = pdf.addPage([842, 595]);
  const { width: W, height: H } = page.getSize();
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.08, 0.07, 0.17);
  const muted = rgb(0.4, 0.38, 0.5);

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(0.99, 0.97, 0.95) });
  page.drawRectangle({ x: 0, y: H - 14, width: W / 2, height: 14, color: hexRgb(colors[0]) });
  page.drawRectangle({ x: W / 2, y: H - 14, width: W / 2, height: 14, color: hexRgb(colors[1]) });
  page.drawRectangle({ x: 28, y: 28, width: W - 56, height: H - 70, borderColor: rgb(0.85, 0.82, 0.78), borderWidth: 1.2 });

  const center = (text: string, y: number, size: number, font = sans, color = ink) => {
    const t = latin1(text);
    let s = size;
    while (font.widthOfTextAtSize(t, s) > W - 140 && s > 10) s -= 1;
    page.drawText(t, { x: (W - font.widthOfTextAtSize(t, s)) / 2, y, size: s, font, color });
  };

  center("GLIDEINBIR GURUKUL", H - 92, 14, sansBold, muted);
  center("Certificate of Completion", H - 150, 40, serif);
  center("This is to certify that", H - 205, 14, serifItalic, muted);
  center(cert.userName, H - 258, 36, serif, hexRgb(colors[1]));
  center("has successfully completed the course", H - 300, 14, serifItalic, muted);
  center(cert.courseTitle, H - 345, 24, sansBold);
  center(`Instructor: ${cert.instructorName}`, H - 378, 12, sans, muted);

  const date = new Date(cert.issuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  page.drawText(latin1(`Issued ${date}`), { x: 70, y: 80, size: 11, font: sans, color: muted });
  page.drawText(`Certificate ID  ${cert.code}`, { x: 70, y: 62, size: 11, font: sansBold, color: ink });
  const v = latin1(`Verify at ${verifyUrl}`);
  page.drawText(v, { x: W - 70 - sans.widthOfTextAtSize(v, 10), y: 62, size: 10, font: sans, color: muted });
  const motto = "Learn. Soar. Grow.";
  page.drawText(motto, { x: W - 70 - serifItalic.widthOfTextAtSize(motto, 13), y: 80, size: 13, font: serifItalic, color: muted });

  return pdf.save();
}
