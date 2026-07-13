import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getSession } from "@/lib/session";
import { Hero } from "@/components/sections/Hero";
import { DemoVideoHero } from "@/components/sections/DemoVideoHero";
import { DemoSummary } from "@/components/sections/DemoSummary";
import { SocialProof } from "@/components/sections/SocialProof";
import { NumberChoice } from "@/components/sections/NumberChoice";
import { ApprovalLoop } from "@/components/sections/ApprovalLoop";
import { HowItWorks } from "@/components/sections/HowItWorks";
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
        <DemoVideoHero />
        <DemoSummary />
        <SocialProof variant="trust" />
        <NumberChoice />
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
