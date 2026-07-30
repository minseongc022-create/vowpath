"use client";

import { useEffect, useState } from "react";
import { AD_CARD_SPECS } from "@/lib/matchcut/ad-card-specs";
import { CREDIT_COSTS, MATCHCUT_API } from "@/lib/matchcut/constants";

type GeneratedAdCard = {
  specId: string;
  label: string;
  width: number;
  height: number;
  copy: { headline: string; subcopy: string; cta: string; badge?: string };
  imageBase64?: string;
  error?: string;
};

function fileToBase64(file: File): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      if (comma === -1) {
        reject(new Error("INVALID_FILE"));
        return;
      }
      resolve({ base64: result.slice(comma + 1), mime: file.type || "image/jpeg" });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function MatchCutAdCardStudio({ initialCredits }: { initialCredits: number }) {
  const [credits, setCredits] = useState(initialCredits);
  const [productName, setProductName] = useState("");
  const [priceKrw, setPriceKrw] = useState("");
  const [points, setPoints] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ base64: string; mime: string } | null>(null);
  const [selected, setSelected] = useState<string[]>(["coupang_square", "naver_square"]);
  const [cards, setCards] = useState<GeneratedAdCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /* keep specs in sync if server adds more — local constant is enough for UI */
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const run = async () => {
    setError(null);
    if (!productName.trim() || !fileMeta) {
      setError("상품명과 사진을 입력하세요.");
      return;
    }
    if (!selected.length) {
      setError("광고카드 규격을 하나 이상 선택하세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(MATCHCUT_API.adCard, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          productImageBase64: fileMeta.base64,
          productMime: fileMeta.mime,
          sellingPoints: points
            .split(/[,\n]/)
            .map((s) => s.trim())
            .filter(Boolean),
          priceKrw: priceKrw ? Number(priceKrw) : undefined,
          specIds: selected,
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setError("크레딧이 부족합니다.");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "생성 실패");
      setCards(data.cards ?? []);
      if (data.credits) setCredits(data.credits.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  };

  const cost = selected.length * CREDIT_COSTS.adCard;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">광고카드 메이커</h1>
          <p className="text-sm text-slate-500">
            쿠팡·네이버·메타·카카오용 고퀄리티 광고 소재를 만듭니다
          </p>
        </div>
        <span className="rounded-full bg-trust-100 px-3 py-1 text-sm font-semibold text-trust-800">
          {credits.toLocaleString()} 크레딧
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold">상품 사진</h2>
          <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 hover:border-trust-300">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="product" className="max-h-56 rounded-lg object-contain" />
            ) : (
              <span className="text-sm text-slate-500">클릭해서 업로드</span>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setPreview(URL.createObjectURL(f));
                setFileMeta(await fileToBase64(f));
              }}
            />
          </label>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <div>
            <label className="text-sm font-semibold">상품명</label>
            <input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none ring-trust-500 focus:ring-2"
              placeholder="예: 프리미엄 보온 텀블러 500ml"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">판매가 (선택)</label>
            <input
              type="number"
              value={priceKrw}
              onChange={(e) => setPriceKrw(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="19900"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">어필 포인트 (쉼표/줄바꿈)</label>
            <textarea
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="가벼움, 보온 12시간, 누수방지"
            />
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold">규격 선택</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {AD_CARD_SPECS.map((s) => (
            <label
              key={s.id}
              className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm ${
                selected.includes(s.id) ? "border-trust-600 bg-trust-50" : "border-slate-200"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(s.id)}
                onChange={() => toggle(s.id)}
              />
              <span>
                <span className="font-medium">{s.label}</span>
                <span className="block text-xs text-slate-500">
                  {s.width}×{s.height} · {s.purpose}
                </span>
              </span>
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="mt-4 rounded-xl bg-trust-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "고퀄리티 생성 중…" : `광고카드 생성 (${cost} 크레딧)`}
        </button>
      </section>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {cards.length > 0 && (
        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {cards.map((c) => (
            <div key={c.specId} className="rounded-2xl border bg-white p-4">
              <p className="text-sm font-semibold">{c.label}</p>
              <p className="text-xs text-slate-500">
                {c.copy.headline} · {c.copy.cta}
              </p>
              {c.imageBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/png;base64,${c.imageBase64}`}
                  alt={c.label}
                  className="mt-3 w-full rounded-xl"
                />
              ) : (
                <p className="mt-3 text-sm text-red-600">{c.error}</p>
              )}
              {c.imageBase64 && (
                <a
                  href={`data:image/png;base64,${c.imageBase64}`}
                  download={`ad-${c.specId}.png`}
                  className="mt-3 inline-block text-sm font-medium text-trust-600 hover:underline"
                >
                  PNG 다운로드
                </a>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
