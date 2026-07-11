import { Container } from "@/components/ui/Container";

const POINTS = [
  {
    title: "Real Dispatches, Real Revenue",
    description:
      "Every call Effiroad answers is a job your crew can actually close — not a lead you have to chase down later.",
  },
  {
    title: "Your Crew, Your Rules",
    description:
      "You set the on-call rotation, the approval loop, and the priority thresholds. Effiroad follows your playbook, not the other way around.",
  },
  {
    title: "Human When It Matters",
    description:
      "Every dispatch and estimate lands in front of your team for the final call. The AI handles the phone — your crew still runs the business.",
  },
];

export function WorkForYou() {
  return (
    <section className="vow-site-section border-y border-brand-200/80 bg-brand-50 py-20 sm:py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-brand-950 sm:text-4xl text-balance">
            We Work For You, Not Against You
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-stone-700">
            Effiroad answers the phone so your crew doesn&apos;t have to — but every decision still runs through you.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-3">
          {POINTS.map((point) => (
            <article key={point.title} className="vow-site-card p-6">
              <h3 className="text-base font-semibold text-brand-900">{point.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-stone-700">{point.description}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
