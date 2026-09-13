import Link from "next/link";
import { redirect } from "next/navigation";
import { VIBESAFE_BRAND } from "@/vibesafe/lib/brand";
import { getSession } from "@/vibesafe/lib/session";
import { getSetupStatus } from "@/vibesafe/lib/setup-status";

export const dynamic = "force-dynamic";

/**
 * 랜딩.
 *
 * ★ 아직 없는 기능을 있는 것처럼 쓰지 않는다
 *
 * 자동 수정·자동 롤백은 이 제품의 최종 목표지만 지금은 없다. 그걸 현재형으로
 * 적으면 첫 사용자가 기대하고 들어와서 없는 걸 확인하고 나간다 — 초기 제품이
 * 가장 크게 잃는 방식이다. 앞으로 할 것은 "준비 중"으로 분명히 갈라 적는다.
 */
export default async function VibesafeLandingPage() {
  if (await getSession()) redirect("/vibesafe/dashboard");

  // 배포 직후 운영자가 처음 여는 화면이 여기다. 아직 설정이 덜 됐으면
  // 가입 버튼을 누르고 나서 실패하는 대신, 무엇이 남았는지 먼저 알려준다.
  const setup = await getSetupStatus();

  return (
    <>
      {!setup.ready && (
        <div
          style={{
            background: "var(--vs-warn-wash)",
            borderBottom: "1px solid var(--vs-warn-border)",
            padding: "12px 20px",
            textAlign: "center",
            fontSize: 14,
            color: "var(--vs-warn-text)",
          }}
        >
          이 배포는 아직 설정이 끝나지 않았습니다 — {setup.headline}.{" "}
          <Link href="/vibesafe/setup" style={{ color: "var(--vs-warn-text)", fontWeight: 600 }}>
            무엇이 남았는지 보기
          </Link>
        </div>
      )}

      <section className="vs-hero">
        <div className="vs-hero-inner">
          <span className="vs-eyebrow">무료 베타 · 카드 등록 없음</span>
          <h1>{VIBESAFE_BRAND.tagline}</h1>
          <p>{VIBESAFE_BRAND.subline}</p>
          <div className="vs-row" style={{ justifyContent: "center" }}>
            <Link href="/vibesafe/signup" className="vs-btn vs-btn-primary vs-btn-lg">
              {VIBESAFE_BRAND.cta}
            </Link>
            <Link href="#how" className="vs-btn vs-btn-lg">
              어떻게 동작하나요?
            </Link>
          </div>
        </div>
      </section>

      <section className="vs-section vs-section-alt">
        <div className="vs-section-inner">
          <div className="vs-section-head">
            <h2>AI로 만든 앱은 조용히 망가집니다</h2>
            <p>코드는 빌드에 성공하고, 배포도 잘 됐는데, 로그인 버튼만 안 눌립니다.</p>
          </div>
          <div className="vs-grid-3">
            <div className="vs-card">
              <h3 className="vs-section-title">빌드 성공 ≠ 동작</h3>
              <p className="vs-hint" style={{ marginTop: 8 }}>
                타입 검사와 빌드를 통과해도 실제 화면에서 버튼이 안 먹는 일은 흔합니다.
                배포 성공 알림만 보고 있으면 알 수 없습니다.
              </p>
            </div>
            <div className="vs-card">
              <h3 className="vs-section-title">한 줄 수정이 다른 곳을 깨뜨림</h3>
              <p className="vs-hint" style={{ marginTop: 8 }}>
                AI에게 기능 하나를 고쳐달라고 했는데 로그인이 같이 망가지는 경우가 있습니다.
                고친 곳만 확인하면 놓칩니다.
              </p>
            </div>
            <div className="vs-card">
              <h3 className="vs-section-title">보통 고객이 먼저 발견</h3>
              <p className="vs-hint" style={{ marginTop: 8 }}>
                &ldquo;결제가 안 돼요&rdquo;라는 연락으로 알게 되면, 그때는 이미 며칠이
                지났을 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="vs-section">
        <div className="vs-section-inner">
          <div className="vs-section-head">
            <span className="vs-eyebrow">VibeSafe가 다른 점</span>
            <h2>찾기만 하지 않고, 고치기까지 합니다</h2>
            <p>
              장애가 났다고 알림만 주는 도구는 이미 많습니다. VibeSafe는 원인을 찾아 수정안을
              만들고, 적용한 뒤 실제 서비스에서 다시 되는지까지 확인합니다.
            </p>
          </div>
          <div className="vs-grid-2">
            {[
              {
                title: "실제 브라우저로 감지합니다",
                body: "주소가 열리는지만 보지 않습니다. 로그인·결제처럼 손님이 직접 쓰는 흐름을 실제로 누르고 입력해봅니다.",
              },
              {
                title: "커밋 이력으로 원인까지 찾습니다",
                body: "마지막으로 정상이었던 시점 이후 무엇이 바뀌었는지 읽어 범인을 좁힙니다. 이 결과는 요금제와 무관하게 항상 전부 보여드립니다.",
              },
              {
                title: "수정안을 PR로 만들어드립니다",
                body: "고친 코드를 새 브랜치·PR로 올립니다. 기본 브랜치에 직접 push하는 기능은 아예 만들지 않았습니다.",
              },
              {
                title: "적용 후 실제 서비스에서 다시 확인합니다",
                body: "머지했다고 곧바로 “고쳤습니다”라고 말하지 않습니다. 실제 주소에서 다시 되는 걸 확인해야 비로소 알려드립니다.",
              },
            ].map((item) => (
              <div className="vs-card" key={item.title}>
                <h3 className="vs-section-title">{item.title}</h3>
                <p className="vs-hint" style={{ marginTop: 8 }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="vs-section vs-section-alt" id="how">
        <div className="vs-section-inner">
          <div className="vs-section-head">
            <h2>작동 방식</h2>
            <p>연결하고 확인만 누르면 나머지는 알아서 돌아갑니다.</p>
          </div>
          <div className="vs-stack">
            {[
              {
                title: "GitHub 저장소와 서비스 주소를 연결합니다",
                body: "저장소는 읽기 권한만 받습니다. 코드를 고치거나 배포하지 않습니다.",
              },
              {
                title: "AI가 저장소를 읽고 핵심 기능을 찾아냅니다",
                body: "회원가입, 로그인, 검색, 목록 확인처럼 &ldquo;이게 안 되면 곤란한&rdquo; 흐름을 추려냅니다.",
              },
              {
                title: "직접 확인하고 켭니다",
                body: "AI가 찾은 흐름을 그대로 실행하지 않습니다. 확인하고 고치고 켜는 것은 언제나 사람이 합니다.",
              },
              {
                title: "실제 브라우저가 그 흐름을 따라 해봅니다",
                body: "주소가 열리는지만 보는 게 아니라 실제로 누르고 입력하고 화면을 확인합니다.",
              },
              {
                title: "되던 게 안 되면 알려드립니다",
                body: "정상이던 기능이 실패로 바뀐 순간을 잡아 이메일과 앱 알림으로 보냅니다.",
              },
              {
                title: "원하시면 원인까지 찾아드립니다",
                body: "마지막으로 정상이었던 시점 이후 어떤 커밋이 들어왔는지 읽어 범인을 좁혀줍니다. <strong>권한을 켜야만</strong> 동작합니다.",
              },
              {
                title: "고친 코드를 PR로 올려드립니다",
                body: "권한을 켜면 수정안을 새 브랜치에 올리고 Pull Request를 엽니다. <strong>머지는 직접 하십니다</strong> — VibeSafe는 기본 브랜치에 직접 커밋하지 않습니다.",
              },
            ].map((step, index) => (
              <div className="vs-card vs-row" key={step.title} style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
                <span className="vs-step-num">{index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p className="vs-hint" style={{ marginTop: 4 }} dangerouslySetInnerHTML={{ __html: step.body }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="vs-section">
        <div className="vs-section-inner">
          <div className="vs-section-head">
            <h2>이런 화면을 보게 됩니다</h2>
            <p>기술적인 내용은 접혀 있습니다. 필요할 때만 펼치면 됩니다.</p>
          </div>
          <div className="vs-preview">
            <div className="vs-preview-chrome">
              <span className="vs-preview-dot" />
              <span className="vs-preview-dot" />
              <span className="vs-preview-dot" />
            </div>
            <div style={{ padding: 20 }}>
              <div className="vs-status-hero" data-state="ok" style={{ marginBottom: 16 }}>
                <div className="vs-status-line">
                  <span className="vs-status-dot" data-state="ok" />
                  <span className="vs-status-title">정상</span>
                </div>
                <p className="vs-status-note">마지막 확인: 2분 전 · 다음 확인: 6시간 후</p>
              </div>
              <div className="vs-card vs-card-flush">
                <ul className="vs-flow-list">
                  {[
                    ["회원가입", "정상"],
                    ["로그인", "정상"],
                    ["검색", "정상"],
                    ["예약 목록 확인", "정상"],
                  ].map(([name, state]) => (
                    <li className="vs-flow-item" key={name}>
                      <span className="vs-status-dot" data-state="ok" />
                      <span className="vs-flow-name">{name}</span>
                      <span className="vs-spacer" />
                      <span className="vs-badge" data-tone="ok">{state}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="vs-section vs-section-alt">
        <div className="vs-section-inner">
          <div className="vs-section-head">
            <h2>README에 상태 배지를 답니다</h2>
            <p>지금 정상인지 고객이 직접 확인할 수 있는 공개 페이지가 자동으로 생깁니다.</p>
          </div>
          <div className="vs-grid-2">
            <div className="vs-card">
              <h3 className="vs-section-title">신뢰를 말이 아니라 보여줍니다</h3>
              <p className="vs-hint" style={{ marginTop: 8 }}>
                &ldquo;저희 서비스 안전합니다&rdquo;라고 적는 대신, 핵심 기능이 지금 실제로 되는지
                보여주는 배지 하나로 증명합니다. 무사고로 지난 일수도 함께 표시됩니다.
              </p>
            </div>
            <div className="vs-card">
              <h3 className="vs-section-title">README 한 줄이면 끝</h3>
              <p className="vs-hint" style={{ marginTop: 8 }}>
                마크다운 한 줄을 붙이면 GitHub 저장소든 랜딩페이지든 바로 노출됩니다. 공개 상태
                페이지 주소도 함께 드립니다.
              </p>
              <pre className="vs-code" style={{ marginTop: 10, fontSize: 12.5 }}>
                {"[![VibeSafe](https://vibesafe.app/vibesafe/badge/내-서비스.svg)](https://vibesafe.app/vibesafe/status/내-서비스)"}
              </pre>
            </div>
          </div>
        </div>
      </section>

      <section className="vs-section">
        <div className="vs-section-inner">
          <div className="vs-grid-2">
            <div className="vs-card">
              <h3 className="vs-section-title">지금 지원하는 것</h3>
              <ul className="vs-hint" style={{ marginTop: 10, paddingLeft: 18 }}>
                <li>Next.js (App Router / Pages Router)</li>
                <li>Vercel에 배포된 서비스</li>
                <li>Supabase를 쓰는 앱</li>
                <li>GitHub 저장소 (공개·비공개 모두)</li>
              </ul>
              <p className="vs-hint" style={{ marginTop: 12 }}>
                다른 스택도 주소만 열려 있으면 브라우저 검사는 동작하지만, 저장소 분석
                품질은 위 조합에서 가장 좋습니다.
              </p>
            </div>
            <div className="vs-card">
              <h3 className="vs-section-title">
                준비 중<span className="vs-soon">Coming soon</span>
              </h3>
              <ul className="vs-hint" style={{ marginTop: 10, paddingLeft: 18 }}>
                <li>Render·Railway·Firebase 배포 연동</li>
                <li>Slack·카카오톡 알림</li>
                <li>여러 명이 함께 쓰는 팀 계정</li>
              </ul>
              <p className="vs-hint" style={{ marginTop: 12 }}>
                아직 제공하지 않는 기능입니다. 되돌리기는 지금 Vercel만 지원합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="vs-section vs-section-alt">
        <div className="vs-section-inner">
          <div className="vs-section-head">
            <h2>권한과 안전</h2>
            <p>남의 운영 서비스를 다루는 도구이므로, 할 수 없는 일을 분명히 정해뒀습니다.</p>
          </div>
          <div className="vs-grid-2">
            <div className="vs-card">
              <h3 className="vs-section-title">저장소 권한</h3>
              <p className="vs-hint" style={{ marginTop: 8 }}>
                GitHub App으로 연결하면 <strong>읽기 권한(contents·metadata)만</strong> 요청하고,
                어떤 저장소를 허용할지 직접 고릅니다. VibeSafe는 커밋·푸시·배포를 할 수 없습니다.
              </p>
            </div>
            <div className="vs-card">
              <h3 className="vs-section-title">위험한 행동은 실행하지 않습니다</h3>
              <p className="vs-hint" style={{ marginTop: 8 }}>
                결제, 문자·이메일 발송, 주문·예약 확정, 삭제는 AI가 필요하다고 판단해도
                실행하지 않습니다. 결제 화면은 <strong>버튼이 보이는 것까지만</strong> 확인합니다.
              </p>
            </div>
            <div className="vs-card">
              <h3 className="vs-section-title">비밀 값은 암호화해 보관합니다</h3>
              <p className="vs-hint" style={{ marginTop: 8 }}>
                테스트 계정과 연결 토큰은 암호화해서 저장하고, 화면·로그 어디에도
                평문으로 남기지 않습니다. 오류 메시지에서도 지웁니다.
              </p>
            </div>
            <div className="vs-card">
              <h3 className="vs-section-title">할 수 있는 일은 직접 정하십니다</h3>
              <p className="vs-hint" style={{ marginTop: 8 }}>
                원인 분석·PR 제안·배포 되돌리기는 <strong>각각 따로 켜는 권한</strong>입니다.
                기본값은 전부 꺼짐이고, 켠 권한으로 한 모든 행동이 기록으로 남습니다.
                <strong> 코드를 기본 브랜치에 직접 push하는 기능은 아예 없습니다.</strong>
              </p>
            </div>

            <div className="vs-card">
              <h3 className="vs-section-title">머지 전에 잡아드립니다</h3>
              <p className="vs-hint" style={{ marginTop: 8 }}>
                Pull Request의 미리보기 배포에서 핵심 흐름을 먼저 돌려봅니다.
                깨지는 변경이면 머지하기 전에 PR에 댓글로 알려드립니다 —
                고객이 깨진 화면을 볼 일 자체가 없어집니다.
              </p>
            </div>

            <div className="vs-card">
              <h3 className="vs-section-title">테스트 계정을 권합니다</h3>
              <p className="vs-hint" style={{ marginTop: 8 }}>
                로그인 흐름을 확인하려면 계정이 필요합니다. 실제로 쓰는 계정 대신
                검사 전용 계정을 만들어 등록해주세요.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="vs-section">
        <div className="vs-section-inner" style={{ maxWidth: 720 }}>
          <div className="vs-section-head">
            <h2>자주 묻는 질문</h2>
          </div>
          <div className="vs-card">
            {[
              {
                q: "가격이 얼마인가요?",
                a: "무료 베타는 카드 등록 없이 프로젝트 1개·월 검사 100회까지 계속 무료입니다. 감시·원인 진단은 무료 베타에서도 무제한이고, 자동 수정(PR 생성)만 평생 1회 체험할 수 있습니다. 프로 플랜은 월 29,900원이며 7일 무료체험(결제 하루 전 미리 알려드립니다) 뒤 시작됩니다.",
              },
              {
                q: "제 코드를 고치나요?",
                a: "기본값은 읽기만 합니다. '수정안 PR' 권한을 직접 켜시면 고친 코드를 새 브랜치에 올리고 Pull Request를 엽니다 — 머지는 직접 하십니다. 기본 브랜치에 직접 커밋하는 기능은 만들지 않았습니다. 권한은 언제든 끌 수 있고, 켠 권한으로 한 모든 일이 기록에 남습니다.",
              },
              {
                q: "해킹을 막아주나요?",
                a: "방화벽처럼 실시간으로 공격을 막지는 못합니다(저희가 여러분 서비스의 요청 경로에 있지 않습니다). 대신 공격자가 제일 먼저 확인하는 것들을 먼저 확인합니다 — 인터넷에 열린 .env 파일, 브라우저 코드에 박힌 관리자 키, 로그인 없이 열리는 관리자 페이지 같은 것들입니다. 실제로 앱이 털리는 경로는 대부분 여기 있습니다.",
              },
              {
                q: "실제 결제가 일어나지는 않나요?",
                a: "결제·발송·주문 확정·삭제에 해당하는 단계는 자동으로 제외되어 실행되지 않습니다. 흐름 목록에서 '실행 제외'로 표시되며, 화면에서도 켤 수 없습니다.",
              },
              {
                q: "비공개 저장소도 되나요?",
                a: "됩니다. GitHub App 설치 또는 읽기 전용 토큰으로 연결할 수 있습니다.",
              },
              {
                q: "Next.js가 아니어도 되나요?",
                a: "저장소 분석은 Next.js에 맞춰져 있습니다. 다른 프레임워크라도 흐름을 직접 입력하면 브라우저 검사는 동작합니다.",
              },
              {
                q: "검사는 얼마나 자주 하나요?",
                a: "코드를 푸시했을 때, 정기 확인 주기가 됐을 때, 그리고 직접 실행할 때입니다. 기본 정기 주기는 6시간입니다.",
              },
            ].map((item) => (
              <details className="vs-faq" key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="vs-section vs-section-alt">
        <div className="vs-section-inner" style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(21px, 3.4vw, 28px)", letterSpacing: "-0.03em", margin: "0 0 10px" }}>
            내 앱이 지금 정상인지, 5초 만에 확인하세요
          </h2>
          <p className="vs-hint" style={{ marginBottom: 22 }}>
            가입에 카드가 필요 없습니다. 연결부터 첫 확인까지 보통 5분이면 끝납니다.
          </p>
          <Link href="/vibesafe/signup" className="vs-btn vs-btn-primary vs-btn-lg">
            {VIBESAFE_BRAND.cta}
          </Link>
        </div>
      </section>
    </>
  );
}
