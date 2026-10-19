import { CTA, Footer } from "@/components/landing/cta-footer";
import { Hero } from "@/components/landing/hero";
import { ModulesBento } from "@/components/landing/modules-bento";
import { Navbar } from "@/components/landing/navbar";
import { Personas } from "@/components/landing/personas";
import { Journey, Marquee, Stats } from "@/components/landing/sections";
import { CursorGlow, ScrollProgress } from "@/components/motion/effects";
import { IntroLoader } from "@/components/motion/intro-loader";
import { SmoothScroll } from "@/components/motion/smooth-scroll";

export default function LandingPage() {
  return (
    <>
      <IntroLoader />
      <SmoothScroll />
      <ScrollProgress />
      <CursorGlow />
      <Navbar />
      <main className="relative overflow-x-clip">
        <Hero />
        <Marquee />
        <ModulesBento />
        <Stats />
        <Journey />
        <Personas />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
