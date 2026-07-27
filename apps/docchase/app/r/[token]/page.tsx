"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";
import { loadPublicCardByReply, savePublicReply, submitUrlFor, type PublicClientCard } from "@/lib/store";

export default function OneTapReplyPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || "";
  const [card, setCard] = useState<PublicClientCard | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    setCard(loadPublicCardByReply(token));
  }, [token]);

  function reply(kind: "이미냈어요" | "해당없음") {
    savePublicReply(token, kind);
    setCard(loadPublicCardByReply(token));
    setDone(kind === "이미냈어요" ? "이미 제출했다고 전달했습니다." : "이번 달 해당 없음으로 전달했습니다.");
  }

  if (!card) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh-hero px-4">
        <div className="sc-card max-w-md p-6 text-center">
          <p className="font-display text-xl text-ink">회신 링크를 확인할 수 없습니다</p>
          <p className="mt-2 text-sm text-ink-muted">만료되었거나 잘못된 주소입니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh-hero">
      <header className="border-b border-paper-line/70 bg-paper-card/90">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
          <p className="font-display text-lg font-medium text-ink">{SITE.name}</p>
          <p className="text-xs text-ink-muted">원탭 회신</p>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-8">
        <p className="text-xs font-semibold tracking-wide text-pine-700">{card.officeName}</p>
        <h1 className="mt-2 font-display text-2xl font-medium text-ink">
          {card.clientName} · {card.monthLabel}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {card.contactName}님, 앱 설치·회원가입 없이 아래 중 하나만 눌러 주세요.
        </p>

        {done ? (
          <p className="mt-8 rounded-2xl border border-pine-200 bg-pine-50 px-4 py-6 text-center text-sm font-medium text-pine-800">
            {done}
          </p>
        ) : (
          <div className="mt-8 space-y-3">
            <button type="button" className="sc-btn-primary w-full py-4" onClick={() => reply("이미냈어요")}>
              이미 냈어요
            </button>
            <button type="button" className="sc-btn-secondary w-full py-4" onClick={() => reply("해당없음")}>
              이번 달 해당 없음
            </button>
            <Link
              href={submitUrlFor(card.token)}
              className="flex min-h-12 w-full items-center justify-center rounded-xl border border-paper-line bg-white text-sm font-semibold text-ink"
            >
              자료 올리러 가기
            </Link>
          </div>
        )}

        <p className="mt-10 text-center text-xs text-ink-muted">
          이 회신은 {card.officeName} 마감용입니다. {SITE.name}
        </p>
      </main>
    </div>
  );
}
