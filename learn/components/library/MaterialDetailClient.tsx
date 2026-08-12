"use client";

import { useCallback, useEffect, useState } from "react";
import type { MaterialRecord } from "@/learn/types/material";
import { KeySummaryPanel } from "@/learn/components/learn/KeySummaryPanel";
import { MindmapDashboard } from "@/learn/components/mindmap/MindmapDashboard";
import { Button } from "@/learn/components/ui/Button";
import Link from "next/link";

export function MaterialDetailClient({
  initial,
}: {
  initial: MaterialRecord;
}) {
  const [material, setMaterial] = useState(initial);
  const [appendText, setAppendText] = useState("");
  const [appending, setAppending] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "script" | "mindmap">("summary");

  const poll = useCallback(async () => {
    const res = await fetch(`/learn/api/library/${material.id}`);
    if (res.ok) {
      const data = (await res.json()) as MaterialRecord;
      setMaterial(data);
    }
  }, [material.id]);

  useEffect(() => {
    if (["READY", "FAILED"].includes(material.status)) return;
    const t = setInterval(() => void poll(), 2500);
    return () => clearInterval(t);
  }, [material.status, poll]);

  async function handleAppend() {
    if (!appendText.trim()) return;
    setAppending(true);
    try {
      const res = await fetch(`/learn/api/library/${material.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "append", text: appendText }),
      });
      if (res.ok) {
        setMaterial((await res.json()) as MaterialRecord);
        setAppendText("");
      }
    } finally {
      setAppending(false);
    }
  }

  return (
    <div className="learn-animate-in">
      <header className="mb-6">
        <Link
          href="/learn/library"
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-learn-ink-muted hover:text-learn-primary"
        >
          ← 내 저장소
        </Link>
        <h1 className="text-2xl font-bold text-learn-ink">{material.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2 items-center">
          {material.sourceLabel && (
            <span className="rounded-full bg-learn-muted px-3 py-1 text-xs font-medium text-learn-ink-muted">
              {material.sourceLabel}
            </span>
          )}
          {material.sourceUrl && (
            <a
              href={material.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-learn-muted px-3 py-1 text-xs font-medium text-learn-primary"
            >
              원본 링크 ↗
            </a>
          )}
          <Link
            href={`/learn/library/${material.id}/mindmap`}
            className="rounded-full bg-learn-primary/10 px-3 py-1 text-xs font-semibold text-learn-primary"
          >
            마인드맵 대시보드 →
          </Link>
        </div>
      </header>

      {material.status === "FAILED" && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {material.errorMessage ?? "처리에 실패했습니다."}
        </div>
      )}

      {!["READY", "FAILED"].includes(material.status) && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-learn-primary/20 bg-blue-50/50 p-4">
          <span className="learn-live-dot h-2 w-2 rounded-full bg-learn-primary" />
          <p className="text-sm font-medium text-learn-ink">
            AI가 자료를 소화하는 중… ({material.status})
          </p>
        </div>
      )}

      <div className="mb-4 flex gap-1 rounded-xl bg-learn-muted p-1">
        {(
          [
            { id: "summary" as const, label: "핵심 요약" },
            { id: "script" as const, label: "전체 스크립트" },
            { id: "mindmap" as const, label: "마인드맵" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              activeTab === t.id
                ? "bg-learn-surface text-learn-primary shadow-learn-sm"
                : "text-learn-ink-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "summary" && material.analysis && (
        <section>
          <KeySummaryPanel
            summary={material.analysis.summary}
            sections={material.analysis.sections ?? []}
            keywords={material.analysis.keywords}
          />
        </section>
      )}

      {activeTab === "script" && (
        <section className="rounded-2xl border border-learn-border bg-learn-surface p-5">
          <h2 className="mb-3 text-sm font-bold text-learn-ink">
            완벽 스크립트
            {material.chunks && (
              <span className="ml-2 text-xs font-normal text-learn-ink-subtle">
                {material.chunks.length}개 청크 병합
              </span>
            )}
          </h2>
          <pre className="learn-scroll max-h-[60dvh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-learn-ink-muted">
            {material.fullTranscript ?? "스크립트 생성 중…"}
          </pre>
        </section>
      )}

      {activeTab === "mindmap" && (
        <section className="overflow-hidden rounded-2xl border border-learn-border bg-learn-surface min-h-[480px]">
          <MindmapDashboard material={material} />
        </section>
      )}

      {/* Append external notes — competitive differentiator */}
      <section className="mt-8 rounded-2xl border border-learn-border bg-learn-muted/30 p-5">
        <h2 className="mb-1 text-sm font-bold text-learn-ink">외부 자료 추가 결합</h2>
        <p className="mb-3 text-xs text-learn-ink-muted">
          유료 사이트에서 추가로 복사한 텍스트나 필기를 붙이면 기존 자료와 즉시 통합·재분석됩니다.
        </p>
        <textarea
          value={appendText}
          onChange={(e) => setAppendText(e.target.value)}
          placeholder="추가 텍스트 붙여넣기…"
          rows={3}
          className="mb-3 w-full rounded-xl border border-learn-border bg-learn-surface p-3 text-sm outline-none focus:border-learn-primary/50"
        />
        <Button
          variant="secondary"
          disabled={appending || !appendText.trim()}
          onClick={() => void handleAppend()}
        >
          {appending ? "통합 분석 중…" : "저장소에 결합"}
        </Button>
      </section>
    </div>
  );
}
