import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getSession } from "@/lib/session";
import { Hero } from "@/components/sections/Hero";
import { IntakeCallDemo } from "@/components/sections/IntakeCallDemo";
import { SocialProof } from "@/components/sections/SocialProof";
import { Problem } from "@/components/sections/Problem";
import { ProductStack } from "@/components/sections/ProductStack";
import { MissedCallFlow } from "@/components/sections/MissedCallFlow";
import { ApprovalLoop } from "@/components/sections/ApprovalLoop";
import { AiDispatcher } from "@/components/sections/AiDispatcher";
import { SchedulingModes } from "@/components/sections/SchedulingModes";
import { Comparison } from "@/components/sections/Comparison";
import { Features } from "@/components/sections/Features";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { TrustROI } from "@/components/sections/TrustROI";
import { About } from "@/components/sections/About";
import { Pricing } from "@/components/sections/Pricing";
import { FAQ } from "@/components/sections/FAQ";
import { CTA } from "@/components/sections/CTA";
import { VerticalFeatureToggle } from "@/components/sections/VerticalFeatureToggle";
import {
  problemHvac,
  productStackHvac,
  missedCallFlowHvac,
  approvalLoopHvac,
  aiDispatcherHvac,
  schedulingModesHvac,
  comparisonHvac,
  featuresHvac,
} from "@/lib/content-marketing-hvac-en";

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="vow-site flex min-h-screen flex-col">
      <Header session={session} />
      <main className="flex-1">
        {/* 1. Hero — value prop + primary CTA */}
        <Hero />
        {/* 2. Interactive intake call demo */}
        <IntakeCallDemo />
        {/* 3. Trust — credibility before the pain */}
        <SocialProof variant="trust" />
        {/* 3-5. Vertical-specific sections — toggle without leaving the page */}
        <VerticalFeatureToggle
          restoration={
            <>
              <Problem />
              <ProductStack />
              <MissedCallFlow />
              <ApprovalLoop />
              <AiDispatcher />
              <SchedulingModes />
              <Comparison />
              <Features />
            </>
          }
          hvac={
            <>
              <Problem content={problemHvac} />
              <ProductStack content={productStackHvac} />
              <MissedCallFlow content={missedCallFlowHvac} />
              <ApprovalLoop content={approvalLoopHvac} />
              <AiDispatcher content={aiDispatcherHvac} />
              <SchedulingModes content={schedulingModesHvac} />
              <Comparison content={comparisonHvac} />
              <Features content={featuresHvac} />
            </>
          }
        />
        {/* 6. How it works — go-live steps */}
        <HowItWorks />
        {/* 7. Results — ROI math */}
        <TrustROI />
        {/* 8. Testimonials — social proof from real operators */}
        <SocialProof />
        {/* 9. Philosophy — brand meaning */}
        <About />
        {/* 10. Conversion path */}
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
