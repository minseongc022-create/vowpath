"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { SP_STRINGS } from "@/toss-shop/lib/strings";

type ConnectOptions = {
  tossSellerUrl: string;
  serverKeysConfigured: boolean;
};

export function TossSellerConnect({ onDemo }: { onDemo?: () => void }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [sandbox, setSandbox] = useState(false);
  const [shopName, setShopName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState<ConnectOptions | null>(null);

  useEffect(() => {
    void fetch("/api/toss-shop/auth/connect")
      .then((r) => r.json())
      .then((d: ConnectOptions) => setOptions(d))
      .catch(() => null);
  }, []);

  async function connect(payload: Record<string, unknown>) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/toss-shop/auth/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "연동 실패");
        return;
      }
      router.push(SP_ROUTES.dashboard);
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  async function submitKeys(e: React.FormEvent) {
    e.preventDefault();
    await connect({ accessKey, secretKey, sandbox, shopName: shopName || undefined });
  }

  const sellerUrl = options?.tossSellerUrl ?? "https://shopping-seller.toss.im";

  return (
    <div className="space-y-4">
      <button
        type="button"
        disabled={loading}
        onClick={() => {
          if (options?.serverKeysConfigured) void connect({ useServerKeys: true });
          else setExpanded(true);
        }}
        className="ts-btn-toss"
      >
        <TossLogo />
        {SP_STRINGS.ctaTossConnect}
      </button>

      {expanded && (
        <form onSubmit={submitKeys} className="space-y-3 rounded-xl border border-ts-border bg-ts-bg p-4">
          <p className="text-xs leading-relaxed text-ts-muted">
            토스쇼핑은 셀러 OAuth 로그인 대신{" "}
            <strong className="text-ts-ink">API 키</strong>로 연동합니다.
            <a
              href={sellerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 font-semibold text-ts-primary underline"
            >
              토스 셀러센터
            </a>
            {" "}→ 쇼핑 → 연동 관리에서 키를 발급한 뒤 입력하세요. 연동 즉시 상품·정산·키워드가 동기화됩니다.
          </p>
          <input
            className="ts-input"
            placeholder="Access Key"
            value={accessKey}
            onChange={(e) => setAccessKey(e.target.value)}
            required
            autoComplete="off"
          />
          <input
            className="ts-input"
            type="password"
            placeholder="Secret Key"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            required
            autoComplete="off"
          />
          <input
            className="ts-input"
            placeholder="상점명 (선택)"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-ts-muted">
            <input type="checkbox" checked={sandbox} onChange={(e) => setSandbox(e.target.checked)} />
            테스트(샌드박스) 환경
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="ts-btn-primary w-full">
            {loading ? "연동 중…" : "연동하고 시작하기"}
          </button>
        </form>
      )}

      {!expanded && error && <p className="text-sm text-red-600">{error}</p>}

      <div className="ts-divider">또는</div>

      <button
        type="button"
        onClick={onDemo}
        className="ts-btn-secondary w-full"
      >
        {SP_STRINGS.ctaDemo}
      </button>
    </div>
  );
}

function TossLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="10" fill="white" fillOpacity="0.2" />
      <path
        d="M6 10.5c0-2.5 1.8-4.5 4-4.5s4 2 4 4.5-1.8 4.5-4 4.5-4-2-4-4.5z"
        fill="white"
      />
    </svg>
  );
}
