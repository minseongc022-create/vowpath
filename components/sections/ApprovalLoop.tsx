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
          ? "border-teal-300/35 bg-teal-500/15 shadow-[0_0_24px_rgb(20_184_166/0.14)]"
          : "border-white/[0.08] bg-white/[0.03]"
      }`}
    >
      <p className={`text-xs font-semibold sm:text-sm ${highlight ? "text-white" : "text-slate-200"}`}>
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
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-teal-300/45 to-teal-300/70" />
        <span className="shrink-0 text-sm text-teal-300" aria-hidden>
          →
        </span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-teal-300/45 to-teal-300/70" />
      </div>
      <p className="mt-2 max-w-[10rem] text-center text-[10px] font-medium leading-snug text-teal-100 sm:max-w-[12rem] sm:text-[11px]">
        {label}
      </p>
    </div>
  );
}

function SmsExampleCard() {
  const ex = siteApprovalLoop.smsExample;

  return (
    <div className="mx-auto w-full max-w-xs rounded-2xl border border-white/[0.08] bg-[#0f0f14] p-4 shadow-[0_0_32px_rgb(139_92_246/0.12)]">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Example SMS</p>
      <div className="mt-3 space-y-1.5 rounded-xl border border-white/[0.06] bg-white/[0.04] p-4">
        <p className="text-sm font-semibold text-white">{ex.customer}</p>
        <p className="text-sm text-slate-300">{ex.issue}</p>
        <p className="text-sm text-teal-200">{ex.window}</p>
        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <p className="text-xs font-medium text-slate-400">Reply:</p>
          <p className="mt-1 text-sm text-emerald-400">{ex.approveLabel}</p>
          <p className="text-sm text-rose-400">{ex.declineLabel}</p>
        </div>
      </div>
    </div>
  );
}

export function ApprovalLoop() {
  const a = siteApprovalLoop;
  const highlightIds = new Set(["vowpath", "owner"]);

  return (
    <section id={a.id} className="vow-site-section py-16 sm:py-20">
      <Container>
        <div className="vow-hero-flow-stage relative overflow-hidden rounded-[1.75rem] border border-white/[0.07] px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 50% 0%, rgb(20 184 166 / 0.16), transparent 55%)",
            }}
            aria-hidden
          />

          <p className="relative text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-teal-100">
            {a.label}
          </p>
          <h2 className="relative mx-auto mt-3 max-w-xl text-center text-2xl font-bold text-white sm:text-3xl">
            {a.title}
          </h2>
          <p className="relative mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-slate-400">
            {a.summary}
          </p>

          <ul className="relative mt-5 flex flex-wrap justify-center gap-2">
            {a.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-teal-300/25 bg-teal-500/10 px-3.5 py-1.5 text-xs font-medium text-slate-200"
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
                    <span className="text-teal-300" aria-hidden>
                      ↓
                    </span>
                    <p className="mt-1 max-w-[16rem] text-center text-[11px] font-medium leading-snug text-teal-100">
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
