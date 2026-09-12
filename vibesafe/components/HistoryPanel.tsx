import type { ProjectHistory } from "../lib/history";
import { absoluteTime } from "../lib/format";

/**
 * 이력 화면 — 이 제품의 1번 전환비용을 눈에 보이게 만드는 곳.
 *
 * 숫자를 크게 띄우는 게 핵심이다. "47일째 무사고"가 매일 커지는 걸 보면
 * 사용자는 이 도구를 끄기 어려워진다 — 끄는 순간 그 숫자가 0이 되니까.
 */
export function HistoryPanel({ history }: { history: ProjectHistory }) {
  if (history.totalChecks === 0) {
    return (
      <div className="vs-card">
        <h2 className="vs-section-title">안정성 이력</h2>
        <p className="vs-hint" style={{ marginTop: 8 }}>
          검사를 시작하면 여기에 이력이 쌓입니다. 오래 쓸수록 값이 커지는 화면입니다.
        </p>
      </div>
    );
  }

  const state = history.cleanDays > 0 ? "ok" : history.totalIncidents > 0 ? "down" : "unknown";

  return (
    <div className="vs-stack">
      <div className="vs-grid-3">
        <div className="vs-stat">
          <div className="vs-clean-days" data-state={state}>
            {history.cleanDays}
            <span style={{ fontSize: 16, fontWeight: 600, marginLeft: 4 }}>일</span>
          </div>
          <div className="vs-stat-label">연속 무사고</div>
        </div>
        <div className="vs-stat">
          <div className="vs-stat-value">{history.watchingDays}일</div>
          <div className="vs-stat-label">
            확인해 온 기간
            {history.watchingSince && (
              <><br />{absoluteTime(history.watchingSince)}부터</>
            )}
          </div>
        </div>
        <div className="vs-stat">
          <div className="vs-stat-value">{history.caughtBeforeCustomers}건</div>
          <div className="vs-stat-label">고객보다 먼저 발견한 문제</div>
        </div>
      </div>

      <div className="vs-card vs-card-flush">
        <div className="vs-card-head">
          <div>
            <h2 className="vs-section-title">기능별 안정성</h2>
            <p className="vs-hint" style={{ marginTop: 4 }}>최근 90일 · 칸 하나가 하루입니다</p>
          </div>
          <span className="vs-badge" data-tone="neutral">검사 {history.totalChecks}회</span>
        </div>

        <div style={{ padding: "4px 20px 16px" }}>
          {history.flows.map((flow) => (
            <div key={flow.flowKey} style={{ padding: "12px 0", borderBottom: "1px solid var(--vs-line)" }}>
              <div className="vs-row-between" style={{ marginBottom: 8 }}>
                <strong style={{ fontSize: 14.5 }}>{flow.flowTitle}</strong>
                <span className="vs-hint">
                  {flow.cleanDays > 0 && `${flow.cleanDays}일째 무사고 · `}
                  {flow.passRate !== null && `성공률 ${Math.round(flow.passRate * 100)}%`}
                  {flow.incidentDays > 0 && ` · 문제 있던 날 ${flow.incidentDays}일`}
                </span>
              </div>
              <div className="vs-heatmap" role="img" aria-label={`${flow.flowTitle} 최근 90일 상태`}>
                {flow.timeline.map((cell) => (
                  <span
                    key={cell.day}
                    className="vs-heatmap-cell"
                    data-state={cell.state}
                    title={`${cell.day}: ${cell.state === "pass" ? "정상" : cell.state === "fail" ? "문제" : "검사 없음"}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--vs-line)" }}>
          <p className="vs-hint">
            이 이력은 VibeSafe가 실제로 지켜본 기록입니다. 다른 도구로 옮기면 처음부터
            다시 쌓아야 합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
