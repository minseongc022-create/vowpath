import Link from "next/link";
import type { RepairHistoryItem } from "../lib/repair/view";
import { absoluteTime } from "../lib/format";

export type RepairStatsView = {
  total: number;
  verified: number;
  failedVerify: number;
  regressed: number;
  rejected: number;
  successRate: number | null;
  note: string;
};

const OUTCOME_LABEL: Record<string, { title: string; tone: "ok" | "warn" | "down" | "neutral" }> = {
  verified: { title: "실제로 고쳐짐", tone: "ok" },
  failed_verify: { title: "미리보기에서 걸러짐", tone: "warn" },
  regressed: { title: "적용 후에도 안 됨", tone: "down" },
  rejected: { title: "거절됨", tone: "neutral" },
  abandoned: { title: "중단됨", tone: "neutral" },
};

/**
 * 수정 이력 전체 — 성공만 골라 보여주지 않는다.
 *
 * ★ 왜 실패도 나열하는가
 *
 * 성공한 것만 보여주면 "이 도구가 고친 건 전부 성공했다"는 착각을 준다.
 * 실패·거절까지 그대로 나열해야 사용자가 이 도구의 실제 타율을 스스로
 * 판단할 수 있다. 판단에 쓸 근거를 감추지 않는 것이 이 화면의 전부다.
 */
export function RepairHistoryPanel({
  items,
  stats,
  projectId,
}: {
  items: RepairHistoryItem[];
  stats: RepairStatsView;
  projectId: string;
}) {
  return (
    <div className="vs-stack">
      <div className="vs-card">
        {stats.successRate != null ? (
          <div className="vs-grid-3">
            <div className="vs-stat">
              <div className="vs-stat-value">{Math.round(stats.successRate * 100)}%</div>
              <div className="vs-stat-label">실제로 고쳐진 비율</div>
            </div>
            <div className="vs-stat">
              <div className="vs-stat-value">{stats.verified}건</div>
              <div className="vs-stat-label">실서비스에서 확인됨</div>
            </div>
            <div className="vs-stat">
              <div className="vs-stat-value">{stats.total}건</div>
              <div className="vs-stat-label">전체 시도</div>
            </div>
          </div>
        ) : (
          <p className="vs-hint">{stats.note}</p>
        )}
      </div>

      {items.length === 0 ? (
        <div className="vs-card">
          <p className="vs-hint">아직 수정 이력이 없습니다. 원인 분석 권한을 켜면 장애가 생겼을 때 여기 쌓이기 시작합니다.</p>
        </div>
      ) : (
        <div className="vs-card vs-card-flush">
          {items.map((item) => (
            <div key={item.id} className="vs-flow-item" style={{ padding: "12px 16px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="vs-row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <span className="vs-badge" data-tone={item.riskLabel.tone}>{item.riskLabel.title}</span>
                  <span className="vs-badge" data-tone="neutral">{item.stage}</span>
                  {item.outcome && OUTCOME_LABEL[item.outcome] && (
                    <span className="vs-badge" data-tone={OUTCOME_LABEL[item.outcome].tone}>
                      {OUTCOME_LABEL[item.outcome].title}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 500 }}>{item.title}</div>
                <p className="vs-hint" style={{ marginTop: 2 }}>
                  {item.flowTitle ? `${item.flowTitle} · ` : ""}
                  {absoluteTime(new Date(item.createdAt))}
                </p>
              </div>
              {item.incidentId && (
                <Link
                  href={`/vibesafe/projects/${projectId}/incidents/${item.incidentId}`}
                  className="vs-btn vs-btn-sm"
                >
                  자세히
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
