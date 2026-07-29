"use client";

import { useCallback, useState } from "react";
import type { PipelineResult } from "@/lib/sourcing-detail/types";

type Step = "idle" | "scanning" | "matching" | "generating" | "done" | "error";

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
      resolve({
        base64: result.slice(comma + 1),
        mime: file.type || "image/jpeg",
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function SourcingTool() {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ base64: string; mime: string } | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [maxAngles, setMaxAngles] = useState(3);

  const onFile = useCallback(async (file: File | null) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    const meta = await fileToBase64(file);
    setFileMeta(meta);
  }, []);

  const run = async () => {
    setError(null);
    setResult(null);
    if (!url.trim()) {
      setError("상품 URL을 입력하세요.");
      setStep("error");
      return;
    }
    if (!fileMeta) {
      setError("실제로 받은 상품 사진을 업로드하세요.");
      setStep("error");
      return;
    }

    setStep("scanning");
    try {
      setStep("matching");
      const res = await fetch("/api/sourcing/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          referenceImageBase64: fileMeta.base64,
          referenceMime: fileMeta.mime,
          generateAngles: true,
          maxAngles,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "요청 실패");

      setStep("generating");
      setResult(data.result as PipelineResult);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
      setStep("error");
    }
  };

  const downloadHtml = () => {
    if (!result) return;
    const blob = new Blob([result.detailPageHtml], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "detail-page.html";
    a.click();
  };

  const stepLabel: Record<Step, string> = {
    idle: "대기",
    scanning: "URL 스캔 중…",
    matching: "실사진 ↔ 목록 이미지 매칭…",
    generating: "새 각도 이미지 생성…",
    done: "완료",
    error: "오류",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          Import seller tool
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          실사진 + URL → 정확한 옵션 매칭 + 새 상세컷
        </h1>
        <p className="mt-3 text-slate-600 leading-relaxed">
          1688·타오바오 상세페이지는 옵션 사진이 섞여 있는 경우가 많습니다. 실제로 받은 상품
          사진 한 장과 URL을 넣으면 목록을 스캔해서 같은 SKU를 찾고, 각도가 다른 새 상품
          사진을 생성합니다.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">1. 실제 상품 사진</h2>
          <label
            className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-10 transition hover:border-indigo-300 hover:bg-indigo-50/40"
          >
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
          <h2 className="text-sm font-semibold text-slate-800">2. 소싱 URL</h2>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://detail.1688.com/offer/..."
            className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ring-indigo-500 focus:ring-2"
          />
          <div className="mt-4 flex items-center gap-3">
            <label className="text-sm text-slate-600">생성 각도 수</label>
            <select
              value={maxAngles}
              onChange={(e) => setMaxAngles(Number(e.target.value))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value={1}>1장 (빠름)</option>
              <option value={3}>3장</option>
              <option value={5}>5장</option>
            </select>
          </div>
          <button
            type="button"
            onClick={run}
            disabled={step === "scanning" || step === "matching" || step === "generating"}
            className="mt-5 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-60"
          >
            분석 + 상세컷 생성
          </button>
          <p className="mt-3 text-xs text-slate-500">상태: {stepLabel[step]}</p>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </section>
      </div>

      {result && (
        <section className="mt-10 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">매칭 결과</h2>
            <p className="mt-2 text-sm text-slate-600">{result.match.referenceDescription}</p>
            {result.match.bestMatch && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-slate-500">목록에서 찾은 이미지</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.match.bestMatch.imageUrl}
                    alt="matched"
                    className="mt-2 rounded-lg border border-slate-100"
                  />
                  <p className="mt-2 text-xs text-indigo-600">
                    신뢰도 {result.match.bestMatch.score}% — {result.match.bestMatch.reason}
                  </p>
                  {result.match.bestMatch.skuLabel && (
                    <p className="text-xs text-slate-500">옵션: {result.match.bestMatch.skuLabel}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">스캔 요약</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    <li>플랫폼: {result.listing.platform}</li>
                    <li>제목: {result.listing.title ?? "—"}</li>
                    <li>이미지 {result.listing.images.length}장 · SKU {result.listing.skuOptions.length}개</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {result.generatedAngles.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold text-slate-900">생성된 새 각도</h2>
                <button
                  type="button"
                  onClick={downloadHtml}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  HTML 상세페이지 다운로드
                </button>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {result.generatedAngles.map((a) => {
                  const src = a.imageBase64
                    ? `data:image/png;base64,${a.imageBase64}`
                    : a.imageUrl;
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
        </section>
      )}
    </div>
  );
}
