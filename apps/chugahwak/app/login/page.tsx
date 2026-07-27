"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/SiteChrome";
import { loadState } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();

  function enter() {
    loadState();
    localStorage.setItem("chugahwak.session", JSON.stringify({ email: "demo@chugahwak.kr", at: Date.now() }));
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-mesh-hero">
      <SiteHeader solid />
      <main className="sc-container flex min-h-[70vh] items-center justify-center py-14">
        <div className="sc-card w-full max-w-md p-6 text-center">
          <h1 className="font-display text-2xl text-ink">데모 로그인</h1>
          <p className="mt-2 text-sm text-ink-muted">비밀번호 없이 저장된 데모 세션으로 들어갑니다.</p>
          <button type="button" className="sc-btn-primary mt-6 w-full py-3" onClick={enter}>
            현황판 들어가기
          </button>
          <p className="mt-4 text-xs text-ink-muted">
            처음이신가요?{" "}
            <Link href="/signup" className="font-semibold text-steel-700">
              가입
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
