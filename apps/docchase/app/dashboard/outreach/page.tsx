"use client";

import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { Toast } from "@/components/Toast";
import { mailtoDraft, OUTREACH_LEADS } from "@/lib/leads";
import { useAppState } from "@/lib/useAppState";

export default function OutreachPage() {
  const { ready, state, toast, flash } = useAppState();
  const [q, setQ] = useState("");
  const [onlyEmail, setOnlyEmail] = useState(true);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return OUTREACH_LEADS.filter((l) => {
      if (onlyEmail && !l.email) return false;
      if (!query) return true;
      return (
        l.name.toLowerCase().includes(query) ||
        l.region.toLowerCase().includes(query) ||
        l.email.toLowerCase().includes(query)
      );
    });
  }, [q, onlyEmail]);

  if (!ready || !state) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">불러오는 중…</div>;
  }

  async function copyEmail(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      flash("이메일을 복사했습니다");
    } catch {
      flash("복사 실패 — 길게 눌러 복사하세요");
    }
  }

  return (
    <DashboardShell officeName={state.profile.officeName}>
      <Toast message={toast} />
      <h1 className="font-display text-2xl font-medium text-ink sm:text-3xl">연락할 사무소</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        공개된 이메일·웹폼만 모았습니다. <strong className="font-semibold text-ink">전화 콜드콜은 하지 마세요.</strong>{" "}
        메일 앱이 열리거나, 이메일을 복사해 Gmail 등에서 보내면 됩니다.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="sc-input sm:max-w-xs"
          placeholder="사무소·지역 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="flex min-h-11 items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={onlyEmail}
            onChange={(e) => setOnlyEmail(e.target.checked)}
            className="h-4 w-4 rounded border-paper-line"
          />
          이메일 있는 곳만
        </label>
        <p className="text-xs text-ink-muted sm:ml-auto">{list.length}곳 표시 · 전체 {OUTREACH_LEADS.length}곳</p>
      </div>

      <ul className="mt-6 space-y-3">
        {list.map((lead) => (
          <li key={lead.name + lead.website} className="sc-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-medium text-ink">{lead.name}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {lead.region} · {lead.notes}
                </p>
                {lead.email ? (
                  <p className="mt-2 break-all text-sm text-pine-700">{lead.email}</p>
                ) : (
                  <p className="mt-2 text-sm text-amber-ink">웹폼만 공개 — 사이트에서 문의</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {lead.email ? (
                  <>
                    <a href={mailtoDraft(lead)} className="sc-btn-primary min-h-10 px-3 text-xs">
                      메일 쓰기
                    </a>
                    <button
                      type="button"
                      className="sc-btn-secondary min-h-10 px-3 text-xs"
                      onClick={() => copyEmail(lead.email)}
                    >
                      이메일 복사
                    </button>
                  </>
                ) : null}
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sc-btn-secondary min-h-10 px-3 text-xs"
                >
                  사이트 열기
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs leading-relaxed text-ink-muted">
        전체 표·템플릿 원문: 레포 <code className="rounded bg-white px-1">apps/docchase/docs/outreach-leads.md</code>
      </p>
    </DashboardShell>
  );
}
