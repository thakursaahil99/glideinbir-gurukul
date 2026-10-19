import { z } from "zod";

export const MODULE_KEYS = ["courses", "tests", "notes", "doubts", "mentorship", "code", "jobs"] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

const text = (max: number) => z.string().trim().max(max, `Max ${max} characters`);
const required = (max: number) => text(max).min(1, "Required");
const lines = (maxItems: number, maxLen: number) => z.array(required(maxLen)).max(maxItems, `Max ${maxItems} items`);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #ff8a00");

const heading = z.object({ eyebrow: text(60), title: required(120), sub: text(400) });

export const moduleConfigSchema = z.object({
  key: z.enum(MODULE_KEYS),
  name: required(40),
  tagline: text(80),
  description: text(300),
  style: text(40),
  colors: z.tuple([hex, hex]),
  enabled: z.boolean(),
  phase: z.number().int().min(0).max(99),
  features: lines(10, 40),
});
export type ModuleConfig = z.infer<typeof moduleConfigSchema>;

/**
 * Everything on the public site and dashboard that the admin can edit.
 * `**bold**` is supported in fields rendered with <Rich />.
 */
export const siteSchema = z.object({
  brand: z.object({
    name: required(40),
    footerBlurb: text(200),
    madeIn: text(60),
    announcement: z.object({ enabled: z.boolean(), text: text(160), href: text(200) }),
  }),
  hero: z.object({
    badgeTag: text(12),
    badge: text(80),
    words: z.tuple([required(20), required(20), required(20)]),
    intro: text(400),
    primaryCta: required(40),
    secondaryCta: required(40),
    footnote: text(160),
  }),
  marquee: z.object({ rowA: lines(20, 30), rowB: lines(20, 30) }),
  modulesSection: heading,
  stats: z
    .array(z.object({ value: z.number().int().min(0).max(1_000_000_000), prefix: text(4), suffix: text(4), label: required(60) }))
    .min(1)
    .max(4),
  journey: heading.extend({
    quote: text(80),
    quoteMeaning: text(120),
    steps: z.array(z.object({ kicker: text(30), title: required(80), body: text(300) })).length(4),
  }),
  personas: heading.extend({
    roles: z.array(z.object({ role: required(30), line: text(80), perks: lines(4, 40) })).length(6),
  }),
  cta: z.object({
    kicker: text(40),
    title: required(80),
    highlight: text(40),
    body: text(300),
    primary: required(40),
    secondary: required(40),
  }),
  dashboard: z.object({ greetingName: required(30), tagline: text(80) }),
  modules: z
    .array(moduleConfigSchema)
    .length(MODULE_KEYS.length)
    .refine((ms) => new Set(ms.map((m) => m.key)).size === MODULE_KEYS.length, "Each module must appear once"),
});

export type SiteContent = z.infer<typeof siteSchema>;
export type SiteSection = keyof SiteContent;
export const SITE_SECTIONS = Object.keys(siteSchema.shape) as SiteSection[];
