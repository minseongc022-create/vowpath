"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function DajeongAuthStatus() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (session?.user) {
    return (
      <span className="dj-auth-status">
        <span className="dj-auth-name">{session.user.name ?? "내 계정"}</span>
        <button type="button" className="dj-nav-link dj-auth-signout" onClick={() => signOut({ callbackUrl: "/dajeong" })}>
          로그아웃
        </button>
      </span>
    );
  }

  return <Link href="/dajeong/login" className="dj-nav-link dj-auth-login">로그인</Link>;
}
