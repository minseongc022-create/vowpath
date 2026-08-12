import type { DemoMindmapNode } from "@/learn/lib/demo-data";

type MindmapPanelProps = {
  nodes: DemoMindmapNode[];
};

function MindmapNodeView({
  node,
  depth = 0,
}: {
  node: DemoMindmapNode;
  depth?: number;
}) {
  return (
    <div className={depth > 0 ? "ml-3 border-l-2 border-learn-primary/20 pl-3" : ""}>
      <div
        className="group relative mb-2 rounded-xl border border-learn-border bg-learn-surface p-3 transition-all hover:border-learn-primary/40 hover:shadow-learn-sm"
        style={{ marginLeft: depth > 0 ? 0 : undefined }}
      >
        <div className="flex items-start gap-2">
          {depth === 0 && (
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-learn-primary/10 text-[10px] font-bold text-learn-primary">
              ●
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-learn-ink leading-snug">
              {node.label}
            </p>
            {node.summary && (
              <p className="mt-0.5 text-xs text-learn-ink-muted leading-relaxed">
                {node.summary}
              </p>
            )}
          </div>
        </div>
      </div>
      {node.children?.map((child) => (
        <MindmapNodeView key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function MindmapPanel({ nodes }: MindmapPanelProps) {
  return (
    <div className="learn-scroll flex-1 overflow-y-auto p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-learn-ink">실시간 마인드맵</h2>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
          <span className="learn-live-dot h-1.5 w-1.5 rounded-full bg-emerald-500" />
          LIVE
        </span>
      </div>
      <p className="mb-4 text-xs text-learn-ink-muted leading-relaxed">
        강의 내용을 AI가 실시간으로 구조화합니다. iPad 가로 모드에서도 우측에서 바로 확인하세요.
      </p>
      {nodes.map((node) => (
        <MindmapNodeView key={node.id} node={node} />
      ))}
    </div>
  );
}
