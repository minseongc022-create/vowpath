import { siteMissedCallFlow } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

type StepId = (typeof siteMissedCallFlow.steps)[number]["id"];

function StepIcon({ id }: { id: StepId }) {
  const cls = "h-6 w-6 text-brand-700";

  if (id === "day") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
      </svg>
    );
  }
  if (id === "call") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.954l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.954-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" />
      </svg>
    );
  }
  if (id === "forward") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M15.75 4.5a3 3 0 11.626 2.122l-8.25 8.25a.75.75 0 01-1.06 0l-2.122-2.122a.75.75 0 011.06-1.06l1.591 1.59 7.72-7.72A1.5 1.5 0 0117.25 6v12a.75.75 0 001.5 0V6a3 3 0 00-3-1.5z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (id === "triage") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z" clipRule="evenodd" />
      </svg>
    );
  }
  if (id === "ai") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M16.5 7.5h-9v9h9v-9z" />
        <path
          fillRule="evenodd"
          d="M8.25 2.25A.75.75 0 019 3v.75h6V3a.75.75 0 011.5 0v.75h.75a3 3 0 013 3v.75H21a.75.75 0 010 1.5h-1.5v1.5H21a.75.75 0 010 1.5h-1.5v1.5H21a.75.75 0 010 1.5h-1.5v.75a3 3 0 01-3 3h-.75V21a.75.75 0 01-1.5 0v-.75h-6V21a.75.75 0 01-1.5 0v-.75H3.75a3 3 0 01-3-3v-.75H.75a.75.75 0 010-1.5H2.25v-1.5H.75a.75.75 0 010-1.5H2.25v-1.5H.75a.75.75 0 010-1.5h1.5v-.75a3 3 0 013-3h.75V3a.75.75 0 011.5 0v.75zM4.5 9.75v7.5a1.5 1.5 0 001.5 1.5h12a1.5 1.5 0 001.5-1.5v-7.5a1.5 1.5 0 00-1.5-1.5h-12a1.5 1.5 0 00-1.5 1.5z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (id === "intake") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M4.5 2.25a.75.75 0 00-.75.75v15c0 .414.336.75.75.75h15a.75.75 0 00.75-.75V3a.75.75 0 00-.75-.75h-15zM9 6.75A.75.75 0 019.75 6h4.5a.75.75 0 010 1.5h-4.5A.75.75 0 019 6.75zm-.75 4.5a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75zm.75 3a.75.75 0 000 1.5h2.25a.75.75 0 000-1.5H9z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (id === "approve") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 01.75.75v.75H3v-.75zm0 3.75h18v7.5a.75.75 0 01-.75.75H3.75a.75.75 0 01-.75-.75v-7.5z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (id === "dispatch") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M8.25 4.5a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM4.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122z" />
      </svg>
    );
  }
  if (id === "onway") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-.18 60.517 60.517 0 00-18.445-8.984z" />
      </svg>
    );
  }
  if (id === "arrival") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function FlowArrow({ vertical }: { vertical?: boolean }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center text-brand-300 ${
        vertical ? "py-2" : "px-1 lg:px-2"
      }`}
      aria-hidden
    >
      <span className="text-xl font-light">{vertical ? "↓" : "→"}</span>
    </div>
  );
}

export function MissedCallFlow({
  content = siteMissedCallFlow,
}: {
  content?: typeof siteMissedCallFlow;
}) {
  const s = content;

  return (
    <section
      id={s.id}
      className="vow-site-section border-y border-brand-200/80 bg-brand-50 py-20 sm:py-24"
    >
      <Container>
        <SectionHeading title={s.title} subtitle={s.subtitle} align="center" />

        <div className="mt-12 hidden overflow-x-auto pb-2 lg:block">
          <div className="mx-auto flex w-max min-w-full items-stretch justify-center px-2">
          {s.steps.map((step, i) => (
            <div key={step.id} className="flex min-w-0 items-center">
              <article className="vow-site-card flex w-[10.5rem] flex-col items-center p-4 text-center xl:w-[11.5rem]">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand-400/25 bg-brand-500/10">
                  <StepIcon id={step.id} />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-brand-900">{step.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-stone-700">{step.description}</p>
              </article>
              {i < s.steps.length - 1 ? <FlowArrow /> : null}
            </div>
          ))}
          </div>
        </div>

        <ol className="mx-auto mt-12 max-w-md space-y-0 px-1 sm:max-w-lg lg:hidden">
          {s.steps.map((step, i) => (
            <li key={step.id}>
              <article className="vow-site-card flex flex-col items-center p-5 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand-400/25 bg-brand-500/10">
                  <StepIcon id={step.id} />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-brand-900">{step.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-stone-700">{step.description}</p>
              </article>
              {i < s.steps.length - 1 ? <FlowArrow vertical /> : null}
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
