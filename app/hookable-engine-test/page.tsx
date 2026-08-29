"use client";

import { useState } from "react";
import type { HookableGenerationResult } from "@/hookable-engine";

const SAMPLE_IMAGES = [
  "https://picsum.photos/seed/hookable1/800/800",
  "https://picsum.photos/seed/hookable2/800/800",
  "https://picsum.photos/seed/hookable3/800/800",
];

export default function HookableEngineTestPage() {
  const [name, setName] = useState("무선 이어폰 프로");
  const [category, setCategory] = useState("이어폰");
  const [priceKrw, setPriceKrw] = useState("39000");
  const [features, setFeatures] = useState("노이즈캔슬링\n24시간 배터리\nIPX7 방수");
  const [imageUrls, setImageUrls] = useState(SAMPLE_IMAGES.join("\n"));
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HookableGenerationResult | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/hookable-engine-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category: category || undefined,
          priceKrw: priceKrw ? Number(priceKrw) : undefined,
          features: features.split("\n").map((f) => f.trim()).filter(Boolean),
          imageUrls: imageUrls.split("\n").map((u) => u.trim()).filter(Boolean),
          description: description || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "generation failed");
      setResult(json);
    } catch (e: any) {
      setError(e?.message ?? "generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-8 text-sm">
      <header>
        <h1 className="text-xl font-bold">hookable-engine 검증 페이지</h1>
        <p className="text-neutral-500 mt-1">
          toss-shop과 완전히 분리된 <code>/hookable-engine</code> 모듈을 직접 호출해 파이프라인
          각 단계(기획 → 생성 → 내보내기) 결과를 확인합니다.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-lg p-4">
        <div className="space-y-3">
          <Field label="상품명">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="카테고리">
            <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} />
          </Field>
          <Field label="가격(원)">
            <input className="input" type="number" value={priceKrw} onChange={(e) => setPriceKrw(e.target.value)} />
          </Field>
          <Field label="설명(선택)">
            <textarea className="input h-20" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
        <div className="space-y-3">
          <Field label="특징 (줄바꿈으로 구분)">
            <textarea className="input h-24" value={features} onChange={(e) => setFeatures(e.target.value)} />
          </Field>
          <Field label="이미지 URL (줄바꿈으로 구분)">
            <textarea className="input h-24" value={imageUrls} onChange={(e) => setImageUrls(e.target.value)} />
          </Field>
        </div>
      </section>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="rounded-md bg-indigo-600 text-white px-4 py-2 font-semibold disabled:opacity-50"
      >
        {loading ? "생성 중..." : "생성 실행"}
      </button>

      {error && <p className="text-red-600">에러: {error}</p>}

      {result && (
        <div className="space-y-8">
          <Meta result={result} />
          <Stage title="1. 기획 — 시장 분석 (market-analysis.ts)">
            <pre className="pre">{JSON.stringify(result.marketAnalysis, null, 2)}</pre>
          </Stage>
          <Stage title="2. 기획 — 섹션 계획 (section-planner.ts)">
            <pre className="pre">{JSON.stringify(result.sectionPlan, null, 2)}</pre>
          </Stage>
          <Stage title="3. 생성 — 섹션 카피 (copywriter.ts)">
            <pre className="pre">{JSON.stringify(result.copy, null, 2)}</pre>
          </Stage>
          <Stage title={`4. 생성 — 코드 객체 (layout-objects.ts) — ${result.document.objects.length}개`}>
            <pre className="pre max-h-64 overflow-auto">{JSON.stringify(result.document.objects, null, 2)}</pre>
          </Stage>
          <Stage title="5. 생성 — GIF (gif-generator.ts)">
            {result.gif ? (
              <div className="space-y-2">
                <img src={result.gif.dataUrl} alt="generated gif" className="border rounded-md" width={result.gif.width} height={result.gif.height} />
                <p className="text-neutral-500">
                  {result.gif.frameCount}프레임 · {result.gif.width}x{result.gif.height} · {(result.gif.bytes / 1024).toFixed(1)}KB
                </p>
              </div>
            ) : (
              <p className="text-neutral-500">이미지가 없거나 생성에 실패해 GIF가 만들어지지 않았습니다.</p>
            )}
          </Stage>
          <Stage title="6. 내보내기 — 최종 HTML (html-renderer.ts)">
            <iframe title="preview" srcDoc={result.html} className="w-full h-[600px] border rounded-md bg-white" />
          </Stage>
        </div>
      )}

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #d4d4d8;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 13px;
        }
        .pre {
          background: #0b0d12;
          color: #d7dae0;
          padding: 12px;
          border-radius: 8px;
          font-size: 12px;
          overflow: auto;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-neutral-600">{label}</span>
      {children}
    </label>
  );
}

function Stage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Meta({ result }: { result: HookableGenerationResult }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-neutral-500 border rounded-md p-3">
      <span>engine v{result.meta.version}</span>
      <span>{result.meta.durationMs}ms</span>
      <span>AI 사용: {result.meta.aiUsed ? "예 (OPENAI_API_KEY)" : "아니오 (휴리스틱 폴백)"}</span>
      <span>{result.meta.generatedAt}</span>
    </div>
  );
}
