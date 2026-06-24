import { siteApprovalLoop } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";

function FlowNode({
  title,
  caption,
  highlight,
}: {
  title: string;
  caption: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex min-w-[5rem] flex-col items-center rounded-xl border px-3 py-2.5 text-center sm:min-w-[6.5rem] sm:px-4 ${
        highlight
          ? "border-brand-300/35 bg-brand-100 shadow-[0_0_24px_rgb(181_155_120/0.2)]"
          : "border-brand-200/80 bg-brand-50"
      }`}
    >
      <p className={`text-xs font-semibold sm:text-sm ${highlight ? "text-brand-900" : "text-stone-700"}`}>
        {title}
      </p>
      <p className="mt-0.5 text-[10px] leading-tight text-slate-500">{caption}</p>
    </div>
  );
}

function FlowConnector({ label }: { label: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-1 sm:px-2">
      <div className="flex w-full max-w-[10rem] items-center gap-1 sm:max-w-[12rem]">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-brand-300/45 to-brand-300/70" />
        <span className="shrink-0 text-sm text-brand-300" aria-hidden>
          →
        </span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-brand-300/45 to-brand-300/70" />
      </div>
      <p className="mt-2 max-w-[10rem] text-center text-[10px] font-medium leading-snug text-brand-800 sm:max-w-[12rem] sm:text-[11px]">
        {label}
      </p>
    </div>
  );
}

function SmsExampleCard() {
  const ex = siteApprovalLoop.smsExample;

  return (
    <div className="mx-auto w-full max-w-xs rounded-2xl border border-brand-200 bg-white p-4 shadow-card">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Example SMS</p>
      <div className="mt-3 space-y-1.5 rounded-xl border border-brand-200/80 bg-brand-50 p-4">
        <p className="text-sm font-semibold text-brand-900">{ex.customer}</p>
        <p className="text-sm text-stone-800">{ex.issue}</p>
        <p className="text-sm text-brand-700">{ex.window}</p>
        <div className="mt-3 border-t border-brand-200/80 pt-3">
          <p className="text-xs font-medium text-stone-700">Reply:</p>
          <p className="mt-1 text-sm text-emerald-400">{ex.approveLabel}</p>
          <p className="text-sm text-rose-400">{ex.declineLabel}</p>
        </div>
      </div>
    </div>
  );
}

export function ApprovalLoop() {
  const a = siteApprovalLoop;
  const highlightIds = new Set(["vowroad", "owner"]);

  return (
    <section id={a.id} className="vow-site-section py-16 sm:py-20">
      <Container>
        <div className="vow-hero-flow-stage relative overflow-hidden rounded-[1.75rem] border border-brand-200/70 px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 50% 0%, rgb(181 155 120 / 0.16), transparent 55%)",
            }}
            aria-hidden
          />

          <p className="relative text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-800">
            {a.label}
          </p>
          <h2 className="relative mx-auto mt-3 max-w-xl text-center text-2xl font-bold text-brand-900 sm:text-3xl">
            {a.title}
          </h2>
          <p className="relative mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-stone-700">
            {a.summary}
          </p>

          <ul className="relative mt-5 flex flex-wrap justify-center gap-2">
            {a.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-brand-300/25 bg-brand-500/10 px-3.5 py-1.5 text-xs font-medium text-stone-700"
              >
                {tag}
              </li>
            ))}
          </ul>

          <div
            className="relative mt-8 hidden items-center justify-center lg:flex"
            role="list"
            aria-label="Approval loop"
          >
            {a.nodes.map((node, i) => (
              <div key={node.id} className="flex min-w-0 items-center" role="listitem">
                <FlowNode
                  title={node.title}
                  caption={node.caption}
                  highlight={highlightIds.has(node.id)}
                />
                {i < a.edges.length ? <FlowConnector label={a.edges[i]} /> : null}
              </div>
            ))}
          </div>

          <ol className="relative mx-auto mt-8 max-w-sm space-y-0 lg:hidden">
            {a.nodes.map((node, i) => (
              <li key={node.id}>
                <div className="flex justify-center">
                  <FlowNode
                    title={node.title}
                    caption={node.caption}
                    highlight={highlightIds.has(node.id)}
                  />
                </div>
                {i < a.edges.length ? (
                  <div className="flex flex-col items-center py-2.5">
                    <span className="text-brand-300" aria-hidden>
                      ↓
                    </span>
                    <p className="mt-1 max-w-[16rem] text-center text-[11px] font-medium leading-snug text-brand-800">
                      {a.edges[i]}
                    </p>
                  </div>
                ) : null}
              </li>
            ))}
          </ol>

          <div className="relative mt-10">
            <SmsExampleCard />
          </div>
        </div>
      </Container>
    </section>
  );
}
