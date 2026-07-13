import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getSession } from "@/lib/session";
import { Hero } from "@/components/sections/Hero";
import { Marquee } from "@/components/sections/Marquee";
import { IntakeCallDemo } from "@/components/sections/IntakeCallDemo";
import { DemoVideoHero } from "@/components/sections/DemoVideoHero";
import { SocialProof } from "@/components/sections/SocialProof";
import { Problem } from "@/components/sections/Problem";
import { ProductStack } from "@/components/sections/ProductStack";
import { MissedCallFlow } from "@/components/sections/MissedCallFlow";
import { NumberChoice } from "@/components/sections/NumberChoice";
import { ApprovalLoop } from "@/components/sections/ApprovalLoop";
import { AiDispatcher } from "@/components/sections/AiDispatcher";
import { SchedulingModes } from "@/components/sections/SchedulingModes";
import { FeatureTabs } from "@/components/sections/FeatureTabs";
import { Comparison } from "@/components/sections/Comparison";
import { Features } from "@/components/sections/Features";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { TrustROI } from "@/components/sections/TrustROI";
import { About } from "@/components/sections/About";
import { WorkForYou } from "@/components/sections/WorkForYou";
import { Pricing } from "@/components/sections/Pricing";
import { FAQ } from "@/components/sections/FAQ";
import { CTA } from "@/components/sections/CTA";

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="vow-site flex min-h-screen flex-col">
      <Header session={session} />
      <main className="flex-1">
        {/* 1. Hero — value prop + primary CTA */}
        <Hero />
        <Marquee />
        {/* 2. Tabbed demo videos (ACE-style) + interactive call demo */}
        <DemoVideoHero />
        <IntakeCallDemo />
        {/* 3. Trust — credibility before the pain */}
        <SocialProof variant="trust" />
        {/* 3. Problem — why missed calls hurt */}
        <Problem />
        {/* 4. Solution — platform + workflows (all existing product sections) */}
        <ProductStack />
        <MissedCallFlow />
        {/* Your number or ours + the AI-backup safety net */}
        <NumberChoice />
        <ApprovalLoop />
        <AiDispatcher />
        <SchedulingModes />
        <FeatureTabs />
        <Comparison />
        {/* 5. Features — full capability grid */}
        <Features />
        {/* 6. How it works — go-live steps */}
        <HowItWorks />
        {/* 7. Results — ROI math */}
        <TrustROI />
        {/* 8. Testimonials — social proof from real operators */}
        <SocialProof />
        {/* 9. Philosophy — brand meaning */}
        <About />
        <WorkForYou />
        {/* 10. Conversion path */}
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
