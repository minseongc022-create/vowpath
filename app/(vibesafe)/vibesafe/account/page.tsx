import { redirect } from "next/navigation";
import {
  DisconnectGithubButton,
  LogoutButton,
  VercelConnectionPanel,
  WriteConnectionPanel,
} from "@/vibesafe/components/AccountPanel";
import { getWriteConnection, isFixAppConfigured } from "@/vibesafe/lib/github/write-connection";
import { getVercelConnection } from "@/vibesafe/lib/repair/rollback";
import { getConnection } from "@/vibesafe/lib/github/connection";
import { absoluteTime } from "@/vibesafe/lib/format";
import { getSession } from "@/vibesafe/lib/session";
import { getUsage, planLimits } from "@/vibesafe/lib/usage";
import { isDatabaseConfigured } from "@/vibesafe/lib/db";
import { UiModeToggle } from "@/vibesafe/components/UiModePicker";
import { getUiModePreference } from "@/vibesafe/lib/user-prefs";

export const metadata = { title: "계정" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/vibesafe/login");

  const dbReady = isDatabaseConfigured();
  const preference = dbReady
    ? await getUiModePreference(session.userId)
    : { mode: "simple" as const, asked: false };
  const [connection, usage, writeConnection, vercelConnection] = dbReady
    ? await Promise.all([
        getConnection(session.userId),
        getUsage(session.userId),
        getWriteConnection(session.userId),
        getVercelConnection(session.userId),
      ])
    : [null, { test_runs: 0, ai_analyses: 0, browser_ms: 0 }, null, null];
  const limits = planLimits();

  return (
    <div className="vs-container">
      <div className="vs-stack" style={{ maxWidth: 640, margin: "0 auto" }}>
        <div>
          <h1 className="vs-page-title">계정</h1>
          <p className="vs-page-sub">{session.email}</p>
        </div>

        <div className="vs-card vs-stack">
          <h2 className="vs-section-title">결과를 보여드리는 방식</h2>
          <UiModeToggle mode={preference.mode} />
        </div>

        <div className="vs-card vs-stack">
          <h2 className="vs-section-title">GitHub 연결</h2>
          {connection ? (
            <>
              <p className="vs-hint">
                <strong>{connection.login}</strong> 계정으로 연결되어 있습니다
                {connection.authKind === "app_installation" ? " (GitHub App · 읽기 전용)" : " (토큰)"}.
                {" "}연결 시각: {absoluteTime(connection.connectedAt)}
              </p>
              <div>
                <DisconnectGithubButton connected />
              </div>
            </>
          ) : (
            <p className="vs-hint">아직 연결되지 않았습니다.</p>
          )}
        </div>

        <WriteConnectionPanel
          connected={Boolean(writeConnection)}
          login={writeConnection?.login ?? null}
          appAvailable={isFixAppConfigured()}
        />

        <VercelConnectionPanel
          connected={Boolean(vercelConnection)}
          login={vercelConnection?.login ?? null}
        />

        <div className="vs-card vs-stack">
          <div className="vs-row-between">
            <h2 className="vs-section-title">이번 달 사용량</h2>
            <span className="vs-badge" data-tone="info">무료 베타</span>
          </div>
          <ul className="vs-hint" style={{ paddingLeft: 18, margin: 0 }}>
            <li>
              검사 {usage.test_runs} / {limits.testRunsPerMonth}회
            </li>
            <li>
              앱 분석 {usage.ai_analyses} / {limits.aiAnalysesPerMonth}회
            </li>
            <li>
              브라우저 실행 {Math.round(usage.browser_ms / 60000)} /{" "}
              {Math.round(limits.browserMsPerMonth / 60000)}분
            </li>
            <li>프로젝트 최대 {limits.projects}개</li>
          </ul>
          <p className="vs-hint">
            지금은 요금이 없습니다. 유료 요금제를 만들 때는 미리 알려드립니다.
          </p>
        </div>

        <div className="vs-row">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
