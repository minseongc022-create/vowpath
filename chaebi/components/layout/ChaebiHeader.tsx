import Link from "next/link";
import { CHAEBI_ROUTES } from "@/chaebi/lib/brand";
import { ArrowLeftIcon, ListIcon } from "@/chaebi/components/ui/Icons";

/**
 * 상단 바 — 최소한만.
 *
 * 원클릭이 컨셉인 앱에서 상단 내비게이션이 굵으면 "골라야 할 게 많다"는
 * 신호가 된다. 뒤로가기와 내 계획, 둘뿐이다.
 */
export function ChaebiHeader({
  back,
  title,
  showPlans = true,
}: {
  back?: string;
  title?: string;
  showPlans?: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-cb-border/70 bg-cb-bg/85 backdrop-blur-md">
      <div className="flex h-14 items-center gap-2 px-3">
        {back ? (
          <Link
            href={back}
            aria-label="뒤로"
            className="cb-btn cb-btn-quiet h-10 w-10 rounded-full p-0"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
        ) : (
          <Link href={CHAEBI_ROUTES.home} className="flex items-center gap-2 px-2" aria-label="채비 홈">
            <span className="text-[17px] font-extrabold tracking-tight text-cb-primary">채비</span>
          </Link>
        )}

        <p className="min-w-0 flex-1 truncate text-center text-[15px] font-bold text-cb-ink">
          {title ?? ""}
        </p>

        {showPlans ? (
          <Link
            href={CHAEBI_ROUTES.plans}
            aria-label="내 계획"
            className="cb-btn cb-btn-quiet h-10 w-10 rounded-full p-0"
          >
            <ListIcon className="h-5 w-5" />
          </Link>
        ) : (
          <span className="h-10 w-10" />
        )}
      </div>
    </header>
  );
}
