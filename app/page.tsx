import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ROUTES } from "@/lib/constants";
import { getSession } from "@/lib/session";
import { Hero } from "@/components/sections/Hero";
import { LandingQuickQA } from "@/components/sections/LandingQuickQA";
import { CallExperience } from "@/components/sections/CallExperience";
import { DemoVideoHero } from "@/components/sections/DemoVideoHero";
import { DemoSummary } from "@/components/sections/DemoSummary";
import { SocialProof } from "@/components/sections/SocialProof";
import { NumberChoice } from "@/components/sections/NumberChoice";
import { Comparison } from "@/components/sections/Comparison";
import { WhyWeWin } from "@/components/sections/WhyWeWin";
import { ApprovalLoop } from "@/components/sections/ApprovalLoop";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Pricing } from "@/components/sections/Pricing";
import { FAQ } from "@/components/sections/FAQ";
import { CTA } from "@/components/sections/CTA";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    redirect(ROUTES.dashboard);
  }

  return (
    <div className="vow-site flex min-h-screen flex-col overflow-x-hidden">
      <Header session={null} />
      <main className="flex-1 w-full min-w-0">
        <Hero />
        <LandingQuickQA />
        <CallExperience />
        <DemoVideoHero />
        <DemoSummary />
        <SocialProof variant="trust" />
        <NumberChoice />
        <Comparison />
        <WhyWeWin />
        <ApprovalLoop />
        <HowItWorks />
        <SocialProof />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
