import Link from "next/link";
import { ChaebiHeader } from "@/chaebi/components/layout/ChaebiHeader";
import { CHAEBI_ROUTES } from "@/chaebi/lib/brand";
import { formatKoreanDate, relativeDayLabel, seoulDateISO } from "@/chaebi/lib/datetime";
import { OCCASION_EMOJI, PLAN_STATUS_LABEL, formatKrwExact } from "@/chaebi/lib/format";
import { currentOwnerId } from "@/chaebi/lib/session";
import { listPlans, storageMode } from "@/chaebi/lib/store";
import { ChevronRightIcon } from "@/chaebi/components/ui/Icons";

export const dynamic = "force-dynamic";

export default async function ChaebiPlansPage() {
  const ownerId = await currentOwnerId();
  const plans = ownerId ? await listPlans(ownerId) : [];
  const today = seoulDateISO();
  const persisted = storageMode() === "kv";

  const upcoming = plans.filter(
    (plan) => plan.status !== "completed" && plan.status !== "cancelled",
  );
  const past = plans.filter(
    (plan) => plan.status === "completed" || plan.status === "cancelled",
  );

  return (
    <>
      <ChaebiHeader back={CHAEBI_ROUTES.home} title="내 계획" showPlans={false} />

      <div className="flex-1 px-5 pb-10 pt-3">
        {!plans.length ? (
          <div className="cb-card mt-6 px-6 py-12 text-center">
            <p className="text-[15px] font-bold text-cb-ink">아직 만든 계획이 없어요</p>
            <p className="mt-2 text-[13px] leading-relaxed text-cb-muted">
              무슨 일이 있는지 한 줄만 적으면
              <br />
              나머지는 제가 준비합니다.
            </p>
            <Link
              href={CHAEBI_ROUTES.home}
              className="cb-btn cb-btn-primary mt-6 inline-flex px-5 py-3 text-[14px]"
            >
              채비 시작하기
            </Link>
          </div>
        ) : null}

        {upcoming.length ? (
          <PlanGroup title="예정" plans={upcoming} today={today} />
        ) : null}
        {past.length ? <PlanGroup title="지난 계획" plans={past} today={today} muted /> : null}

        {plans.length && !persisted ? (
          <p className="mt-8 text-center text-[11.5px] leading-relaxed text-cb-subtle">
            지금은 이 기기에만 저장됩니다. 서버 저장소(KV)를 연결하면 기기가 바뀌어도 이어집니다.
          </p>
        ) : null}
      </div>
    </>
  );
}

function PlanGroup({
  title,
  plans,
  today,
  muted,
}: {
  title: string;
  plans: Awaited<ReturnType<typeof listPlans>>;
  today: string;
  muted?: boolean;
}) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 px-1 text-[13px] font-bold text-cb-muted">{title}</h2>
      <ul className="space-y-2">
        {plans.map((plan) => (
          <li key={plan.id}>
            <Link
              href={
                plan.status === "draft" ? CHAEBI_ROUTES.plan(plan.id) : CHAEBI_ROUTES.progress(plan.id)
              }
              className="cb-card flex items-center gap-3 px-4 py-3.5 transition hover:border-cb-border-strong"
              style={{ opacity: muted ? 0.72 : 1 }}
            >
              <span className="text-[22px]" aria-hidden>
                {OCCASION_EMOJI[plan.occasion]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-extrabold text-cb-ink">{plan.headline}</p>
                <p className="mt-0.5 text-[12px] text-cb-muted">
                  {relativeDayLabel(plan.dateISO, today) === formatKoreanDate(plan.dateISO)
                    ? formatKoreanDate(plan.dateISO)
                    : relativeDayLabel(plan.dateISO, today)}{" "}
                  · {plan.itemCount}가지 · {formatKrwExact(plan.totalKrw)}
                </p>
              </div>
              <div className="flex flex-none items-center gap-1.5">
                <span
                  className="cb-badge"
                  data-tone={
                    plan.status === "completed"
                      ? "good"
                      : plan.status === "cancelled"
                        ? "muted"
                        : plan.status === "draft"
                          ? "idle"
                          : "progress"
                  }
                >
                  {PLAN_STATUS_LABEL[plan.status]}
                </span>
                <ChevronRightIcon className="h-4 w-4 text-cb-subtle" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
