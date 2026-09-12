import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicStatus } from "@/vibesafe/lib/public-status";
import { relativeTime } from "@/vibesafe/lib/format";
import { VIBESAFE_BRAND } from "@/vibesafe/lib/brand";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const status = await getPublicStatus((await params).slug);
  if (!status) return { title: "상태", robots: { index: false } };
  return {
    title: `${status.projectName} 상태`,
    description: `${status.projectName} — ${status.headline}`,
    robots: { index: false, follow: false },
  };
}

/**
 * 공개 상태 페이지.
 *
 * 나가는 것: 흐름 이름, 정상/문제, 마지막 확인 시각, 무사고 일수.
 * 절대 안 나가는 것: 실제 주소, 저장소, 오류 메시지, 스크린샷, 소유자.
 *
 * 상태 페이지가 공격자에게 "이 앱의 로그인이 지금 깨져 있다"를 친절히
 * 알려주는 꼴이 되면 안 되므로, 어느 흐름이 왜 실패했는지는 내보내지 않는다.
 */
export default async function PublicStatusPage({ params }: { params: Promise<{ slug: string }> }) {
  const status = await getPublicStatus((await params).slug);
  if (!status) notFound();

  const state = status.state;

  return (
    <div className="vs-container-narrow">
      <div className="vs-stack">
        <div className="vs-status-hero" data-state={state === "down" ? "down" : state === "ok" ? "ok" : "unknown"}>
          <div className="vs-status-line">
            <span className="vs-status-dot" data-state={state === "down" ? "down" : state === "ok" ? "ok" : "unknown"} />
            <div>
              <div className="vs-status-title">{status.projectName}</div>
              <p className="vs-status-note" style={{ margin: "4px 0 0" }}>{status.headline}</p>
            </div>
          </div>
          <p className="vs-status-note">
            마지막 확인: {relativeTime(status.lastCheckedAt)}
            {status.cleanDays > 0 && ` · ${status.cleanDays}일째 무사고`}
            {status.watchingDays > 0 && ` · ${status.watchingDays}일째 확인 중`}
          </p>
        </div>

        {status.flows.length > 0 && (
          <div className="vs-card vs-card-flush">
            <div className="vs-card-head">
              <h2 className="vs-section-title">확인 중인 기능</h2>
            </div>
            <ul className="vs-flow-list">
              {status.flows.map((flow) => (
                <li className="vs-flow-item" key={flow.title}>
                  <span className="vs-status-dot" data-state={flow.ok ? "ok" : "down"} />
                  <span className="vs-flow-name">{flow.title}</span>
                  <span className="vs-spacer" />
                  <span className="vs-badge" data-tone={flow.ok ? "ok" : "down"}>
                    {flow.ok ? "정상" : "확인 필요"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="vs-hint" style={{ textAlign: "center" }}>
          이 페이지는 <Link href="/vibesafe">{VIBESAFE_BRAND.name}</Link>가 실제 브라우저로 확인한
          결과입니다.
        </p>
      </div>
    </div>
  );
}
