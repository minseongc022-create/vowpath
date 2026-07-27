"use client";

import { alimtalkPreview, maskPhone, sendStepLabel } from "@/lib/format";
import { planAllows } from "@/lib/plans";
import { submitUrlFor } from "@/lib/store";
import type { ClientAccount } from "@/lib/types";
import type { PlanId } from "@/lib/plans";

type Props = {
  open: boolean;
  client: ClientAccount | null;
  officeName: string;
  monthLabel: string;
  planId: PlanId;
  demoMode?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function SendRequestSheet({
  open,
  client,
  officeName,
  monthLabel,
  planId,
  demoMode = true,
  onClose,
  onConfirm,
}: Props) {
  if (!open || !client) return null;

  const step = sendStepLabel(client.status);
  const withLink = planAllows(planId, "submitLink");
  const link = withLink ? submitUrlFor(client.submitToken) : undefined;
  const preview = alimtalkPreview(officeName, client, monthLabel, link);
  const hasPhone = Boolean(client.phone?.replace(/\D/g, "").length);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal>
      <button type="button" className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" aria-label="닫기" onClick={onClose} />
      <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-paper-line bg-paper-card p-5 shadow-soft sm:rounded-3xl sm:p-6">
        <p className="text-xs font-semibold tracking-[0.14em] text-pine-700">자료 요청 보내기</p>
        <h2 className="mt-2 font-display text-2xl font-medium text-ink">확인만 하고 보내면 됩니다</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          거래처 휴대폰(카카오 알림톡)으로 갑니다.
          {withLink ? " 알림 안에 제출 링크가 포함됩니다." : " 라이트는 안내 문구만 보냅니다."}
        </p>

        <dl className="mt-5 space-y-3 rounded-2xl border border-paper-line bg-white/80 p-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">누구에게</dt>
            <dd className="text-right font-medium text-ink">
              {client.name}
              <span className="block text-xs font-normal text-ink-muted">{client.contactName}</span>
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">어디로</dt>
            <dd className="text-right font-medium text-ink">
              {hasPhone ? client.phone : "번호 없음"}
              {hasPhone ? (
                <span className="mt-0.5 block text-xs font-normal text-ink-muted">
                  카카오톡 · {maskPhone(client.phone)}
                </span>
              ) : null}
            </dd>
          </div>
          {withLink ? (
            <div>
              <dt className="text-ink-muted">제출 링크</dt>
              <dd className="mt-1 break-all text-xs font-medium text-pine-700">{link}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">이번 발송</dt>
            <dd className="text-right font-medium text-ink">{step}</dd>
          </div>
        </dl>

        <div className="mt-4">
          <p className="text-xs font-semibold text-ink-muted">보낼 내용</p>
          <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl bg-ink px-4 py-3 font-sans text-xs leading-relaxed text-paper/90 sm:text-sm">
            {preview}
          </pre>
        </div>

        {demoMode ? (
          <p className="mt-4 rounded-xl border border-amber-soft bg-amber-soft/50 px-3 py-2.5 text-xs leading-relaxed text-amber-ink">
            연습 모드: 실제 카톡은 나가지 않고 목록·로그만 바뀝니다. 제출 링크는 지금 바로 열어볼 수 있습니다.
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button type="button" className="sc-btn-primary w-full sm:flex-1" disabled={!hasPhone} onClick={onConfirm}>
            {hasPhone ? `${step} 보내기` : "번호가 없어 보낼 수 없음"}
          </button>
          <button type="button" className="sc-btn-secondary w-full sm:w-auto" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
