"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { formatKrw } from "@/toss-shop/lib/format";
import { useSilentFetch } from "@/toss-shop/lib/hooks/use-silent-fetch";
import type { JarvisListingDraft, JarvisPickBrief } from "@/toss-shop/lib/types";
import { JARVIS_NAME } from "@/toss-shop/lib/seller-engine/jarvis-engine";
import { SP_ROUTES } from "@/toss-shop/lib/routes";

const STATUS_LABEL: Record<JarvisListingDraft["status"], string> = {
  draft: "초안",
  pending_review: "OK 대기",
  approved: "OK 완료",
  publishing: "등록 중",
  published: "등록됨",
  rejected: "거절",
  failed: "실패",
};

function statusClass(status: JarvisListingDraft["status"]): string {
  if (status === "published") return "bg-emerald-100 text-emerald-800";
  if (status === "approved") return "bg-violet-100 text-violet-800";
  if (status === "pending_review") return "bg-amber-100 text-amber-900";
  if (status === "failed" || status === "rejected") return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-700";
}

function detailSourceLabel(source: JarvisListingDraft["detailPage"]["source"], provider?: string): string {
  if (source === "matchcut") return "Matchcut AI";
  if (source === "openai_premium") return "OpenAI Premium (~150원)";
  if (source === "manual_import") return "외부 툴 반입 (검수 완료)";
  if (source === "jarvis_ai") return provider === "hookable_local" ? "로컬 템플릿" : "자비스 생성";
  return "생성 중";
}

