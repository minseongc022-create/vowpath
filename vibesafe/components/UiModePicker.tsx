"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UI_MODE_LABELS,
  UI_MODE_OPTIONS,
  UI_MODE_QUESTION,
  type UiMode,
} from "../lib/ui-mode";

/**
 * 화면 취향을 묻고 저장한다.
 *
 * ★ 질문을 "당신은 개발자입니까?"로 쓰지 않은 이유
 *
 * 그건 자존심이 걸린 질문이라 사람들이 정직하게 답하지 않는다. 개발을
 * 배우는 중인 사람은 "네"라고 답하고 스택 트레이스를 받는다. 대신 **원하는
 * 결과**를 묻는다 — 어느 쪽을 골라도 부끄럽지 않게.
 *
 * ★ 그리고 이건 한 번 묻고 마는 질문이 아니다
 *
 * 언제든 계정 화면에서 바꿀 수 있고, 장애 화면에서도 [기술 상세 보기] 한
 * 번이면 전문가 모드와 같은 내용을 본다. 잘못 골라도 잃는 게 없어야
 * 사람들이 편하게 고른다.
 */
export function UiModeQuestion({ initialMode = "simple" }: { initialMode?: UiMode }) {
  const router = useRouter();
  const [busy, setBusy] = useState<UiMode | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(mode: UiMode) {
    setBusy(mode);
    setError(null);
    const res = await fetch("/api/vibesafe/account/ui-mode", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    setBusy(null);
    if (!res.ok) {
      setError("저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) return null;

  return (
    <div className="vs-card vs-stack">
      <div>
        <h2 className="vs-section-title">{UI_MODE_QUESTION}</h2>
        <p className="vs-hint" style={{ marginTop: 4 }}>
          언제든 계정 화면에서 바꿀 수 있습니다. 어느 쪽을 고르셔도 확인하는 내용은 똑같습니다.
        </p>
      </div>

      {error && (
        <div className="vs-alert" data-tone="error" role="alert">
          {error}
        </div>
      )}

      <div className="vs-stack-sm">
        {UI_MODE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className="vs-card vs-card-flush"
            onClick={() => void choose(option.value)}
            disabled={busy !== null}
            style={{
              textAlign: "left",
              cursor: busy ? "wait" : "pointer",
              width: "100%",
              padding: 16,
              background: "transparent",
              font: "inherit",
              color: "inherit",
            }}
          >
            <strong style={{ fontSize: 15 }}>
              {busy === option.value ? "저장하는 중…" : option.label}
            </strong>
            <p className="vs-hint" style={{ margin: "6px 0 0" }}>
              {option.detail}
            </p>
            <p className="vs-hint" style={{ margin: "8px 0 0", fontStyle: "italic" }}>
              {option.example}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

/** 계정 화면의 토글. 온보딩을 건너뛴 사람도 여기서 바꾼다. */
export function UiModeToggle({ mode }: { mode: UiMode }) {
  const router = useRouter();
  const [current, setCurrent] = useState<UiMode>(mode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: UiMode) {
    if (next === current || busy) return;

    // ★ 먼저 화면을 바꾸고 나중에 서버에 알린다
    //
    // 서버 응답을 기다렸다가 라디오를 옮기면, 느린 연결에서는 눌러도
    // 아무 일이 안 일어난 것처럼 보인다. 그러면 사용자는 한 번 더 누른다.
    // 브라우저 검증에서 실제로 잡혔다 — 클릭 직후 라디오가 그대로였다.
    // 실패하면 되돌리고 이유를 말한다.
    const previous = current;
    setCurrent(next);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/vibesafe/account/ui-mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: next }),
      });
      if (!res.ok) {
        setCurrent(previous);
        setError("바꾸지 못했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }
      router.refresh();
    } catch {
      setCurrent(previous);
      setError("연결에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vs-stack-sm">
      {error && (
        <div className="vs-alert" data-tone="error" role="alert">
          {error}
        </div>
      )}
      {(["simple", "expert"] as UiMode[]).map((value) => (
        <label key={value} className="vs-perm" data-locked="false">
          <input
            type="radio"
            name="vs-ui-mode"
            checked={current === value}
            onChange={() => void change(value)}
            aria-label={UI_MODE_LABELS[value].title}
          />
          <div className="vs-perm-body">
            <strong>{UI_MODE_LABELS[value].title}</strong>
            <p className="vs-hint" style={{ marginTop: 2 }}>
              {UI_MODE_LABELS[value].hint}
            </p>
          </div>
        </label>
      ))}
      <p className="vs-hint">
        어느 쪽이든 확인하는 내용과 고치는 방식은 똑같습니다. 간편 모드에서도
        [기술 상세 보기]를 누르면 커밋·로그·diff를 전부 볼 수 있습니다.
      </p>
    </div>
  );
}
