"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ANGLE_PACKAGES,
  CREDIT_COSTS,
  MATCHCUT_API,
  MATCHCUT_ROUTES,
  estimateGenerateCredits,
  estimateRunCredits,
  getAnglePackage,
} from "@/lib/matchcut/constants";
import type { PricingRecommendation } from "@/lib/matchcut/pricing-calc";
import type { RegisterResult } from "@/lib/matchcut/markets/types";
import type { ListingThumbnail } from "@/lib/sourcing-detail/thumbnail-generate";
import type {
  DetailPageBundle,
  GeneratedAngle,
  MatchCandidate,
  MatchResult,
  ScrapedListing,
} from "@/lib/sourcing-detail/types";

type Phase = "input" | "pick" | "generating" | "done";

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

function angleSrc(a: GeneratedAngle): string | null {
  if (a.imageBase64) return `data:image/png;base64,${a.imageBase64}`;
  if (a.imageUrl) return a.imageUrl;
  return null;
}

function proxyListingImage(url: string): string {
  if (!url) return url;
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (url.startsWith("/")) return url;
  return `${MATCHCUT_API.imageProxy}?url=${encodeURIComponent(url)}`;
}

async function downloadZip(
  files: { filename: string; base64: string }[],
  zipName: string,
) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.filename, Uint8Array.from(atob(f.base64), (c) => c.charCodeAt(0)));
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = zipName;
  a.click();
}

