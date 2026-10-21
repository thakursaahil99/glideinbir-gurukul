import type { MetadataRoute } from "next";
import { getSite } from "@/core/site/store";

/** Brand name is admin-editable. */
export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { brand, hero } = await getSite();
  return {
    name: brand.name,
    short_name: brand.name.split(" ")[0],
    description: `${hero.words.join(" ")} Courses, tests, notes, doubts, mentors, coding and jobs in one app.`,
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#07061a",
    theme_color: "#07061a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
