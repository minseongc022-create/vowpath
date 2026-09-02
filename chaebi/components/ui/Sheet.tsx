"use client";

import { useEffect, useRef } from "react";
import { CloseIcon } from "./Icons";

/**
 * 바텀시트.
 *
 * 이 앱에서 "선택"은 전부 시트에서 일어난다 — 페이지를 갈아 끼우면 방금 보던
 * 계획이 사라져서, 무엇을 바꾸는 중이었는지 감이 끊긴다. 시트는 뒤에 계획을
 * 남겨둔 채 위로만 올라온다.
 *
 * 접근성: 열리면 포커스를 안으로 가두고, Esc·배경 탭으로 닫히고, 뒤 화면
 * 스크롤을 잠근다. 모바일에서 시트 뒤가 같이 스크롤되면 조작이 어긋난다.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    // 열리자마자 첫 조작 대상으로 포커스를 옮긴다
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("button, [href]")?.focus();
    }, 60);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="cb-sheet-backdrop" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        className="cb-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="cb-sheet-handle" />
        <div className="flex items-start gap-3 px-5 pb-3 pt-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-extrabold text-cb-ink">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-[13px] text-cb-muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="cb-btn cb-btn-quiet -mr-1 h-9 w-9 rounded-full p-0"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer ? (
          <div className="flex-none border-t border-cb-border bg-cb-surface px-5 py-4">{footer}</div>
        ) : null}
      </div>
    </>
  );
}
