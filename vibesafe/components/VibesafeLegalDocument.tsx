import Link from "next/link";

type Section = { heading: string; body: string };

/**
 * 법적 문서 공용 레이아웃.
 *
 * ★ 기존 `components/legal/LegalDocument.tsx`를 재사용하지 않은 이유
 *
 * 그건 Effiroad(미국 HVAC 전화 인테이크 제품)의 실제 계약 조항이 박힌
 * 컴포넌트다 — 레이아웃만 빌려써도 "이 페이지가 그 제품의 확장"이라는
 * 착각을 부를 여지가 있고, VibeSafe는 디자인 토큰(`vs-*`)이 별도라 그대로
 * 가져오면 스타일도 깨진다. 내용 없는 레이아웃만 새로 만들었다.
 */
export function VibesafeLegalDocument({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro?: string;
  sections: Section[];
}) {
  return (
    <div className="vs-container-narrow">
      <div className="vs-card vs-stack" style={{ marginTop: 32, marginBottom: 48 }}>
        <h1 className="vs-page-title">{title}</h1>
        <p className="vs-hint">최종 수정: {updated}</p>
        {intro && <p style={{ fontSize: 14.5 }}>{intro}</p>}
        <div className="vs-stack">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="vs-section-title">{s.heading}</h2>
              <p style={{ fontSize: 14.5, marginTop: 6, lineHeight: 1.6, whiteSpace: "pre-line" }}>
                {s.body}
              </p>
            </section>
          ))}
        </div>
        <p>
          <Link href="/vibesafe" className="vs-nav-link">
            ← VibeSafe 홈으로
          </Link>
        </p>
      </div>
    </div>
  );
}
