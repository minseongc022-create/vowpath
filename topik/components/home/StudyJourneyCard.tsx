"use client";

import Link from "next/link";
import { vi } from "@/topik/lib/i18n/vi";
import type { StudyJourney } from "@/topik/lib/journey/study-journey";
import { IconChevronRight } from "@/topik/components/ui/TopikIcons";

type Props = {
  journey: StudyJourney;
};

export function StudyJourneyCard({ journey }: Props) {
  const { steps, currentStep, dailyCompleted, dailyTotal, confidenceVi } = journey;

  return (
    <section className="topik-journey-section">
      <div className="topik-journey-header">
        <div>
          <p className="topik-section-title">{vi.journey.title}</p>
          <p className="topik-journey-confidence">{confidenceVi}</p>
        </div>
        <div className="topik-journey-daily">
          <span className="topik-journey-daily-num">
            {dailyCompleted}/{dailyTotal}
          </span>
          <span className="topik-journey-daily-label">{vi.journey.dailyGoal}</span>
        </div>
      </div>

      <Link href={currentStep.href} className="topik-today-hero">
        <div className="topik-today-hero-body">
          <p className="topik-today-hero-label">{vi.journey.nextStep}</p>
          <p className="topik-today-hero-title">{currentStep.titleVi}</p>
          <p className="topik-today-hero-task">{currentStep.descVi}</p>
        </div>
        <span className="topik-today-hero-action" aria-hidden>
          <IconChevronRight className="text-white" />
        </span>
      </Link>

      <ol className="topik-journey-steps">
        {steps.map((step) => (
          <li key={step.id} className={`topik-journey-step topik-journey-step-${step.status}`}>
            <Link href={step.href} className="topik-journey-step-link">
              <span className="topik-journey-step-num">
                {step.status === "done" ? "✓" : step.order}
              </span>
              <span className="topik-journey-step-body">
                <span className="topik-journey-step-title">{step.titleVi}</span>
                {step.status === "current" && step.whyVi && (
                  <span className="topik-journey-step-why">{step.whyVi}</span>
                )}
              </span>
              <IconChevronRight className="topik-journey-step-chevron" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
