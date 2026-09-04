"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { DAJEONG_BRAND } from "../lib/brand";
import { ArrowIcon, SparkleIcon } from "./DajeongIcons";

const isDemo = process.env.NEXT_PUBLIC_DAJEONG_AUTH_DEMO === "true";

const providers = [
  {
    id: "google",
    label: "Google로 시작하기",
    className: "dj-login-google",
    configured: isDemo || process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true",
  },
  {
    id: "kakao",
    label: "카카오로 시작하기",
    className: "dj-login-kakao",
    configured: isDemo || process.env.NEXT_PUBLIC_KAKAO_ENABLED === "true",
  },
  {
    id: "naver",
    label: "네이버로 시작하기",
    className: "dj-login-naver",
    configured: isDemo || process.env.NEXT_PUBLIC_NAVER_ENABLED === "true",
  },
  {
    id: "toss",
    label: "토스로 시작하기",
    className: "dj-login-toss",
    configured: isDemo || process.env.NEXT_PUBLIC_TOSS_ENABLED === "true",
  },
] as const;

export function LoginWorkspace({ callbackUrl = "/dajeong" }: { callbackUrl?: string }) {
  const anyConfigured = providers.some((provider) => provider.configured);

  function start(id: string) {
    if (isDemo) {
      window.location.href = callbackUrl;
      return;
    }
    void signIn(id, { callbackUrl });
  }

  return (
    <div className="dj-login-page dj-narrow">
      <div className="dj-login-card dj-card">
        <span className="dj-login-orb"><SparkleIcon size={20} /></span>
        <h1>{DAJEONG_BRAND.name} 로그인</h1>
        <p>로그인하면 다른 기기에서도 계획을 이어보고, 동반자와의 연결이 더 안전하게 유지돼요.</p>
        <div className="dj-login-buttons">
          {providers.map((provider) => (
            <button
              key={provider.id}
              type="button"
              className={`dj-login-button ${provider.className}`}
              onClick={() => start(provider.id)}
              disabled={!provider.configured}
            >
              {provider.label}
              {!provider.configured ? <em>준비 중</em> : null}
            </button>
          ))}
        </div>
        {!anyConfigured ? <p className="dj-login-note">아직 연결된 로그인 방법이 없어요. 관리자가 Google/카카오/네이버/토스 앱 키를 등록하면 여기서 바로 활성화돼요.</p> : null}
        {isDemo ? <p className="dj-login-note">데모 모드 — 실제 계정 연동 없이 체험할 수 있어요.</p> : null}
        <Link href="/dajeong" className="dj-help-link">로그인 없이 계속하기 <ArrowIcon size={14} /></Link>
      </div>
    </div>
  );
}
