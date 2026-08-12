"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/learn/components/ui/Button";
import type { MaterialType } from "@/learn/types/material";

const SOURCE_PRESETS = [
  "메가스터디",
  "EBSi",
  "클래스101",
  "인프런",
  "유데미",
  "내 필기",
  "기타",
];

type Tab = "youtube" | "text" | "pdf";

export function LibraryUploadForm() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("youtube");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [pastedTranscript, setPastedTranscript] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);

    try {
      let res: Response;

      if (tab === "pdf" && pdfFile) {
        const form = new FormData();
        form.append("file", pdfFile);
        form.append("type", "PDF");
        if (textTitle) form.append("title", textTitle);
        if (sourceLabel) form.append("sourceLabel", sourceLabel);
        res = await fetch("/learn/api/library", { method: "POST", body: form });
      } else if (tab === "youtube") {
        res = await fetch("/learn/api/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "YOUTUBE" as MaterialType,
            sourceUrl: youtubeUrl,
            pastedTranscript: pastedTranscript || undefined,
            sourceLabel: sourceLabel || undefined,
            async: true,
          }),
        });
      } else {
        if (!textContent.trim()) throw new Error("텍스트를 입력해 주세요.");
        res = await fetch("/learn/api/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "NOTE" as MaterialType,
            title: textTitle || "외부 강의 노트",
            text: textContent,
            sourceLabel: sourceLabel || undefined,
            async: true,
          }),
        });
      }

      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "업로드 실패");

      if (data.id) {
        router.push(`/learn/study/${data.id}`);
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-learn-border bg-learn-surface p-4 md:p-6 shadow-learn-sm">
      <h2 className="mb-1 text-lg font-bold text-learn-ink">자료 추가</h2>
      <p className="mb-4 text-sm text-learn-ink-muted">
        강의 링크, PDF, 외부 유료 강의 텍스트 — AI가 즉시 소화합니다
      </p>

      <div className="mb-4 flex gap-1 rounded-xl bg-learn-muted p-1">
        {(
          [
            { id: "youtube" as Tab, label: "강의 링크" },
            { id: "text" as Tab, label: "텍스트/필기" },
            { id: "pdf" as Tab, label: "PDF" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
              tab === t.id
                ? "bg-learn-surface text-learn-primary shadow-learn-sm"
                : "text-learn-ink-muted hover:text-learn-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-medium text-learn-ink-muted">
          출처 (선택)
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {SOURCE_PRESETS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSourceLabel(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                sourceLabel === s
                  ? "bg-learn-primary text-white"
                  : "bg-learn-muted text-learn-ink-muted hover:text-learn-ink"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {tab === "youtube" && (
        <div className="space-y-3">
          <input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="강의 링크 붙여넣기"
            className="h-12 w-full rounded-xl border border-learn-border px-4 text-sm outline-none focus:border-learn-primary/50"
          />
          <textarea
            value={pastedTranscript}
            onChange={(e) => setPastedTranscript(e.target.value)}
            placeholder="자막이 없을 때: 유료 강의 스크립트를 여기에 붙여넣기 (선택)"
            rows={3}
            className="w-full rounded-xl border border-learn-border p-3 text-sm outline-none focus:border-learn-primary/50"
          />
        </div>
      )}

      {tab === "text" && (
        <div className="space-y-3">
          <input
            value={textTitle}
            onChange={(e) => setTextTitle(e.target.value)}
            placeholder="제목"
            className="h-11 w-full rounded-xl border border-learn-border px-4 text-sm outline-none focus:border-learn-primary/50"
          />
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="외부 유료 사이트에서 복사한 텍스트, 또는 본인 필기를 붙여넣으세요"
            rows={6}
            className="w-full rounded-xl border border-learn-border p-3 text-sm leading-relaxed outline-none focus:border-learn-primary/50"
          />
        </div>
      )}

      {tab === "pdf" && (
        <div className="space-y-3">
          <input
            value={textTitle}
            onChange={(e) => setTextTitle(e.target.value)}
            placeholder="제목 (선택)"
            className="h-11 w-full rounded-xl border border-learn-border px-4 text-sm outline-none focus:border-learn-primary/50"
          />
          <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-learn-border bg-learn-muted/50 transition-colors hover:border-learn-primary/40">
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            />
            <span className="text-sm font-medium text-learn-ink">
              {pdfFile ? pdfFile.name : "PDF 파일 선택"}
            </span>
            <span className="mt-1 text-xs text-learn-ink-subtle">최대 20MB 권장</span>
          </label>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}

      <Button
        size="lg"
        className="mt-4 w-full"
        disabled={loading}
        onClick={() => void submit()}
      >
        {loading ? "AI 분석 중…" : "AI 소화 시작"}
      </Button>
    </div>
  );
}
