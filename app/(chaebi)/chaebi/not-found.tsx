import Link from "next/link";
import { ChaebiHeader } from "@/chaebi/components/layout/ChaebiHeader";
import { CHAEBI_ROUTES } from "@/chaebi/lib/brand";

export default function ChaebiNotFound() {
  return (
    <>
      <ChaebiHeader back={CHAEBI_ROUTES.home} title="찾을 수 없음" showPlans={false} />
      <div className="flex flex-1 flex-col items-center justify-center px-8 pb-20 text-center">
        <p className="text-[17px] font-extrabold text-cb-ink">이 계획을 찾을 수 없어요</p>
        <p className="mt-2 text-[13px] leading-relaxed text-cb-muted">
          링크가 오래됐거나 다른 기기에서 만든 계획일 수 있어요.
          <br />
          계획은 만든 기기에서만 열립니다.
        </p>
        <Link
          href={CHAEBI_ROUTES.home}
          className="cb-btn cb-btn-primary mt-7 px-5 py-3 text-[14px]"
        >
          처음으로
        </Link>
      </div>
    </>
  );
}
