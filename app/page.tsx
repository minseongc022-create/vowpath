import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getSession } from "@/lib/session";
import { Hero } from "@/components/sections/Hero";
import { MissedCallFlow } from "@/components/sections/MissedCallFlow";
import { ApprovalLoop } from "@/components/sections/ApprovalLoop";
import { SchedulingModes } from "@/components/sections/SchedulingModes";
import { Problem } from "@/components/sections/Problem";
import { TrustROI } from "@/components/sections/TrustROI";
import { AiDispatcher } from "@/components/sections/AiDispatcher";
import { About } from "@/components/sections/About";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Differentiators } from "@/components/sections/Differentiators";
import { Comparison } from "@/components/sections/Comparison";
import { JobberOptional } from "@/components/sections/JobberOptional";
import { Features } from "@/components/sections/Features";
import { SocialProof } from "@/components/sections/SocialProof";
import { SignupFlow } from "@/components/sections/SignupFlow";
import { Pricing } from "@/components/sections/Pricing";
import { FAQ } from "@/components/sections/FAQ";
import { CTA } from "@/components/sections/CTA";

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="vow-site flex min-h-screen flex-col">
      <Header session={session} />
      <main className="flex-1">
        <Hero />
        <MissedCallFlow />
        <ApprovalLoop />
        <SchedulingModes />
        <Problem />
        <TrustROI />
        <AiDispatcher />
        <About />
        <HowItWorks />
        <Differentiators />
        <Comparison />
        <JobberOptional />
        <Features />
        <SocialProof />
        <SignupFlow />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
