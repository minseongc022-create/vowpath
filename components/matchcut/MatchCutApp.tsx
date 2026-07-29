"use client";

import { useCallback, useMemo, useState } from "react";
import { MATCHCUT, type MarketPlatform } from "@/lib/matchcut/constants";
import type {
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
  files: { filename: string; base64: string; mime: string }[],
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

export function MatchCutApp() {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ base64: string; mime: string } | null>(null);
  const [phase, setPhase] = useState<Phase>("input");
  const [error, setError] = useState<string | null>(null);
  const [maxAngles, setMaxAngles] = useState(3);

  const [listing, setListing] = useState<ScrapedListing | null>(null);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [selected, setSelected] = useState<MatchCandidate | null>(null);
  const [generatedAngles, setGeneratedAngles] = useState<GeneratedAngle[]>([]);
  const [detailPageHtml, setDetailPageHtml] = useState<string>("");
  const [exportPlatform, setExportPlatform] = useState<MarketPlatform>("both");
  const [exporting, setExporting] = useState(false);

  const candidates = useMemo(() => match?.candidates ?? [], [match]);

  const onFile = useCallback(async (file: File | null) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setFileMeta(await fileToBase64(file));
  }, []);

  const runMatch = async () => {
    setError(null);
    if (!url.trim()) {
      setError("상품 URL을 입력하세요.");
      return;
    }
    if (!fileMeta) {
      setError("실제로 받은 상품 사진을 업로드하세요.");
      return;
    }

    setPhase("input");
    try {
      const res = await fetch(MATCHCUT.api.match, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          referenceImageBase64: fileMeta.base64,
          referenceMime: fileMeta.mime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "매칭 실패");

      setListing(data.listing as ScrapedListing);
      setMatch(data.match as MatchResult);
      const best = (data.match as MatchResult).bestMatch;
      setSelected(best);
      setGeneratedAngles([]);
      setDetailPageHtml("");
      setPhase("pick");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    }
  };

  const runGenerate = async () => {
    if (!listing || !match || !selected || !fileMeta) return;
    setError(null);
    setPhase("generating");
    try {
      const res = await fetch(MATCHCUT.api.generate, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing,
          match,
          selectedCandidate: selected,
          referenceImageBase64: fileMeta.base64,
          referenceMime: fileMeta.mime,
          maxAngles,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "생성 실패");

      setGeneratedAngles(data.generatedAngles ?? []);
      setDetailPageHtml(data.detailPageHtml ?? "");
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
      setPhase("pick");
    }
  };

  const downloadHtml = () => {
    if (!detailPageHtml) return;
    const blob = new Blob([detailPageHtml], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "matchcut-detail.html";
    a.click();
  };

  const runExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const sources: { name: string; base64?: string; url?: string }[] = [];

      if (preview && fileMeta) {
        sources.push({ name: "reference", base64: fileMeta.base64 });
      }
      if (selected?.imageUrl) {
        sources.push({ name: "matched-listing", url: selected.imageUrl });
      }
      for (const a of generatedAngles) {
        const src = angleSrc(a);
        if (!src) continue;
        if (src.startsWith("data:")) {
          sources.push({ name: a.angle, base64: src.split(",")[1] });
        } else {
          sources.push({ name: a.angle, url: src });
        }
      }

      if (sources.length === 0) {
        throw new Error("내보낼 이미지가 없습니다.");
      }

      const res = await fetch(MATCHCUT.api.export, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: exportPlatform, images: sources }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "내보내기 실패");

      await downloadZip(
        data.files.map((f: { filename: string; base64: string; mime: string }) => ({
          filename: f.filename,
          base64: f.base64,
          mime: f.mime,
        })),
        `matchcut-${exportPlatform}.zip`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "내보내기 오류");
    } finally {
      setExporting(false);
    }
  };

  const reset = () => {
    setPhase("input");
    setListing(null);
    setMatch(null);
    setSelected(null);
    setGeneratedAngles([]);
    setDetailPageHtml("");
    setError(null);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-lg font-bold text-white shadow-lg shadow-indigo-600/30">
            M
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-600">
              {MATCHCUT.nameEn}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {MATCHCUT.name}
            </h1>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-slate-600 leading-relaxed">{MATCHCUT.tagline}</p>
        <p className="mt-2 text-sm text-slate-500">{MATCHCUT.description}</p>
      </header>

      {/* Progress */}
      <ol className="mb-8 flex flex-wrap gap-2 text-xs font-medium">
        {[
          { id: "input", label: "1. 사진 + URL" },
          { id: "pick", label: "2. 옵션 확인" },
          { id: "generating", label: "3. 상세컷 생성" },
          { id: "done", label: "4. 마켓 내보내기" },
        ].map((s) => {
          const active =
            phase === s.id ||
            (phase === "done" && s.id === "done") ||
            (phase === "pick" && s.id === "input") ||
            (phase === "generating" && (s.id === "input" || s.id === "pick"));
          const done =
            (phase === "pick" || phase === "generating" || phase === "done") &&
            s.id === "input";
          const done2 = (phase === "generating" || phase === "done") && s.id === "pick";
          const done3 = phase === "done" && s.id === "generating";
          const isDone = done || done2 || done3;
          return (
            <li
              key={s.id}
              className={`rounded-full px-3 py-1.5 ${
                phase === s.id
                  ? "bg-violet-600 text-white"
                  : isDone
                    ? "bg-violet-100 text-violet-800"
                    : active
                      ? "bg-slate-200 text-slate-700"
                      : "bg-slate-100 text-slate-400"
              }`}
            >
              {s.label}
            </li>
          );
        })}
      </ol>

      {(phase === "input" || phase === "pick") && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800">실제 받은 상품 사진</h2>
            <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-10 transition hover:border-violet-300 hover:bg-violet-50/40">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="reference" className="max-h-64 rounded-lg object-contain" />
              ) : (
                <span className="text-sm text-slate-500">클릭해서 사진 업로드</span>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800">1688 · 타오바오 URL</h2>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://detail.1688.com/offer/..."
              className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2"
            />
            <div className="mt-4 flex items-center gap-3">
              <label className="text-sm text-slate-600">생성 각도</label>
              <select
                value={maxAngles}
                onChange={(e) => setMaxAngles(Number(e.target.value))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value={1}>1장</option>
                <option value={3}>3장</option>
                <option value={5}>5장</option>
              </select>
            </div>
            {phase === "input" && (
              <button
                type="button"
                onClick={runMatch}
                className="mt-5 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 hover:bg-violet-700"
              >
                URL 스캔 + 옵션 매칭
              </button>
            )}
          </section>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {phase === "pick" && match && listing && (
        <section className="mt-8 space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">AI 매칭 결과 — 직접 고르세요</h2>
            <p className="mt-2 text-sm text-slate-600">{match.referenceDescription}</p>
            <p className="mt-1 text-xs text-slate-500">
              {listing.title ?? "—"} · 이미지 {listing.images.length}장 · SKU{" "}
              {listing.skuOptions.length}개 · {listing.platform}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map((c, i) => {
              const isSelected = selected?.imageUrl === c.imageUrl;
              return (
                <button
                  key={`${c.imageUrl}-${i}`}
                  type="button"
                  onClick={() => setSelected(c)}
                  className={`rounded-xl border-2 p-3 text-left transition ${
                    isSelected
                      ? "border-violet-600 bg-violet-50 ring-2 ring-violet-600/20"
                      : "border-slate-200 bg-white hover:border-violet-300"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.imageUrl}
                    alt={`candidate-${i}`}
                    className="aspect-square w-full rounded-lg object-contain bg-slate-50"
                  />
                  <p className="mt-2 text-xs font-semibold text-violet-700">신뢰도 {c.score}%</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">{c.reason}</p>
                  {c.skuLabel && (
                    <p className="mt-1 text-xs text-slate-500">옵션: {c.skuLabel}</p>
                  )}
                  {isSelected && (
                    <p className="mt-2 text-xs font-bold text-violet-600">✓ 선택됨</p>
                  )}
                </button>
              );
            })}
          </div>

          {candidates.length === 0 && (
            <p className="text-sm text-amber-700">
              후보를 찾지 못했습니다. URL을 확인하거나 다른 링크를 시도하세요.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={runGenerate}
              disabled={!selected}
              className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              선택한 옵션으로 상세컷 생성
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-medium hover:bg-slate-50"
            >
              처음부터
            </button>
          </div>
        </section>
      )}

      {phase === "generating" && (
        <div className="mt-10 rounded-2xl border border-violet-200 bg-violet-50 p-8 text-center">
          <p className="text-lg font-semibold text-violet-900">새 각도 상세컷 생성 중…</p>
          <p className="mt-2 text-sm text-violet-700">30초~2분 정도 걸릴 수 있습니다.</p>
        </div>
      )}

      {phase === "done" && (
        <section className="mt-8 space-y-6">
          {selected && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold">선택한 옵션</h2>
              <div className="mt-3 flex gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.imageUrl}
                  alt="selected"
                  className="h-24 w-24 rounded-lg border object-contain"
                />
                <div className="text-sm text-slate-600">
                  <p>신뢰도 {selected.score}%</p>
                  <p className="mt-1">{selected.reason}</p>
                </div>
              </div>
            </div>
          )}

          {generatedAngles.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold">생성된 상세컷</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {generatedAngles.map((a) => {
                  const src = angleSrc(a);
                  return (
                    <div key={a.angle} className="rounded-xl border border-slate-100 p-3">
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt={a.angle} className="rounded-lg" />
                      ) : (
                        <p className="text-sm text-red-500">{a.error ?? "생성 실패"}</p>
                      )}
                      <p className="mt-2 text-center text-xs text-slate-500">{a.angle}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">쿠팡 · 스마트스토어 내보내기</h2>
            <p className="mt-2 text-sm text-slate-600">
              대표 1000×1000 · 상세 780~1000px JPEG로 리사이즈해서 ZIP 다운로드합니다.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <select
                value={exportPlatform}
                onChange={(e) => setExportPlatform(e.target.value as MarketPlatform)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="both">쿠팡 + 스마트스토어</option>
                <option value="coupang">쿠팡만</option>
                <option value="smartstore">스마트스토어만</option>
              </select>
              <button
                type="button"
                onClick={runExport}
                disabled={exporting}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {exporting ? "ZIP 만드는 중…" : "마켓 규격 ZIP 다운로드"}
              </button>
              <button
                type="button"
                onClick={downloadHtml}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium hover:bg-slate-50"
              >
                HTML 상세페이지
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium hover:bg-slate-50"
              >
                새 상품
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
