import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ResultBadge } from "@/vibesafe/components/StatusBits";
import { getRunDetail } from "@/vibesafe/lib/dashboard";
import { absoluteTime, duration, TRIGGER_LABELS } from "@/vibesafe/lib/format";
import { getSession } from "@/vibesafe/lib/session";

export const metadata = { title: "검사 결과" };
export const dynamic = "force-dynamic";

/**
 * 검사 1건의 상세.
 *
 * 여기가 개발자용 화면이다 — 기본 화면에서 숨긴 원본 오류 메시지와 실패 당시
 * 화면을 여기에 둔다. 다만 기본은 접힌 상태다.
 */
export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; runId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/vibesafe/login");

  const { projectId, runId } = await params;
  const detail = await getRunDetail(session.userId, projectId, runId);
  if (!detail) notFound();

  const { run } = detail;

  return (
    <div className="vs-container">
      <div className="vs-stack">
        <div className="vs-row-between">
          <div>
            <h1 className="vs-page-title">검사 결과</h1>
            <p className="vs-page-sub">
              {absoluteTime(run.queuedAt)} · {TRIGGER_LABELS[run.trigger] ?? run.trigger}
              {run.commitSha ? ` · ${run.commitSha.slice(0, 7)}` : ""}
              {run.durationMs ? ` · ${duration(run.durationMs)}` : ""}
            </p>
          </div>
          <Link href={`/vibesafe/projects/${projectId}/runs`} className="vs-btn vs-btn-sm">
            기록으로
          </Link>
        </div>

        <div className="vs-row">
          <ResultBadge status={run.status} />
          {run.error && <span className="vs-hint">{run.error}</span>}
        </div>

        {run.results.length === 0 ? (
          <div className="vs-card">
            <p className="vs-hint">
              {run.status === "queued" || run.status === "running"
                ? "워커가 검사를 진행하고 있습니다."
                : "기록된 결과가 없습니다."}
            </p>
          </div>
        ) : (
          <div className="vs-stack">
            {run.results.map((result) => (
              <div className="vs-card vs-card-flush" key={result.id}>
                <div className="vs-card-head">
                  <div>
                    <strong>{result.flowTitle}</strong>
                    <p className="vs-hint" style={{ marginTop: 3 }}>
                      {duration(result.durationMs)}
                      {result.failedStepDescription && ` · 실패한 단계: ${result.failedStepDescription}`}
                    </p>
                  </div>
                  <ResultBadge status={result.status} />
                </div>

                {result.status === "failed" && (
                  <>
                    {result.screenshotId && (
                      <div style={{ padding: 16, background: "var(--vs-surface-sunken)" }}>
                        <p className="vs-label" style={{ marginBottom: 8 }}>
                          실패 당시 화면
                        </p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/vibesafe/screenshots/${result.screenshotId}`}
                          alt={`${result.flowTitle} 실패 화면`}
                          style={{
                            maxWidth: "100%",
                            borderRadius: 8,
                            border: "1px solid var(--vs-line)",
                            display: "block",
                          }}
                        />
                      </div>
                    )}
                    <details className="vs-details">
                      <summary>개발자용 상세 보기</summary>
                      <pre className="vs-code">
                        {[
                          result.url ? `주소: ${result.url}` : null,
                          result.failedStepOrder !== null ? `단계 번호: ${result.failedStepOrder}` : null,
                          result.errorMessage ? `\n${result.errorMessage}` : "오류 메시지 없음",
                        ]
                          .filter(Boolean)
                          .join("\n")}
                      </pre>
                    </details>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
