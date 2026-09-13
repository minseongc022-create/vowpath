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
  homepage: string | null;
};

type ConnectionState = {
  connection: { login: string; authKind: string } | null;
  appAvailable: boolean;
  patAvailable: boolean;
};

type UrlCandidate = { url: string; source: "deployment" | "homepage"; label: string };

type Reachability = { checking: boolean; reachable: boolean | null; reason: string | null };
const IDLE_REACHABILITY: Reachability = { checking: false, reachable: null, reason: null };

/** 한 번의 클릭이 끝날 때까지 화면이 보여주는 단계들. */
type Stage = { key: string; label: string; state: "wait" | "doing" | "done" | "fail"; note?: string };

const STAGES: { key: string; label: string }[] = [
  { key: "create", label: "앱 등록" },
  { key: "analyze", label: "저장소를 읽고 핵심 기능 찾기" },
  { key: "start", label: "안전한 기능을 켜고 첫 확인 시작" },
];

/**
 * 연결 → 저장소 선택 → 시작을 한 화면에서 끝낸다.
 *
 * ★ 사용자가 하는 일은 두 번의 선택뿐이다
 *
 *   1. GitHub 연결
 *   2. 저장소 고르기
 *   그리고 [연결하고 바로 시작] 한 번.
 *
 * 배포 주소는 묻지 않는다 — GitHub에서 찾아 채워 넣고 맞는지만 확인받는다.
 * 분석·흐름 켜기·첫 검사도 사용자가 따로 누르지 않는다. 예전에는 여기서
 * 세 번을 더 눌러야 했고, 대부분은 첫 번째에서 멈췄다.
 *
 * ★ 자동으로 한 일은 전부 보여준다
 *
 * 진행 중인 단계를 하나씩 표시하고, 끝나면 무엇을 켰는지 알려준다.
 * 사용자가 나중에 "이건 언제 켜진 거지?"라고 묻게 되는 상황을 만들지 않는다.
 */
