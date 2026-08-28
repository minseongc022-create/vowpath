"use client";

/**
 * 등록 전 최종 검수 화면
 *
 * ★ 왜 등록함(JarvisListingPanel)과 따로 만드는가
 *
 * 등록함은 **관리 화면**이다 — 모든 상태의 초안을 나열하고, 마진·신뢰도·
 * 체크리스트 같은 셀러용 지표를 보여준다. 정보가 많아야 하는 화면이다.
 *
 * 이 화면은 목적이 하나다: **"고객 눈에 이렇게 보인다. 올려도 되겠는가."**
 * 그래서 셀러용 숫자를 앞세우지 않고, 토스 상품 페이지에 올라갔을 때의
 * 모습을 그대로 재현해서 보여준다. 검수는 숫자를 보는 일이 아니라
 * 결과물을 보는 일이기 때문이다.
 *
 * ⚠️ 이 미리보기는 **재현**이지 토스가 렌더링한 실제 화면이 아니다.
 * 토스는 등록된 HTML을 자체 sanitize·스타일링하므로 세부 여백·폰트는
 * 다를 수 있다. 그래서 화면에 그 사실을 명시한다 — "실제와 100% 같다"고
 * 믿게 만들면, 다르게 나왔을 때 신뢰가 통째로 깨진다.
 */

import { useCallback, useState } from "react";
import Link from "next/link";
import { formatKrw } from "@/toss-shop/lib/format";
import { useSilentFetch } from "@/toss-shop/lib/hooks/use-silent-fetch";
import type { JarvisListingDraft } from "@/toss-shop/lib/types";
import { SP_ROUTES } from "@/toss-shop/lib/routes";

/**
 * 상품 페이지 미리보기 — 고객 휴대폰에서 보이는 모습 그대로.
 *
 * 대표 이미지 → 상품명 → 가격 → 배송 → 상세 → 하단 구매바 순서는 국내
 * 모바일 커머스 상품 페이지의 공통 구조다. 데스크톱 카드로 보여주면
 * "실제로 어떻게 보일지"가 안 잡히므로 휴대폰 폭(390px)으로 가둔다.
 */