export function MatchCutStudio({
  initialCredits,
}: {
  initialCredits: number;
}) {
  const [credits, setCredits] = useState(initialCredits);
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ base64: string; mime: string } | null>(null);
  const [phase, setPhase] = useState<Phase>("input");
  const [error, setError] = useState<string | null>(null);
  const [maxAngles, setMaxAngles] = useState(3);

  const [projectId, setProjectId] = useState<string | null>(null);
  const [listing, setListing] = useState<ScrapedListing | null>(null);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [selected, setSelected] = useState<MatchCandidate | null>(null);
  const [generatedAngles, setGeneratedAngles] = useState<GeneratedAngle[]>([]);
  const [thumbnails, setThumbnails] = useState<ListingThumbnail[]>([]);
  const [detailPageHtml, setDetailPageHtml] = useState("");
  const [detailBundle, setDetailBundle] = useState<DetailPageBundle | null>(null);
  const [exportPlatform, setExportPlatform] = useState<"coupang" | "smartstore" | "both">("both");
  const [exporting, setExporting] = useState(false);

  const [fixTarget, setFixTarget] = useState<GeneratedAngle | null>(null);
  const [fixInstruction, setFixInstruction] = useState(
    "원본 실사진과 디자인·로고·색·내부 디테일을 완전히 같게 고쳐주세요. 각도만 유지.",
  );
  const [fixing, setFixing] = useState(false);

  const [costKrw, setCostKrw] = useState("");
  const [fulfillmentKrw, setFulfillmentKrw] = useState("3000");
  const [targetMargin, setTargetMargin] = useState("25");
  const [priceMarket, setPriceMarket] = useState("coupang");
  const [pricing, setPricing] = useState<PricingRecommendation | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);

  const [marketChannels, setMarketChannels] = useState<string[]>(["coupang", "smartstore"]);
  const [registering, setRegistering] = useState(false);
  const [registerResults, setRegisterResults] = useState<RegisterResult[]>([]);
  const [rematching, setRematching] = useState(false);
  const [galleryUrlInput, setGalleryUrlInput] = useState("");
  const [savingListing, setSavingListing] = useState(false);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("project");
    if (!id) return;
    void (async () => {
      try {
        const res = await fetch(`${MATCHCUT_API.projects}?id=${id}`);
        const data = await res.json();
        if (!res.ok || !data.project) return;
        const p = data.project;
        setProjectId(p.id);
        setUrl(p.sourceUrl ?? "");
        setListing(p.listing ?? null);
        setMatch(p.match ?? null);
        setSelected(p.selectedCandidate ?? p.match?.bestMatch ?? null);
        setGeneratedAngles(p.generatedAngles ?? []);
        setThumbnails(p.thumbnails ?? []);
        setDetailPageHtml(p.detailPageHtml ?? "");
        setDetailBundle(p.detailBundle ?? null);
        if (p.generatedAngles?.length) setPhase("done");
        else if (p.match) setPhase("pick");
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const runMatch = async () => {
    setError(null);
    if (!url.trim() || !fileMeta) {
      setError("사진과 URL을 모두 입력하세요.");
      return;
    }

    try {
      const res = await fetch(MATCHCUT_API.match, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          referenceImageBase64: fileMeta.base64,
          referenceMime: fileMeta.mime,
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setError("크레딧이 부족합니다.");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "매칭 실패");

      setListing(data.listing);
      setMatch(data.match);
      setSelected(data.match.bestMatch);
      setProjectId(data.projectId ?? null);
      if (data.credits) setCredits(data.credits.total);
      setPhase("pick");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    }
  };

  const patchListing = (patch: Partial<ScrapedListing>) => {
    setListing((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const saveListingEdits = async (next?: ScrapedListing) => {
    if (!projectId) return;
    const payload = next ?? listing;
    if (!payload) return;
    setSavingListing(true);
    try {
      const res = await fetch(MATCHCUT_API.projects, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: projectId,
          title: payload.titleKo || payload.title,
          listing: payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "저장 실패");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSavingListing(false);
    }
  };

  const addGalleryFiles = async (files: FileList | null) => {
    if (!files?.length || !listing) return;
    const added: ScrapedListing["images"] = [];
    for (const f of Array.from(files)) {
      const meta = await fileToBase64(f);
      added.push({
        url: `data:${meta.mime};base64,${meta.base64}`,
        source: "gallery",
      });
    }
    const next = {
      ...listing,
      images: [...listing.images, ...added],
      scrapeWarning: undefined,
    };
    setListing(next);
    await saveListingEdits(next);
  };

  const addGalleryUrl = async () => {
    if (!listing) return;
    const raw = galleryUrlInput.trim();
    if (!raw) return;
    const next = {
      ...listing,
      images: [...listing.images, { url: raw, source: "gallery" as const }],
      scrapeWarning: undefined,
    };
    setListing(next);
    setGalleryUrlInput("");
    await saveListingEdits(next);
  };

  const removeGalleryImage = async (index: number) => {
    if (!listing) return;
    const next = {
      ...listing,
      images: listing.images.filter((_, i) => i !== index),
    };
    setListing(next);
    if (selected && listing.images[index]?.url === selected.imageUrl) {
      setSelected(null);
    }
    await saveListingEdits(next);
  };

  const runRematch = async () => {
    if (!projectId || !listing || !fileMeta) return;
    setRematching(true);
    setError(null);
    try {
      const res = await fetch(MATCHCUT_API.rematch, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          listing,
          referenceImageBase64: fileMeta.base64,
          referenceMime: fileMeta.mime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "재매칭 실패");
      setListing(data.listing);
      setMatch(data.match);
      setSelected(data.match.bestMatch);
    } catch (e) {
      setError(e instanceof Error ? e.message : "재매칭 실패");
    } finally {
      setRematching(false);
    }
  };

  const useReferenceAsSelected = () => {
    if (!fileMeta) return;
    const imageUrl = `data:${fileMeta.mime};base64,${fileMeta.base64}`;
    setSelected({
      imageUrl,
      score: 100,
      reason: "실사진을 매칭 기준으로 사용",
      skuLabel: "실사진",
    });
  };

  const runGenerate = async () => {
    if (!listing || !match || !selected || !fileMeta) return;
    setPhase("generating");
    setError(null);
    try {
      const res = await fetch(MATCHCUT_API.generate, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing,
          match,
          selectedCandidate: selected,
          referenceImageBase64: fileMeta.base64,
          referenceMime: fileMeta.mime,
          maxAngles,
          projectId,
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setError("크레딧이 부족합니다.");
        setPhase("pick");
        return;
      }
      if (res.status === 422) {
        setError(data.error ?? "생성 실패 — 크레딧 환불됨");
        if (data.credits) setCredits(data.credits.total);
        setPhase("pick");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "생성 실패");

      setGeneratedAngles(data.generatedAngles ?? []);
      setThumbnails(data.thumbnails ?? []);
      setDetailPageHtml(data.detailPageHtml ?? "");
      setDetailBundle(data.detailBundle ?? null);
      if (data.credits) setCredits(data.credits.total);
      if (data.needsFixCount > 0) {
        setError(
          `${data.needsFixCount}장에 이상한 부분이 있을 수 있습니다. 사진을 눌러 AI에게 고쳐달라고 하세요.`,
        );
      } else if (data.partialFailure) {
        setError("일부 각도 생성에 실패했습니다. 실패분 크레딧은 환불되었습니다.");
      }
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
      setPhase("pick");
    }
  };

  const runFix = async () => {
    if (!fixTarget || !fileMeta) return;
    const broken =
      fixTarget.imageBase64 ||
      (fixTarget.imageUrl ? fixTarget.imageUrl.split(",").pop() : null);
    if (!broken && !fixTarget.imageBase64) {
      setError("수정할 이미지가 없습니다.");
      return;
    }
    setFixing(true);
    setError(null);
    try {
      const brokenB64 = fixTarget.imageBase64
        ? fixTarget.imageBase64
        : "";
      if (!brokenB64) {
        setError("이미지 데이터가 없어 수정할 수 없습니다. 다시 생성해 주세요.");
        return;
      }
      const res = await fetch(MATCHCUT_API.fixAngle, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          angle: fixTarget.angle,
          userInstruction: fixInstruction,
          referenceImageBase64: fileMeta.base64,
          referenceMime: fileMeta.mime,
          brokenImageBase64: brokenB64,
          productDescription: detailBundle?.detailCopy.headline ?? match?.referenceDescription,
          projectId,
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setError("크레딧이 부족합니다.");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "수정 실패");
      const fixed = data.angle as GeneratedAngle;
      setGeneratedAngles((prev) => prev.map((a) => (a.angle === fixed.angle ? fixed : a)));
      if (data.credits) setCredits(data.credits.total);
      setFixTarget(null);
      if (fixed.needsFix) {
        setError("아직 완벽하지 않습니다. 지시를 더 구체적으로 적어 다시 고쳐보세요.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "수정 실패");
    } finally {
      setFixing(false);
    }
  };

  const runPricing = async () => {
    setPricingLoading(true);
    setError(null);
    try {
      const res = await fetch(MATCHCUT_API.pricing, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          costKrw: Number(costKrw),
          fulfillmentKrw: Number(fulfillmentKrw || 0),
          targetMarginRate: Number(targetMargin) / 100,
          marketId: priceMarket,
          searchQuery: detailBundle?.competitorInsight.searchQuery,
          productName: detailBundle?.productAnalysis.productNameKo,
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setError("크레딧이 부족합니다.");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "가격 분석 실패");
      setPricing(data.pricing);
      if (data.credits) setCredits(data.credits.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "가격 분석 실패");
    } finally {
      setPricingLoading(false);
    }
  };

  const runMarketRegister = async () => {
    setRegistering(true);
    setError(null);
    try {
      const imagesBase64: string[] = [];
      if (fileMeta) imagesBase64.push(fileMeta.base64);
      for (const a of generatedAngles) {
        if (a.imageBase64) imagesBase64.push(a.imageBase64);
      }
      const res = await fetch(MATCHCUT_API.marketsRegister, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channels: marketChannels,
          title:
            detailBundle?.detailCopy.headline ||
            detailBundle?.productAnalysis.productNameKo ||
            listing?.title ||
            "상품",
          salePrice: pricing?.recommendedPriceKrw || Number(costKrw) * 2 || 19900,
          detailHtml: detailPageHtml,
          imagesBase64: imagesBase64.slice(0, 8),
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setError("크레딧이 부족합니다.");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "등록 실패");
      setRegisterResults(data.results ?? []);
      if (data.credits) setCredits(data.credits.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setRegistering(false);
    }
  };

  const runExport = async () => {
    setExporting(true);
    try {
      const sources: { name: string; base64?: string; url?: string }[] = [];
      if (fileMeta) sources.push({ name: "reference", base64: fileMeta.base64 });
      if (selected?.imageUrl) sources.push({ name: "matched", url: selected.imageUrl });
      for (const t of thumbnails) {
        if (t.imageBase64) sources.push({ name: `thumb-${t.concept}`, base64: t.imageBase64 });
      }
      for (const a of generatedAngles) {
        const src = angleSrc(a);
        if (!src) continue;
        sources.push(
          src.startsWith("data:")
            ? { name: a.angle, base64: src.split(",")[1] }
            : { name: a.angle, url: src },
        );
      }
      const res = await fetch(MATCHCUT_API.export, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: exportPlatform,
          images: sources,
          detailHtml: detailPageHtml || undefined,
          asZip: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.zipBase64) {
        const bytes = Uint8Array.from(atob(data.zipBase64), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: "application/zip" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = data.filename ?? `matchcut-${exportPlatform}.zip`;
        a.click();
      } else if (data.files) {
        await downloadZip(data.files, `matchcut-${exportPlatform}.zip`);
      }
      if (projectId) {
        await fetch(MATCHCUT_API.projects, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: projectId, status: "exported" }),
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "내보내기 실패");
    } finally {
      setExporting(false);
    }
  };

  const anglePack = getAnglePackage(maxAngles);
  const estCost =
    phase === "input" ? estimateRunCredits(maxAngles) : null;
  const genCost = estimateGenerateCredits(maxAngles);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">소싱 스튜디오</h1>
          <p className="text-sm text-slate-500">실사진 + URL → 옵션 매칭 → 상세컷</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-trust-100 px-3 py-1 text-sm font-semibold text-trust-800">
            {credits.toLocaleString()} 크레딧
          </span>
          <Link
            href={MATCHCUT_ROUTES.credits}
            className="text-sm font-medium text-trust-600 hover:underline"
          >
            충전
          </Link>
        </div>
      </div>

      {(phase === "input" || phase === "pick") && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold">실제 상품 사진</h2>
            <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 hover:border-trust-300">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="ref" className="max-h-56 rounded-lg object-contain" />
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
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold">소싱 URL</h2>
            <input
              type="text"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="1688 공유 문구 붙여넣기 또는 https://detail.1688.com/offer/..."
              className="mt-3 w-full rounded-xl border px-4 py-3 text-sm outline-none ring-trust-500 focus:ring-2"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <label className="text-slate-600">상세컷</label>
              <select
                value={maxAngles}
                onChange={(e) => setMaxAngles(Number(e.target.value))}
                className="rounded-lg border px-2 py-1"
              >
                {ANGLE_PACKAGES.map((p) => (
                  <option key={p.angles} value={p.angles}>
                    {p.label}
                    {p.badge ? ` · ${p.badge}` : ""} — {p.credits}크레딧
                    {p.listCredits > p.credits ? ` (정가 ${p.listCredits})` : ""}
                  </option>
                ))}
              </select>
              {estCost && (
                <span className="text-slate-500">
                  매칭+생성 예상 {estCost} · 썸네일 3장 포함
                </span>
              )}
            </div>
            {phase === "input" && (
              <button
                type="button"
                onClick={runMatch}
                className="mt-4 w-full rounded-xl bg-trust-600 py-3 text-sm font-semibold text-white hover:bg-trust-700"
              >
                스캔 + 매칭 (20 크레딧)
              </button>
            )}
          </section>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}{" "}
          {(error.includes("크레딧이 부족") || error.includes("요금제에서 충전")) && (
            <Link href={MATCHCUT_ROUTES.credits} className="font-semibold underline">
              충전하기
            </Link>
          )}
        </p>
      )}

      {phase === "pick" && listing && (
        <section className="mt-8 space-y-6">
          {listing.scrapeWarning && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {listing.scrapeWarning}
            </p>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-900">상품 정보</h2>
              <button
                type="button"
                disabled={savingListing}
                onClick={() => void saveListingEdits()}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {savingListing ? "저장 중…" : "정보 저장"}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">가져온 내용을 확인하고 수정·추가할 수 있습니다.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs text-slate-600 sm:col-span-2">
                한국어 상품명
                <input
                  value={listing.titleKo ?? ""}
                  onChange={(e) => patchListing({ titleKo: e.target.value })}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  placeholder="예: 자동차 시트 수납 가방"
                />
              </label>
              <label className="block text-xs text-slate-600 sm:col-span-2">
                원문 제목
                <input
                  value={listing.title ?? ""}
                  onChange={(e) => patchListing({ title: e.target.value })}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs text-slate-600">
                가격
                <input
                  value={listing.priceText ?? ""}
                  onChange={(e) => patchListing({ priceText: e.target.value })}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  placeholder="¥19.9"
                />
              </label>
              <label className="block text-xs text-slate-600">
                최소주문(MOQ)
                <input
                  value={listing.moq ?? ""}
                  onChange={(e) => patchListing({ moq: e.target.value })}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs text-slate-600 sm:col-span-2">
                판매자/공장
                <input
                  value={listing.sellerName ?? ""}
                  onChange={(e) => patchListing({ sellerName: e.target.value })}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs text-slate-600 sm:col-span-2">
                설명 / 메모
                <textarea
                  value={listing.description ?? listing.notes ?? ""}
                  onChange={(e) =>
                    patchListing({ description: e.target.value, notes: e.target.value })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  placeholder="옵션, 색상, 재질 등"
                />
              </label>
            </div>
            {(listing.attributes?.length ?? 0) > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-600">속성</p>
                <ul className="mt-2 space-y-2">
                  {listing.attributes!.map((attr, i) => (
                    <li key={`${attr.name}-${i}`} className="flex gap-2">
                      <input
                        value={attr.name}
                        onChange={(e) => {
                          const attributes = [...(listing.attributes ?? [])];
                          attributes[i] = { ...attributes[i]!, name: e.target.value };
                          patchListing({ attributes });
                        }}
                        className="w-1/3 rounded-lg border px-2 py-1.5 text-xs"
                      />
                      <input
                        value={attr.value}
                        onChange={(e) => {
                          const attributes = [...(listing.attributes ?? [])];
                          attributes[i] = { ...attributes[i]!, value: e.target.value };
                          patchListing({ attributes });
                        }}
                        className="flex-1 rounded-lg border px-2 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        className="text-xs text-red-600"
                        onClick={() =>
                          patchListing({
                            attributes: (listing.attributes ?? []).filter((_, j) => j !== i),
                          })
                        }
                      >
                        삭제
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              type="button"
              className="mt-3 text-xs font-medium text-trust-700"
              onClick={() =>
                patchListing({
                  attributes: [...(listing.attributes ?? []), { name: "", value: "" }],
                })
              }
            >
              + 속성 추가
            </button>
            <p className="mt-3 break-all text-[11px] text-slate-400">{listing.url}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">상품 갤러리</h2>
            <p className="mt-1 text-sm text-slate-500">
              자동으로 가져온 사진 + 직접 추가한 사진으로 매칭합니다.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {listing.images.map((img, i) => (
                <div key={`${img.url.slice(0, 48)}-${i}`} className="relative rounded-xl border p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proxyListingImage(img.url)}
                    alt=""
                    className="aspect-square w-full rounded-lg object-contain bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => void removeGalleryImage(i)}
                    className="absolute right-2 top-2 rounded bg-white/90 px-2 py-0.5 text-[10px] font-medium text-red-600 shadow"
                  >
                    삭제
                  </button>
                </div>
              ))}
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-xs text-slate-500 hover:border-trust-300">
                + 사진 추가
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => void addGalleryFiles(e.target.files)}
                />
              </label>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={galleryUrlInput}
                onChange={(e) => setGalleryUrlInput(e.target.value)}
                placeholder="이미지 URL 붙여넣기"
                className="flex-1 rounded-xl border px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void addGalleryUrl()}
                className="rounded-xl border px-4 py-2 text-sm font-medium"
              >
                URL 추가
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={rematching || listing.images.length === 0}
                onClick={() => void runRematch()}
                className="rounded-xl bg-trust-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {rematching ? "매칭 중…" : "갤러리로 다시 매칭 (무료)"}
              </button>
              <button
                type="button"
                onClick={useReferenceAsSelected}
                className="rounded-xl border px-4 py-2.5 text-sm font-medium text-slate-700"
              >
                실사진을 기준으로 진행
              </button>
            </div>
          </div>

          {match && (
            <div>
              <h2 className="font-semibold">매칭 후보 — 직접 선택</h2>
              <p className="mt-1 text-sm text-slate-600">{match.referenceDescription}</p>
              {match.candidates.length === 0 ? (
                <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  아직 매칭 후보가 없습니다. 갤러리에 상품 사진을 추가한 뒤 「다시 매칭」을 눌러 주세요.
                  또는 「실사진을 기준으로 진행」할 수 있습니다.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {match.candidates.map((c, i) => (
                    <button
                      key={`${c.imageUrl}-${i}`}
                      type="button"
                      onClick={() => setSelected(c)}
                      className={`rounded-xl border-2 p-2 text-left ${
                        selected?.imageUrl === c.imageUrl
                          ? "border-trust-600 bg-trust-50"
                          : "border-slate-200"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proxyListingImage(c.imageUrl)}
                        alt=""
                        className="aspect-square w-full rounded-lg object-contain bg-slate-50"
                      />
                      <p className="mt-1 text-xs font-semibold text-trust-700">{c.score}%</p>
                      <p className="line-clamp-2 text-xs text-slate-600">{c.reason}</p>
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={runGenerate}
                disabled={!selected}
                className="mt-4 rounded-xl bg-trust-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                상세컷 {anglePack.label} + 썸네일 3장 ({genCost} 크레딧
                {anglePack.listCredits > anglePack.credits
                  ? ` · 정가 ${anglePack.listCredits} → ${Math.round(
                      (1 - anglePack.credits / anglePack.listCredits) * 100,
                    )}%↓`
                  : ""}
                {anglePack.badge ? ` · ${anglePack.badge}` : ""})
              </button>
            </div>
          )}
        </section>
      )}

      {phase === "generating" && (
        <div className="mt-10 text-center">
          <p className="text-trust-800 font-medium">상세컷 생성 중…</p>
          <p className="mt-1 text-sm text-slate-500">
            실사진 고정 → 상세컷 · 썸네일 3종 · 전문 카피 · 카테고리 디자인툴
          </p>
        </div>
      )}

      {phase === "done" && (
        <section className="mt-8 space-y-6">
          {detailBundle && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-slate-900">시장 분석 · 상세 카피</h2>
              <p className="mt-1 text-xs text-slate-500">
                검색어 「{detailBundle.competitorInsight.searchQuery}」 ·{" "}
                {detailBundle.competitorInsight.source === "naver_api"
                  ? "네이버 쇼핑 상위 상품 분석"
                  : "카테고리 베스트 프랙티스"}
                {detailBundle.designToolkit
                  ? ` · 디자인툴 ${detailBundle.designToolkit.label}`
                  : ""}
              </p>
              <p className="mt-3 text-sm font-medium text-trust-800">
                {detailBundle.detailCopy.headline}
              </p>
              <p className="text-sm text-slate-600">{detailBundle.detailCopy.subheadline}</p>
              {detailBundle.detailCopy.storyParagraph && (
                <p className="mt-2 text-sm text-slate-500">
                  {detailBundle.detailCopy.storyParagraph}
                </p>
              )}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase text-slate-400">상위 셀러 강점</h3>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {detailBundle.competitorInsight.commonStrengths.map((s) => (
                      <li key={s}>· {s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase text-slate-400">우리 어필 포인트</h3>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {detailBundle.competitorInsight.recommendedAppeals.map((s) => (
                      <li key={s}>· {s}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {detailBundle.competitorInsight.topProducts.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold uppercase text-slate-400">참고 상위 상품</h3>
                  <ul className="mt-2 space-y-1 text-xs text-slate-500">
                    {detailBundle.competitorInsight.topProducts.slice(0, 3).map((p) => (
                      <li key={p.link ?? p.title} className="line-clamp-1">
                        [{p.platform === "coupang" ? "쿠팡" : p.platform === "smartstore" ? "스마트스토어" : p.mallName}]{" "}
                        {p.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {thumbnails.length > 0 && (
            <div>
              <h2 className="font-semibold">마켓 썸네일 3종</h2>
              <p className="mt-1 text-xs text-slate-500">
                경쟁 툴이 잘 안 해주는 대표 썸네일 — 검색 그리드용
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {thumbnails.map((t) => (
                  <div key={t.concept} className="rounded-xl border bg-white p-2">
                    {t.imageBase64 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`data:image/png;base64,${t.imageBase64}`}
                        alt={t.label}
                        className="aspect-square w-full rounded-lg object-cover"
                      />
                    ) : (
                      <p className="p-4 text-xs text-red-500">{t.error}</p>
                    )}
                    <p className="mt-1 text-center text-xs text-slate-600">
                      {t.label} · {t.headline}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {generatedAngles.map((a) => {
              const src = angleSrc(a);
              return (
                <button
                  key={a.angle}
                  type="button"
                  onClick={() => src && setFixTarget(a)}
                  className={`rounded-xl border bg-white p-3 text-left ${
                    a.needsFix ? "border-amber-400 ring-2 ring-amber-100" : "border-slate-200"
                  }`}
                >
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={a.angle} className="rounded-lg" />
                  ) : (
                    <p className="text-red-500">{a.error ?? "생성 실패"}</p>
                  )}
                  <p className="mt-1 text-center text-xs text-slate-500">
                    {a.angle}
                    {a.qualityScore != null && (
                      <span
                        className={`ml-1 ${
                          a.qualityScore >= 88 ? "text-trust-600" : "text-amber-600"
                        }`}
                      >
                        · 원본일치 {a.qualityScore}%
                      </span>
                    )}
                  </p>
                  {src && (
                    <p className="mt-1 text-center text-xs font-medium text-trust-600">
                      {a.needsFix ? "이상함 → AI에게 고치기" : "클릭해서 AI 수정"}
                    </p>
                  )}
                  {a.issues?.[0] && (
                    <p className="mt-1 line-clamp-2 text-center text-[11px] text-amber-700">
                      {a.issues[0]}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">경쟁가 · 마진 추천</h2>
            <p className="mt-1 text-xs text-slate-500">
              상위 경쟁 상품 가격을 보고 추천 판매가·예상 마진을 계산합니다 ({CREDIT_COSTS.pricing}{" "}
              크레딧)
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              <input
                type="number"
                value={costKrw}
                onChange={(e) => setCostKrw(e.target.value)}
                placeholder="원가(원)"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={fulfillmentKrw}
                onChange={(e) => setFulfillmentKrw(e.target.value)}
                placeholder="출고비"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={targetMargin}
                onChange={(e) => setTargetMargin(e.target.value)}
                placeholder="목표마진%"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <select
                value={priceMarket}
                onChange={(e) => setPriceMarket(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <option value="coupang">쿠팡</option>
                <option value="smartstore">스마트스토어</option>
                <option value="elevenst">11번가</option>
                <option value="gmarket">G마켓</option>
              </select>
            </div>
            <button
              type="button"
              onClick={runPricing}
              disabled={pricingLoading || !costKrw}
              className="mt-3 rounded-xl bg-trust-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pricingLoading ? "분석 중…" : "추천가 계산"}
            </button>
            {pricing && (
              <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded-xl bg-trust-50 p-3">
                  <p className="text-xs text-trust-700">추천 판매가</p>
                  <p className="text-lg font-bold text-trust-900">
                    {pricing.recommendedPriceKrw.toLocaleString()}원
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">예상 순이익</p>
                  <p className="text-lg font-bold">
                    {pricing.estimatedNetKrw.toLocaleString()}원
                  </p>
                  <p className="text-xs text-slate-500">
                    마진 {(pricing.estimatedMarginRate * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">경쟁 중앙값</p>
                  <p className="text-lg font-bold">
                    {pricing.competitorMedian
                      ? `${pricing.competitorMedian.toLocaleString()}원`
                      : "데이터 없음"}
                  </p>
                </div>
                <p className="sm:col-span-3 text-xs text-slate-600">{pricing.rationale}</p>
                <p className="sm:col-span-3 text-xs text-slate-500">
                  공격 {pricing.priceBand.aggressive.toLocaleString()} · 균형{" "}
                  {pricing.priceBand.balanced.toLocaleString()} · 프리미엄{" "}
                  {pricing.priceBand.premium.toLocaleString()} · 손익분기{" "}
                  {pricing.breakEvenPriceKrw.toLocaleString()}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">마켓 자동 등록</h2>
            <p className="mt-1 text-xs text-slate-500">
              API 연결 시 바로 등록, 없으면 드래프트 JSON · 채널당 {CREDIT_COSTS.marketRegister}{" "}
              크레딧 ·{" "}
              <Link href={MATCHCUT_ROUTES.markets} className="text-trust-600 underline">
                연동 상태
              </Link>
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              {["coupang", "smartstore", "elevenst", "gmarket"].map((id) => (
                <label key={id} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={marketChannels.includes(id)}
                    onChange={() =>
                      setMarketChannels((prev) =>
                        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                      )
                    }
                  />
                  {id}
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={runMarketRegister}
              disabled={registering || !marketChannels.length}
              className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {registering ? "등록 중…" : "선택 마켓에 등록 / 드래프트"}
            </button>
            {registerResults.length > 0 && (
              <ul className="mt-3 space-y-2 text-sm">
                {registerResults.map((r) => (
                  <li key={r.channel} className="rounded-lg bg-slate-50 px-3 py-2">
                    <span className="font-medium">{r.channel}</span> · {r.status} — {r.message}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={exportPlatform}
              onChange={(e) => setExportPlatform(e.target.value as typeof exportPlatform)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="both">쿠팡+스마트스토어</option>
              <option value="coupang">쿠팡</option>
              <option value="smartstore">스마트스토어</option>
            </select>
            <button
              type="button"
              onClick={runExport}
              disabled={exporting}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white"
            >
              {exporting ? "ZIP 생성 중…" : "마켓 업로드 ZIP (가이드 포함)"}
            </button>
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([detailPageHtml], { type: "text/html;charset=utf-8" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "detail.html";
                a.click();
              }}
              className="rounded-xl border px-5 py-2 text-sm"
            >
              HTML
            </button>
            <Link
              href={MATCHCUT_ROUTES.adCard}
              className="rounded-xl border border-trust-200 bg-trust-50 px-5 py-2 text-sm font-medium text-trust-800"
            >
              광고카드 만들기
            </Link>
            <Link href={MATCHCUT_ROUTES.projects} className="rounded-xl border px-5 py-2 text-sm">
              프로젝트 목록
            </Link>
          </div>
        </section>
      )}

      {fixTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="font-semibold text-slate-900">AI에게 고치기 · {fixTarget.angle}</h3>
            <p className="mt-1 text-xs text-slate-500">
              이상한 부분 / 바꾸고 싶은 점을 알려주세요. 실사진 디자인은 유지합니다. (
              {CREDIT_COSTS.fixAngle} 크레딧)
            </p>
            {angleSrc(fixTarget) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={angleSrc(fixTarget)!}
                alt="fix"
                className="mt-3 max-h-48 w-full rounded-xl object-contain"
              />
            )}
            {fixTarget.issues && fixTarget.issues.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs text-amber-700">
                {fixTarget.issues.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            )}
            <textarea
              value={fixInstruction}
              onChange={(e) => setFixInstruction(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-xl border px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFixTarget(null)}
                className="rounded-xl border px-4 py-2 text-sm"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={runFix}
                disabled={fixing}
                className="rounded-xl bg-trust-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {fixing ? "고치는 중…" : "AI에게 고쳐달라고 하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
