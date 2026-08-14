"use client";

import { useCallback, useState } from "react";
import { KoreanStudyText } from "@/topik/components/korean/KoreanStudyText";
import { useTopikVi } from "@/topik/lib/i18n/TopikLocaleProvider";

type Props = {
  fragments: string[];
  disabled?: boolean;
  showResult?: boolean;
  correctOrder?: number[];
  value: number[];
  onChange: (order: number[]) => void;
};

function shuffleIndices(count: number, avoid?: number[]): number[] {
  for (let attempt = 0; attempt < 24; attempt++) {
    const indices = Array.from({ length: count }, (_, i) => i);
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j]!, indices[i]!];
    }
    if (!avoid || !indices.every((v, i) => v === avoid[i])) {
      return indices;
    }
  }
  return Array.from({ length: count }, (_, i) => (count - 1 - i) % count);
}

export function SentenceOrderInput({
  fragments,
  disabled,
  showResult,
  correctOrder,
  value,
  onChange,
}: Props) {
  const vi = useTopikVi();
  const [pool, setPool] = useState<number[]>(() => shuffleIndices(fragments.length, correctOrder));

  const isComplete = value.length === fragments.length;

  const pickFragment = useCallback(
    (fragmentIndex: number) => {
      if (disabled || isComplete) return;
      setPool((p) => p.filter((i) => i !== fragmentIndex));
      onChange([...value, fragmentIndex]);
    },
    [disabled, isComplete, onChange, value],
  );

  function removeFromSlot(slotIdx: number) {
    if (disabled) return;
    const removed = value[slotIdx];
    if (removed === undefined) return;
    onChange(value.filter((_, i) => i !== slotIdx));
    setPool((p) => [...p, removed]);
  }

  function moveSlot(slotIdx: number, direction: -1 | 1) {
    if (disabled || value[slotIdx] === undefined) return;
    const next = slotIdx + direction;
    if (next < 0 || next >= value.length) return;
    const copy = [...value];
    [copy[slotIdx], copy[next]] = [copy[next]!, copy[slotIdx]!];
    onChange(copy);
  }

  function reset() {
    if (disabled) return;
    setPool(shuffleIndices(fragments.length, correctOrder));
    onChange([]);
  }

  function slotClass(slotIdx: number): string {
    if (!showResult || !correctOrder) return "topik-order-slot";
    const filled = value[slotIdx];
    if (filled === undefined) return "topik-order-slot";
    return filled === correctOrder[slotIdx]
      ? "topik-order-slot topik-order-slot-correct"
      : "topik-order-slot topik-order-slot-wrong";
  }

  return (
    <div className="topik-order-input">
      <p className="topik-order-label">{vi.drill.orderHint}</p>
      <div className="topik-order-slots">
        {fragments.map((_, slotIdx) => {
          const filled = value[slotIdx];
          return (
            <div key={slotIdx} className="topik-order-slot-row">
              <button
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
              {!disabled && filled !== undefined && (
                <div className="topik-order-slot-actions">
                  <button
                    type="button"
                    disabled={slotIdx === 0}
                    onClick={() => moveSlot(slotIdx, -1)}
                    className="topik-order-move"
                    aria-label={vi.drill.moveUp}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={slotIdx >= value.length - 1}
                    onClick={() => moveSlot(slotIdx, 1)}
                    className="topik-order-move"
                    aria-label={vi.drill.moveDown}
                  >
                    ↓
                  </button>
                </div>
              )}
            </div>
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