function StorefrontPreview({ draft }: { draft: JarvisListingDraft }) {
  const p = draft.listingPayload;
  const thumb = draft.detailPage.thumbnailUrl ?? draft.detailPage.imageUrls?.[0];
  const discountPct =
    p.originPrice > p.salePrice
      ? Math.round(((p.originPrice - p.salePrice) / p.originPrice) * 100)
      : 0;

  const deliveryLabel =
    p.deliveryFeeType === "FREE"
      ? "무료배송"
      : p.deliveryFeeType === "CONDITIONALLY_FREE"
        ? "조건부 무료배송"
        : "배송비 별도";

  return (
    <div className="mx-auto w-full max-w-[390px] overflow-hidden rounded-[28px] border-[6px] border-slate-900 bg-white shadow-xl">
      {/* 상단 바 — 실제 앱처럼 보이게 하는 최소한의 장치 */}
      <div className="flex items-center justify-between bg-white px-4 py-2.5 text-slate-900">
        <span aria-hidden className="text-lg leading-none">‹</span>
        <span className="text-[13px] font-semibold">상품</span>
        <span aria-hidden className="text-sm leading-none">⋯</span>
      </div>

      {/* 스크롤 영역 — 대표 이미지부터 상세까지 한 흐름으로 */}
      <div className="max-h-[620px] overflow-y-auto">
        <div className="aspect-square w-full bg-slate-50">
          {thumb ? (
            // 외부 도매 이미지라 next/image 최적화 대상이 아니다 — 원본 그대로 띄운다
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt={p.name} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-ts-muted">
              대표 이미지 없음
            </div>
          )}
        </div>

        <div className="px-4 pb-4 pt-4">
          <p className="text-[16px] font-semibold leading-snug text-slate-900">{p.name}</p>
          <div className="mt-2.5 flex flex-wrap items-baseline gap-2">
            {discountPct > 0 && (
              <span className="text-[22px] font-extrabold text-rose-600">{discountPct}%</span>
            )}
            <span className="text-[22px] font-extrabold text-slate-900">
              {formatKrw(p.salePrice)}
            </span>
            {discountPct > 0 && (
              <span className="text-sm text-ts-muted line-through">{formatKrw(p.originPrice)}</span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              {deliveryLabel}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              {p.brandName}
            </span>
          </div>
        </div>

        {/* 상세페이지 — 상품 페이지 안에서 이어지는 위치에 그대로 둔다.
            따로 떼어 보여주면 "고객이 보는 흐름"이 안 잡힌다. */}
        <div className="border-t border-slate-100">
          {draft.detailPage.html ? (
            <iframe
              title={`상세 ${draft.id}`}
              className="h-[900px] w-full bg-white"
              srcDoc={draft.detailPage.html}
              // 공급처 외부 콘텐츠다 — 스크립트를 못 돌게 막아 대시보드에
              // 영향을 못 주게 한다.
              sandbox=""
            />
          ) : (
            <p className="p-4 text-xs text-ts-muted">상세페이지가 아직 없습니다.</p>
          )}
        </div>
      </div>

      {/* 하단 구매바 — 모바일 커머스 상품 페이지의 고정 요소 */}
      <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-4 py-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400">
          ♡
        </div>
        <div className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[#3182f6] text-[15px] font-bold text-white">
          구매하기
        </div>
      </div>
    </div>
  );
}

/** 검수에 필요한 최소한의 숫자만 — 판단에 쓰이는 것만 남긴다 */
function ReviewFacts({ draft }: { draft: JarvisListingDraft }) {
  const brief = draft.pickBrief;
  const items: Array<{ label: string; value: string; tone?: "good" | "warn" }> = [
    { label: "판매가", value: formatKrw(draft.listingPayload.salePrice) },
    {
      label: "원가",
      value: draft.landedCostKrw ? formatKrw(draft.landedCostKrw) : "—",
    },
    {
      label: "마진",
      value: brief ? `${brief.marginPct}%` : "—",
      tone: brief && brief.marginPct >= 15 ? "good" : "warn",
    },
    {
      label: "자비스 신뢰도",
      value: draft.jarvisConfidence != null ? `${draft.jarvisConfidence}%` : "—",
      tone: draft.jarvisCertified ? "good" : "warn",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] text-ts-muted">{it.label}</p>
          <p
            className={
              "text-sm font-bold " +
              (it.tone === "good"
                ? "text-emerald-700"
                : it.tone === "warn"
                  ? "text-amber-700"
                  : "text-slate-900")
            }
          >
            {it.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function ReviewCard({
  draft,
  onUpdate,
}: {
  draft: JarvisListingDraft;
  onUpdate: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  async function act(path: string, body?: object) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = (await res.json()) as { error?: string; message?: string };
      setMessage(!res.ok ? (json.error ?? "요청 실패") : (json.message ?? "완료"));
      if (res.ok) onUpdate();
    } finally {
      setBusy(false);
    }
  }

  // 반품지 자동 매칭이 안 된 건은 등록이 막힌다 — 승인 버튼을 눌러도 실패하므로
  // 미리 알려서 헛클릭을 막는다.
  const blocked = draft.sellerChecklist.filter((s) => s.includes("반품지 미등록"));

  return (
    <article className="ts-card">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* 왼쪽 — 고객 휴대폰에 보이는 그대로 */}
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-ts-muted">
            고객 화면 미리보기
          </p>
          <StorefrontPreview draft={draft} />
        </div>

        {/* 오른쪽 — 판단 근거와 결정 */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900">
              검수 대기
            </span>
            <span className="text-xs text-ts-muted">「{draft.keyword}」</span>
          </div>

          <div className="mt-3">
            <ReviewFacts draft={draft} />
          </div>

          {blocked.length > 0 && (
            <div className="mt-3 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
              <p className="text-xs font-bold text-amber-900">등록이 막혀 있습니다</p>
              {blocked.map((b) => (
                <p key={b} className="mt-1 text-xs text-amber-800">
                  {b}
                </p>
              ))}
              <Link href={SP_ROUTES.listings} className="mt-2 inline-block text-xs font-semibold text-amber-900 underline">
                등록함에서 반품지 지정하기 →
              </Link>
            </div>
          )}

          {/* 자비스가 왜 이 상품을 골랐는지 — 승인 판단의 근거 */}
          {draft.pickBrief?.headline && (
            <div className="mt-4 rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ts-muted">
                자비스 판단
              </p>
              <p className="mt-1 text-sm text-slate-800">{draft.pickBrief.headline}</p>
            </div>
          )}

          {/* 승인 / 반려 */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || blocked.length > 0}
              onClick={() => void act(`/api/toss-shop/listings/${draft.id}/execute`, {})}
              className="ts-btn-primary text-sm"
            >
              승인하고 등록
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setShowReject((v) => !v)}
              className="ts-btn-secondary text-sm"
            >
              반려
            </button>
          </div>

          {showReject && (
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="반려 사유 (예: 사진이 부족함)"
                className="ts-input min-w-[220px] flex-1 text-sm"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void act(`/api/toss-shop/listings/${draft.id}/reject`, {
                    reason: rejectReason.trim() || "검수 반려",
                  })
                }
                className="ts-btn-secondary text-sm"
              >
                반려 확정
              </button>
            </div>
          )}

          {message && <p className="mt-2 text-xs text-ts-muted">{message}</p>}
        </div>
      </div>
    </article>
  );
}

export function JarvisReviewPanel() {
  const [drafts, setDrafts] = useState<JarvisListingDraft[]>([]);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/toss-shop/listings");
    if (!res.ok) return;
    const json = (await res.json()) as { drafts?: JarvisListingDraft[] };
    setDrafts(json.drafts ?? []);
  }, []);

  const { initialLoading } = useSilentFetch(fetchData);

  // 검수 대상은 **아직 승인 전인 것**만이다. 이미 올라간 것까지 보여주면
  // 이 화면의 목적("지금 결정해야 할 것")이 흐려진다.
  const pending = drafts.filter(
    (d) => d.status === "pending_review" || d.status === "draft",
  );

  if (initialLoading) {
    return <p className="text-sm text-ts-muted">불러오는 중…</p>;
  }

  if (pending.length === 0) {
    return (
      <div className="ts-card text-center">
        <p className="text-sm font-semibold text-slate-900">검수할 상품이 없습니다</p>
        <p className="mt-1 text-xs text-ts-muted">
          자비스가 새 상품을 찾으면 여기에 올라오고, 등록 전에 문자로 알려드립니다.
        </p>
        <Link href={SP_ROUTES.listings} className="mt-3 inline-block text-xs font-semibold text-ts-accent underline">
          등록함 전체 보기 →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-slate-50 p-3 text-xs text-ts-muted">
        아래는 토스에 올라갔을 때의 모습을 재현한 것입니다. 토스가 상세 HTML을 자체
        정리·스타일링하므로 여백·글꼴이 조금 다를 수 있습니다.
      </div>
      {pending.map((d) => (
        <ReviewCard key={d.id} draft={d} onUpdate={() => void fetchData()} />
      ))}
    </div>
  );
}
