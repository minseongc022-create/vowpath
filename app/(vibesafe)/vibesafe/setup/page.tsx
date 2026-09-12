import Link from "next/link";
import { getSetupStatus } from "@/vibesafe/lib/setup-status";
import { relativeTime } from "@/vibesafe/lib/format";
import { getSession } from "@/vibesafe/lib/session";

export const metadata = { title: "설정 확인", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * 설정 점검 화면.
 *
 * ★ 로그인 없이 열려야 한다
 *
 * DB가 안 붙어 있으면 로그인 자체가 안 된다. 그 상태를 확인하려고 로그인을
 * 요구하면 아무것도 진단할 수 없다. 그래서 공개 화면으로 두되, 나가는 것은
 * "설정됨/안 됨"과 우리가 쓴 안내문뿐이다 — 키 값은 한 글자도 나가지 않는다.
 *
 * 설정이 다 끝난 뒤에는 세부 내용을 로그인한 사람에게만 보여준다. 그 시점엔
 * 진단이 더 필요 없고, 남에게 배포 구성을 알려줄 이유도 없다.
 */
export default async function SetupPage() {
  const [status, session] = await Promise.all([getSetupStatus(), getSession()]);
  const showDetail = !status.ready || Boolean(session);

  const missing = status.checks.filter((c) => c.state === "missing");
  const optional = status.checks.filter((c) => c.state === "optional");

  return (
    <div className="vs-container">
      <div className="vs-stack" style={{ maxWidth: 720, margin: "0 auto" }}>
        <div>
          <h1 className="vs-page-title">설정 확인</h1>
          <p className="vs-page-sub">이 배포가 실제로 동작하는 상태인지 봅니다.</p>
        </div>

        <div className="vs-status-hero" data-state={status.ready ? "ok" : "unknown"}>
          <div className="vs-status-line">
            <span className="vs-status-dot" data-state={status.ready ? "ok" : "unknown"} />
            <span className="vs-status-title">{status.headline}</span>
          </div>
          {status.ready && (
            <p className="vs-status-note">
              <Link href="/vibesafe/signup">가입하고 첫 앱을 연결</Link>할 수 있습니다.
            </p>
          )}
        </div>

        {!showDetail ? (
          <div className="vs-card">
            <p className="vs-hint">
              설정이 모두 끝났습니다. 자세한 내용은 로그인 후 볼 수 있습니다.
            </p>
          </div>
        ) : (
          <>
            {missing.length === 0 && status.runtime && !status.runtime.tablesReady && (
              <div className="vs-alert" data-tone="warn">
                환경변수는 모두 설정됐습니다. 마지막으로 데이터베이스 테이블을 만드세요:{" "}
                <code>npm run vibesafe:push</code>
              </div>
            )}

            {missing.length > 0 && (
              <div className="vs-card vs-card-flush">
                <div className="vs-card-head">
                  <h2 className="vs-section-title">해야 할 일</h2>
                  <span className="vs-badge" data-tone="down">{missing.length}건</span>
                </div>
                <ul className="vs-flow-list">
                  {missing.map((check) => (
                    <li className="vs-flow-item" key={check.key} style={{ alignItems: "flex-start" }}>
                      <span className="vs-status-dot" data-state="down" />
                      <div style={{ minWidth: 0 }}>
                        <div className="vs-flow-name">{check.label}</div>
                        <p className="vs-flow-desc">{check.detail}</p>
                        {check.fix && <p className="vs-flow-desc">→ {check.fix}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="vs-card vs-card-flush">
              <div className="vs-card-head">
                <h2 className="vs-section-title">전체 항목</h2>
              </div>
              <ul className="vs-flow-list">
                {status.checks.map((check) => (
                  <li className="vs-flow-item" key={check.key}>
                    <span
                      className="vs-status-dot"
                      data-state={check.state === "ok" ? "ok" : check.state === "missing" ? "down" : "unknown"}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div className="vs-flow-name">{check.label}</div>
                      <p className="vs-flow-desc">{check.detail}</p>
                    </div>
                    <span className="vs-spacer" />
                    <span
                      className="vs-badge"
                      data-tone={check.state === "ok" ? "ok" : check.state === "missing" ? "down" : "neutral"}
                    >
                      {check.state === "ok" ? "됨" : check.state === "missing" ? "필요" : "선택"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {status.runtime && (
              <div className="vs-card vs-stack">
                <h2 className="vs-section-title">현재 상태</h2>
                {!status.runtime.tablesReady ? (
                  <div className="vs-alert" data-tone="error">
                    데이터베이스 테이블이 아직 없습니다. <code>npm run vibesafe:push</code> 를 실행하세요.
                  </div>
                ) : (
                  <>
                    <ul className="vs-hint" style={{ paddingLeft: 18, margin: 0 }}>
                      <li>가입한 사용자 {status.runtime.users}명</li>
                      <li>연결된 앱 {status.runtime.projects}개</li>
                      <li>대기 중인 검사 {status.runtime.queuedRuns}건</li>
                      <li>
                        워커가 마지막으로 일한 시각:{" "}
                        {status.runtime.workerSeenAt ? relativeTime(status.runtime.workerSeenAt) : "없음"}
                      </li>
                    </ul>
                    {status.runtime.queuedRuns > 0 && !status.runtime.workerSeenAt && (
                      <div className="vs-alert" data-tone="warn">
                        검사가 큐에 있는데 워커가 한 번도 일한 적이 없습니다. GitHub → Actions →
                        &ldquo;VibeSafe 브라우저 워커&rdquo;를 실행하거나, 워커 프로세스를 띄우세요.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <p className="vs-hint">
              설치 순서와 각 값을 어디서 받는지는 저장소의 <code>VIBESAFE.md</code> 에 있습니다.
              비밀값은 이 화면에 표시되지 않습니다.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
