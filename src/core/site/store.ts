import { readJson, updateJson } from "@/core/db/json-store";
import { DEFAULT_SITE } from "./defaults";
import { siteSchema, type SiteContent, type SiteSection } from "./schema";

const FILE = "site.json";

/** Section-by-section parse: a broken or outdated section falls back to its default instead of breaking the site. */
function parseSite(raw: unknown): SiteContent {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = { ...DEFAULT_SITE } as Record<SiteSection, unknown>;
  for (const key of Object.keys(DEFAULT_SITE) as SiteSection[]) {
    const parsed = siteSchema.shape[key].safeParse(obj[key]);
    if (parsed.success) out[key] = parsed.data;
  }
  return out as SiteContent;
}

export async function getSite(): Promise<SiteContent> {
  return parseSite(await readJson(FILE));
}

export async function saveSiteSection<K extends SiteSection>(key: K, value: SiteContent[K]) {
  return updateJson(FILE, parseSite, (site) => ({ ...site, [key]: value }));
}
