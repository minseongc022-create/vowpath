import type { StudyPlanDay } from "@/topik/types";
import { vi } from "@/topik/lib/i18n/vi";

type Props = {
  today: StudyPlanDay | null;
  planDay?: number;
  totalDays?: number;
};

export function StudyPlanCard({ today, planDay, totalDays }: Props) {
  if (!today) return null;

  return (
    <section className="topik-card mb-6 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase text-learn-ink-muted">{vi.home.todayPlan}</p>
        {planDay && totalDays && (
          <span className="topik-badge">Ngày {planDay}/{totalDays}</span>
        )}
      </div>
      <ul className="space-y-2">
        {today.tasksVi.map((task) => (
          <li key={task} className="flex items-start gap-2 text-sm text-learn-ink">
            <span className="text-learn-primary mt-0.5">•</span>
            <span>{task}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
