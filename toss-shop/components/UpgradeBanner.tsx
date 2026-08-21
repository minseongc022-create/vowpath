"use client";

import Link from "next/link";
import { PRO_PRICE_KRW } from "@/toss-shop/lib/billing";
import { SP_ROUTES } from "@/toss-shop/lib/routes";

export function UpgradeBanner({ feature }: { feature: string }) {
  return (
    <div className="rounded-2xl bg-ts-surface px-5 py-8 text-center ring-1 ring-ts-border">
      <p className="text-lg font-bold text-ts-ink">Pro 플랜이 필요합니다</p>
      <p className="mt-2 text-sm text-ts-muted">
        {feature}은(는) Owner / Pro 전용 기능입니다.
        <br />
        Free 플랜은 하루 3회 키워드 분석만 이용할 수 있습니다.
      </p>
      <p className="mt-4 text-2xl font-bold text-ts-primary">
        월 {PRO_PRICE_KRW.toLocaleString()}원
      </p>
      <Link href={`${SP_ROUTES.settings}#upgrade`} className="ts-btn-primary mx-auto mt-5 sm:!w-auto sm:px-8">
        Pro 업그레이드
      </Link>
    </div>
  );
}

export function UsageBadge({ used, limit }: { used: number; limit: number }) {
  return (
    <span className="ts-badge-neutral">
      오늘 키워드 {used}/{limit}
    </span>
  );
}
