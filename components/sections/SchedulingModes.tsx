import { siteSchedulingModes } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function SchedulingModes() {
  const s = siteSchedulingModes;

  return (
    <section id={s.id} className="vow-site-section py-20 sm:py-24">
      <Container>
        <SectionHeading label={s.label} title={s.title} subtitle={s.subtitle} />

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {s.modes.map((mode) => (
            <article
              key={mode.id}
              className={`vow-site-card relative flex flex-col p-6 ${
                mode.badge ? "border-violet-500/40 ring-1 ring-violet-500/20" : ""
              }`}
            >
              {mode.badge ? (
                <span className="absolute -top-3 left-5 rounded-full bg-violet-600 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                  {mode.badge}
                </span>
              ) : null}
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">
                {mode.name}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">{mode.tagline}</h3>

              {mode.description ? (
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">
                  {mode.description}
                </p>
              ) : null}

              {mode.details && mode.details.length > 0 ? (
                <ul className="mt-3 flex-1 space-y-2">
                  {mode.details.map((row, i) =>
                    row.label ? (
                      <li
                        key={`${row.label}-${row.value}`}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="text-slate-400">{row.label}</span>
                        <span className="font-medium text-slate-200">{row.value}</span>
                      </li>
                    ) : (
                      <li key={`${row.value}-${i}`} className="text-sm font-medium text-slate-200">
                        {row.value}
                      </li>
                    ),
                  )}
                </ul>
              ) : null}

              <p className="mt-4 border-t border-white/[0.06] pt-4 text-xs text-slate-500">
                <span className="font-medium text-slate-400">Best for: </span>
                {mode.bestFor}
              </p>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-slate-500">
          {s.footnote}
        </p>
      </Container>
    </section>
  );
}
