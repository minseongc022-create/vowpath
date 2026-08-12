import Link from "next/link";
import type { MaterialRecord } from "@/learn/types/material";
import { Card } from "@/learn/components/ui/Card";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기",
  EXTRACTING: "추출 중",
  CHUNKING: "청크 분할",
  TRANSCRIBING: "스크립트 생성",
  ANALYZING: "AI 분석",
  READY: "완료",
  FAILED: "실패",
};

const TYPE_ICON: Record<string, string> = {
  YOUTUBE: "▶",
  PDF: "📄",
  TEXT: "📝",
  NOTE: "✏️",
};

export function LibraryMaterialCard({ material }: { material: MaterialRecord }) {
  const isProcessing = !["READY", "FAILED"].includes(material.status);

  return (
    <Link href={`/learn/library/${material.id}`}>
      <Card hover className="p-4 h-full">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-learn-muted text-lg">
            {TYPE_ICON[material.type] ?? "📚"}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-bold text-learn-ink">{material.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  material.status === "READY"
                    ? "bg-emerald-50 text-emerald-700"
                    : material.status === "FAILED"
                      ? "bg-red-50 text-red-600"
                      : "bg-blue-50 text-learn-primary"
                }`}
              >
                {isProcessing && (
                  <span className="learn-live-dot h-1.5 w-1.5 rounded-full bg-current" />
                )}
                {STATUS_LABEL[material.status] ?? material.status}
              </span>
              {material.sourceLabel && (
                <span className="text-[10px] text-learn-ink-subtle">
                  {material.sourceLabel}
                </span>
              )}
            </div>
            {material.analysis?.summary && (
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-learn-ink-muted">
                {material.analysis.summary}
              </p>
            )}
            {material.progress && isProcessing && (
              <div className="mt-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-learn-muted">
                  <div
                    className="h-full rounded-full bg-learn-primary transition-all"
                    style={{
                      width: `${Math.round(
                        (material.progress.completedChunks /
                          Math.max(material.progress.totalChunks, 1)) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
