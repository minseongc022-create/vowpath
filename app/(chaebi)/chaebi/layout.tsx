/**
 * 채비 셸 — 모든 화면을 한 손 폭의 프레임 안에 넣는다.
 *
 * 데스크톱에서도 앱처럼 보여야 하는 제품이라(설치형 PWA가 1차 배포 형태다)
 * 폭을 넓히지 않고 가운데 프레임을 유지한다. 화면 전환이 프레임 안에서만
 * 일어나야 "앱을 쓰는 중"이라는 감각이 끊기지 않는다.
 */
export default function ChaebiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="cb-app">
      <div className="cb-frame flex flex-col">{children}</div>
    </div>
  );
}
