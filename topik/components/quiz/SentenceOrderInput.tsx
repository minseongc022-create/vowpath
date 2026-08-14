"use client";

import { useEffect, useMemo, useState } from "react";
import { KoreanStudyText } from "@/topik/components/korean/KoreanStudyText";
import { vi } from "@/topik/lib/i18n/vi";

type Props = {
  fragments: string[];
  disabled?: boolean;
  showResult?: boolean;
  correctOrder?: number[];
  value: number[];
  onChange: (order: number[]) => void;
};

export function SentenceOrderInput({
  fragments,
  disabled,
  showResult,
  correctOrder,
  value,
  onChange,
}: Props) {
  const [pool, setPool] = useState<number[]>([]);

  const shuffledIndices = useMemo(() => {
    const indices = fragments.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j]!, indices[i]!];
    }
    return indices;
  }, [fragments]);

  useEffect(() => {
    setPool(shuffledIndices);
    onChange([]);
  }, [shuffledIndices, onChange]);

  const slots = value;
  const isComplete = slots.length === fragments.length;

  function pickFragment(fragmentIndex: number) {
    if (disabled || isComplete) return;
    setPool((p) => p.filter((i) => i !== fragmentIndex));
    onChange([...slots, fragmentIndex]);
  }

  function removeFromSlot(slotIdx: number) {
    if (disabled) return;
    const removed = slots[slotIdx];
    if (removed === undefined) return;
    onChange(slots.filter((_, i) => i !== slotIdx));
    setPool((p) => [...p, removed]);
  }

  function reset() {
    if (disabled) return;
    setPool(shuffledIndices);
    onChange([]);
  }

  function slotClass(slotIdx: number): string {
    if (!showResult || !correctOrder) return "topik-order-slot";
    const filled = slots[slotIdx];
    if (filled === undefined) return "topik-order-slot";
    return filled === correctOrder[slotIdx] ? "topik-order-slot topik-order-slot-correct" : "topik-order-slot topik-order-slot-wrong";
  }

  return (
    <div className="topik-order-input">
      <p className="topik-order-label">{vi.drill.orderHint}</p>
      <div className="topik-order-slots">
        {fragments.map((_, slotIdx) => {
          const filled = slots[slotIdx];
          return (
            <button
              key={slotIdx}
              type="button"
              disabled={disabled || filled === undefined}
              onClick={() => removeFromSlot(slotIdx)}
              className={slotClass(slotIdx)}
            >
              {filled !== undefined ? (
                <KoreanStudyText text={fragments[filled]!} studyMode />
              ) : (
                <span className="topik-order-slot-empty">{slotIdx + 1}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="topik-order-pool">
        {pool.map((fragmentIndex) => (
          <button
            key={fragmentIndex}
            type="button"
            disabled={disabled || isComplete}
            onClick={() => pickFragment(fragmentIndex)}
            className="topik-order-chip"
          >
            <KoreanStudyText text={fragments[fragmentIndex]!} studyMode />
          </button>
        ))}
      </div>
      {!disabled && (
        <button type="button" onClick={reset} className="topik-btn topik-btn-outline topik-btn-sm mt-3">
          {vi.drill.resetOrder}
        </button>
      )}
    </div>
  );
}
