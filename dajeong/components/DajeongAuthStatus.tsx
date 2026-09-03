"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { disablePush } from "../lib/push-client";

/**
 * Notification cleanup must happen BEFORE signOut() — verifying this really is that account
 * (identity-guard's verifyClaimedIdentity) needs a live session, and there's no way to prove
 * that anymore once the session is gone. Best-effort: a failure here never blocks logout itself.
 */
async function logout(accountUserId: string) {
  const personId = `user_${accountUserId}`;
  try {
    await disablePush(personId);
    await fetch("/api/dajeong/notifications/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId }),
    });
  } catch {
    // Fall through to sign-out regardless.
  }
  await signOut({ callbackUrl: "/dajeong" });
}

export function DajeongAuthStatus() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (session?.user) {
    return (
      <span className="dj-auth-status">
        <span className="dj-auth-name">{session.user.name ?? "내 계정"}</span>
        <button type="button" className="dj-nav-link dj-auth-signout" onClick={() => void logout(session.user!.id)}>
          로그아웃
        </button>
      </span>
    );
  }

  return <Link href="/dajeong/login" className="dj-nav-link dj-auth-login">로그인</Link>;
}
