"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconCompetitors,
  IconConsignment,
  IconDiscovery,
  IconHome,
  IconKeywords,
  IconMore,
  IconRankings,
  IconSettlements,
  IconSettings,
} from "@/toss-shop/components/icons/NavIcons";
import { SP_ROUTES } from "@/toss-shop/lib/routes";

/**
 * 위탁 전용 네비게이션.
 *
 * 수입판매는 비활성(channel-mode.ts)이라 탭에서 뺐다 — 눌러도 빈 화면만
 * 나오는 메뉴는 화면만 복잡하게 만든다. 되살리려면 여기에 다시 넣으면 된다.
 *
 * 하단 탭은 **매일 쓰는 4개**만 남긴다: 홈(현황) · 위탁(소싱) · 등록함(승인) · 키워드(분석).
 * 등록함을 더보기에서 탭으로 올린 이유는, 무인 자동화에서 사장님이 실제로
 * 손대는 유일한 지점이 "승인"이기 때문이다.
 */
const PRIMARY_NAV = [
  { href: SP_ROUTES.dashboard, label: "홈", Icon: IconHome, match: (p: string) => p === SP_ROUTES.dashboard },
  { href: SP_ROUTES.consignment, label: "소싱", Icon: IconConsignment, match: (p: string) => p.includes("/consignment") },
  { href: SP_ROUTES.listings, label: "등록함", Icon: IconConsignment, match: (p: string) => p.includes("/listings") },
  { href: SP_ROUTES.keywords, label: "키워드", Icon: IconKeywords, match: (p: string) => p.includes("/keywords") },
] as const;

const MORE_LINKS = [
  { href: SP_ROUTES.settlements, label: "정산 · 효자상품", desc: "실제 입금 기준 SKU 등급", Icon: IconSettlements },
  { href: SP_ROUTES.discovery, label: "아이템 발굴", desc: "수요·공급 키워드", Icon: IconDiscovery },
  { href: SP_ROUTES.rankings, label: "랭킹 추적", desc: "노출 순위", Icon: IconRankings },
  { href: SP_ROUTES.competitors, label: "경쟁사", desc: "가격·랭킹 알림", Icon: IconCompetitors },
  { href: SP_ROUTES.settings, label: "설정", desc: "API 연동·카테고리·반품지", Icon: IconSettings },
] as const;

function isMoreActive(pathname: string): boolean {
  return MORE_LINKS.some((l) => pathname.includes(l.href.split("/dashboard")[1] ?? l.href));
}

export function DashboardMobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = isMoreActive(pathname);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  return (
    <>
      {moreOpen && (
        <button
          type="button"
          className="ts-mobile-more-backdrop"
          aria-label="메뉴 닫기"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {moreOpen && (
        <div className="ts-mobile-more-sheet" role="dialog" aria-label="추가 메뉴">
          <p className="px-4 pb-2 text-xs font-semibold text-ts-muted">추가 기능</p>
          {MORE_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="ts-mobile-more-item"
              onClick={() => setMoreOpen(false)}
            >
              <span className="ts-mobile-nav-icon">
                <item.Icon active={pathname.includes(item.href)} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ts-ink">{item.label}</span>
                <span className="block text-xs text-ts-muted">{item.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      )}

      <nav className="ts-mobile-nav" aria-label="대시보드 메뉴">
        <div className="ts-mobile-nav-inner">
          {PRIMARY_NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "ts-mobile-nav-item ts-mobile-nav-item-active" : "ts-mobile-nav-item"}
              >
                <span className="ts-mobile-nav-icon">
                  <item.Icon active={active} />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={moreActive || moreOpen ? "ts-mobile-nav-item ts-mobile-nav-item-active" : "ts-mobile-nav-item"}
            aria-expanded={moreOpen}
          >
            <span className="ts-mobile-nav-icon">
              <IconMore active={moreActive || moreOpen} />
            </span>
            <span className="truncate">더보기</span>
          </button>
        </div>
      </nav>
    </>
  );
}

export function DashboardPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sp-dashboard mx-auto max-w-6xl px-4 py-5 sm:py-8">
      <header className="ts-page-header mb-4">
        <h1 className="ts-page-title">{title}</h1>
        {description && <p className="ts-page-desc">{description}</p>}
      </header>
      {children}
    </div>
  );
}
