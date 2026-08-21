"use client";

import { useCallback, useEffect, useState } from "react";
import { dataSourceLabel, planLabel } from "@/toss-shop/lib/billing";

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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/toss-shop/settings");
    const json = (await res.json()) as SettingsData;
    setData(json);
    setSandbox(json.api?.sandbox ?? false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveKeys() {
    setLoading(true);
    setMessage("");
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
    void load();
    setLoading(false);
  }

  async function syncNow() {
    setLoading(true);
    setMessage("");
    await fetch("/api/toss-shop/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync" }),
    });
    setMessage("동기화 요청 완료");
    void load();
    setLoading(false);
  }

  if (!data) return <p className="text-sm text-ts-muted">불러오는 중…</p>;

  return (
    <div className="space-y-6">
      <section className="ts-card">
        <h2 className="text-sm font-bold">플랜</h2>
        <p className="mt-2 text-2xl font-bold text-ts-primary">{data.billing.planLabel}</p>
        {data.billing.trialEndsAt && (
          <p className="mt-1 text-xs text-ts-muted">
            체험 종료: {new Date(data.billing.trialEndsAt).toLocaleDateString("ko-KR")}
          </p>
        )}
        <p className="mt-2 text-sm text-ts-muted">
          데이터 소스: <strong>{dataSourceLabel(data.api.dataSource)}</strong>
        </p>
      </section>

      <section className="ts-card">
        <h2 className="text-sm font-bold">토스쇼핑 API 연동</h2>
        <p className="mt-1 text-xs text-ts-muted">
          파트너스 → 가맹점·계정 관리 → 자체 개발에서 발급한 키를 입력하면 정산·상품·키워드가 자동 동기화됩니다.
          키 없이도 데모 데이터로 모든 기능을 사용할 수 있습니다.
        </p>

        {data.api.configured && (
          <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            연동됨 · Access Key {data.api.accessKeyMasked}
            {data.api.lastSyncAt && (
              <> · 마지막 동기화 {new Date(data.api.lastSyncAt).toLocaleString("ko-KR")}</>
            )}
          </div>
        )}
        {data.api.lastSyncError && (
          <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
            동기화 오류: {data.api.lastSyncError}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <input
            className="ts-input"
            placeholder="Access Key"
            value={accessKey}
            onChange={(e) => setAccessKey(e.target.value)}
          />
          <input
            className="ts-input"
            type="password"
            placeholder="Secret Key"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sandbox} onChange={(e) => setSandbox(e.target.checked)} />
            테스트(샌드박스) 환경
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={loading} onClick={saveKeys} className="ts-btn-primary">
            키 저장 & 동기화
          </button>
          <button type="button" disabled={loading} onClick={syncNow} className="ts-btn-secondary">
            지금 동기화
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-ts-muted">{message}</p>}
      </section>
    </div>
  );
}
