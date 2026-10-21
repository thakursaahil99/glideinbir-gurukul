import { ImageResponse } from "next/og";
import { getSite } from "@/core/site/store";
import { BirdSvg } from "./brand-image";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
/** Brand name and hero words are admin-editable. */
export const dynamic = "force-dynamic";
export const alt = "Glideinbir Gurukul: courses, tests, notes, doubts, mentors, coding and jobs";

const WORLDS = ["Courses", "Test Series", "Notes", "Instant Doubts", "Mentorship", "Coding", "Jobs"];

/** Share card for the whole site (admin-editable brand name and hero words). */
export default async function OpengraphImage() {
  const { brand, hero } = await getSite();
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        color: "#f4f2ff",
        backgroundColor: "#07061a",
        backgroundImage: "radial-gradient(circle at 85% 10%, #2a1f7a 0%, #07061a 55%)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <BirdSvg width={96} />
        <div style={{ fontSize: 40, fontWeight: 700 }}>{brand.name}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ fontSize: 112, fontWeight: 800, letterSpacing: -4, lineHeight: 1 }}>{hero.words.join(" ")}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {WORLDS.map((w) => (
            <div
              key={w}
              style={{
                fontSize: 23,
                padding: "7px 16px",
                borderRadius: 999,
                border: "2px solid rgba(255,255,255,0.18)",
                color: "#a3a0c4",
              }}
            >
              {w}
            </div>
          ))}
        </div>
      </div>
    </div>,
    size,
  );
}
