import type { ItemStatus } from "@/chaebi/lib/types";
import { ITEM_STATUS_LABEL, ITEM_STATUS_TONE } from "@/chaebi/lib/format";
import { CheckIcon } from "./Icons";

/** 항목 상태 한 조각. 진행 중일 때만 점이 뛰고, 끝나면 체크로 굳는다. */
export function StatusBadge({ status }: { status: ItemStatus }) {
  const tone = ITEM_STATUS_TONE[status];
  const done = status === "done" || status === "confirmed" || status === "ready";

  return (
    <span className="cb-badge" data-tone={tone}>
      {done ? <CheckIcon className="h-3 w-3" strokeWidth={3} /> : <span className="cb-dot" />}
      {ITEM_STATUS_LABEL[status]}
    </span>
  );
}
