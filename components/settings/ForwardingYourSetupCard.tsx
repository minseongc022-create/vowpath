"use client";

import { useSettingsPage } from "@/components/providers/LocaleProvider";
import type { ForwardingProviderId } from "@/lib/forwarding-guides";
import {
  formatQuizAnswerRecap,
  getQuizPathSummary,
  type QuizPathSummaryCopy,
} from "@/lib/forwarding-quiz-summary";
import type { ForwardingQuizAnswers } from "@/lib/forwarding-quiz";

type Props = {
  provider: ForwardingProviderId;
  quizAnswers?: ForwardingQuizAnswers | null;
  onChangeSetup?: () => void;
};

export function ForwardingYourSetupCard({ provider, quizAnswers, onChangeSetup }: Props) {
  const settingsPage = useSettingsPage();
  const q = settingsPage.forwardingQuiz;
  const summary: QuizPathSummaryCopy = getQuizPathSummary(
    provider,
    q.pathSummary as Record<string, QuizPathSummaryCopy>,
  );
  const recap = quizAnswers ? formatQuizAnswerRecap(quizAnswers) : null;

  return (
    <div className="rounded-xl border-2 border-brand-400 bg-gradient-to-br from-brand-50 to-white p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{q.yourSetupBadge}</p>
          <h3 className="mt-1 text-base font-bold leading-snug text-brand-950 sm:text-lg">{summary.headline}</h3>
          {recap ? <p className="mt-0.5 text-xs font-medium text-brand-800/90 sm:text-sm">{recap}</p> : null}
        </div>
        <span className="shrink-0 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-800">
          {summary.timeLabel}
        </span>
      </div>

      <p className="mt-2 text-sm leading-snug text-slate-700">{summary.body}</p>

      <div className="mt-2.5 rounded-lg border border-brand-200/80 bg-white/80 px-3 py-2.5">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{q.methodLabel}</p>
        <p className="mt-1 text-sm leading-snug text-slate-800">{summary.method}</p>
      </div>

      <div className="mt-2.5">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{q.whatYouNeedLabel}</p>
        <ul className="mt-1 space-y-0.5">
          {summary.whatYouNeed.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-snug text-slate-700">
              <span className="text-brand-600" aria-hidden="true">
                •
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {onChangeSetup ? (
        <button
          type="button"
          onClick={onChangeSetup}
          className="mt-3 text-sm font-semibold text-brand-700 underline"
        >
          {q.changeAnswers}
        </button>
      ) : null}
    </div>
  );
}
