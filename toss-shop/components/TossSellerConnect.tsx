"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LegalDisclaimer } from "@/toss-shop/components/LegalDisclaimer";
import { IconLink } from "@/toss-shop/components/icons/FeatureIcons";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { SP_STRINGS } from "@/toss-shop/lib/strings";

type ConnectOptions = {
  tossSellerUrl: string;
  serverKeysConfigured: boolean;
};

export function TossSellerConnect({ onDemo }: { onDemo?: () => void }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(true);
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
        setError(data.error ?? "연동에 실패했습니다.");
        return;
      }
      router.push(SP_ROUTES.dashboard);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function submitKeys(e: React.FormEvent) {
    e.preventDefault();
    if (!accessKey.trim() || !secretKey.trim()) {
      setError("Access Key와 Secret Key를 입력해주세요.");
      return;
    }
    await connect({ accessKey, secretKey, sandbox, shopName: shopName || undefined });
  }

  const sellerUrl = options?.tossSellerUrl ?? "https://shopping-seller.toss.im";

  return (
    <div className="space-y-4">
      {!showForm ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => setShowForm(true)}
          className="ts-btn-primary"
        >
          <IconLink className="h-5 w-5" />
          {SP_STRINGS.ctaApiConnect}
        </button>
      ) : (
        <form onSubmit={submitKeys} className="space-y-4">
          <div>
            <p className="text-base font-bold text-ts-ink">{SP_STRINGS.ctaApiConnect}</p>
            <p className="mt-1 text-sm text-ts-muted">{SP_STRINGS.ctaApiConnectDesc}</p>
          </div>

          <LegalDisclaimer compact />

          <p className="text-xs leading-relaxed text-ts-muted">
            <a
              href={sellerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ts-primary underline-offset-2 hover:underline"
            >
              토스쇼핑 셀러센터
            </a>
            {" "}→ 쇼핑 → 연동 관리에서 API 키를 발급한 뒤 아래에 입력하세요.
          </p>

          <div>
            <label className="ts-label" htmlFor="access-key">Access Key</label>
            <input
              id="access-key"
              className="ts-input"
              placeholder="Access Key"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
            />
          </div>
          <div>
            <label className="ts-label" htmlFor="secret-key">Secret Key</label>
            <input
              id="secret-key"
              className="ts-input"
              type="password"
              placeholder="Secret Key"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="ts-label" htmlFor="shop-name">상점명 (선택)</label>
            <input
              id="shop-name"
              className="ts-input"
              placeholder="내 상점"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ts-muted">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-ts-border"
              checked={sandbox}
              onChange={(e) => setSandbox(e.target.checked)}
            />
            테스트(샌드박스) 환경
          </label>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-100" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="ts-btn-primary">
            {loading ? "연동 중…" : "연동하고 시작하기"}
          </button>

          {options?.serverKeysConfigured && (
            <button
              type="button"
              disabled={loading}
              onClick={() => void connect({ useServerKeys: true })}
              className="ts-btn-ghost text-sm"
            >
              서버에 설정된 API 키로 연동
            </button>
          )}
        </form>
      )}

      {/* onDemo가 없으면(프로덕션) 데모 진입 자체를 노출하지 않는다 */}
      {onDemo && (
        <>
          <div className="ts-divider">또는</div>
          <button type="button" onClick={onDemo} disabled={loading} className="ts-btn-secondary">
            {SP_STRINGS.ctaDemo}
          </button>
        </>
      )}
    </div>
  );
}
