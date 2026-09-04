"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { resolveIdentity, setIdentityName } from "../lib/identity";
import type { CompanionInvite, CompanionRelationLabel, DajeongPlan } from "../lib/types";
import { ArrowIcon, CheckIcon, ClockIcon, HeartIcon, SparkleIcon, TrashIcon } from "./DajeongIcons";

type Companion = { link: { id: string; relationLabel: CompanionRelationLabel; createdAt: string }; companionId: string; companionName: string };
type SharedEntry = { planId: string; ownerName?: string; companionName?: string; plan: DajeongPlan | null; version: number; updatedAt: string };

const RELATIONS: CompanionRelationLabel[] = ["연인", "친구", "가족", "동료", "기타"];

function displayDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

export function CompanionsWorkspace() {
  const [myId, setMyId] = useState("");
  const [myName, setMyName] = useState("나");
  const [loggedIn, setLoggedIn] = useState(false);
  const [relation, setRelation] = useState<CompanionRelationLabel>("연인");
  const [note, setNote] = useState("");
  const [invite, setInvite] = useState<CompanionInvite | null>(null);
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [acceptCode, setAcceptCode] = useState("");
  const [sharedWithMe, setSharedWithMe] = useState<SharedEntry[]>([]);
  const [mine, setMine] = useState<SharedEntry[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh(personId: string) {
    const [companionData, sharedData] = await Promise.all([
      fetch(`/api/dajeong/companions/list?personId=${personId}`).then((r) => r.json()),
      fetch(`/api/dajeong/plans/shared?viewerId=${personId}`).then((r) => r.json()),
    ]);
    setCompanions(companionData.companions ?? []);
    // createInvite() cancels any earlier pending invite server-side, so there's at most one — a
    // returning visit (or another tab) needs to see it without having to make a fresh one.
    const pending = (companionData.invites ?? []).find((entry: CompanionInvite) => entry.status === "pending") ?? null;
    setInvite((current) => current ?? pending);
    setSharedWithMe(sharedData.sharedWithMe ?? []);
    setMine(sharedData.mine ?? []);
  }

  useEffect(() => {
    void (async () => {
      const identity = await resolveIdentity();
      setMyId(identity.id);
      setMyName(identity.name);
      setLoggedIn(identity.id.startsWith("user_"));
      void refresh(identity.id);
    })();
  }, []);

  function saveName(event: FormEvent) {
    event.preventDefault();
    const identity = setIdentityName(myName);
    setMyName(identity.name);
    setStatus("이름 저장했어.");
  }

  async function createInvite() {
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/dajeong/companions/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: myId, personName: myName, relationLabel: relation, note: note.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "초대를 못 만들었어.");
      setInvite(data.invite);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "잠시 후에 다시 해볼래?");
    } finally {
      setBusy(false);
    }
  }

  async function acceptInvite(event: FormEvent) {
    event.preventDefault();
    if (acceptCode.trim().length < 4) return;
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/dajeong/companions/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: acceptCode.trim(), personId: myId, personName: myName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "연결을 못 했어.");
      setAcceptCode("");
      setStatus("동반자로 연결됐어.");
      await refresh(myId);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "잠시 후에 다시 해볼래?");
    } finally {
      setBusy(false);
    }
  }

  async function removeCompanion(linkId: string) {
    if (!window.confirm("이 동반자와 연결을 끊을까? 같이 보던 계획도 못 보게 돼.")) return;
    await fetch("/api/dajeong/companions/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkId, personId: myId }),
    });
    await refresh(myId);
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("초대 코드 복사했어.");
    } catch {
      setStatus(`초대 코드: ${code}`);
    }
  }

  return (
    <div className="dj-plans-page dj-narrow dj-companions-page">
      <div className="dj-plans-heading">
        <div><span className="dj-kicker"><HeartIcon size={15} /> 함께 준비하는 사람들</span><h1>동반자</h1><p>연결한 동반자와 계획을 같이 보고, 서로 허용한 부분만 보여줘.</p></div>
        <Link href="/dajeong" className="dj-btn dj-btn-primary">새 계획 <ArrowIcon size={16} /></Link>
      </div>

      {loggedIn ? (
        <div className="dj-companion-name-form dj-card"><label>내 이름 (동반자 화면에 보여)</label><p className="dj-companion-empty">{myName} · 로그인 계정 이름을 쓰고 있어</p></div>
      ) : (
        <form className="dj-companion-name-form dj-card" onSubmit={saveName}>
          <label>내 이름 (동반자 화면에 보여)</label>
          <div>
            <input value={myName} onChange={(event) => setMyName(event.target.value)} maxLength={20} />
            <button type="submit" className="dj-btn dj-btn-secondary">저장</button>
          </div>
          <p className="dj-companion-empty"><Link href="/dajeong/login">로그인</Link>하면 다른 기기에서도 같은 계정으로 이어볼 수 있어.</p>
        </form>
      )}

      <section className="dj-card dj-companion-invite">
        <h2>동반자 초대하기</h2>
        <div className="dj-companion-invite-row">
          <select value={relation} onChange={(event) => setRelation(event.target.value as CompanionRelationLabel)}>
            {RELATIONS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="메모 (선택)" maxLength={80} />
          <button type="button" className="dj-btn dj-btn-primary" onClick={createInvite} disabled={busy}>초대 코드 만들기</button>
        </div>
        {invite ? (
          <div className="dj-invite-code-box">
            <span>초대 코드</span>
            <strong>{invite.code}</strong>
            <button type="button" className="dj-btn dj-btn-secondary" onClick={() => copyCode(invite.code)}>복사</button>
            <p>이 코드를 동반자한테 알려주면 아래 “초대 코드로 연결하기”에 넣어서 연결할 수 있어. 7일 동안 쓸 수 있어.</p>
          </div>
        ) : null}
      </section>

      <section className="dj-card dj-companion-accept">
        <h2>초대 코드로 연결하기</h2>
        <form onSubmit={acceptInvite}>
          <input value={acceptCode} onChange={(event) => setAcceptCode(event.target.value.toUpperCase())} placeholder="받은 코드 넣기" maxLength={12} />
          <button type="submit" className="dj-btn dj-btn-primary" disabled={busy || acceptCode.trim().length < 4}>연결하기</button>
        </form>
      </section>

      {status ? <p className="dj-sr-only" role="status">{status}</p> : null}
      {status ? <div className="dj-companion-status">{status}</div> : null}

      <section>
        <span className="dj-summary-eyebrow">연결된 동반자</span>
        {companions.length === 0 ? <p className="dj-companion-empty">아직 연결한 동반자가 없어.</p> : (
          <div className="dj-companion-list">
            {companions.map(({ link, companionId, companionName }) => (
              <div key={link.id} className="dj-companion-row dj-card">
                <div><strong>{companionName}</strong><span>{link.relationLabel} · {displayDate(link.createdAt)} 연결</span></div>
                <button type="button" className="dj-btn dj-btn-danger" onClick={() => removeCompanion(link.id)} aria-label={`${companionName} 연결 해제`}><TrashIcon size={15} /></button>
                <span data-companion-id={companionId} hidden />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <span className="dj-summary-eyebrow">동반자가 공유한 계획</span>
        {sharedWithMe.length === 0 ? <p className="dj-companion-empty">아직 공유받은 계획이 없어.</p> : (
          <div className="dj-plans-list">
            {sharedWithMe.filter((entry) => entry.plan).map((entry) => (
              <Link key={entry.planId} href={`/dajeong/plan/${entry.planId}/today`} className="dj-saved-plan dj-card dj-saved-plan-main">
                <span className="dj-status-mark dj-status-draft"><HeartIcon size={18} /></span>
                <div><div className="dj-saved-meta"><span><ClockIcon size={13} />{entry.plan?.situation.targetDate ? displayDate(entry.plan.situation.targetDate) : ""}</span></div><h2>{entry.plan?.title}</h2><p>{entry.ownerName}님이 공유했어</p></div>
                <ArrowIcon size={18} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {mine.length ? (
        <section>
          <span className="dj-summary-eyebrow">내가 공유한 계획</span>
          <div className="dj-plans-list">
            {mine.map((entry) => (
              <Link key={entry.planId} href={`/dajeong/plan/${entry.planId}`} className="dj-saved-plan dj-card dj-saved-plan-main">
                <span className="dj-status-mark dj-status-confirmed"><CheckIcon size={18} /></span>
                <div><h2>{entry.plan?.title}</h2><p>{entry.companionName}님과 공유 중</p></div>
                <ArrowIcon size={18} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="dj-companion-note dj-card"><SparkleIcon size={14} /><span>동반자는 네가 비공개로 해둔 일정과 대화는 못 봐.<br />비공개 설정은 계획 화면에서 언제든 바꿀 수 있어.</span></div>
    </div>
  );
}
