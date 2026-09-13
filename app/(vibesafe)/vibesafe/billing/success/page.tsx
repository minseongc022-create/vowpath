"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * 토스 카드 등록이 끝나면 여기로 돌아온다.
 *
 * URL의 authKey·customerKey는 **1회용**이다 — 여기서 서버에 넘겨 billingKey로
 * 바꾸고 첫 결제를 완료한다. 이 페이지를 새로고침해도 같은 authKey로 다시
 * 시도되지 않게, 완료 후에는 이 값들이 붙은 주소로 남아있지 않도록 결과
 * 화면으로 바로 안내한다.
 */
export default function BillingSuccessPage() {
  const params = useSearchParams();
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState<string | null>(null);
  const [trialStarted, setTrialStarted] = useState(false);

  useEffect(() => {
    const authKey = params.get("authKey");
    const customerKey = params.get("customerKey");
    if (!authKey || !customerKey) {
      setState("error");
      setMessage("결제 정보를 확인하지 못했습니다.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/vibesafe/billing/register/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authKey, customerKey }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string; trialStarted?: boolean };
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setState("error");
          setMessage(data.error ?? "결제를 완료하지 못했습니다.");
          return;
        }
        setTrialStarted(Boolean(data.trialStarted));
        setState("done");
      } catch {
        if (!cancelled) {
          setState("error");
          setMessage("연결에 실패했습니다.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="vs-container-narrow">
      <div className="vs-card vs-stack" style={{ marginTop: 40 }}>
        {state === "working" && (
          <>
            <h1 className="vs-page-title">결제를 확인하는 중입니다</h1>
            <p className="vs-hint">잠시만 기다려주세요.</p>
          </>
        )}
        {state === "done" && (
          <>
            <h1 className="vs-page-title">
              {trialStarted ? "7일 무료체험이 시작됐습니다" : "구독이 시작됐습니다"}
            </h1>
            <p className="vs-hint">
              {trialStarted
                ? "지금 결제된 금액은 없습니다. 이제 프로 플랜의 한도를 바로 쓸 수 있고, 체험 종료 하루 전에 알려드립니다. 원하지 않으시면 그 전에 언제든 해지하실 수 있습니다."
                : "첫 결제가 완료됐습니다. 이제 프로 플랜의 한도를 쓸 수 있습니다."}
            </p>
            <Link href="/vibesafe/billing" className="vs-btn vs-btn-primary">
              결제 내역 보기
            </Link>
          </>
        )}
        {state === "error" && (
          <>
            <h1 className="vs-page-title">결제를 완료하지 못했습니다</h1>
            {message && (
              <div className="vs-alert" data-tone="error" role="alert">
                {message}
              </div>
            )}
            <Link href="/vibesafe/billing" className="vs-btn vs-btn-primary">
              다시 시도하기
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
