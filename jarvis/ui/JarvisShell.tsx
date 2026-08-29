"use client";

/**
 * 자비스 껍데기 — 화면 셋을 감싸는 틀
 *
 * 메뉴는 셋뿐이다. 옛 대시보드는 11개였는데 실제로 쓰는 건 셋이었고,
 * 나머지는 화면을 채울 뿐 결정을 돕지 않았다.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { JV_ROUTES } from "../routes";

const TABS = [
  { href: JV_ROUTES.chat, label: "대화", key: "chat" },
  { href: JV_ROUTES.review, label: "검수", key: "review" },
  { href: JV_ROUTES.settings, label: "설정", key: "settings" },
] as const;

export function JarvisShell({
  children,
  pendingCount = 0,
}: {
  children: React.ReactNode;
  pendingCount?: number;
}) {
  const pathname = usePathname() ?? "";

  function isActive(href: string): boolean {
    // 홈(대화)은 정확히 일치할 때만 — 아니면 모든 경로에서 활성으로 보인다
    if (href === JV_ROUTES.chat) return pathname === href || pathname === `${href}/`;
    return pathname.startsWith(href);
  }

  return (
    <div className="jv-shell">
      <header className="jv-top">
        <div className="jv-brand">
          <span className="jv-dot" aria-hidden />
          <span>자비스</span>
        </div>
        <nav className="jv-tabs">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              className={isActive(t.href) ? "jv-tab jv-tab-on" : "jv-tab"}
            >
              {t.label}
              {t.key === "review" && pendingCount > 0 && (
                <span className="jv-badge">{pendingCount > 99 ? "99+" : pendingCount}</span>
              )}
            </Link>
          ))}
        </nav>
      </header>
      <main className="jv-main">{children}</main>
      <style jsx global>{`
        :root {
          --jv-bg: #ffffff;
          --jv-surface: #f7f8fa;
          --jv-line: #e8eaed;
          --jv-text: #17171c;
          --jv-muted: #6b7280;
          --jv-blue: #3182f6;
          --jv-green: #12b886;
          --jv-red: #e03131;
        }
        * { box-sizing: border-box; }
        html, body {
          margin: 0;
          padding: 0;
          background: var(--jv-bg);
          color: var(--jv-text);
          font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo",
            "Pretendard", "Malgun Gothic", sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .jv-shell {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          max-width: 720px;
          margin: 0 auto;
        }
        .jv-top {
          position: sticky;
          top: 0;
          z-index: 20;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: saturate(180%) blur(12px);
          border-bottom: 1px solid var(--jv-line);
          padding: 14px 18px 0;
        }
        .jv-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 800;
          font-size: 17px;
          letter-spacing: -0.3px;
          margin-bottom: 12px;
        }
        .jv-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--jv-green);
          box-shadow: 0 0 0 3px rgba(18, 184, 134, 0.15);
        }
        .jv-tabs { display: flex; gap: 4px; }
        .jv-tab {
          position: relative;
          padding: 10px 14px 12px;
          font-size: 15px;
          font-weight: 600;
          color: var(--jv-muted);
          text-decoration: none;
          border-bottom: 2px solid transparent;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .jv-tab-on { color: var(--jv-text); border-bottom-color: var(--jv-text); }
        .jv-badge {
          background: var(--jv-red);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 5px;
        }
        .jv-main { flex: 1; display: flex; flex-direction: column; min-height: 0; }
        .jv-empty {
          text-align: center;
          color: var(--jv-muted);
          padding: 56px 24px;
          font-size: 15px;
          line-height: 1.7;
        }
        .jv-btn {
          appearance: none;
          border: 0;
          border-radius: 12px;
          padding: 13px 18px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
        }
        .jv-btn-primary { background: var(--jv-blue); color: #fff; }
        .jv-btn-ghost { background: var(--jv-surface); color: var(--jv-text); }
        .jv-btn-danger { background: #fff0f0; color: var(--jv-red); }
        .jv-btn:disabled { opacity: 0.45; cursor: default; }
      `}</style>
    </div>
  );
}
