"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatBytes } from "@/lib/format";
import { loadPublicCard, savePublicUpload, type PublicClientCard } from "@/lib/store";
import { SITE } from "@/lib/site";
import type { SubmittedFile } from "@/lib/types";

export default function PublicSubmitPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || "";
  const [card, setCard] = useState<PublicClientCard | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCard(loadPublicCard(token));
  }, [token]);

  async function onFiles(files: FileList | null) {
    if (!files?.length || !card) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 4 * 1024 * 1024) {
          setMsg("파일은 4MB 이하로 올려 주세요 (데모 제한)");
          continue;
        }
        const dataUrl = await readAsDataUrl(file);
        const item: SubmittedFile = {
          id: `up_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          size: file.size,
          dataUrl,
          uploadedAt: new Date().toISOString(),
          docKind: "기타",
        };
        savePublicUpload(token, item);
      }
      setCard(loadPublicCard(token));
      setMsg("자료를 보냈습니다. 감사합니다.");
    } finally {
      setBusy(false);
    }
  }

  if (!card) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh-hero px-4">
        <div className="sc-card max-w-md p-6 text-center">
          <p className="font-display text-xl text-ink">링크를 확인할 수 없습니다</p>
          <p className="mt-2 text-sm text-ink-muted">
            만료되었거나 잘못된 주소입니다. 세무 사무소에 문의해 주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh-hero">
      <header className="border-b border-paper-line/70 bg-paper-card/90">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
          <p className="font-display text-lg font-medium text-ink">{SITE.name}</p>
          <p className="text-xs text-ink-muted">자료 제출</p>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-8">
        <p className="text-xs font-semibold tracking-wide text-pine-700">{card.officeName}</p>
        <h1 className="mt-2 font-display text-2xl font-medium text-ink">
          {card.clientName} 자료 제출
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {card.contactName}님, {card.monthLabel} 기장에 필요한 자료를 올려 주세요. 앱 설치·회원가입은
          없습니다. 이미 냈다면{" "}
          <a href={`/r/${card.replyToken}`} className="font-semibold text-pine-700 underline">
            원탭 회신
          </a>
          을 눌러 주세요.
        </p>

        <div className="mt-6 sc-card p-4">
          <p className="text-sm font-semibold text-ink">필요한 자료</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-muted">
            {card.docs.map((d) => (
              <li key={d}>· {d}</li>
            ))}
          </ul>
        </div>

        <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-pine-500/40 bg-white/70 px-4 py-10 text-center">
          <span className="text-sm font-semibold text-ink">여기를 눌러 파일 선택</span>
          <span className="mt-1 text-xs text-ink-muted">PDF, 사진, 엑셀 · 파일당 4MB 이하 (데모)</span>
          <input
            type="file"
            className="hidden"
            multiple
            accept="image/*,.pdf,.xls,.xlsx,.csv"
            disabled={busy}
            onChange={(e) => onFiles(e.target.files)}
          />
        </label>

        {msg ? <p className="mt-4 text-center text-sm font-medium text-pine-700">{msg}</p> : null}

        {(card.files?.length || 0) > 0 ? (
          <div className="mt-8">
            <p className="text-sm font-semibold text-ink">올린 파일</p>
            <ul className="mt-2 space-y-2">
              {card.files.map((f) => (
                <li key={f.id} className="sc-card flex items-center justify-between px-3 py-2.5 text-sm">
                  <span className="truncate font-medium text-ink">{f.name}</span>
                  <span className="shrink-0 text-xs text-ink-muted">{formatBytes(f.size)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-10 text-center text-xs text-ink-muted">
          이 페이지는 {card.officeName}의 자료 요청용입니다. {SITE.name}
        </p>
      </main>
    </div>
  );
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
