"use client";

import { useState } from "react";

/**
 * 카드 등록 시작 버튼.
 *
 * ★ 위젯을 화면 안에 그리지 않는다
 *
 * 토스의 자동결제 카드 등록(`requestBillingAuth`)은 GIU의 1회성 결제
 * 위젯(`widgets().renderPaymentMethods`)과 달리 **전체 페이지 이동** 방식이다
 * — 사용자를 토스 카드 등록 화면으로 보냈다가 성공/실패 URL로 돌려보낸다.
 * 카드 번호가 우리 페이지의 iframe이 아니라 토스 도메인에서 직접 입력되므로,
 * 우리 서버는 카드 정보를 한 번도 보지 않는다.
 */
export function BillingRegisterButton({
  customerEmail,
  trialEligible,
}: {
  customerEmail?: string | null;
  /** 이 계정이 7일 체험을 아직 안 써봤는가. false면 등록 즉시 결제된다 —
   *  버튼 문구가 실제로 일어날 일과 달라지면 안 되므로 반드시 넘겨받는다. */
  trialEligible: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/vibesafe/billing/register", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        customerKey?: string;
        clientKey?: string;
      };
      if (!res.ok || !data.ok || !data.customerKey || !data.clientKey) {
        setError(data.error ?? "결제 준비에 실패했습니다.");
        setBusy(false);
        return;
      }

      const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
      const tossPayments = await loadTossPayments(data.clientKey);
      const payment = tossPayments.payment({ customerKey: data.customerKey });
      const origin = window.location.origin;

      // 이 호출이 페이지를 토스 도메인으로 이동시킨다. 이후 로직은
      // successUrl(/vibesafe/billing/success)에서 이어진다.
      await payment.requestBillingAuth({
        method: "CARD",
        successUrl: `${origin}/vibesafe/billing/success`,
        failUrl: `${origin}/vibesafe/billing/fail`,
        customerEmail: customerEmail ?? undefined,
      });
    } catch {
      setError("결제 준비 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setBusy(false);
    }
  }

  return (
    <div className="vs-stack-sm">
      {error && (
        <div className="vs-alert" data-tone="error" role="alert">
          {error}
        </div>
      )}
      <button className="vs-btn vs-btn-primary vs-btn-lg" onClick={() => void start()} disabled={busy}>
        {busy ? "이동하는 중…" : trialEligible ? "카드 등록하고 7일 무료체험 시작하기" : "카드 등록하고 시작하기"}
      </button>
      <p className="vs-hint">
        카드 번호는 토스 결제창에만 입력되고 저희 서버를 거치지 않습니다.{" "}
        {trialEligible
          ? "등록해도 지금 결제되는 금액은 없습니다 — 7일 뒤부터 자동으로 결제되고, 결제 하루 전에 미리 알려드립니다. 그 전에 언제든 해지하면 결제되지 않습니다."
          : "이미 무료체험을 사용하셨어서, 이번에는 등록 즉시 결제되고 이후 30일마다 자동으로 결제됩니다. 언제든 해지할 수 있습니다."}
      </p>
    </div>
  );
}
