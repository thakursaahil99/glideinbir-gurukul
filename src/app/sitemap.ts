import type { MetadataRoute } from "next";
import { siteUrl } from "@/core/site/url";

/** Only public pages: everything else sits behind login. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/remote-jobs`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/signup`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
