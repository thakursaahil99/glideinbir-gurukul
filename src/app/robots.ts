import type { MetadataRoute } from "next";
import { siteUrl } from "@/core/site/url";

/** Logged-in areas redirect to /login anyway; keep crawlers out of them and the API. */
const PRIVATE = [
  "/api/",
  "/admin",
  "/dashboard",
  "/courses",
  "/tests",
  "/notes",
  "/doubts",
  "/mentorship",
  "/code",
  "/jobs",
  "/wallet",
  "/notifications",
  "/profile",
  "/verify/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
