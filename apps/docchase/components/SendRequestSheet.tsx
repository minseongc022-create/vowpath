"use client";

import { alimtalkPreview, maskPhone, sendStepLabel } from "@/lib/format";
import type { ClientAccount } from "@/lib/types";

type Props = {
  open: boolean;
  client: ClientAccount | null;
  officeName: string;
  monthLabel: string;
  demoMode?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function SendRequestSheet({
  open,
  client,
  officeName,
  monthLabel,
  demoMode = true,
  onClose,
  onConfirm,
}: Props) {
  if (!open || !client) return null;

  const step = sendStepLabel(client.status);
  const preview = alimtalkPreview(officeName, client, monthLabel);
  const hasPhone = Boolean(client.phone?.replace(/\D/g, "").length);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal>
      <button
        type="button"
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-paper-line bg-paper-card p-5 shadow-soft sm:rounded-3xl sm:p-6">
        <p className="text-xs font-semibold tracking-[0.14em] text-pine-700">자료 요청 보내기</p>
        <h2 className="mt-2 font-display text-2xl font-medium text-ink">사무원이 전화 대신 보내던 그 안내</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          받을 사람·번호·문구를 확인한 뒤 보냅니다. 실제 사무소에서도 이렇게 한 곳씩 확인하고 독촉합니다.
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
            <dt className="text-ink-muted">어디로 (알림톡)</dt>
            <dd className="text-right font-medium text-ink">
              {hasPhone ? client.phone : "번호 없음 — 거래처에서 먼저 등록"}
              {hasPhone ? (
                <span className="mt-0.5 block text-xs font-normal text-ink-muted">
                  카카오톡 · {maskPhone(client.phone)}
                </span>
              ) : null}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">이번 발송</dt>
            <dd className="text-right font-medium text-ink">{step}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">받을 자료</dt>
            <dd className="mt-1 font-medium text-ink">{client.docs.join(" · ")}</dd>
          </div>
        </dl>

        <div className="mt-4">
          <p className="text-xs font-semibold text-ink-muted">보낼 내용 미리보기</p>
          <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl bg-ink px-4 py-3 font-sans text-xs leading-relaxed text-paper/90 sm:text-sm">
            {preview}
          </pre>
        </div>

        {demoMode ? (
          <p className="mt-4 rounded-xl border border-amber-soft bg-amber-soft/50 px-3 py-2.5 text-xs leading-relaxed text-amber-ink">
            지금은 <strong>연습 모드</strong>입니다. 누르면 카톡이 실제로 나가지 않고, 목록 상태만
            “보낸 것처럼” 바뀝니다. 알림톡(솔라피) 연동 후에는 <strong>같은 버튼</strong>으로 위 번호에
            진짜로 발송됩니다.
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            className="sc-btn-primary w-full sm:flex-1"
            disabled={!hasPhone}
            onClick={onConfirm}
          >
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
