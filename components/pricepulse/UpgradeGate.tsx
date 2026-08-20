import Link from "next/link";

export function UpgradeGate({ feature }: { feature: string }) {
  return (
    <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-8 text-center">
      <p className="text-sm font-medium text-amber-900">{feature}은(는) Pro 플랜 기능입니다</p>
      <p className="mt-1 text-xs text-amber-700">무료 플랜은 키워드별 순위 추적만 제공됩니다.</p>
      <Link
        href="/pricepulse/upgrade"
        className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
      >
        Pro로 업그레이드
      </Link>
    </div>
  );
}
