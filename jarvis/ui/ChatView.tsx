"use client";

/**
 * 대화 화면 — 사장님이 자비스에게 아무 말이나 하는 곳
 *
 * ★ 무엇에 신경 썼는가
 *
 *  · **말하면 바로 반응한다** — 보낸 말이 즉시 화면에 뜨고, 자비스가
 *    생각 중이라는 게 보인다. 응답이 몇 초 걸리는데 아무 표시가 없으면
 *    사장님은 안 보내진 줄 알고 다시 누른다.
 *  · **한 일이 보인다** — 자비스가 실제로 뭘 했는지(초안 생성·설정 변경)를
 *    말풍선 아래 붙인다. 말만 하고 안 하는 걸 구분할 수 있어야 한다.
 *  · **막히지 않는다** — 처음 온 사람도 뭘 물어야 할지 알게 예시를 준다.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { JV_API, JV_ROUTES } from "../routes";
import type { ChatTurn, SourcingRun } from "../core/types";

const SUGGESTIONS = [
  "상품 찾아줘",
  "지금 어때?",
  "만든 거 보여줘",
  "어떤 기준으로 골라?",
];

export function ChatView() {
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetch(JV_API.chat)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { chat?: ChatTurn[]; pendingCount?: number }) => {
        if (!alive) return;
        setChat(d.chat ?? []);
        setPendingCount(d.pendingCount ?? 0);
      })
      .catch(() => {
        if (alive) setError("대화를 불러오지 못했습니다. 새로고침해 주세요.");
      })
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length, busy]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || busy) return;

      setError(null);
      setInput("");
      setBusy(true);

      // 보낸 말을 즉시 띄운다 — 응답을 기다리는 동안 화면이 죽어 있으면
      // 안 보내진 줄 알고 다시 누르게 된다
      const mine: ChatTurn = {
        id: `local_${Date.now()}`,
        role: "owner",
        text: message,
        at: new Date().toISOString(),
      };
      setChat((c) => [...c, mine]);

      try {
        const res = await fetch(JV_API.chat, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { chat?: ChatTurn[]; pendingCount?: number };
        setChat(data.chat ?? []);
        setPendingCount(data.pendingCount ?? 0);
      } catch {
        setError("전달하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        // 실패한 말은 되돌려 놓는다 — 사장님이 다시 타이핑하지 않게
        setChat((c) => c.filter((t) => t.id !== mine.id));
        setInput(message);
      } finally {
        setBusy(false);
      }
    },
    [busy],
  );

  return (
    <div className="jv-chat">
      <div className="jv-stream">
        {!loaded && <div className="jv-empty">불러오는 중…</div>}

        {loaded && chat.length === 0 && (
          <div className="jv-welcome">
            <h2>무엇을 도와드릴까요</h2>
            <p>
              도매를 훑어 팔 만한 상품을 찾고, 상세페이지까지 만들어 두겠습니다.
              올리기 전에 한 번만 확인해 주시면 됩니다.
            </p>
          </div>
        )}

        {chat.map((turn) => (
          <Bubble key={turn.id} turn={turn} />
        ))}

        {busy && (
          <div className="jv-row jv-row-jarvis">
            <div className="jv-bubble jv-bubble-jarvis jv-thinking">
              <span /><span /><span />
            </div>
          </div>
        )}

        {error && <div className="jv-error">{error}</div>}
        <div ref={bottomRef} />
      </div>

      {loaded && chat.length === 0 && (
        <div className="jv-suggest">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="jv-chip" onClick={() => void send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      {pendingCount > 0 && (
        <Link href={JV_ROUTES.review} className="jv-pending-bar">
          검수 대기 {pendingCount}건 — 확인하러 가기
        </Link>
      )}

      <form
        className="jv-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // 엔터로 보내고 시프트+엔터로 줄바꿈 — 메신저와 같은 감각
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send(input);
            }
          }}
          placeholder="아무거나 말씀하세요"
          rows={1}
          disabled={busy}
        />
        <button type="submit" className="jv-send" disabled={busy || !input.trim()}>
          보내기
        </button>
      </form>

      <style jsx>{`
        .jv-chat { display: flex; flex-direction: column; flex: 1; min-height: 0; }
        .jv-stream { flex: 1; overflow-y: auto; padding: 20px 18px 8px; }
        .jv-welcome { padding: 48px 6px 28px; }
        .jv-welcome h2 { font-size: 25px; font-weight: 800; margin: 0 0 10px; letter-spacing: -0.5px; }
        .jv-welcome p { color: var(--jv-muted); font-size: 15px; line-height: 1.7; margin: 0; }
        .jv-suggest { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 18px 12px; }
        .jv-chip {
          border: 1px solid var(--jv-line); background: #fff; border-radius: 999px;
          padding: 9px 15px; font-size: 14px; font-weight: 600; cursor: pointer;
          color: var(--jv-text); font-family: inherit;
        }
        .jv-chip:hover { background: var(--jv-surface); }
        .jv-error {
          background: #fff0f0; color: var(--jv-red); border-radius: 12px;
          padding: 12px 14px; font-size: 14px; margin: 8px 0;
        }
        .jv-pending-bar {
          display: block; margin: 0 18px 10px; padding: 13px 16px;
          background: #eef5ff; color: var(--jv-blue); border-radius: 12px;
          font-size: 14px; font-weight: 700; text-decoration: none; text-align: center;
        }
        .jv-composer {
          display: flex; gap: 8px; padding: 12px 18px calc(14px + env(safe-area-inset-bottom));
          border-top: 1px solid var(--jv-line); background: #fff;
          position: sticky; bottom: 0;
        }
        .jv-composer textarea {
          flex: 1; resize: none; border: 1px solid var(--jv-line); border-radius: 14px;
          padding: 13px 15px; font-size: 16px; font-family: inherit; line-height: 1.5;
          max-height: 140px; outline: none;
        }
        .jv-composer textarea:focus { border-color: var(--jv-blue); }
        .jv-send {
          border: 0; border-radius: 14px; background: var(--jv-blue); color: #fff;
          font-weight: 700; font-size: 15px; padding: 0 20px; cursor: pointer; font-family: inherit;
        }
        .jv-send:disabled { background: #c9d3e0; cursor: default; }
        .jv-thinking { display: flex; gap: 5px; align-items: center; padding: 16px 18px; }
        .jv-thinking span {
          width: 7px; height: 7px; border-radius: 50%; background: #b6bdc7;
          animation: jvblink 1.3s infinite ease-in-out;
        }
        .jv-thinking span:nth-child(2) { animation-delay: 0.18s; }
        .jv-thinking span:nth-child(3) { animation-delay: 0.36s; }
        @keyframes jvblink { 0%, 60%, 100% { opacity: 0.28; } 30% { opacity: 1; } }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

function Bubble({ turn }: { turn: ChatTurn }) {
  const mine = turn.role === "owner";
  return (
    <div className={mine ? "jv-row jv-row-owner" : "jv-row jv-row-jarvis"}>
      <div className={mine ? "jv-bubble jv-bubble-owner" : "jv-bubble jv-bubble-jarvis"}>
        {turn.text.split("\n").map((line, i) => (
          <p key={i}>{line || " "}</p>
        ))}
        {turn.attachments?.map((a, i) => (
          <Attachment key={i} attachment={a} />
        ))}
      </div>
      <style jsx>{`
        .jv-row { display: flex; margin-bottom: 12px; }
        .jv-row-owner { justify-content: flex-end; }
        .jv-row-jarvis { justify-content: flex-start; }
        .jv-bubble {
          max-width: 84%; border-radius: 18px; padding: 13px 16px;
          font-size: 15px; line-height: 1.65; word-break: break-word;
        }
        .jv-bubble-owner { background: var(--jv-blue); color: #fff; border-bottom-right-radius: 5px; }
        .jv-bubble-jarvis { background: var(--jv-surface); color: var(--jv-text); border-bottom-left-radius: 5px; }
        .jv-bubble :global(p) { margin: 0; }
        .jv-bubble :global(p + p) { margin-top: 3px; }
      `}</style>
    </div>
  );
}

function Attachment({
  attachment,
}: {
  attachment: NonNullable<ChatTurn["attachments"]>[number];
}) {
  if (attachment.kind === "drafts") {
    return (
      <Link href={JV_ROUTES.review} className="jv-attach">
        검수 화면에서 {attachment.draftIds.length}건 확인하기 →
        <style jsx>{`
          .jv-attach {
            display: block; margin-top: 10px; padding: 11px 14px; background: #fff;
            border: 1px solid var(--jv-line); border-radius: 12px; text-decoration: none;
            color: var(--jv-blue); font-weight: 700; font-size: 14px;
          }
        `}</style>
      </Link>
    );
  }

  if (attachment.kind === "sourcing") {
    return <SourcingCard run={attachment.run} />;
  }

  if (attachment.kind === "detail") {
    return (
      <Link href={`${JV_ROUTES.review}?id=${attachment.draftId}`} className="jv-attach">
        상세페이지 보기 →
        <style jsx>{`
          .jv-attach {
            display: block; margin-top: 10px; padding: 11px 14px; background: #fff;
            border: 1px solid var(--jv-line); border-radius: 12px; text-decoration: none;
            color: var(--jv-blue); font-weight: 700; font-size: 14px;
          }
        `}</style>
      </Link>
    );
  }

  return null;
}

/**
 * 소싱 결과 카드 — 0건일 때 특히 중요하다.
 * "없습니다"만 반복되면 기준을 낮추고 싶어지는데, 어디서 걸렸는지 숫자로
 * 보여주면 **넓혀야 할 곳**이 보인다.
 */
function SourcingCard({ run }: { run: SourcingRun }) {
  const rows = Object.entries(run.rejections).slice(0, 5);
  return (
    <div className="jv-sourcing">
      <div className="jv-sourcing-head">
        검색어 {run.keywordsTried}개 · 상품 {run.productsSeen}개 확인 · 후보 {run.candidatesFound}개
      </div>
      {rows.length > 0 && (
        <ul>
          {rows.map(([why, n]) => (
            <li key={why}>
              <span>{why}</span>
              <b>{n}</b>
            </li>
          ))}
        </ul>
      )}
      <style jsx>{`
        .jv-sourcing {
          margin-top: 10px; background: #fff; border: 1px solid var(--jv-line);
          border-radius: 12px; padding: 12px 14px;
        }
        .jv-sourcing-head { font-size: 13px; font-weight: 700; color: var(--jv-muted); margin-bottom: 8px; }
        ul { list-style: none; margin: 0; padding: 0; }
        li {
          display: flex; justify-content: space-between; gap: 12px;
          font-size: 13px; padding: 5px 0; color: var(--jv-text);
        }
        li b { color: var(--jv-muted); flex: 0 0 auto; }
      `}</style>
    </div>
  );
}
