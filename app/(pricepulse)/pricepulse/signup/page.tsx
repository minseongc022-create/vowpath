import Link from "next/link";
import { isDashboardDbConfigured } from "@/pricepulse/lib/dashboard/auth.ts";

export default async function PricepulseSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Pricepulse 무료 시작</h1>
        <p className="mt-1 text-sm text-slate-500">
          토스쇼핑 판매 키워드를 등록하면 매일 순위·가격을 추적해드려요. 베타 기간 무료.
        </p>

        {!isDashboardDbConfigured() ? (
          <p className="mt-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            서비스 준비 중입니다. 잠시 후 다시 시도해주세요.
          </p>
        ) : (
          <>
            <form action="/pricepulse/signup/submit" method="POST" className="mt-6 space-y-3">
              <input
                type="text"
                name="displayName"
                placeholder="상호명 또는 이름 (선택)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <input
                type="email"
                name="email"
                placeholder="이메일"
                autoFocus
                required
                autoComplete="email"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <input
                type="password"
                name="password"
                placeholder="비밀번호 (8자 이상)"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              {params.error ? <p className="text-sm text-red-600">{decodeURIComponent(params.error)}</p> : null}
              <button
                type="submit"
                className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                무료로 시작하기
              </button>
            </form>
            <p className="mt-4 text-center text-xs text-slate-400">
              이미 계정이 있으신가요?{" "}
              <Link href="/pricepulse/login" className="text-blue-600 hover:underline">
                로그인
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
