"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CHAEBI_ROUTES } from "@/chaebi/lib/brand";
import { ChaebiApiError, createPlan } from "@/chaebi/lib/client";
import type { PlanSummary } from "@/chaebi/lib/types";
import { AlertIcon, SparkIcon } from "@/chaebi/components/ui/Icons";
import { PreparingOverlay } from "./PreparingOverlay";
import { RecentStrip } from "./RecentStrip";

/**
 * 첫 화면 — 이 앱의 전부.
 *
 * 여기서 사용자가 해야 할 일은 딱 하나다: 무슨 일인지 한 줄 적기. 카테고리
 * 고르기·지역 선택·날짜 선택을 앞에 세우는 순간 이 앱은 그냥 또 하나의
 * 예약앱이 된다. 부족한 정보는 뒤(확인 화면)에서 되묻는다.
 */

const EXAMPLES = [
  "내일 여자친구 생일인데 아무것도 준비 못했어",
  "이번 주 토요일 부모님 생신, 30만원 정도로",
  "오늘 저녁 급하게 데이트 코스 짜줘",
  "결혼기념일인데 조용한 데로 하고 싶어",
  "친구 승진 축하 자리 강남에서",
  "여자친구랑 싸웠는데 화해하고 싶어",
];

const MIN_LENGTH = 4;

export function AskScreen({
  recent,
  catalogSize,
}: {
  recent: PlanSummary[];
  catalogSize: number;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 입력이 길어지면 상자가 같이 자란다 — 스크롤바가 생기면 "폼"처럼 보인다
  const grow = useCallback(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 240)}px`;
  }, []);

  useEffect(grow, [text, grow]);

  const ready = text.trim().length >= MIN_LENGTH;

  async function submit() {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);

    // 답이 너무 빨리 와도 준비 화면을 한 번은 보여준다 — "정말 뭔가 했나?"
    // 싶게 만드는 0.3초짜리 전환이 신뢰를 깎는다.
    const floor = new Promise((resolve) => setTimeout(resolve, 2400));
    try {
      const [{ plan }] = await Promise.all([createPlan(text.trim()), floor]);
      router.push(CHAEBI_ROUTES.plan(plan.id));
    } catch (e) {
      setBusy(false);
      setError(
        e instanceof ChaebiApiError
          ? e.message
          : "잠시 문제가 생겼습니다. 다시 시도해 주세요.",
      );
    }
  }

  return (
    <>
      <div className="flex flex-1 flex-col px-5 pb-2 pt-7">
        <div className="cb-rise">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cb-primary-soft px-3 py-1 text-[12px] font-bold text-cb-primary">
            <SparkIcon className="h-3.5 w-3.5" />
            검색하지 말고, 그냥 말하세요
          </span>
          <h1 className="mt-4 text-[30px] font-extrabold leading-[1.25] tracking-[-0.02em] text-cb-ink">
            무슨 일이
            <br />
            있으신가요?
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-cb-muted">
            상황만 적어주시면 필요한 걸 찾아서
            <br />
            예약·주문까지 제가 끝내 드립니다.
          </p>
        </div>

        <div className="cb-rise mt-6" style={{ animationDelay: "70ms" }}>
          <label htmlFor="chaebi-situation" className="cb-sr">
            상황을 적어주세요
          </label>
          <textarea
            id="chaebi-situation"
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void submit();
              }
            }}
            rows={3}
            maxLength={1000}
            placeholder="예) 내일 여자친구 생일인데 아무것도 준비 못했어"
            className="cb-input cb-textarea text-[16px]"
            disabled={busy}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                className="cb-chip text-left"
                onClick={() => {
                  setText(example);
                  textareaRef.current?.focus();
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded-2xl border border-cb-danger/25 bg-cb-danger-soft px-4 py-3"
          >
            <AlertIcon className="mt-0.5 h-4 w-4 flex-none text-cb-danger" />
            <p className="text-[13px] leading-relaxed text-cb-danger">{error}</p>
          </div>
        ) : null}

        <RecentStrip plans={recent} />

        <div className="flex-1" />

        <p className="mt-8 text-center text-[12px] leading-relaxed text-cb-subtle">
          회원가입 없이 바로 시작합니다 · 제휴처 {catalogSize.toLocaleString("ko-KR")}곳
        </p>
      </div>

      <div className="cb-actionbar">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!ready || busy}
          className="cb-btn cb-btn-primary h-14 w-full text-[16px]"
        >
          채비 시작하기
        </button>
      </div>

      {busy ? <PreparingOverlay /> : null}
    </>
  );
}
