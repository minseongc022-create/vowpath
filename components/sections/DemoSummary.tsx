import { Container } from "@/components/ui/Container";

const STEPS = [
  {
    title: "Same phone number",
    body: "Keep your Google and truck line. Forward unanswered calls to Effiroad — customers never see a new number.",
  },
  {
    title: "Voice or text link",
    body: "Callers talk to AI on the phone, or press 2 for a one-minute SMS form. Name, address, and loss type captured either way.",
  },
  {
    title: "You stay in control",
    body: "Clear water / no-heat jobs can notify your crew. Fire, mold, gas smell, or anything unclear — you approve by text first.",
  },
  {
    title: "Live in ~10 minutes",
    body: "Sign up, set on-call hours, forward your line, run one test call. Jobber sync optional.",
  },
] as const;

export function DemoSummary() {
  return (
    <section className="border-b border-brand-200/40 bg-brand-50 py-14 sm:py-16">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-xl font-bold tracking-tight text-brand-900 sm:text-2xl">
            What you just saw — in plain English
          </h2>
          <p className="mt-2 text-sm text-stone-600 sm:text-base">
            Built for independent water, fire, mold restoration and HVAC shops — not franchise call centers.
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
          {STEPS.map((step, i) => (
            <article
              key={step.title}
              className="rounded-xl border border-brand-200/80 bg-white p-5 shadow-sm"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-xs font-bold text-slate-950">
                {i + 1}
              </span>
              <h3 className="mt-3 font-semibold text-brand-900">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{step.body}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
