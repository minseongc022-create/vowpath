"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CHAEBI_ROUTES } from "@/chaebi/lib/brand";

/**
 * 화면이 통째로 깨졌을 때.
 *
 * 스택 트레이스를 보여주지 않는다 — 이 앱을 쓰는 사람은 개발자가 아니고,
 * 지금 급한 건 원인이 아니라 "그래서 뭘 하면 되나"다.
 */
export default function ChaebiError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[chaebi]", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-24 text-center">
      <p className="text-[17px] font-extrabold text-cb-ink">잠시 문제가 생겼어요</p>
      <p className="mt-2 text-[13px] leading-relaxed text-cb-muted">
        만들던 계획은 저장돼 있습니다.
        <br />
        다시 시도해 보시겠어요?
      </p>
      <div className="mt-7 flex gap-2">
        <button type="button" onClick={reset} className="cb-btn cb-btn-primary px-5 py-3 text-[14px]">
          다시 시도
        </button>
        <Link href={CHAEBI_ROUTES.home} className="cb-btn cb-btn-ghost px-5 py-3 text-[14px]">
          처음으로
        </Link>
      </div>
    </div>
  );
}
