"use client";

import { useState } from "react";

type ShareInfo = {
  slug: string;
  statusUrl: string;
  badgeUrl: string;
  markdown: string;
  projectName: string;
};

/**
 * 공개 상태 페이지 + README 배지.
 *
 * ★ 이게 광고비 0원짜리 확산 고리다
 *
 * 배지를 붙인 저장소를 보는 모든 사람에게 VibeSafe가 노출된다. 동시에
 * 고객에게도 "우리 서비스 잘 돌아갑니다"를 증명하는 수단이라, 억지로
 * 붙이는 홍보가 아니라 원해서 붙이는 기능이 된다.
 */
export function SharePanel({
  projectId,
  initial,
}: {
  projectId: string;
  initial: ShareInfo | null;
}) {
  const [share, setShare] = useState<ShareInfo | null>(initial);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function enable() {
    setBusy(true);
    const res = await fetch(`/api/vibesafe/projects/${projectId}/public-status`, { method: "POST" });
    const data = (await res.json()) as { ok?: boolean } & ShareInfo;
    setBusy(false);
    if (res.ok && data.ok) setShare(data);
  }

  async function disable() {
    setBusy(true);
    await fetch(`/api/vibesafe/projects/${projectId}/public-status`, { method: "DELETE" });
    setBusy(false);
    setShare(null);
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // 클립보드가 막힌 환경 — 입력칸에서 직접 복사하면 된다.
    }
  }

  if (!share) {
    return (
      <div className="vs-card vs-stack">
        <h2 className="vs-section-title">상태 배지 · 공개 페이지</h2>
        <p className="vs-hint">
          README에 붙일 수 있는 상태 배지와, 누구나 볼 수 있는 상태 페이지를 만듭니다.
          &ldquo;우리 서비스 잘 돌아갑니다&rdquo;를 남에게 보여줄 때 씁니다.
        </p>
        <p className="vs-hint">
          공개되는 것: 기능 이름, 정상/문제, 마지막 확인 시각.<br />
          공개되지 않는 것: 서비스 주소, 저장소, 오류 내용, 화면 캡처.
        </p>
        <div>
          <button className="vs-btn vs-btn-primary" onClick={enable} disabled={busy}>
            {busy ? "만드는 중…" : "상태 배지 만들기"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="vs-card vs-stack">
      <div className="vs-row-between">
        <h2 className="vs-section-title">상태 배지 · 공개 페이지</h2>
        <span className="vs-badge" data-tone="ok">공개 중</span>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={share.badgeUrl} alt="VibeSafe 상태 배지" style={{ height: 20, alignSelf: "flex-start" }} />

      <div className="vs-field">
        <span className="vs-label">README에 붙여넣기 (마크다운)</span>
        <div className="vs-copy-box">
          <input className="vs-input vs-input-sm" readOnly value={share.markdown} onFocus={(e) => e.target.select()} />
          <button className="vs-btn vs-btn-sm" onClick={() => copy(share.markdown, "md")}>
            {copied === "md" ? "복사됨" : "복사"}
          </button>
        </div>
      </div>

      <div className="vs-field">
        <span className="vs-label">공개 상태 페이지 주소</span>
        <div className="vs-copy-box">
          <input className="vs-input vs-input-sm" readOnly value={share.statusUrl} onFocus={(e) => e.target.select()} />
          <button className="vs-btn vs-btn-sm" onClick={() => copy(share.statusUrl, "url")}>
            {copied === "url" ? "복사됨" : "복사"}
          </button>
        </div>
      </div>

      <div className="vs-row">
        <a className="vs-btn vs-btn-sm" href={share.statusUrl} target="_blank" rel="noreferrer noopener">
          공개 페이지 보기
        </a>
        <button className="vs-btn vs-btn-danger vs-btn-sm" onClick={disable} disabled={busy}>
          공개 끄기
        </button>
      </div>
    </div>
  );
}
