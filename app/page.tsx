import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BetaBanner } from "@/components/BetaBanner";
import { IS_BETA } from "@/lib/beta";
import { getSession } from "@/lib/session";
import { Hero } from "@/components/sections/Hero";
import { SignupFlow } from "@/components/sections/SignupFlow";
import { Differentiators } from "@/components/sections/Differentiators";
import { Problem } from "@/components/sections/Problem";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Features } from "@/components/sections/Features";
import { Pricing } from "@/components/sections/Pricing";
import { FAQ } from "@/components/sections/FAQ";
import { CTA } from "@/components/sections/CTA";

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="vow-site flex min-h-screen flex-col">
      {IS_BETA ? <BetaBanner /> : null}
      <Header session={session} />
      <main className="flex-1">
        <Hero />
        <SignupFlow />
        <Differentiators />
        <Problem />
        <HowItWorks />
        <Features />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
