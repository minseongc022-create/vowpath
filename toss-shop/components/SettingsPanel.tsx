"use client";

import { useCallback, useState } from "react";
import { dataSourceLabel } from "@/toss-shop/lib/billing";
import { useSilentFetch } from "@/toss-shop/lib/hooks/use-silent-fetch";
import { TOSS_SELLER_CENTER_URL } from "@/toss-shop/lib/toss-connect";

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
    trialEndsAt?: string;
    entitled: boolean;
    dataSourceLabel: string;
  };
};

export function SettingsPanel() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [sandbox, setSandbox] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/toss-shop/settings");
    const json = (await res.json()) as SettingsData;
    setData(json);
    setSandbox(json.api?.sandbox ?? false);
  }, []);

  const { initialLoading } = useSilentFetch(fetchData);

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
        <p className="mt-2 text-2xl font-bold text-ts-primary">{data.billing.planLabel}</p>
        {data.billing.trialEndsAt && (
          <p className="mt-1 text-xs text-ts-muted">
            체험 종료: {new Date(data.billing.trialEndsAt).toLocaleDateString("ko-KR")}
          </p>
        )}
        <p className="mt-2 text-sm text-ts-muted">
          데이터: <strong>{dataSourceLabel(data.api.dataSource)}</strong>
        </p>
      </section>

      <section className="ts-card">
        <h2 className="text-sm font-bold">토스쇼핑 API 연동</h2>
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
    </div>
  );
}
