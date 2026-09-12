"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Repo = {
  fullName: string;
  owner: string;
  name: string;
  private: boolean;
  defaultBranch: string;
  description: string | null;
  pushedAt: string | null;
};

type ConnectionState = {
  connection: { login: string; authKind: string } | null;
  appAvailable: boolean;
  patAvailable: boolean;
};

/**
 * 연결 → 저장소 선택 → 주소 입력을 한 화면에서 끝낸다.
 *
 * 단계를 페이지로 쪼개면 중간에 이탈한 사용자가 어디까지 했는지 몰라 다시
 * 처음부터 하게 된다. 한 화면에서 순서대로 열리게 두는 편이 완주율이 높다.
 */
export function ProjectSetup({ initialError }: { initialError?: string | null }) {
  const router = useRouter();
  const [state, setState] = useState<ConnectionState | null>(null);
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [selected, setSelected] = useState<Repo | null>(null);
  const [projectName, setProjectName] = useState("");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [busy, setBusy] = useState(false);

  const loadConnection = useCallback(async () => {
    const res = await fetch("/api/vibesafe/github");
    const data = (await res.json()) as ConnectionState & { error?: string };
    if (!res.ok) {
      setError(data.error ?? "연결 상태를 불러오지 못했습니다.");
      return;
    }
    setState(data);
    if (data.connection) void loadRepos();
  }, []);

  const loadRepos = useCallback(async () => {
    const res = await fetch("/api/vibesafe/github/repos");
    const data = (await res.json()) as { repos?: Repo[]; error?: string };
    if (!res.ok) {
      setError(data.error ?? "저장소 목록을 불러오지 못했습니다.");
      return;
    }
    setRepos(data.repos ?? []);
  }, []);

  useEffect(() => {
    void loadConnection();
  }, [loadConnection]);

  async function connectToken(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/vibesafe/github/pat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.trim() }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "토큰으로 연결하지 못했습니다.");
      return;
    }
    setToken("");
    setShowTokenForm(false);
    await loadConnection();
  }

  function pickRepo(repo: Repo) {
    setSelected(repo);
    if (!projectName) setProjectName(repo.name);
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/vibesafe/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: projectName.trim() || selected.name,
        owner: selected.owner,
        repo: selected.name,
        defaultBranch: selected.defaultBranch,
        isPrivate: selected.private,
        productionUrl: url.trim(),
      }),
    });
    const data = (await res.json()) as { ok?: boolean; projectId?: string; error?: string };
    if (!res.ok || !data.ok || !data.projectId) {
      setBusy(false);
      setError(data.error ?? "프로젝트를 만들지 못했습니다.");
      return;
    }
    router.push(`/vibesafe/projects/${data.projectId}?analyze=1`);
  }

  const connected = Boolean(state?.connection);

  return (
    <div className="vs-container-narrow">
      <div className="vs-stack">
        <div>
          <h1 className="vs-page-title">앱 연결하기</h1>
          <p className="vs-page-sub">저장소와 서비스 주소만 있으면 됩니다. 보통 3분이면 끝납니다.</p>
        </div>

        {error && (
          <div className="vs-alert" data-tone="error" role="alert">
            {error}
          </div>
        )}

        {/* 1단계 — GitHub */}
        <div className="vs-card vs-stack">
          <div className="vs-row">
            <span className="vs-step-num">1</span>
            <strong>GitHub 연결</strong>
            {connected && (
              <span className="vs-badge" data-tone="ok">
                {state?.connection?.login} 연결됨
              </span>
            )}
          </div>

          {!connected && (
            <>
              <p className="vs-hint">
                VibeSafe는 저장소를 <strong>읽기만</strong> 합니다. 커밋·푸시·배포 권한은 요청하지 않습니다.
              </p>
              {state?.appAvailable && (
                <a className="vs-btn vs-btn-primary" href="/api/vibesafe/github/install">
                  GitHub App 설치하고 연결 (권장)
                </a>
              )}
              {state?.patAvailable && (
                <>
                  <button
                    type="button"
                    className="vs-btn vs-btn-ghost vs-btn-sm"
                    onClick={() => setShowTokenForm((v) => !v)}
                  >
                    {state.appAvailable ? "또는 읽기 전용 토큰으로 연결" : "읽기 전용 토큰으로 연결"}
                  </button>
                  {showTokenForm && (
                    <form className="vs-stack-sm" onSubmit={connectToken}>
                      <p className="vs-hint">
                        GitHub → Settings → Developer settings → Personal access tokens →
                        <strong> Fine-grained tokens</strong>에서 만들고, 권한은{" "}
                        <strong>Contents: Read-only</strong>와 <strong>Metadata: Read-only</strong>만
                        주세요.
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
                        {busy ? "확인 중…" : "토큰으로 연결"}
                      </button>
                    </form>
                  )}
                </>
              )}
              {!state?.appAvailable && !state?.patAvailable && state && (
                <div className="vs-alert" data-tone="warn">
                  이 서버에는 GitHub 연결 설정이 아직 되어 있지 않습니다. 운영자에게 문의해주세요.
                </div>
              )}
            </>
          )}
        </div>

        {/* 2단계 — 저장소 */}
        {connected && (
          <div className="vs-card vs-stack">
            <div className="vs-row">
              <span className="vs-step-num">2</span>
              <strong>저장소 선택</strong>
            </div>

            {repos === null && <p className="vs-hint">저장소를 불러오는 중…</p>}
            {repos?.length === 0 && (
              <p className="vs-hint">
                접근 가능한 저장소가 없습니다. GitHub App 설정에서 저장소 접근을 허용했는지
                확인해주세요.
              </p>
            )}
            {repos && repos.length > 0 && (
              <select
                className="vs-select"
                value={selected?.fullName ?? ""}
                onChange={(e) => {
                  const repo = repos.find((r) => r.fullName === e.target.value);
                  if (repo) pickRepo(repo);
                }}
              >
                <option value="">저장소를 고르세요</option>
                {repos.map((repo) => (
                  <option key={repo.fullName} value={repo.fullName}>
                    {repo.fullName}
                    {repo.private ? " (비공개)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* 3단계 — 주소 */}
        {selected && (
          <form className="vs-card vs-stack" onSubmit={createProject}>
            <div className="vs-row">
              <span className="vs-step-num">3</span>
              <strong>배포된 서비스 주소</strong>
            </div>

            <div className="vs-field">
              <label className="vs-label" htmlFor="vs-project-name">
                프로젝트 이름
              </label>
              <input
                id="vs-project-name"
                className="vs-input"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                maxLength={80}
                required
              />
            </div>

            <div className="vs-field">
              <label className="vs-label" htmlFor="vs-url">
                서비스 주소
              </label>
              <input
                id="vs-url"
                className="vs-input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://my-app.vercel.app"
                inputMode="url"
                required
              />
              <p className="vs-hint">
                실제 고객이 접속하는 주소를 넣어주세요. 이 주소를 브라우저가 직접 방문합니다.
              </p>
            </div>

            <button className="vs-btn vs-btn-primary vs-btn-block" type="submit" disabled={busy}>
              {busy ? "만드는 중…" : "연결하고 앱 분석 시작"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
