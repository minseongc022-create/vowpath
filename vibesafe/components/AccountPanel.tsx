"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/vibesafe/auth/logout", { method: "POST" });
    // 로그인과 같은 이유 — 세션 쿠키가 사라지는 순간이라 서버 렌더를 처음부터
    // 다시 받는 게 확실하다.
    window.location.replace("/vibesafe");
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


/**
 * 수정 권한 연결 — 기본 연결과 별개다.
 *
 * ★ 화면에서 "안 써도 된다"를 먼저 말한다
 *
 * 쓰기 권한을 요구하는 화면에서 제일 중요한 건 설득이 아니라 안심이다.
 * 안 붙여도 제품이 온전히 동작한다는 걸 먼저 말해야 붙일 마음이 생긴다.
 */
export function WriteConnectionPanel({
  connected,
  login,
  appAvailable,
}: {
  connected: boolean;
  login: string | null;
  appAvailable: boolean;
}) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connectPat(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/vibesafe/github/fix-pat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.trim() }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "연결에 실패했습니다.");
      return;
    }
    setToken("");
    setShowForm(false);
    router.refresh();
  }

  async function disconnect() {
    setBusy(true);
    await fetch("/api/vibesafe/github/fix-pat", { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="vs-card vs-stack">
      <div className="vs-row-between">
        <h2 className="vs-section-title">수정 권한 연결 (선택)</h2>
        {connected && <span className="vs-badge" data-tone="ok">{login} 연결됨</span>}
      </div>

      <p className="vs-hint">
        VibeSafe가 고친 코드를 <strong>PR로 올릴 수 있게</strong> 하는 연결입니다.
        기본 연결은 읽기 전용이라 이게 없으면 PR을 만들 수 없습니다.
      </p>
      <p className="vs-hint">
        <strong>붙이지 않아도 됩니다.</strong> 감시·알림·원인 분석은 읽기 연결만으로 전부 동작합니다.
        기본 브랜치에 직접 커밋하는 일은 이 연결이 있어도 하지 않습니다.
      </p>

      {error && <div className="vs-alert" data-tone="error">{error}</div>}

      {connected ? (
        <div>
          <button className="vs-btn vs-btn-danger vs-btn-sm" onClick={disconnect} disabled={busy}>
            {busy ? "해제 중…" : "수정 권한 연결 해제"}
          </button>
        </div>
      ) : (
        <>
          {appAvailable && (
            <a className="vs-btn vs-btn-primary" href="/api/vibesafe/github/fix-install">
              수정용 GitHub App 설치
            </a>
          )}
          <button type="button" className="vs-btn vs-btn-ghost vs-btn-sm" onClick={() => setShowForm((v) => !v)}>
            {appAvailable ? "또는 토큰으로 연결" : "토큰으로 연결"}
          </button>
          {showForm && (
            <form className="vs-stack-sm" onSubmit={connectPat}>
              <p className="vs-hint">
                fine-grained 토큰에 <strong>Contents: Read and write</strong> 와{" "}
                <strong>Pull requests: Read and write</strong> 만 주세요.
              </p>
              <input
                className="vs-input"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="github_pat_..."
                autoComplete="off"
                required
              />
              <button className="vs-btn vs-btn-primary" type="submit" disabled={busy}>
                {busy ? "확인 중…" : "연결"}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

/** Vercel 연결 — 배포 되돌리기에만 쓴다. */
export function VercelConnectionPanel({ connected, login }: { connected: boolean; login: string | null }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [teamId, setTeamId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/vibesafe/vercel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.trim(), teamId: teamId.trim() || null }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "연결에 실패했습니다.");
      return;
    }
    setToken("");
    setShowForm(false);
    router.refresh();
  }

  async function disconnect() {
    setBusy(true);
    await fetch("/api/vibesafe/vercel", { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="vs-card vs-stack">
      <div className="vs-row-between">
        <h2 className="vs-section-title">Vercel 연결 (선택)</h2>
        {connected && <span className="vs-badge" data-tone="ok">{login} 연결됨</span>}
      </div>

      <p className="vs-hint">
        핵심 기능이 깨졌을 때 <strong>직전 정상 배포로 되돌리기</strong> 위한 연결입니다.
      </p>
      <div className="vs-alert" data-tone="warn">
        Vercel 토큰은 계정 전체를 다룰 수 있는 강한 값입니다. VibeSafe는 배포 목록 조회와
        되돌리기에만 쓰고 암호화해 보관하지만, <strong>되돌리기를 쓸 생각이 없으면 연결하지 마세요.</strong>
      </div>

      {error && <div className="vs-alert" data-tone="error">{error}</div>}

      {connected ? (
        <div>
          <button className="vs-btn vs-btn-danger vs-btn-sm" onClick={disconnect} disabled={busy}>
            {busy ? "해제 중…" : "Vercel 연결 해제"}
          </button>
        </div>
      ) : (
        <>
          <button type="button" className="vs-btn vs-btn-sm" onClick={() => setShowForm((v) => !v)}>
            Vercel 연결하기
          </button>
          {showForm && (
            <form className="vs-stack-sm" onSubmit={connect}>
              <p className="vs-hint">
                vercel.com → Account Settings → Tokens 에서 만드세요. 팀 프로젝트면 Team ID도 필요합니다.
              </p>
              <input
                className="vs-input"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Vercel 토큰"
                autoComplete="off"
                required
              />
              <input
                className="vs-input"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                placeholder="Team ID (개인 계정이면 비워두세요)"
              />
              <button className="vs-btn vs-btn-primary" type="submit" disabled={busy}>
                {busy ? "확인 중…" : "연결"}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
