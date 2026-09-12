import type { FileDiff } from "../lib/repair/diff";

/**
 * 바뀌는 내용을 눈으로 보여준다.
 *
 * ★ 이게 없으면 [적용하기]는 신뢰가 아니라 도박이다
 *
 * "고쳤습니다, 적용할까요?"에 [예]를 누르는 건 내용을 볼 수 있을 때만
 * 합리적인 선택이다. 간편 모드에서도 [기술 상세 보기]를 누르면 여기가 나온다.
 */
export function DiffView({ diff }: { diff: FileDiff }) {
  if (!diff?.hunks?.length) return null;

  return (
    <div className="vs-code" style={{ padding: 0, overflowX: "auto" }}>
      <div
        className="vs-hint vs-mono"
        style={{ padding: "6px 10px", borderBottom: "1px solid var(--vs-line)" }}
      >
        {diff.path} <span style={{ color: "var(--vs-ok)" }}>+{diff.added}</span>{" "}
        <span style={{ color: "var(--vs-danger)" }}>−{diff.removed}</span>
      </div>
      {diff.hunks.map((hunk, hunkIndex) => (
        <div key={`${hunk.header}-${hunkIndex}`}>
          {hunkIndex > 0 && (
            <div className="vs-hint vs-mono" style={{ padding: "2px 10px" }}>
              ⋯
            </div>
          )}
          {hunk.lines.map((line, lineIndex) => (
            <div
              key={`${hunkIndex}-${lineIndex}`}
              className="vs-mono"
              style={{
                display: "flex",
                gap: 8,
                padding: "1px 10px",
                fontSize: 12.5,
                whiteSpace: "pre",
                background:
                  line.kind === "add"
                    ? "var(--vs-ok-wash)"
                    : line.kind === "remove"
                      ? "var(--vs-danger-wash)"
                      : "transparent",
              }}
            >
              <span className="vs-muted" style={{ minWidth: 34, textAlign: "right", opacity: 0.6 }}>
                {line.before ?? line.after ?? ""}
              </span>
              <span style={{ minWidth: 10 }}>
                {line.kind === "add" ? "+" : line.kind === "remove" ? "−" : " "}
              </span>
              <span>{line.text || " "}</span>
            </div>
          ))}
        </div>
      ))}
      {diff.truncated && (
        <div className="vs-hint" style={{ padding: "6px 10px" }}>
          변경이 많아 일부만 보여드립니다. 전체는 Pull Request에서 확인하실 수 있습니다.
        </div>
      )}
    </div>
  );
}
