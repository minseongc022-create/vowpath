import type { Metadata } from "next";

import { Header } from "@/components/layout/Header";

import { Footer } from "@/components/layout/Footer";

import { BetaBanner } from "@/components/BetaBanner";

import { Pricing } from "@/components/sections/Pricing";

import { IS_BETA } from "@/lib/beta";

import { getSession } from "@/lib/session";



export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Effiroad plans for restoration companies — Lite, Flex, or Unlimited. AI voice, SMS, dispatch, and analytics included.",
};



export default async function PricingPage() {

  const session = await getSession();



  return (

    <div className="vow-site flex min-h-screen flex-col">

      {IS_BETA ? <BetaBanner /> : null}

      <Header session={session} />

      <main className="flex-1">

        <Pricing />

      </main>

      <Footer />

    </div>

  );

}

