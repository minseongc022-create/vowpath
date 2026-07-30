import Link from "next/link";
import {
  MatchCutFooter,
  MatchCutMarketingHeader,
} from "@/components/matchcut/MatchCutShell";
import { getMatchCutSession } from "@/lib/matchcut/session";
import { MATCHCUT_ROUTES, WELCOME_CREDITS, estimateStandardPageCredits, packById } from "@/lib/matchcut/constants";
import {
  matchCutFeatures,
  matchCutHero,
  matchCutHow,
  matchCutProblem,
} from "@/lib/matchcut/content-ko";

export default async function MatchCutLandingPage() {
  const session = await getMatchCutSession();

  const sellerPack = packById("pack_150");
  const pagesPerSellerPack =
    sellerPack
      ? Math.floor(sellerPack.credits / estimateStandardPageCredits())
      : 0;

  return (
    <>
      <MatchCutMarketingHeader session={session} />
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-trust-600">
            {matchCutHero.eyebrow}
          </p>
          <h1 className="mt-4 whitespace-pre-line text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
            {matchCutHero.title}
          </h1>
          <p className="mt-6 text-lg text-slate-600">{matchCutHero.subtitle}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={session ? MATCHCUT_ROUTES.app : MATCHCUT_ROUTES.signup}
              className="rounded-xl bg-trust-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-trust-600/25 hover:bg-trust-700"
            >
              {matchCutHero.cta}
            </Link>
            <Link
              href={MATCHCUT_ROUTES.pricing}
              className="rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              {matchCutHero.secondaryCta}
            </Link>
          </div>
          <p className="mt-4 text-sm text-trust-700">
            가입 즉시 {WELCOME_CREDITS}크레딧 · 셀러팩 19,900원에 상세페이지 {pagesPerSellerPack}건+
          </p>
        </div>

        <div className="mt-20 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">{matchCutProblem.title}</h2>
          <ul className="mt-4 space-y-3">
            {matchCutProblem.items.map((item) => (
              <li key={item} className="flex gap-3 text-slate-600">
                <span className="text-trust-500">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div id="how" className="mt-20">
          <h2 className="text-center text-2xl font-bold">어떻게 동작하나요?</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {matchCutHow.map((step) => (
              <div
                key={step.step}
                className="rounded-2xl border border-trust-100 bg-gradient-to-b from-trust-50/80 to-white p-6"
              >
                <span className="text-sm font-bold text-trust-600">{step.step}</span>
                <h3 className="mt-2 text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{step.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {matchCutFeatures.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
      <MatchCutFooter />
    </>
  );
}
