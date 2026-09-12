"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/vibesafe/auth/logout", { method: "POST" });
    router.replace("/vibesafe");
    router.refresh();
  }

  return (
    <button className="vs-btn" onClick={logout} disabled={busy}>
      {busy ? "로그아웃 중…" : "로그아웃"}
    </button>
  );
}

export function DisconnectGithubButton({ connected }: { connected: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (!connected) return null;

  async function disconnect() {
    setBusy(true);
    await fetch("/api/vibesafe/github", { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <button className="vs-btn vs-btn-danger vs-btn-sm" onClick={disconnect} disabled={busy}>
      {busy ? "해제 중…" : "GitHub 연결 해제"}
    </button>
  );
}
