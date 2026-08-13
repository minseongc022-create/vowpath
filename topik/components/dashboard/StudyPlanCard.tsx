import type { StudyPlanDay } from "@/topik/types";
import { vi } from "@/topik/lib/i18n/vi";

type Props = {
  today: StudyPlanDay | null;
  planDay: number;
  totalDays: number;
};

export function StudyPlanCard({ today, planDay, totalDays }: Props) {
  if (!today) return null;

  return (
    <section className="topik-card mb-5 p-4 topik-animate-in">
      <div className="mb-3 flex items-center justify-between">
        <p className="topik-section-title">{vi.home.todayPlan}</p>
        <span className="topik-badge">
          {vi.home.planDay.replace("{day}", String(planDay)).replace("{total}", String(totalDays))}
        </span>
      </div>
      <ul className="space-y-2.5">
        {today.tasksVi.map((task, i) => (
          <li key={task} className="flex items-start gap-2.5 text-sm text-learn-ink">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--topik-soft)] text-[10px] font-bold text-learn-primary">
              {i + 1}
            </span>
            <span className="leading-relaxed">{task}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
