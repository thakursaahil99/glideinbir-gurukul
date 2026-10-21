import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans, Tiro_Devanagari_Hindi } from "next/font/google";
import { ThemeProvider, themeScript } from "@/components/theme/theme-provider";
import { SiteProvider } from "@/core/site/site-context";
import { getSite } from "@/core/site/store";
import { siteUrl } from "@/core/site/url";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const tiro = Tiro_Devanagari_Hindi({
  subsets: ["devanagari", "latin"],
  weight: "400",
  variable: "--font-tiro",
  display: "swap",
});

/** Site content is admin-editable, so every request reads the latest copy. */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { brand, hero } = await getSite();
  const title = `${brand.name} · ${hero.words.join(" ")}`;
  const description =
    "One login, one wallet, seven learning worlds: courses, test series, notes, instant doubt solving, mentorship, coding practice and jobs.";
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: `%s · ${brand.name}` },
    description,
    applicationName: brand.name,
    openGraph: { type: "website", siteName: brand.name, title, description, locale: "en_IN", url: "/" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8f3" },
    { media: "(prefers-color-scheme: dark)", color: "#07061a" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const site = await getSite();
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${bricolage.variable} ${jakarta.variable} ${tiro.variable} grain antialiased`}>
        <a
          href="#main"
          className="sr-only z-[100] rounded-xl bg-fg px-4 py-2 font-semibold text-bg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <SiteProvider value={site}>{children}</SiteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
