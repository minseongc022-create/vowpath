"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  projectId: string;
  projectName: string;
  productionUrl: string;
  repository: { owner: string; repo: string; defaultBranch: string } | null;
  hasCredential: boolean;
  webhookUrl: string;
  githubAppConnected: boolean;
};

export function ProjectSettings(props: Props) {
  const router = useRouter();
  const [url, setUrl] = useState(props.productionUrl);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function call(key: string, url: string, init: RequestInit) {
    setBusy(key);
    setMessage(null);
    try {
      const res = await fetch(url, init);
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; secret?: string };
      if (!res.ok || !data.ok) {
        setMessage({ tone: "error", text: data.error ?? "요청에 실패했습니다." });
        return null;
      }
      return data;
    } finally {
      setBusy(null);
    }
  }

  async function saveUrl(e: React.FormEvent) {
    e.preventDefault();
    const result = await call("url", `/api/vibesafe/projects/${props.projectId}/url`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (result) {
      setMessage({ tone: "ok", text: "서비스 주소를 저장했습니다." });
      router.refresh();
    }
  }

  async function saveCredential(e: React.FormEvent) {
    e.preventDefault();
    const result = await call("cred", `/api/vibesafe/projects/${props.projectId}/credential`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (result) {
      setUsername("");
      setPassword("");
      setMessage({ tone: "ok", text: "테스트 계정을 저장했습니다." });
      router.refresh();
    }
  }

  async function removeCredential() {
    const result = await call("cred-del", `/api/vibesafe/projects/${props.projectId}/credential`, {
      method: "DELETE",
    });
    if (result) {
      setMessage({ tone: "ok", text: "테스트 계정을 삭제했습니다." });
      router.refresh();
    }
  }

  async function createWebhookSecret() {
    const result = await call("webhook", `/api/vibesafe/projects/${props.projectId}/webhook`, {
      method: "POST",
    });
    if (result?.secret) setWebhookSecret(result.secret);
  }

  return (
    <div className="vs-container">
      <div className="vs-stack" style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="vs-row-between">
          <div>
            <h1 className="vs-page-title">{props.projectName} 설정</h1>
            {props.repository && (
              <p className="vs-page-sub">
                {props.repository.owner}/{props.repository.repo} · {props.repository.defaultBranch}
              </p>
            )}
          </div>
          <Link href={`/vibesafe/projects/${props.projectId}`} className="vs-btn vs-btn-sm">
            돌아가기
          </Link>
        </div>

        {message && (
          <div className="vs-alert" data-tone={message.tone} role="status">
            {message.text}
          </div>
        )}

        <form className="vs-card vs-stack" onSubmit={saveUrl}>
          <h2 className="vs-section-title">서비스 주소</h2>
          <input
            className="vs-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://my-app.vercel.app"
            inputMode="url"
            required
          />
          <p className="vs-hint">브라우저가 실제로 방문하는 주소입니다.</p>
          <div>
            <button className="vs-btn vs-btn-primary" type="submit" disabled={busy !== null}>
              저장
            </button>
          </div>
        </form>

        <form className="vs-card vs-stack" onSubmit={saveCredential}>
          <div className="vs-row-between">
            <h2 className="vs-section-title">테스트 계정</h2>
            {props.hasCredential && (
              <span className="vs-badge" data-tone="ok">
                저장됨
              </span>
            )}
          </div>
          <div className="vs-alert" data-tone="warn">
            실제로 쓰는 계정 대신 <strong>검사 전용 계정</strong>을 만들어 넣어주세요. 이 계정으로
            로그인이 필요한 흐름을 확인합니다.
          </div>
          <input
            className="vs-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="아이디 또는 이메일"
            autoComplete="off"
          />
          <input
            className="vs-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            autoComplete="new-password"
          />
          <p className="vs-hint">
            암호화해서 저장하며 화면에 다시 표시하지 않습니다. 검사 실행 직전에만 복호화합니다.
          </p>
          <div className="vs-row">
            <button className="vs-btn vs-btn-primary" type="submit" disabled={busy !== null}>
              저장
            </button>
            {props.hasCredential && (
              <button
                type="button"
                className="vs-btn vs-btn-danger"
                onClick={removeCredential}
                disabled={busy !== null}
              >
                삭제
              </button>
            )}
          </div>
        </form>

        <div className="vs-card vs-stack">
          <h2 className="vs-section-title">코드 변경 시 자동 검사</h2>
          {props.githubAppConnected ? (
            <p className="vs-hint">
              GitHub App으로 연결되어 있어 push가 일어나면 자동으로 검사합니다. 따로 설정할 것이
              없습니다.
            </p>
          ) : (
            <>
              <p className="vs-hint">
                토큰으로 연결한 경우, 저장소 설정에 webhook을 직접 추가하면 push할 때마다 바로
                검사합니다. (추가하지 않아도 정기 확인과 직접 실행은 동작합니다.)
              </p>
              <div className="vs-field">
                <span className="vs-label">Payload URL</span>
                <input className="vs-input vs-input-sm vs-mono" readOnly value={props.webhookUrl} />
              </div>
              {webhookSecret ? (
                <div className="vs-field">
                  <span className="vs-label">Secret (이 화면에서만 볼 수 있습니다)</span>
                  <input className="vs-input vs-input-sm vs-mono" readOnly value={webhookSecret} />
                  <p className="vs-hint">
                    GitHub 저장소 → Settings → Webhooks → Add webhook에서 위 두 값을 넣고
                    Content type은 <code>application/json</code>, 이벤트는 <code>push</code>만
                    고르세요.
                  </p>
                </div>
              ) : (
                <div>
                  <button className="vs-btn" onClick={createWebhookSecret} disabled={busy !== null}>
                    Secret 만들기
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
