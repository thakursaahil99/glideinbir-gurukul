import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans, Tiro_Devanagari_Hindi } from "next/font/google";
import { ThemeProvider, themeScript } from "@/components/theme/theme-provider";
import { SiteProvider } from "@/core/site/site-context";
import { getSite } from "@/core/site/store";
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
  return {
    title: { default: `${brand.name} · ${hero.words.join(" ")}`, template: `%s · ${brand.name}` },
    description:
      "One login, one wallet, seven learning worlds: courses, test series, notes, instant doubt solving, mentorship, coding practice and jobs.",
    applicationName: brand.name,
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
        <ThemeProvider>
          <SiteProvider value={site}>{children}</SiteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
