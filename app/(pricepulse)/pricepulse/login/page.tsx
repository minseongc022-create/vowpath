import { isPasswordConfigured } from "@/pricepulse/lib/dashboard/auth.ts";

export default async function PricepulseLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Pricepulse</h1>
        <p className="mt-1 text-sm text-slate-500">토스쇼핑 가격·순위 인텔리전스 — 내부 도구</p>

        {!isPasswordConfigured() ? (
          <p className="mt-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            PRICEPULSE_DASHBOARD_PASSWORD가 설정되지 않았습니다. 환경변수를 설정한 뒤 다시 배포하세요.
          </p>
        ) : (
          <form action="/pricepulse/login/submit" method="POST" className="mt-6 space-y-3">
            <input type="hidden" name="next" value={params.next ?? "/pricepulse/rank"} />
            <input
              type="password"
              name="password"
              placeholder="비밀번호"
              autoFocus
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            {params.error ? <p className="text-sm text-red-600">비밀번호가 올바르지 않습니다.</p> : null}
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              로그인
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
