import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RepairPanel } from "@/vibesafe/components/RepairPanel";
import { absoluteTime } from "@/vibesafe/lib/format";
import { particle, withParticle } from "@/vibesafe/lib/korean";
import { assertProjectOwner } from "@/vibesafe/lib/projects";
import { getRepairView } from "@/vibesafe/lib/repair/view";
import { getSession } from "@/vibesafe/lib/session";
import { TECHNICAL_DETAIL_TOGGLE_LABEL } from "@/vibesafe/lib/ui-mode";

export const metadata = { title: "문제 상세" };
export const dynamic = "force-dynamic";

/**
 * 장애 하나를 끝까지 보는 화면.
 *
 * ★ 제목을 "누가 못 하는 일"로 쓴다
 *
 * "checkout_flow 실패"는 정보지만 문장이 아니다. "손님이 결제를 못 합니다"는
 * 사장님이 읽고 바로 무슨 일인지 아는 문장이다. 같은 사실이다.
 */
export default async function IncidentPage({
  params,
}: {
  params: Promise<{ projectId: string; incidentId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/vibesafe/login");
  const { projectId, incidentId } = await params;
  if (!(await assertProjectOwner(session.userId, projectId))) notFound();

  const view = await getRepairView({ userId: session.userId, projectId, incidentId });
  if (!view) notFound();

  const { incident, mode, diagnosis } = view;
  const who = incident.roleTitle ? `${withParticle(incident.roleTitle, "이/가")} ` : "";
  const whatObject = `"${incident.flowTitle}"${particle(`"${incident.flowTitle}"`, "을/를")}`;
  const open = incident.status === "open";

  return (
    <div className="vs-container">
      <div className="vs-stack" style={{ maxWidth: 760, margin: "0 auto" }}>
        <div className="vs-row-between">
          <div>
            <h1 className="vs-page-title">{incident.flowTitle}</h1>
            <p className="vs-page-sub">
              {open ? "문제가 계속되고 있습니다" : "해결됨"} · {absoluteTime(new Date(incident.detectedAt))} 발견
            </p>
          </div>
          <Link href={`/vibesafe/projects/${projectId}`} className="vs-btn vs-btn-sm">
            앱 상태로
          </Link>
        </div>

        <div className="vs-status-hero" data-state={open ? "down" : "ok"}>
          <div className="vs-status-line">
            <span className="vs-status-dot" data-state={open ? "down" : "ok"} />
            <span className="vs-status-title">
              {open
                ? `${who}${whatObject} 하지 못합니다`
                : `${who}${whatObject} 다시 할 수 있습니다`}
            </span>
          </div>
          {incident.failedStepDescription && (
            <p className="vs-status-note">
              {mode === "simple" ? "막힌 지점" : "실패한 단계"}: {incident.failedStepDescription}
            </p>
          )}
        </div>

        {diagnosis && (
          <div className="vs-card vs-stack">
            <h3 className="vs-section-title">
              {mode === "simple" ? "무엇 때문인지" : "원인 분석"}
            </h3>
            <p style={{ fontSize: 14.5, margin: 0 }}>{diagnosis.summary}</p>
            {diagnosis.suggestion && <p className="vs-hint">{diagnosis.suggestion}</p>}
          </div>
        )}

        <RepairPanel projectId={projectId} incidentId={incidentId} initialView={view} />

        {/* 원본 오류는 간편 모드에서도 지우지 않는다 — 접어둘 뿐이다 */}
        {incident.errorMessage && (
          <details className="vs-card vs-details" style={{ padding: 0 }} open={mode === "expert"}>
            <summary>
              {mode === "simple" ? TECHNICAL_DETAIL_TOGGLE_LABEL : "원본 오류 메시지"}
            </summary>
            <pre className="vs-code">{incident.errorMessage}</pre>
          </details>
        )}
      </div>
    </div>
  );
}