function PickBriefPanel({ brief }: { brief: JarvisPickBrief }) {
  return (
    <div className="mt-3 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 p-4 ring-1 ring-violet-100">
      <p className="text-sm font-bold text-violet-950">{brief.headline}</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <div className="ts-mini-stat">
          <p className="text-ts-muted">일 예상 수익</p>
          <p className="font-bold text-emerald-700">{formatKrw(brief.profitDailyKrw)}</p>
        </div>
        <div className="ts-mini-stat">
          <p className="text-ts-muted">월 예상 수익</p>
          <p className="font-bold">{formatKrw(brief.profitMonthlyKrw)}</p>
        </div>
        <div className="ts-mini-stat">
          <p className="text-ts-muted">마진</p>
          <p className="font-bold">{brief.marginPct}%</p>
        </div>
        <div className="ts-mini-stat">
          <p className="text-ts-muted">1천만 목표 기여</p>
          <p className="font-bold">{brief.goalSharePct}%</p>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-violet-800/70">
        보수 {formatKrw(brief.profitConservativeKrw)} ~ 낙관 {formatKrw(brief.profitOptimisticKrw)} /월
      </p>

      <div className="mt-3">
        <p className="text-xs font-bold text-violet-900">왜 이 상품인가요?</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-violet-950/90">
          {brief.whyReasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>

      {brief.appliedTactics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {brief.appliedTactics.map((t) => (
            <span
              key={t}
              className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-violet-800 ring-1 ring-violet-200"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {brief.gateHighlights.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {brief.gateHighlights.map((g) => (
            <span
              key={g.label}
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                g.passed ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
              }`}
              title={g.detail}
            >
              {g.passed ? "✓" : "✗"} {g.label}
            </span>
          ))}
        </div>
      )}

      {brief.jarvisBrief && (
        <p className="mt-2 text-[11px] text-violet-800/80">{brief.jarvisBrief}</p>
      )}
    </div>
  );
}

export function JarvisListingDraftCard({
  draft,
  onUpdate,
}: {
  draft: JarvisListingDraft;
  onUpdate: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [message, setMessage] = useState("");
  const [manualLocationId, setManualLocationId] = useState("");

  async function act(path: string, body?: object) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = (await res.json()) as { error?: string; message?: string; draft?: JarvisListingDraft };
      if (!res.ok) setMessage(json.error ?? "요청 실패");
      else {
        setMessage(json.message ?? "완료");
        onUpdate();
      }
    } finally {
      setBusy(false);
    }
  }

  const canExecuteFull =
    draft.status === "draft" ||
    draft.status === "pending_review" ||
    draft.status === "approved" ||
    (draft.status === "failed" && !draft.executedAt);
  const canReject = !["published", "rejected", "publishing"].includes(draft.status);
  const executed = Boolean(draft.executedAt);

  // 반품지 자동 매칭이 안 돼 자비스가 소싱은 하되 등록을 보류한 건이다 —
  // 수익성 때문에 버리지 않고 여기까지 올라왔으니, 사장님이 반품지 ID를
  // 직접 넣어 실행할 수 있어야 "손 타게 해도 된다"는 지시가 완결된다.
  const needsManualLocation = draft.sellerChecklist.some((s) => s.includes("반품지 미등록"));
  const manualLocationIdNum = Number.parseInt(manualLocationId, 10);
  const manualLocationValid = Number.isFinite(manualLocationIdNum) && manualLocationIdNum > 0;

  return (
    <article className="ts-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-ts-primary">{draft.keyword}</p>
          <h3 className="mt-1 font-bold text-ts-ink">{draft.listingPayload.name}</h3>
          <p className="mt-0.5 text-[11px] text-ts-muted">
            {draft.pickMode === "consignment" ? "위탁" : "수입"} · {detailSourceLabel(draft.detailPage.source, draft.detailPage.detailProvider)}
            {draft.detailPage.imageUrls?.length
              ? ` · ${draft.detailPage.imageUrls.length}장`
              : ""}
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusClass(draft.status)}`}>
          {STATUS_LABEL[draft.status]}
        </span>
      </div>

      {draft.pickBrief && <PickBriefPanel brief={draft.pickBrief} />}

      <div className="mt-3 grid gap-2 sm:grid-cols-3 text-xs">
        <div className="ts-mini-stat">
          <p className="text-ts-muted">판매가</p>
          <p className="font-bold">{formatKrw(draft.listingPayload.salePrice)}</p>
        </div>
        <div className="ts-mini-stat">
          <p className="text-ts-muted">Jarvis</p>
          <p className="font-bold">{draft.jarvisConfidence ?? 0}%</p>
        </div>
        <div className="ts-mini-stat">
          <p className="text-ts-muted">상세</p>
          <p className="font-bold">{detailSourceLabel(draft.detailPage.source, draft.detailPage.detailProvider)}</p>
          {draft.detailPage.detailCostKrw != null && draft.detailPage.detailCostKrw > 0 && (
            <p className="text-[11px] text-ts-muted">예상 비용 {draft.detailPage.detailCostKrw.toLocaleString()}원</p>
          )}
        </div>
      </div>

      {draft.wholesaleComposition && (
        <div className="mt-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-950">
          <p className="font-bold">
            구성 분석 · Item Winner {draft.wholesaleComposition.itemWinnerRisk} ·{" "}
            {draft.wholesaleComposition.catalogMode === "avoid_catalog" ? "카탈로그 분리" : "대표아이템"}
          </p>
          <p className="mt-0.5">{draft.wholesaleComposition.brief}</p>
        </div>
      )}

      {draft.adCampaign && (
        <div className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-950">
          <p className="font-bold">
            광고 설계 · 일 {formatKrw(draft.adCampaign.dailyBudgetKrw)} · 목표 {draft.adCampaign.rankTargetScore}점
          </p>
          <p className="mt-0.5">{draft.adCampaign.pageOneGoal}</p>
          <ul className="mt-1 list-disc pl-4 text-[11px]">
            {draft.adCampaign.tactics.slice(0, 2).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {draft.detailPage.matchcutNote && !draft.detailPage.matchcutReady && (
        <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] text-ts-muted">
          {draft.detailPage.matchcutNote}
        </p>
      )}

      {draft.consignmentOrder && (
        <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <p className="font-bold">
            발주{" "}
            {draft.consignmentOrder.status === "ordered"
              ? "기록 완료"
              : draft.consignmentOrder.status === "skipped"
                ? "수동(수입)"
                : draft.consignmentOrder.status}
          </p>
          {draft.consignmentOrder.orderNote && <p className="mt-0.5">{draft.consignmentOrder.orderNote}</p>}
          {draft.consignmentOrder.supplierUrl && (
            <a
              href={draft.consignmentOrder.supplierUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block font-semibold underline"
            >
              공급처 발주 →
            </a>
          )}
        </div>
      )}

      <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-ts-muted">
        {draft.sellerChecklist.slice(0, 4).map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>

      {needsManualLocation && !executed && (
        <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
          <p className="text-xs font-bold text-amber-900">반품지를 직접 지정해서 등록</p>
          <p className="mt-0.5 text-[11px] text-amber-800/90">
            공급처 전용 반품지가 아직 없어 자동 등록을 보류했습니다. 이미 등록된 반품지 ID를 알고 있으면
            (설정 → 카테고리·반품지 조회에서 확인) 여기 넣고 바로 등록하세요 — 수익성이 좋다면 이 상품을 놓치지 마세요.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={manualLocationId}
              onChange={(e) => setManualLocationId(e.target.value)}
              placeholder="반품지 ID (예: 1520171)"
              className="w-40 rounded-md border border-amber-300 bg-white px-2 py-1 text-xs"
            />
            <button
              type="button"
              disabled={busy || !manualLocationValid}
              onClick={() =>
                void act(`/api/toss-shop/listings/${draft.id}/execute`, {
                  exchangeReturnLocationId: manualLocationIdNum,
                })
              }
              className="ts-btn-primary text-xs disabled:opacity-50"
            >
              이 반품지로 실행
            </button>
          </div>
        </div>
      )}

      {draft.publishError && (
        <p className="mt-2 text-xs text-red-700">{draft.publishError}</p>
      )}

      {draft.tossProductId && (
        <p className="mt-2 text-xs font-semibold text-emerald-700">
          토스 상품 ID {draft.tossProductId}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => setShowPreview((v) => !v)}
          className="ts-btn-secondary text-xs"
        >
          {showPreview ? "미리보기 닫기" : "상세 미리보기"}
        </button>
        {canExecuteFull && !executed && !needsManualLocation && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act(`/api/toss-shop/listings/${draft.id}/execute`, {})}
            className="ts-btn-primary text-xs"
          >
            OK · Jarvis 전체 실행
          </button>
        )}
        {draft.status === "approved" && !executed && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act(`/api/toss-shop/listings/${draft.id}/publish`, {})}
            className="ts-btn-secondary text-xs"
          >
            토스만 등록
          </button>
        )}
        {canReject && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act(`/api/toss-shop/listings/${draft.id}/reject`, { reason: "수정 필요" })}
            className="ts-btn-secondary text-xs"
          >
            거절
          </button>
        )}
      </div>

      {message && <p className="mt-2 text-xs text-ts-muted">{message}</p>}

      {showPreview && draft.detailPage.html && (
        <iframe
          title="detail preview"
          className="mt-3 h-[480px] w-full rounded-xl border border-ts-border bg-white"
          srcDoc={draft.detailPage.html}
          sandbox=""
        />
      )}
    </article>
  );
}

export function JarvisListingsPanel() {
  const [drafts, setDrafts] = useState<JarvisListingDraft[]>([]);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/toss-shop/listings");
    if (!res.ok) return;
    const json = (await res.json()) as { drafts?: JarvisListingDraft[] };
    setDrafts(json.drafts ?? []);
  }, []);

  const { initialLoading } = useSilentFetch(fetchData);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-950 ring-1 ring-violet-100">
        <p className="font-bold">{JARVIS_NAME} 자동 등록 · Hookable 상세 · OK 게이트</p>
        <p className="mt-1 text-violet-900/80">
          소싱 → 공급처 사진 자동 수집 → <strong>Hookable-class 상세</strong> → 예상 수익·이유 미리보기 →{" "}
          <strong>OK · Jarvis 전체 실행</strong> → 토스 등록 + 위탁 발주.
          수입은 발주 수동.
        </p>
      </div>

      {initialLoading ? (
        <div className="ts-skeleton h-40 w-full rounded-2xl" />
      ) : drafts.length === 0 ? (
        <div className="ts-card text-sm text-ts-muted">
          등록 초안이 없습니다. 소싱 화면에서 「Jarvis 등록 준비」를 눌러주세요.
        </div>
      ) : (
        drafts.map((d) => (
          <JarvisListingDraftCard key={d.id} draft={d} onUpdate={() => void fetchData()} />
        ))
      )}
    </div>
  );
}

export function JarvisPrepareListingButton({
  pickId,
  mode,
  label = "Jarvis 등록 준비",
}: {
  pickId: string;
  mode: "consignment" | "import";
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function prepare() {
    setBusy(true);
    try {
      const res = await fetch("/api/toss-shop/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickId, mode }),
      });
      if (res.ok) {
        setDone(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy || done}
        onClick={() => void prepare()}
        className="ts-btn-secondary text-xs sm:w-auto"
      >
        {done ? "등록 초안 생성됨" : busy ? "Jarvis 준비 중…" : label}
      </button>
      {done && (
        <Link href={SP_ROUTES.listings} className="text-xs font-semibold text-ts-primary underline">
          등록함에서 미리보기 →
        </Link>
      )}
    </div>
  );
}
