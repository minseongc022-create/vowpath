"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/** 토스 카드 등록 화면에서 사용자가 취소했거나 실패했을 때 돌아오는 곳. */
export default function BillingFailPage() {
  const params = useSearchParams();
  const message = params.get("message");

  return (
    <div className="vs-container-narrow">
      <div className="vs-card vs-stack" style={{ marginTop: 40 }}>
        <h1 className="vs-page-title">카드 등록이 취소됐습니다</h1>
        <p className="vs-hint">
          {message ? message : "결제 수단이 등록되지 않았습니다. 무료 베타는 그대로 이용하실 수 있습니다."}
        </p>
        <Link href="/vibesafe/billing" className="vs-btn vs-btn-primary">
          결제 화면으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
