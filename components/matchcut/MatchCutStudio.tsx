"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MATCHCUT_API, MATCHCUT_ROUTES, estimateRunCredits } from "@/lib/matchcut/constants";
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
  const [detailPageHtml, setDetailPageHtml] = useState("");
  const [detailBundle, setDetailBundle] = useState<DetailPageBundle | null>(null);
  const [exportPlatform, setExportPlatform] = useState<"coupang" | "smartstore" | "both">("both");
  const [exporting, setExporting] = useState(false);

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
      setDetailPageHtml(data.detailPageHtml ?? "");
      setDetailBundle(data.detailBundle ?? null);
      if (data.credits) setCredits(data.credits.total);
      if (data.partialFailure) {
        setError("일부 각도 생성에 실패했습니다. 실패분 크레딧은 환불되었습니다.");
      }
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
      setPhase("pick");
    }
  };

  const runExport = async () => {
    setExporting(true);
    try {
      const sources: { name: string; base64?: string; url?: string }[] = [];
      if (fileMeta) sources.push({ name: "reference", base64: fileMeta.base64 });
      if (selected?.imageUrl) sources.push({ name: "matched", url: selected.imageUrl });
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

  const estCost = phase === "input" ? estimateRunCredits(maxAngles) : null;

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
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://detail.1688.com/offer/..."
              className="mt-3 w-full rounded-xl border px-4 py-3 text-sm outline-none ring-trust-500 focus:ring-2"
            />
            <div className="mt-3 flex items-center gap-2 text-sm">
              <label>각도</label>
              <select
                value={maxAngles}
                onChange={(e) => setMaxAngles(Number(e.target.value))}
                className="rounded-lg border px-2 py-1"
              >
                <option value={1}>1장</option>
                <option value={3}>3장</option>
                <option value={5}>5장</option>
              </select>
              {estCost && (
                <span className="text-slate-500">예상 {estCost} 크레딧/건</span>
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
          {error.includes("크레딧") && (
            <Link href={MATCHCUT_ROUTES.credits} className="font-semibold underline">
              충전하기
            </Link>
          )}
        </p>
      )}

      {phase === "pick" && match && (
        <section className="mt-8">
          <h2 className="font-semibold">매칭 후보 — 직접 선택</h2>
          <p className="mt-1 text-sm text-slate-600">{match.referenceDescription}</p>
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
                <img src={c.imageUrl} alt="" className="aspect-square w-full rounded-lg object-contain" />
                <p className="mt-1 text-xs font-semibold text-trust-700">{c.score}%</p>
                <p className="line-clamp-2 text-xs text-slate-600">{c.reason}</p>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={runGenerate}
            disabled={!selected}
            className="mt-4 rounded-xl bg-trust-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            상세컷 생성 ({maxAngles * 8} 크레딧)
          </button>
        </section>
      )}

      {phase === "generating" && (
        <div className="mt-10 text-center">
          <p className="text-trust-800 font-medium">상세컷 생성 중…</p>
          <p className="mt-1 text-sm text-slate-500">
            실사진 디자인·디테일 고정 → 각도만 변경 → 원본일치 검증
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
              </p>
              <p className="mt-3 text-sm font-medium text-trust-800">
                {detailBundle.detailCopy.headline}
              </p>
              <p className="text-sm text-slate-600">{detailBundle.detailCopy.subheadline}</p>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {generatedAngles.map((a) => {
              const src = angleSrc(a);
              return (
                <div key={a.angle} className="rounded-xl border bg-white p-3">
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
                </div>
              );
            })}
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
            <Link href={MATCHCUT_ROUTES.projects} className="rounded-xl border px-5 py-2 text-sm">
              프로젝트 목록
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
