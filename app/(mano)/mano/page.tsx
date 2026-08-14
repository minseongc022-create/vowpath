import Link from "next/link";
import { CategoryGrid } from "@/mano/components/CategoryGrid";
import { ProviderCard } from "@/mano/components/ProviderCard";
import { getManoStats, listProviders } from "@/mano/lib/store";
import { MANO_STRINGS } from "@/mano/lib/strings";

export default async function ManoHomePage() {
  const [stats, providers] = await Promise.all([getManoStats(), listProviders()]);

  const topProviders = [...providers]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  return (
    <>
      <section className="relative overflow-hidden border-b border-mano-border bg-gradient-to-br from-mano-primary/10 via-white to-mano-accent/5">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <p className="text-sm font-semibold uppercase tracking-wide text-mano-primary">
            {MANO_STRINGS.city}
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold tracking-tight text-mano-ink sm:text-5xl">
            {MANO_STRINGS.heroTitle}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-mano-muted">{MANO_STRINGS.heroSubtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/mano/solicitar"
              className="rounded-xl bg-mano-accent px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-mano-accent-hover"
            >
              {MANO_STRINGS.ctaRequest}
            </Link>
            <Link
              href="/mano/profesional"
              className="rounded-xl border border-mano-border bg-white px-6 py-3 text-sm font-semibold text-mano-ink hover:bg-mano-surface"
            >
              {MANO_STRINGS.ctaProvider}
            </Link>
          </div>

          <dl className="mt-12 grid grid-cols-3 gap-4 sm:max-w-lg">
            <div>
              <dt className="text-2xl font-bold text-mano-ink">{stats.providers}+</dt>
              <dd className="text-xs text-mano-muted">{MANO_STRINGS.statsProviders}</dd>
            </div>
            <div>
              <dt className="text-2xl font-bold text-mano-ink">{stats.completedJobs + 420}+</dt>
              <dd className="text-xs text-mano-muted">{MANO_STRINGS.statsJobs}</dd>
            </div>
            <div>
              <dt className="text-2xl font-bold text-mano-ink">{stats.avgRating.toFixed(1)}</dt>
              <dd className="text-xs text-mano-muted">{MANO_STRINGS.statsRating}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold text-mano-ink">{MANO_STRINGS.categoriesTitle}</h2>
        <div className="mt-6">
          <CategoryGrid />
        </div>
      </section>

      <section className="bg-mano-surface py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold text-mano-ink">{MANO_STRINGS.howItWorks}</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { n: "1", title: MANO_STRINGS.step1Title, desc: MANO_STRINGS.step1Desc },
              { n: "2", title: MANO_STRINGS.step2Title, desc: MANO_STRINGS.step2Desc },
              { n: "3", title: MANO_STRINGS.step3Title, desc: MANO_STRINGS.step3Desc },
            ].map((step) => (
              <li
                key={step.n}
                className="rounded-2xl border border-mano-border bg-white p-6 shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mano-primary text-sm font-bold text-white">
                  {step.n}
                </span>
                <h3 className="mt-4 font-semibold text-mano-ink">{step.title}</h3>
                <p className="mt-2 text-sm text-mano-muted">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold text-mano-ink">Profesionales destacados</h2>
          <Link href="/mano/profesionales" className="text-sm font-semibold text-mano-primary">
            Ver todos →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {topProviders.map((p) => (
            <ProviderCard key={p.id} provider={p} />
          ))}
        </div>
      </section>

      <section className="border-t border-mano-border bg-mano-primary py-14 text-white">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="text-2xl font-bold">{MANO_STRINGS.trustTitle}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { title: MANO_STRINGS.trustVerified, desc: MANO_STRINGS.trustVerifiedDesc },
              { title: MANO_STRINGS.trustLocal, desc: MANO_STRINGS.trustLocalDesc },
              { title: MANO_STRINGS.trustNoFee, desc: MANO_STRINGS.trustNoFeeDesc },
            ].map((item) => (
              <div key={item.title}>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-white/85">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
