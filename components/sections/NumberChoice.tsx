import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

const OPTIONS = [
  {
    id: "keep",
    badge: "Option A",
    title: "Keep your own number",
    description:
      "Customers dial the same company number that's on your trucks and Google listing. When you're busy or nobody answers in ~20 seconds, the call forwards to Effiroad — you still pick up every live call yourself.",
    points: [
      "Nothing changes for your customers",
      "One-tap carrier setup, or use your VoIP / Google Voice",
      "Only missed rings come to us",
    ],
  },
  {
    id: "ours",
    badge: "Option B",
    title: "Use the number we give you",
    description:
      "Publish the dedicated Effiroad number instead — no carrier codes at all. During your answer hours the AI picks up; outside them the call rings your own phone so you can take it live. Set no hours and the AI simply covers you 24/7.",
    points: [
      "Zero forwarding setup — just use our number",
      "Business hours ring straight to you",
      "Turn it on with one click",
    ],
  },
];

export function NumberChoice() {
  return (
    <section id="number-choice" className="vow-site-section py-20 sm:py-24">
      <Container>
        <SectionHeading
          title="Your number or ours — either way, no missed call"
          subtitle="Pick whichever fits how you already run. The safety net is the same: if a call slips past a human, the AI catches it."
          align="center"
        />

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {OPTIONS.map((o) => (
            <article key={o.id} className="vow-site-card flex flex-col p-6 sm:p-7">
              <span className="w-fit rounded-full border border-brand-300 bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">
                {o.badge}
              </span>
              <h3 className="mt-4 text-xl font-bold text-brand-900">{o.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-stone-700">{o.description}</p>
              <ul className="mt-5 space-y-2">
                {o.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-stone-700">
                    <span className="mt-0.5 text-brand-600" aria-hidden>
                      ✓
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        {/* The shared safety net — the part shops actually worry about. */}
        <div className="mx-auto mt-6 flex max-w-3xl flex-col items-center gap-3 rounded-2xl border border-brand-300/70 bg-brand-50/80 px-6 py-6 text-center sm:flex-row sm:text-left">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-400/30 bg-brand-500/10 text-xl"
            aria-hidden
          >
            🛟
          </span>
          <p className="text-base leading-relaxed text-brand-900">
            <span className="font-semibold">Miss a call and the AI backs you up automatically.</span>{" "}
            No answer, busy line, after hours, or three phones ringing at once — the caller still gets
            answered, their details captured, and the lead lands on your dashboard. Nothing falls through.
          </p>
        </div>
      </Container>
    </section>
  );
}
