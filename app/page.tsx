import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getSession } from "@/lib/session";
import { Hero } from "@/components/sections/Hero";
import { ProductStack } from "@/components/sections/ProductStack";
import { Problem } from "@/components/sections/Problem";
import { About } from "@/components/sections/About";
import { MissedCallFlow } from "@/components/sections/MissedCallFlow";
import { ApprovalLoop } from "@/components/sections/ApprovalLoop";
import { AiDispatcher } from "@/components/sections/AiDispatcher";
import { Features } from "@/components/sections/Features";
import { AgreementKeeper } from "@/components/sections/AgreementKeeper";
import { SchedulingModes } from "@/components/sections/SchedulingModes";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { TrustROI } from "@/components/sections/TrustROI";
import { SocialProof } from "@/components/sections/SocialProof";
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
        <ProductStack />
        <MissedCallFlow />
        <Problem />
        <About />
        <ApprovalLoop />
        <AiDispatcher />
        <Features />
        <AgreementKeeper />
        <SchedulingModes />
        <HowItWorks />
        <TrustROI />
        <SocialProof />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
