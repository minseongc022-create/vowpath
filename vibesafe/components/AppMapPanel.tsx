import Link from "next/link";
import type { AppMap } from "../lib/app-map";
import type { UiMode } from "../lib/ui-mode";

/**
 * 앱 지도 — "누가 이 앱에서 무엇을 할 수 있는가".
 *
 * ★ 흐름 목록과 무엇이 다른가
 *
 * 목록은 "우리가 무엇을 검사하는지"를 보여준다. 지도는 "당신의 서비스가
 * 누구에게 무엇을 해주는지"를 보여준다. 후자가 사용자의 머릿속에 이미 있는
 * 모양이라, 빠진 것이 있으면 사용자가 바로 알아본다 — "어? 사장님이 정산
 * 확인하는 건 왜 없지?" 이 한 마디가 나오게 하는 것이 이 화면의 목적이다.
 *
 * ★ 여기 없는 것: "앱 전체가 정상입니다"
 *
 * 우리가 확인한 건 등록된 흐름 몇 개뿐이다. 그걸 "전체"라고 부르면, 확인하지
 * 않은 곳이 깨졌을 때 우리가 거짓말한 것이 된다. 확인한 개수를 그대로 쓴다.
 */
export function AppMapPanel({
  map,
  projectId,
  mode,
}: {
  map: AppMap;
  projectId: string;
  mode: UiMode;
}) {
  if (map.totalFlows === 0) return null;

  const roles = map.roles.filter((role) => role.flows.length > 0);
  const hasRoles = roles.length > 0;

  return (
    <div className="vs-container">
      <div className="vs-card vs-stack" style={{ marginTop: 16 }}>
        <div className="vs-row-between">
          <div>
            <h2 className="vs-section-title">이 앱은 누가 무엇을 하나요</h2>
            <p className="vs-hint" style={{ marginTop: 4 }}>
              {map.summary ?? "저장소를 읽고 정리한 내용입니다."}
            </p>
          </div>
        </div>

        <p className="vs-hint">
          VibeSafe가 확인하는 것은 아래 <strong>{map.totalFlows}가지</strong>입니다. 여기
          없는 기능은 확인하지 않습니다 — 빠진 게 있으면 직접 추가해주세요.
        </p>

        {hasRoles &&
          roles.map((role) => (
            <div key={role.key} className="vs-surface-sunken" style={{ padding: 12, borderRadius: 8 }}>
              <div className="vs-row" style={{ gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 15 }}>{role.title}</strong>
                {role.isPrimary && (
                  <span className="vs-badge" data-tone="neutral">주 사용자</span>
                )}
                {role.brokenCount > 0 && (
                  <span className="vs-badge" data-tone="down">
                    지금 못 하는 일 {role.brokenCount}개
                  </span>
                )}
                {mode === "expert" && (
                  <span className="vs-hint vs-mono">{role.key}</span>
                )}
              </div>
              {role.description && (
                <p className="vs-hint" style={{ margin: "0 0 8px" }}>{role.description}</p>
              )}
              <ul className="vs-flow-list">
                {role.flows.map((flow) => (
                  <li key={flow.key} className="vs-flow-item">
                    <span
                      className="vs-status-dot"
                      data-state={
                        flow.hasOpenIncident ? "down" : flow.lastStatus === "passed" ? "ok" : "idle"
                      }
                    />
                    <Link
                      href={`/vibesafe/projects/${projectId}/flows/${flow.id}`}
                      className="vs-flow-name"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      {flow.title}
                    </Link>
                    {flow.status === "pending" && (
                      <span className="vs-badge" data-tone="neutral">확인 대기</span>
                    )}
                    {flow.riskLevel === "blocked" && (
                      <span className="vs-badge" data-tone="warn">실행 안 함</span>
                    )}
                    {mode === "expert" && <span className="vs-hint vs-mono">{flow.key}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}

        {map.unassigned.length > 0 && (
          <div className="vs-surface-sunken" style={{ padding: 12, borderRadius: 8 }}>
            <strong style={{ fontSize: 15 }}>
              {hasRoles ? "누가 하는지 정하지 못한 기능" : "확인 중인 기능"}
            </strong>
            {hasRoles && (
              <p className="vs-hint" style={{ margin: "4px 0 8px" }}>
                어느 역할의 일인지 확실하지 않아 따로 두었습니다. 아는 척하는 것보다 낫습니다.
              </p>
            )}
            <ul className="vs-flow-list" style={{ marginTop: 8 }}>
              {map.unassigned.map((flow) => (
                <li key={flow.key} className="vs-flow-item">
                  <span
                    className="vs-status-dot"
                    data-state={
                      flow.hasOpenIncident ? "down" : flow.lastStatus === "passed" ? "ok" : "idle"
                    }
                  />
                  <Link
                    href={`/vibesafe/projects/${projectId}/flows/${flow.id}`}
                    className="vs-flow-name"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    {flow.title}
                  </Link>
                  {mode === "expert" && <span className="vs-hint vs-mono">{flow.key}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
