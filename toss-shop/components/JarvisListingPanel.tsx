"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { formatKrw } from "@/toss-shop/lib/format";
import { useSilentFetch } from "@/toss-shop/lib/hooks/use-silent-fetch";
import type { JarvisListingDraft } from "@/toss-shop/lib/types";
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

export function JarvisListingDraftCard({
  draft,
  onUpdate,
}: {
  draft: JarvisListingDraft;
  onUpdate: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState("");

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

  const canApprove = draft.status === "pending_review" || draft.status === "draft";
  const canPublish = draft.status === "approved";
  const canReject = !["published", "rejected", "publishing"].includes(draft.status);

  return (
    <article className="ts-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-ts-primary">{draft.keyword}</p>
          <h3 className="mt-1 font-bold text-ts-ink">{draft.listingPayload.name}</h3>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusClass(draft.status)}`}>
          {STATUS_LABEL[draft.status]}
        </span>
      </div>

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
          <p className="font-bold">
            {draft.detailPage.source === "jarvis_ai" ? "AI 생성" : draft.detailPage.source}
          </p>
        </div>
      </div>

      {draft.detailPage.matchcutNote && (
        <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] text-ts-muted">
          Matchcut: {draft.detailPage.matchcutNote}
        </p>
      )}

      <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-ts-muted">
        {draft.sellerChecklist.slice(0, 4).map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>

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
        {canApprove && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act(`/api/toss-shop/listings/${draft.id}/approve`)}
            className="ts-btn-primary text-xs"
          >
            OK · Jarvis 실행 승인
          </button>
        )}
        {canPublish && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act(`/api/toss-shop/listings/${draft.id}/publish`, {})}
            className="ts-btn-primary text-xs"
          >
            토스 등록
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

      {showPreview && (
        <iframe
          title="detail preview"
          className="mt-3 h-96 w-full rounded-xl border border-ts-border bg-white"
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
        <p className="font-bold">{JARVIS_NAME} 자동 등록 · OK 사인 게이트</p>
        <p className="mt-1 text-violet-900/80">
          소싱 → AI 상세페이지 → 등록 초안 → <strong>사용자 OK</strong> → 토스 등록.
          Matchcut 상세는 나중에 연결 (현재 Jarvis AI 상세 사용).
        </p>
      </div>

      {initialLoading ? (
        <div className="ts-skeleton h-40 w-full rounded-2xl" />
      ) : drafts.length === 0 ? (
        <div className="ts-card text-sm text-ts-muted">
          등록 초안이 없습니다. 위탁/수입 AI에서 「Jarvis 등록 준비」를 눌러주세요.
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
          등록함에서 OK →
        </Link>
      )}
    </div>
  );
}
