"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { dataSourceLabel, FREE_DAILY_KEYWORD_LIMIT, PRO_PRICE_KRW } from "@/toss-shop/lib/billing";
import { useSilentFetch } from "@/toss-shop/lib/hooks/use-silent-fetch";
import { TOSS_SELLER_CENTER_URL } from "@/toss-shop/lib/toss-connect-constants";
import { TossCategoryReturnLookup } from "@/toss-shop/components/TossCategoryReturnLookup";

type PlanAccess = {
  tier: string;
  label: string;
  fullAccess: boolean;
  dailyKeywordLimit: number | null;
  isOwner: boolean;
};

type SettingsData = {
  merchant: { shopName: string };
  api: {
    configured: boolean;
    dataSource: string;
    accessKeyMasked: string | null;
    sandbox: boolean;
    lastSyncAt?: string;
    lastSyncError?: string;
  };
  billing: {
    plan: string;
    planLabel: string;
    access: PlanAccess;
    proExpiresAt?: string;
    entitled: boolean;
    priceKrw: number;
    keywordLimit: number;
    dataSourceLabel: string;
  };
};

export function SettingsPanel() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<SettingsData | null>(null);
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [sandbox, setSandbox] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [upgradeMessage, setUpgradeMessage] = useState("");

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/toss-shop/settings");
    const json = (await res.json()) as SettingsData;
    setData(json);
    setSandbox(json.api?.sandbox ?? false);
  }, []);

  const { initialLoading } = useSilentFetch(fetchData);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      setUpgradeMessage("결제가 완료되었습니다. Pro 기능이 곧 활성화됩니다.");
      void fetchData();
    }
  }, [searchParams, fetchData]);

  async function saveKeys() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/toss-shop/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_keys", accessKey, secretKey, sandbox }),
      });
      const json = (await res.json()) as { sync?: { result?: { error?: string; productsSynced?: number } } };
      if (!res.ok) setMessage("저장 실패");
      else {
        setMessage(
          json.sync?.result?.error
            ? `키 저장됨 · 동기화 오류: ${json.sync.result.error}`
            : `연동 완료 · 상품 ${json.sync?.result?.productsSynced ?? 0}개 동기화`,
        );
        setAccessKey("");
        setSecretKey("");
      }
      await fetchData();
    } finally {
      setBusy(false);
    }
  }

  async function startCheckout() {
    setBusy(true);
    setUpgradeMessage("");
    try {
      const res = await fetch("/api/toss-shop/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start_checkout" }),
      });
      const json = (await res.json()) as { error?: string; url?: string };
      if (!res.ok || !json.url) {
        setUpgradeMessage(json.error ?? "결제 페이지를 열 수 없습니다.");
        return;
      }
      window.location.href = json.url;
    } finally {
      setBusy(false);
    }
  }

  async function activatePro() {
    setBusy(true);
    setUpgradeMessage("");
    try {
      const res = await fetch("/api/toss-shop/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate_pro", code: activationCode }),
      });
      const json = (await res.json()) as { error?: string; proExpiresAt?: string };
      if (!res.ok) {
        setUpgradeMessage(json.error ?? "활성화 실패");
      } else {
        setUpgradeMessage(
          json.proExpiresAt
            ? `Pro 활성화 완료 · 만료 ${new Date(json.proExpiresAt).toLocaleDateString("ko-KR")}`
            : "Pro 활성화 완료",
        );
        setActivationCode("");
      }
      await fetchData();
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    setBusy(true);
    setMessage("");
    try {
      await fetch("/api/toss-shop/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      setMessage("동기화 완료");
      await fetchData();
    } finally {
      setBusy(false);
    }
  }

  if (initialLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="ts-skeleton h-32 w-full rounded-2xl" />
        <div className="ts-skeleton h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="ts-card">
        <h2 className="text-sm font-bold">플랜</h2>
        <p className="mt-2 text-2xl font-bold text-ts-primary">{data.billing.access.label}</p>
        {data.billing.proExpiresAt && data.billing.access.tier === "pro" && (
          <p className="mt-1 text-xs text-ts-muted">
            Pro 만료: {new Date(data.billing.proExpiresAt).toLocaleDateString("ko-KR")}
          </p>
        )}
        {data.billing.access.isOwner && (
          <p className="mt-1 text-xs text-emerald-700">Owner 계정 · 모든 기능 무제한 무료</p>
        )}
        {!data.billing.access.fullAccess && (
          <p className="mt-2 text-sm text-ts-muted">
            Free: 하루 키워드 분석 {FREE_DAILY_KEYWORD_LIMIT}회 · 위탁 소싱 AI·발굴·랭킹은 Pro 필요
          </p>
        )}
        <p className="mt-2 text-sm text-ts-muted">
          데이터: <strong>{dataSourceLabel(data.api.dataSource)}</strong>
        </p>
      </section>

      {!data.billing.access.fullAccess && (
        <section id="upgrade" className="ts-card scroll-mt-24 ring-2 ring-ts-primary/20">
          <h2 className="text-sm font-bold">Pro 업그레이드</h2>
          <p className="mt-2 text-sm text-ts-muted">
            위탁 AI · 수입 AI · 아이템 발굴 · 랭킹 · 경쟁사 · 정산 · API 연동 전체 이용
          </p>
          <p className="mt-3 text-2xl font-bold text-ts-primary">
            월 {(data.billing.priceKrw ?? PRO_PRICE_KRW).toLocaleString()}원
          </p>
          <p className="mt-1 text-xs text-ts-muted">
            Lemon Squeezy 카드/페이팔 결제 · 활성화 코드도 사용 가능
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void startCheckout()}
            className="ts-btn-primary mt-4 sm:!w-auto sm:px-8"
          >
            Pro 구독하기
          </button>
          <p className="mt-4 text-xs font-semibold text-ts-muted">또는 활성화 코드</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              className="ts-input min-w-0 flex-1"
              placeholder="Pro 활성화 코드"
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value)}
              autoComplete="off"
            />
            <button type="button" disabled={busy || !activationCode.trim()} onClick={() => void activatePro()} className="ts-btn-primary shrink-0 sm:!w-auto sm:px-6">
              활성화
            </button>
          </div>
          {upgradeMessage && <p className="mt-3 text-sm text-ts-muted">{upgradeMessage}</p>}
        </section>
      )}

      <section className={`ts-card ${!data.billing.entitled ? "opacity-60" : ""}`}>
        <h2 className="text-sm font-bold">토스쇼핑 API 연동</h2>
        {!data.billing.entitled && (
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Pro 플랜에서 API 연동·동기화를 사용할 수 있습니다.
          </p>
        )}
        <p className="mt-1 text-xs leading-relaxed text-ts-muted">
          <a href={TOSS_SELLER_CENTER_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-ts-primary underline">
            토스쇼핑 셀러센터
          </a>
          {" "}→ 쇼핑 → 연동 관리에서 API 키를 발급하세요. 저장 즉시 상품·정산·키워드가 동기화됩니다.
        </p>

        {data.api.configured && (
          <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            연동됨 · {data.merchant.shopName} · Access Key {data.api.accessKeyMasked}
            {data.api.lastSyncAt && (
              <> · 동기화 {new Date(data.api.lastSyncAt).toLocaleString("ko-KR")}</>
            )}
          </div>
        )}
        {data.api.lastSyncError && (
          <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
            {data.api.lastSyncError}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <input className="ts-input" placeholder="Access Key" value={accessKey} onChange={(e) => setAccessKey(e.target.value)} autoComplete="off" />
          <input className="ts-input" type="password" placeholder="Secret Key" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} autoComplete="off" />
          <label className="flex items-center gap-2 text-sm text-ts-muted">
            <input type="checkbox" checked={sandbox} onChange={(e) => setSandbox(e.target.checked)} />
            테스트(샌드박스) 환경
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={saveKeys} className="ts-btn-primary">
            저장 & 동기화
          </button>
          <button type="button" disabled={busy} onClick={syncNow} className="ts-btn-secondary">
            지금 동기화
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-ts-muted">{message}</p>}
      </section>

      {data.api.configured && <TossCategoryReturnLookup />}

      <section className="ts-card">
        <h2 className="text-sm font-bold">도매매·도매꾹 API (Jarvis 위탁)</h2>
        <p className="mt-1 text-xs leading-relaxed text-ts-muted">
          <strong className="text-ts-ink">도매매(supply) 우선</strong> — 개당(MOQ≤1) 주문 가능. 도매꾹은 대량 MOQ 위주라 Jarvis는 도매매 단품 공급처를 먼저 검색합니다.
          {" "}
          <a href="https://openapi.domeggook.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-ts-primary underline">
            Open API
          </a>
          {" "}키를 Vercel에 <code className="text-xs">DOMEGGOOK_API_KEY</code> 로 등록하면 위탁 AI가 실시간 공급가·상품 URL을 가져옵니다.
        </p>
      </section>
    </div>
  );
}