export function ProjectSetup({ initialError }: { initialError?: string | null }) {
  const router = useRouter();
  const [state, setState] = useState<ConnectionState | null>(null);
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [selected, setSelected] = useState<Repo | null>(null);
  const [projectName, setProjectName] = useState("");
  const [url, setUrl] = useState("");
  const [detected, setDetected] = useState<UrlCandidate | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [reachability, setReachability] = useState<Reachability>(IDLE_REACHABILITY);
  const [token, setToken] = useState("");
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [busy, setBusy] = useState(false);
  const [stages, setStages] = useState<Stage[] | null>(null);

  const loadRepos = useCallback(async () => {
    const res = await fetch("/api/vibesafe/github/repos");
    const data = (await res.json()) as { repos?: Repo[]; error?: string };
    if (!res.ok) {
      setError(data.error ?? "저장소 목록을 불러오지 못했습니다.");
      return;
    }
    setRepos(data.repos ?? []);
  }, []);

  const loadConnection = useCallback(async () => {
    const res = await fetch("/api/vibesafe/github");
    const data = (await res.json()) as ConnectionState & { error?: string };
    if (!res.ok) {
      setError(data.error ?? "연결 상태를 불러오지 못했습니다.");
      return;
    }
    setState(data);
    if (data.connection) void loadRepos();
  }, [loadRepos]);

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

  /**
   * 주소가 실제로 응답하는지 미리 찔러본다.
   *
   * ★ 왜 여기서 확인하는가
   *
   * 이게 없으면 사용자는 [연결하고 바로 시작]을 누르고 분석이 끝나는
   * 1~2분을 기다린 뒤에야 주소가 틀렸다는 걸 안다. 자동 감지 직후와
   * 사용자가 직접 고친 뒤(blur) 둘 다에서 불러 최대한 일찍 알려준다.
   *
   * ★ 실패해도 진행을 막지 않는다
   *
   * HEAD·GET을 막아둔 서버, 봇 차단처럼 실제로는 멀쩡한데 이 가벼운 확인만
   * 실패하는 경우가 흔하다. 경고만 보여주고 결정은 사용자에게 맡긴다.
   */
  const checkReachability = useCallback(async (targetUrl: string) => {
    if (!targetUrl.trim()) {
      setReachability(IDLE_REACHABILITY);
      return;
    }
    setReachability({ checking: true, reachable: null, reason: null });
    try {
      const res = await fetch("/api/vibesafe/github/check-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      const data = (await res.json()) as { ok?: boolean; reachable?: boolean; reason?: string };
      if (!res.ok || !data.ok) {
        setReachability(IDLE_REACHABILITY);
        return;
      }
      setReachability({ checking: false, reachable: Boolean(data.reachable), reason: data.reason ?? null });
    } catch {
      setReachability(IDLE_REACHABILITY);
    }
  }, []);

  /**
   * 저장소를 고르는 순간 배포 주소를 찾으러 간다.
   *
   * 저장소의 homepage 칸은 목록에 이미 실려 오므로 먼저 그것으로 칸을 채워
   * 두고(즉시 반응), 그 사이 배포 기록까지 확인해 더 정확한 값이 나오면
   * 바꿔준다. 빈 칸을 잠깐이라도 보여주지 않으려는 것이다.
   */
  async function pickRepo(repo: Repo) {
    setSelected(repo);
    setDetected(null);
    setReachability(IDLE_REACHABILITY);
    if (!projectName) setProjectName(repo.name);

    let finalUrl = "";
    if (repo.homepage) {
      finalUrl = repo.homepage;
      setUrl(repo.homepage);
      setDetected({ url: repo.homepage, source: "homepage", label: "저장소에 적힌 주소입니다" });
    } else {
      setUrl("");
    }

    setDetecting(true);
    try {
      const res = await fetch("/api/vibesafe/github/detect-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: repo.owner, repo: repo.name }),
      });
      const data = (await res.json()) as { candidates?: UrlCandidate[] };
      const best = data.candidates?.[0];
      if (best) {
        finalUrl = best.url;
        setUrl(best.url);
        setDetected(best);
      }
    } catch {
      // 못 찾아도 문제가 아니다. 사용자가 직접 넣으면 된다.
    } finally {
      setDetecting(false);
    }

    if (finalUrl) void checkReachability(finalUrl);
  }

  function mark(key: string, state: Stage["state"], note?: string) {
    setStages((prev) =>
      (prev ?? STAGES.map((s) => ({ ...s, state: "wait" as const }))).map((s) =>
        s.key === key ? { ...s, state, note } : s,
      ),
    );
  }

  /** 여기 한 번이 등록 → 분석 → 켜기 → 첫 검사까지 전부 한다. */
  async function connectAndStart(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    setStages(STAGES.map((s) => ({ ...s, state: "wait" })));

    // 1) 등록
    mark("create", "doing");
    const createRes = await fetch("/api/vibesafe/projects", {
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
    const created = (await createRes.json()) as { ok?: boolean; projectId?: string; error?: string };
    if (!createRes.ok || !created.ok || !created.projectId) {
      mark("create", "fail");
      setError(created.error ?? "프로젝트를 만들지 못했습니다.");
      setBusy(false);
      return;
    }
    mark("create", "done");
    const projectId = created.projectId;

    // 2) 분석 — 여기가 제일 오래 걸린다(보통 30초~2분)
    mark("analyze", "doing");
    type AnalyzeResult = { ok?: boolean; error?: string; outcome?: { flowCount?: number } };
    async function runAnalyze(): Promise<{ res: Response; data: AnalyzeResult }> {
      const res = await fetch(`/api/vibesafe/projects/${projectId}/analyze`, { method: "POST" });
      const data = (await res.json()) as AnalyzeResult;
      return { res, data };
    }
    let { res: analyzeRes, data: analyzed } = await runAnalyze();
    if (!analyzeRes.ok || !analyzed.ok) {
      // 첫 실패가 일시적인 것일 수 있다 — 사용자에게 보여주기 전에 조용히
      // 한 번 더 시도한다. AI 호출·GitHub API 모두 가끔 타임아웃이 난다.
      mark("analyze", "doing", "한 번 더 시도하는 중…");
      ({ res: analyzeRes, data: analyzed } = await runAnalyze());
    }
    if (!analyzeRes.ok || !analyzed.ok) {
      // 그래도 안 되면 프로젝트는 이미 있으니 앱 화면에서 다시 시도할 수 있다.
      mark("analyze", "fail", analyzed.error ?? "분석에 실패했습니다.");
      setError(
        `${analyzed.error ?? "분석에 실패했습니다."} 앱은 등록됐으니 앱 화면에서 다시 시도할 수 있습니다.`,
      );
      setBusy(false);
      setTimeout(() => router.push(`/vibesafe/projects/${projectId}`), 2500);
      return;
    }
    const flowCount = analyzed.outcome?.flowCount;
    mark("analyze", "done", flowCount ? `핵심 기능 ${flowCount}개를 찾았습니다` : undefined);

    // 3) 안전한 흐름만 켜고 첫 검사를 건다
    mark("start", "doing");
    const startRes = await fetch(`/api/vibesafe/projects/${projectId}/autostart`, { method: "POST" });
    const started = (await startRes.json()) as {
      ok?: boolean;
      autoStart?: { enabledFlows: { title: string }[]; needsReview: unknown[]; runId: string | null };
    };
    if (startRes.ok && started.ok && started.autoStart) {
      const { enabledFlows, needsReview } = started.autoStart;
      mark(
        "start",
        "done",
        `${enabledFlows.length}개를 켜고 확인을 시작했습니다` +
          (needsReview.length > 0 ? ` · ${needsReview.length}개는 직접 확인이 필요합니다` : ""),
      );
    } else {
      mark("start", "fail");
    }

    setTimeout(() => router.push(`/vibesafe/projects/${projectId}`), 1200);
  }

  const connected = Boolean(state?.connection);

  return (
    <div className="vs-container-narrow">
      <div className="vs-stack">
        <div>
          <h1 className="vs-page-title">앱 연결하기</h1>
          <p className="vs-page-sub">
            저장소만 고르시면 됩니다. 주소는 저희가 찾고, 나머지도 저희가 합니다.
          </p>
        </div>

        {error && (
          <div className="vs-alert" data-tone="error" role="alert">
            {error}
          </div>
        )}

        {/* 진행 중일 때는 진행 상황만 보여준다 — 지금 뭐가 되고 있는지가 전부다 */}
        {stages && (
          <div className="vs-card vs-stack-sm">
            <strong>연결하는 중입니다</strong>
            {stages.map((stage) => (
              <div key={stage.key} className="vs-row" style={{ gap: 10, alignItems: "flex-start" }}>
                <span aria-hidden style={{ lineHeight: 1.6, minWidth: 18 }}>
                  {stage.state === "done"
                    ? "✅"
                    : stage.state === "doing"
                      ? "⏳"
                      : stage.state === "fail"
                        ? "❌"
                        : "·"}
                </span>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: stage.state === "doing" ? 600 : 400 }}>
                    {stage.label}
                  </div>
                  {stage.note && (
                    <p className="vs-hint" style={{ margin: "2px 0 0" }}>
                      {stage.note}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <p className="vs-hint">
              저장소를 읽고 이 앱이 무엇을 하는 앱인지 파악합니다. 보통 30초에서 2분 걸립니다.
            </p>
          </div>
        )}

        {/* 1단계 — GitHub */}
        {!stages && (
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
        )}

        {/* 2단계 — 저장소 */}
        {!stages && connected && (
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
                  if (repo) void pickRepo(repo);
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

        {/* 3단계 — 확인하고 시작 */}
        {!stages && selected && (
          <form className="vs-card vs-stack" onSubmit={connectAndStart}>
            <div className="vs-row">
              <span className="vs-step-num">3</span>
              <strong>확인하고 시작</strong>
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
                onChange={(e) => {
                  setUrl(e.target.value);
                  setDetected(null);
                  setReachability(IDLE_REACHABILITY);
                }}
                onBlur={(e) => void checkReachability(e.target.value)}
                placeholder={detecting ? "주소를 찾는 중…" : "https://my-app.vercel.app"}
                inputMode="url"
                required
              />
              {detecting && <p className="vs-hint">배포 주소를 찾는 중…</p>}
              {!detecting && detected && (
                <p className="vs-hint">
                  <span className="vs-badge" data-tone="ok" style={{ marginRight: 6 }}>
                    자동으로 찾음
                  </span>
                  {detected.label}. 다르면 고쳐주세요.
                </p>
              )}
              {!detecting && !detected && (
                <p className="vs-hint">
                  실제 고객이 접속하는 주소를 넣어주세요. 이 주소를 브라우저가 직접 방문합니다.
                </p>
              )}
              {!detecting && reachability.checking && (
                <p className="vs-hint">이 주소가 실제로 열리는지 확인하는 중…</p>
              )}
              {!detecting && !reachability.checking && reachability.reachable === true && (
                <p className="vs-hint">
                  <span className="vs-badge" data-tone="ok" style={{ marginRight: 6 }}>
                    접속 확인됨
                  </span>
                  지금 이 주소가 응답합니다.
                </p>
              )}
              {!detecting && !reachability.checking && reachability.reachable === false && (
                <div className="vs-alert" data-tone="warn">
                  {reachability.reason ?? "이 주소에 접속하지 못했습니다."} 주소가 맞는지 한 번 더
                  확인해주세요 — 그래도 이대로 진행할 수는 있습니다.
                </div>
              )}
            </div>

            <button className="vs-btn vs-btn-primary vs-btn-block vs-btn-lg" type="submit" disabled={busy}>
              {busy ? "시작하는 중…" : "연결하고 바로 시작"}
            </button>
            <p className="vs-hint">
              누르면 저장소를 읽어 핵심 기능을 찾고, <strong>되돌릴 수 있는 기능만</strong> 자동으로
              켠 뒤 첫 확인을 시작합니다. 결제·발송·삭제가 걸린 기능은 켜지 않고 따로 보여드립니다.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
