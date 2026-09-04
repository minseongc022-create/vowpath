"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getPlan, rememberPacePreference, rememberPersonProfile, savePlan } from "../lib/storage";
import { appendPlanConversation, appendPlanVersion, replacePlanItem } from "../lib/plan-engine";
import { DAJEONG_BRAND } from "../lib/brand";
import { MOOD_LABEL } from "../lib/experience";
import { prepareReservationOrder } from "../lib/reservation-engine";
import { resolveIdentity } from "../lib/identity";
import { NotificationPermissionPrompt } from "./NotificationPermissionPrompt";
import { fetchSharedPlan, planRole, reviseAnyPlan, syncPlanIfShared } from "../lib/plan-sync";
import type { ConciergeMessage, DajeongPlan, PlanCategory, PlanChangeProposal, PlanItem, PlanOption, PlanRevisionResult } from "../lib/types";
import { ArrowIcon, CategoryIcon, CheckIcon, ChevronIcon, ClockIcon, LockIcon, MapPinIcon, ShieldIcon, SparkleIcon, UsersIcon, WalletIcon } from "./DajeongIcons";

function money(value: number): string {
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

function displayDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(date);
}

function checkedLabel(value?: string): string {
  if (!value) return "확인 시각 없음";
  const elapsed = Date.now() - new Date(value).getTime();
  if (elapsed < 60_000) return "방금 확인";
  if (elapsed < 3_600_000) return `${Math.max(1, Math.floor(elapsed / 60_000))}분 전 확인`;
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function chatMessage(role: ConciergeMessage["role"], text: string, status: ConciergeMessage["status"] = "done"): ConciergeMessage {
  return { id: `chat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, role, text, status, createdAt: new Date().toISOString() };
}

function OptionCard({ option, selected, onSelect }: { option: PlanOption; selected: boolean; onSelect: () => void }) {
  const hasPhoto = Boolean(option.imageUrl);
  return (
    <button className={`dj-option-card ${selected ? "dj-option-selected" : ""}`} type="button" onClick={onSelect}>
      {hasPhoto ? <img src={option.imageUrl} alt={option.imageAlt || option.title} onError={(event) => { if (option.referenceImageUrl && event.currentTarget.src !== option.referenceImageUrl) event.currentTarget.src = option.referenceImageUrl; else event.currentTarget.style.display = "none"; }} /> : <span className="dj-option-photo-empty"><MapPinIcon size={16} /></span>}
      <span className="dj-option-copy">
        <strong>{option.title}</strong>
        <small>{option.reality?.address || option.subtitle}</small>
        <em>
          {option.reality?.rating ? `★ ${option.reality.rating.toFixed(1)}${option.reality.reviewCount ? ` · 리뷰 ${option.reality.reviewCount.toLocaleString("ko-KR")}` : ""}` : "지도에서 리뷰 확인"}
          {option.reality?.localIndependent ? " · 로컬 매장" : ""}
        </em>
      </span>
      <span className="dj-option-side"><b>{money(option.price)}</b><i>{selected ? <><CheckIcon size={12} /> 선택됨</> : "이곳으로 변경"}</i></span>
    </button>
  );
}

type ItemChatEntry = { id: string; role: "user" | "assistant"; text: string; status?: "searching" | "error" };

function TimelineItem({
  item,
  isLast,
  changed,
  highlight,
  onReplace,
  onAsk,
  onApplyProposal,
  onToggleSecret,
  onSetDisclosure,
}: {
  item: PlanItem;
  isLast: boolean;
  changed: boolean;
  highlight: boolean;
  onReplace: (optionId: string) => void;
  onAsk: (instruction: string) => Promise<PlanRevisionResult>;
  onApplyProposal: (proposal: PlanChangeProposal) => void;
  onToggleSecret: (item: PlanItem) => void;
  onSetDisclosure: (item: PlanItem, disclosure: "hidden" | "time_only" | "label_only") => void;
}) {
  const [open, setOpen] = useState(false);
  const [localInstruction, setLocalInstruction] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const [localProposal, setLocalProposal] = useState<PlanChangeProposal | null>(null);
  const localChatRef = useRef<HTMLDivElement>(null);
  const [localMessages, setLocalMessages] = useState<ItemChatEntry[]>([
    { id: "welcome", role: "assistant", text: `지금 선택한 ‘${item.title}’을 기준으로 찾아볼게요. 원하는 분위기나 음식, 가격을 평소 말하듯 알려주세요.` },
  ]);
  const allOptions = useMemo(() => [item, ...item.alternatives], [item]);
  const reservationLabel = item.reality?.reservationLabel ?? (item.reservationRequired ? "예약 확인 필요" : "예약 없이 가능");
  const openLabel = item.reality?.openNow === true ? "지금 영업 중" : item.reality?.openNow === false ? "지금은 영업 종료" : "방문 시간 영업 확인";
  const hasPhoto = Boolean(item.imageUrl);
  const photoLabel = item.reality?.imageKind === "place" ? "실제 대표 사진" : "분위기 참고 사진";

  useEffect(() => {
    const chat = localChatRef.current;
    if (chat) chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });
  }, [localMessages.length, localProposal]);

  async function ask(event: FormEvent) {
    event.preventDefault();
    const text = localInstruction.trim();
    if (text.length < 2 || localLoading) return;
    const searchingId = `local_${Date.now().toString(36)}`;
    setLocalMessages((current) => [...current, { id: `${searchingId}_user`, role: "user", text }, { id: searchingId, role: "assistant", text: "말씀하신 느낌에 맞는 실제 후보와 리뷰, 앞뒤 동선을 같이 확인하고 있어요.", status: "searching" }]);
    setLocalInstruction("");
    setLocalProposal(null);
    setLocalLoading(true);
    try {
      const result = await onAsk(text);
      setLocalMessages((current) => current.map((message) => message.id === searchingId ? { ...message, text: result.message, status: undefined } : message));
      setLocalProposal(result.proposal ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "잠시 후 다시 말해 주세요.";
      setLocalMessages((current) => current.map((entry) => entry.id === searchingId ? { ...entry, text: message, status: "error" } : entry));
    } finally {
      setLocalLoading(false);
    }
  }

  return (
    <>
      {item.travelFromPrevious ? (
        <div className="dj-travel-row">
          <span>{item.travelFromPrevious.mode} {item.travelFromPrevious.minutes}분{item.travelFromPrevious.walkingMinutes != null ? ` · 도보 약 ${item.travelFromPrevious.walkingMinutes}분` : ""}</span>
          <p>{item.travelFromPrevious.note}</p>
          {item.travelFromPrevious.fatigue ? <em>이동 피로 {item.travelFromPrevious.fatigue === "high" ? "높음" : item.travelFromPrevious.fatigue === "medium" ? "보통" : "낮음"}</em> : null}
        </div>
      ) : null}
      <article className={`dj-timeline-row ${changed ? "dj-plan-changed" : ""} ${highlight ? "dj-plan-highlight" : ""}`}>
        <div className="dj-time-column"><strong>{item.time}</strong><span>{item.durationMinutes}분</span></div>
        <div className="dj-timeline-track">
          <span className="dj-category-dot"><CategoryIcon category={item.category} size={20} /></span>
          {!isLast ? <i /> : null}
        </div>
        <div className="dj-plan-item dj-card">
          {hasPhoto ? <div className="dj-plan-image"><img src={item.imageUrl} alt={item.imageAlt || item.title} onError={(event) => { if (item.referenceImageUrl && event.currentTarget.src !== item.referenceImageUrl) { event.currentTarget.src = item.referenceImageUrl; return; } event.currentTarget.style.display = "none"; event.currentTarget.parentElement?.classList.add("dj-plan-image-placeholder"); }} /><span>{item.location || `${item.categoryLabel} 후보`}</span><small>{photoLabel}</small>{changed ? <em>방금 조정됨</em> : null}</div> : <div className="dj-plan-image dj-plan-image-placeholder"><MapPinIcon size={25} /><span>{item.location || item.title}</span><small>사진은 상세 페이지에서 확인</small>{changed ? <em>방금 조정됨</em> : null}</div>}
          <div className="dj-plan-item-body">
            <div className="dj-plan-item-top">
              <div className="dj-plan-category"><span>{item.categoryLabel}</span>{highlight ? <em className="dj-highlight-badge">이번 코스의 하이라이트</em> : item.badge ? <em>{item.badge}</em> : null}</div>
              <strong className="dj-plan-price">{money(item.price)}</strong>
            </div>
            <h3>{item.title}</h3>
            <p className="dj-plan-subtitle">{item.subtitle}</p>
            {item.reality ? (
              <div className="dj-reality-strip">
                <span className={item.reality.openNow === true ? "dj-open-now" : ""}>{openLabel}</span>
                <span>{item.reality.priceConfidence === "provider" ? "가격대 확인됨" : "예상 비용"}</span>
                {item.reality.rating ? <span>★ {item.reality.rating.toFixed(1)}{item.reality.reviewCount ? ` · 리뷰 ${item.reality.reviewCount.toLocaleString("ko-KR")}` : ""}</span> : null}
                {item.reality.localIndependent ? <span className="dj-local-place">로컬 매장</span> : null}
              </div>
            ) : null}
            {item.experience?.traits.length ? <div className="dj-experience-traits">{item.experience.traits.slice(0, 4).map((trait) => <span key={trait}>{trait}</span>)}{item.experience.limited ? <span className="dj-limited-candidate">기간 확인 중</span> : null}</div> : null}
            <div className="dj-experience-facts">
              <span><ClockIcon size={14} /> 약 {item.durationMinutes}분</span>
              {item.endTime ? <span><ClockIcon size={14} /> {item.endTime} 종료</span> : null}
              {item.bufferAfterMinutes ? <span>다음 일정 전 여유 {item.bufferAfterMinutes}분</span> : null}
              {item.placeLocked || item.timeLocked ? <span className="dj-fixed-chip"><ShieldIcon size={14} /> 사용자 고정</span> : null}
              {item.visibility === "secret" ? (
                <span className="dj-secret-chip-row">
                  <span className="dj-secret-chip"><LockIcon size={13} /> 동반자에게 비공개</span>
                  <select
                    aria-label={`${item.title} 공개 수준`}
                    value={item.secretDisclosure ?? "hidden"}
                    onChange={(event) => onSetDisclosure(item, event.target.value as "hidden" | "time_only" | "label_only")}
                  >
                    <option value="hidden">완전 숨김</option>
                    <option value="time_only">시간만 표시</option>
                    <option value="label_only">서프라이즈로 표시</option>
                  </select>
                </span>
              ) : null}
              {item.category === "lodging" ? <span><ClockIcon size={14} /> 체크인 {item.time}</span> : null}
              <span><ShieldIcon size={14} /> {reservationLabel}</span>
              {item.reality?.distanceFromPreviousKm != null ? <span><MapPinIcon size={14} /> 앞 일정에서 약 {item.reality.distanceFromPreviousKm.toFixed(1)}km</span> : null}
            </div>
            {item.reality?.reviewHighlights?.length ? <div className="dj-review-glance"><strong>Google 지도 실제 리뷰</strong>{item.reality.reviewHighlights.slice(0, 2).map((review, index) => <p key={`${item.id}-review-${index}`}>“{review}” <small>— {item.reality?.reviewAuthors?.[index] || "지도 이용자"}</small></p>)}</div> : item.reality?.editorialSummary ? <div className="dj-review-glance"><strong>장소 한눈에 보기</strong><p>{item.reality.editorialSummary}</p></div> : null}
            <div className="dj-plan-reason"><SparkleIcon size={15} /><p><strong>{highlight ? "이 하루의 하이라이트인 이유" : "당신에게 맞춰 고른 이유"}</strong>{item.reason || "전체 흐름과 예산을 함께 고려했어요."}{item.experience?.highlightReason ? ` ${item.experience.highlightReason}` : ""}</p></div>
            <div className="dj-plan-actions">
              {item.handoffKind === "self" ? (
                <span className="dj-self-chip">♡ 직접 준비하는 항목</span>
              ) : (
                <a href={item.href} target="_blank" rel="noreferrer" className="dj-btn dj-btn-secondary dj-connect-link">
                  사진·리뷰 더 보기 <ArrowIcon size={16} />
                </a>
              )}
              <button type="button" className="dj-change-button dj-item-change-button" onClick={() => setOpen((value) => !value)}>
                <SparkleIcon size={15} /> {open ? "변경 창 닫기" : `${DAJEONG_BRAND.assistantName}와 이 일정 바꾸기`}
              </button>
              <button
                type="button"
                className={`dj-visibility-toggle ${item.visibility === "secret" ? "dj-visibility-toggle-active" : ""}`}
                onClick={() => onToggleSecret(item)}
                aria-pressed={item.visibility === "secret"}
              >
                <LockIcon size={13} /> {item.visibility === "secret" ? "다시 공개하기" : "동반자에게 비공개"}
              </button>
            </div>
            {open ? (
              <div className="dj-options-panel">
                <div className="dj-item-chat-context">
                  {hasPhoto ? <img src={item.imageUrl} alt={item.imageAlt || item.title} /> : <span><MapPinIcon size={18} /></span>}
                  <div><small>지금 바꾸려는 일정</small><strong>{item.title}</strong><p>{item.reality?.address || item.subtitle}</p></div>
                </div>
                <div className="dj-item-chat" aria-live="polite" ref={localChatRef}>
                  {localMessages.slice(-10).map((message) => <div key={message.id} className={`dj-item-chat-${message.role} ${message.status ? `dj-item-chat-${message.status}` : ""}`}><p>{message.text}{message.status === "searching" ? <i className="dj-thinking-dots"><b /><b /><b /></i> : null}</p></div>)}
                  {localProposal ? <div className="dj-item-route-proposal"><p>{localProposal.reason}</p><button type="button" onClick={() => { onApplyProposal(localProposal); setLocalMessages((current) => [...current, { id: `applied_${Date.now()}`, role: "assistant", text: "좋아요. 이동이 덜 끊기도록 순서까지 바꿨어요." }]); setLocalProposal(null); }}>추천 순서로 바꿔줘</button><button type="button" onClick={() => setLocalProposal(null)}>지금 순서 유지</button></div> : null}
                </div>
                <form className="dj-item-chat-form" onSubmit={ask}><input value={localInstruction} onChange={(event) => setLocalInstruction(event.target.value)} placeholder="예: 여긴 좋은데 더 조용하고 디저트가 맛있는 곳이면 좋겠어" aria-label={`${item.title} 대체 후보 요청`} /><button type="submit" disabled={localLoading || localInstruction.trim().length < 2}>{localLoading ? <span className="dj-spinner dj-spinner-coral" /> : <ArrowIcon size={16} />}</button></form>
                <div className="dj-option-divider"><span>바로 고를 수 있는 후보</span></div>
                {allOptions.map((option) => <OptionCard key={option.id} option={option} selected={option.id === item.id} onSelect={() => { onReplace(option.id); setLocalMessages((current) => [...current, { id: `picked_${Date.now()}`, role: "assistant", text: `좋아요. ‘${option.title}’으로 바꾸고 전체 비용을 다시 계산했어요.` }]); }} />)}
              </div>
            ) : null}
          </div>
        </div>
      </article>
    </>
  );
}

const revisionExamples = ["조금 더 싸게 해줘", "저녁 식당만 바꿔줘", "실내 위주로 바꿔줘", "마지막에 야경 넣어줘", "좀 더 특별하게 해줘"];

const PREP_STATUS_LABEL: Record<string, string> = { suggested: "제안됨", confirmed: "준비 확정", ordered: "주문 완료", ready: "준비 완료", picked_up: "픽업 완료", delivered: "전달 완료", cancelled: "취소됨" };
const PREP_HANDLING_LABEL: Record<string, string> = { pickup: "픽업", delivery: "배송/전달", self_prepared: "직접 준비/보관", unknown: "방식 확인 필요" };

export function PlanWorkspace({ planId }: { planId: string }) {
  const router = useRouter();
  const [plan, setPlan] = useState<DajeongPlan | null | undefined>(undefined);
  const [instruction, setInstruction] = useState("");
  const [revisionMessage, setRevisionMessage] = useState("");
  const [changed, setChanged] = useState<PlanCategory[]>([]);
  const [revising, setRevising] = useState(false);
  const [proposal, setProposal] = useState<PlanChangeProposal | null>(null);
  const [messages, setMessages] = useState<ConciergeMessage[]>([
    chatMessage("assistant", "원하는 장면을 편하게 말해 주세요. 기존 일정은 기억하고 실제 장소와 동선을 확인해 필요한 부분만 바꿀게요."),
  ]);
  const chatRef = useRef<HTMLDivElement>(null);
  const [identity, setIdentity] = useState({ id: "", name: "나" });
  const [companions, setCompanions] = useState<Array<{ companionId: string; companionName: string }>>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);

  useEffect(() => {
    void (async () => {
    const me = await resolveIdentity();
    setIdentity(me);
    const stored = getPlan(planId);
    if (stored && (stored.planKind !== "shared" || stored.ownerId === me.id)) {
      setPlan(stored);
      if (stored?.conversation?.length) setMessages(stored.conversation);
      else if (stored?.revisions?.length) {
        const restored = [...stored.revisions].reverse().flatMap((revision) => [
          chatMessage("user", revision.instruction),
          chatMessage("assistant", revision.summary),
        ]);
        setMessages([
          chatMessage("assistant", "원하는 장면을 편하게 말해 주세요. 기존 일정은 기억하고 필요한 부분만 바꿀게요."),
          ...restored,
        ]);
      }
    } else {
      fetch(`/api/dajeong/plans/shared?planId=${planId}&viewerId=${me.id}`)
        .then((response) => response.json())
        .then((data: { plan?: DajeongPlan; version?: number }) => {
          if (!data.plan) { setPlan(stored ?? null); return; }
          const shared = { ...data.plan, sharedVersion: data.version };
          setPlan(shared);
          if (shared.conversation?.length) setMessages(shared.conversation);
        })
        .catch(() => setPlan(stored ?? null));
    }
    fetch(`/api/dajeong/companions/list?personId=${me.id}`)
      .then((response) => response.json())
      .then((data: { companions?: Array<{ companionId: string; companionName: string }> }) => setCompanions(data.companions ?? []))
      .catch(() => setCompanions([]));
    })();
  }, [planId]);

  useEffect(() => {
    const chat = chatRef.current;
    if (chat) chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });
  }, [messages.length, proposal]);

  // Coming back to this tab (or switching back from another app) re-checks the shared copy —
  // this is what actually catches "the other person changed something while I was away",
  // not just the 20s background poll.
  useEffect(() => {
    if (!plan?.id || plan.planKind !== "shared" || !identity.id) return;
    const planId2 = plan.id;
    const myId = identity.id;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      fetchSharedPlan(planId2, myId).then((result) => {
        if (result && result.version !== plan.sharedVersion) {
          setPlan(result.plan);
          if (result.plan.conversation?.length) setMessages(result.plan.conversation);
        }
      });
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [plan?.id, plan?.planKind, plan?.sharedVersion, identity.id]);

  const role = planRole(plan, identity.id);

  async function replace(item: PlanItem, optionId: string) {
    if (!plan) return;
    const category = item.category;
    let next = replacePlanItem(plan, category, optionId, item.id);
    const selectedTitle = next.items.find((entry) => entry.category === category && entry.dayNumber === item.dayNumber)?.title ?? "새 후보";
    const response = `${selectedTitle}(으)로 바꾸고 전체 비용을 다시 계산했어요.`;
    next = appendPlanConversation(next, `후보에서 ‘${selectedTitle}’ 선택`, response);
    next = {
      ...next,
      revisions: [{
        id: `rev_${Date.now().toString(36)}`,
        instruction: `후보에서 ‘${selectedTitle}’ 선택`,
        summary: response,
        createdAt: new Date().toISOString(),
        changedCategories: [category],
      }, ...(next.revisions ?? [])].slice(0, 12),
    };
    next = appendPlanVersion(next, `후보에서 ‘${selectedTitle}’ 선택`, response);
    // A companion's local plan is already redacted (missing secret items) — publishing it
    // as-is would overwrite the owner's real data. Only the owner's client, which always
    // holds the full plan, is allowed to push a locally-computed result like this.
    if (role !== "companion") {
      next = await syncPlanIfShared(next, identity.id, identity.name, response);
      savePlan(next);
    }
    setPlan(next);
    setChanged([category]);
    setRevisionMessage(`${next.items.find((item) => item.category === category)?.categoryLabel ?? "일정"}만 바꿨어요. 전체 비용도 다시 계산했습니다.`);
    setMessages((current) => [...current, chatMessage("assistant", response)]);
  }

  function applyRevisionResult(result: PlanRevisionResult) {
    setPlan(result.plan);
    if (role !== "companion") savePlan(result.plan);
    if (result.profileUpdate) rememberPersonProfile(result.plan.situation, { memoryUpdate: result.profileUpdate });
    if (result.paceUpdate?.scope === "profile") rememberPacePreference(result.plan.companionId ?? "solo", result.paceUpdate);
  }

  async function revise(event?: FormEvent, example?: string) {
    event?.preventDefault();
    if (!plan) return;
    const nextInstruction = (example ?? instruction).trim();
    if (nextInstruction.length < 2) return;
    setRevising(true);
    setProposal(null);
    setRevisionMessage("");
    const searching = chatMessage("assistant", "요청을 이해했어요. 근처의 실제 장소와 남은 예산, 앞뒤 이동 동선을 확인하고 있어요…", "searching");
    setMessages((current) => [...current, chatMessage("user", nextInstruction), searching]);
    try {
      const result = await reviseAnyPlan(plan, identity.id, identity.name, nextInstruction);
      applyRevisionResult(result);
      setChanged(result.changedCategories);
      setRevisionMessage(result.message);
      setProposal(result.proposal ?? null);
      setMessages((current) => current.map((message) => message.id === searching.id
        ? { ...message, text: result.message, status: result.proposal ? "proposal" : "done" }
        : message));
      setInstruction("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "잠시 후 다시 말해 주세요.";
      setRevisionMessage(message);
      setMessages((current) => current.map((entry) => entry.id === searching.id ? { ...entry, text: message, status: "error" } : entry));
    } finally {
      setRevising(false);
    }
  }

  async function reviseItem(item: PlanItem, nextInstruction: string): Promise<PlanRevisionResult> {
    if (!plan) throw new Error("계획을 불러오지 못했어요.");
    const result = await reviseAnyPlan(plan, identity.id, identity.name, nextInstruction, item.category, item.id);
    applyRevisionResult(result);
    setChanged(result.changedCategories);
    setRevisionMessage(result.message);
    return result;
  }

  async function sendPrepText(text: string, prepId?: string) {
    if (!plan) return;
    try {
      const result = await reviseAnyPlan(plan, identity.id, identity.name, text, undefined, prepId);
      applyRevisionResult(result);
      setMessages((current) => [...current, chatMessage("user", text), chatMessage("assistant", result.message)]);
    } catch (error) {
      setRevisionMessage(error instanceof Error ? error.message : "준비 항목을 바꾸지 못했어요.");
    }
  }

  async function toggleSecret(item: PlanItem) {
    if (!plan || role === "companion") return;
    const text = item.visibility !== "secret" ? `${item.title} 일정은 동반자에게 비밀로 해줘` : `${item.title} 일정은 이제 공개해도 돼`;
    try {
      const result = await reviseAnyPlan(plan, identity.id, identity.name, text, item.category, item.id);
      applyRevisionResult(result);
      setMessages((current) => [...current, chatMessage("user", text), chatMessage("assistant", result.message)]);
    } catch (error) {
      setRevisionMessage(error instanceof Error ? error.message : "비공개 설정을 바꾸지 못했어요.");
    }
  }

  async function setDisclosure(item: PlanItem, disclosure: "hidden" | "time_only" | "label_only") {
    if (!plan || role === "companion") return;
    const text = disclosure === "hidden"
      ? `${item.title}은 완전히 숨겨줘`
      : disclosure === "time_only"
        ? `${item.title}은 시간만 보여줘`
        : `${item.title}은 서프라이즈라고만 보여줘`;
    try {
      const result = await reviseAnyPlan(plan, identity.id, identity.name, text, item.category, item.id);
      applyRevisionResult(result);
      setMessages((current) => [...current, chatMessage("user", text), chatMessage("assistant", result.message)]);
    } catch (error) {
      setRevisionMessage(error instanceof Error ? error.message : "공개 수준을 바꾸지 못했어요.");
    }
  }

  async function shareWithCompanion(companionId: string, companionName: string) {
    if (!plan || shareBusy) return;
    setShareBusy(true);
    try {
      const response = await fetch("/api/dajeong/plans/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, ownerId: identity.id, ownerName: identity.name, companionId, companionName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "공유하지 못했어요.");
      const next = { ...data.plan, sharedVersion: data.version } as DajeongPlan;
      setPlan(next);
      savePlan(next);
      setRevisionMessage(`${companionName}님과 계획을 공유했어요.`);
      setShareOpen(false);
    } catch (error) {
      setRevisionMessage(error instanceof Error ? error.message : "공유하지 못했어요.");
    } finally {
      setShareBusy(false);
    }
  }

  async function unshare() {
    if (!plan || plan.planKind !== "shared" || shareBusy) return;
    if (!window.confirm("공유를 해제할까요? 동반자는 더 이상 이 계획을 볼 수 없게 돼요.")) return;
    setShareBusy(true);
    try {
      await fetch("/api/dajeong/plans/unshare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, actorId: identity.id }),
      });
      const next = { ...plan, planKind: "solo" as const, companionId: undefined, companionName: undefined };
      setPlan(next);
      savePlan(next);
      setRevisionMessage("공유를 해제했어요. 이제 나만 볼 수 있는 계획이에요.");
    } finally {
      setShareBusy(false);
    }
  }

  async function applyItemProposal(nextProposal: PlanChangeProposal) {
    let next = appendPlanConversation(nextProposal.plan, "추천한 동선으로 바꿔줘", "좋아요. 이동이 덜 끊기도록 순서까지 바꿨어요.");
    if (role !== "companion") {
      next = await syncPlanIfShared(next, identity.id, identity.name, "이동이 덜 끊기도록 순서까지 바꿨어요.");
      savePlan(next);
    }
    setPlan(next);
    setChanged(next.items.map((item) => item.category));
    setRevisionMessage("이동이 덜 끊기도록 일정 순서를 바꿨어요.");
  }

  async function acceptProposal() {
    if (!proposal) return;
    let next = appendPlanConversation(proposal.plan, "추천한 순서로 바꿔줘", "좋아요. 이동이 덜 끊기도록 일정 순서를 바꿨어요. 실제 이동시간은 출발 전에 지도에서 한 번 더 확인해 주세요.");
    if (role !== "companion") {
      next = await syncPlanIfShared(next, identity.id, identity.name, "이동이 덜 끊기도록 일정 순서를 바꿨어요.");
      savePlan(next);
    }
    setPlan(next);
    setChanged(next.items.map((item) => item.category));
    setMessages((current) => [...current, chatMessage("user", "추천한 순서로 바꿔줘"), chatMessage("assistant", "좋아요. 이동이 덜 끊기도록 일정 순서를 바꿨어요. 실제 이동시간은 출발 전에 지도에서 한 번 더 확인해 주세요.")]);
    setProposal(null);
  }

  async function keepCurrentOrder() {
    if (plan) {
      let next = appendPlanConversation(plan, "지금 순서를 유지할게", "알겠어요. 장소만 바꾸고 기존 순서는 그대로 유지했어요.");
      if (role !== "companion") {
        next = await syncPlanIfShared(next, identity.id, identity.name, "장소만 바꾸고 기존 순서는 그대로 유지했어요.");
        savePlan(next);
      }
      setPlan(next);
    }
    setMessages((current) => [...current, chatMessage("user", "지금 순서를 유지할게"), chatMessage("assistant", "알겠어요. 장소만 바꾸고 기존 순서는 그대로 유지했어요.")]);
    setProposal(null);
  }

  async function confirmPlan() {
    if (!plan || plan.budgetRemaining < 0 || role === "companion") return;
    const confirmed: DajeongPlan = {
      ...plan,
      status: "confirmed",
      items: plan.items.map((item) => ({ ...item, status: "confirmed" })),
    };
    let next: DajeongPlan = {
      ...confirmed,
      execution: prepareReservationOrder(confirmed, { previous: plan.execution, includeTravel: true }),
    };
    next = await syncPlanIfShared(next, identity.id, identity.name, "계획을 확정하고 예약 준비를 시작했어요.");
    savePlan(next);
    router.push(`/dajeong/plan/${plan.id}/execute`);
  }

  async function setNotificationLevel(level: "normal" | "content_hidden" | "off") {
    if (!plan || role === "companion") return;
    let next: DajeongPlan = { ...plan, notificationLevel: level };
    next = await syncPlanIfShared(next, identity.id, identity.name, "알림 공개 수준을 바꿨어요.");
    savePlan(next);
    setPlan(next);
    // The plan-level toggle drives this person's actual notification privacy setting — a secret
    // item's push must be governed by the same choice shown here, not a second hidden setting.
    fetch("/api/dajeong/notifications/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: identity.id, secretPrivacyLevel: level }),
    }).catch(() => {});
  }

  if (plan === undefined) return <div className="dj-loading-page"><span className="dj-spinner dj-spinner-coral" /><p>계획을 꺼내고 있어요</p></div>;
  if (!plan) return <div className="dj-empty-page dj-narrow"><span className="dj-empty-mark"><SparkleIcon size={28} /></span><h1>이 계획을 찾지 못했어요</h1><p>이 기기에 저장된 계획이 아니거나 브라우저 데이터가 지워졌을 수 있어요.</p><Link href="/dajeong" className="dj-btn dj-btn-primary">새 계획 만들기 <ArrowIcon size={17} /></Link></div>;

  const overBudget = plan.budgetRemaining < 0;
  const spendPercent = Math.min(100, Math.round((plan.total / plan.budget) * 100));
  const start = plan.items[0]?.time ?? plan.situation.startTime ?? "14:00";
  const end = plan.schedule?.estimatedEndTime ?? plan.items.at(-1)?.endTime ?? plan.items.at(-1)?.time ?? plan.situation.preferredTime;
  const tripLabel = plan.situation.planScope === "trip" ? ` · ${plan.situation.tripNights ?? 0}박 ${plan.situation.tripDays ?? 1}일` : "";
  const constraints = plan.situation.constraints ?? [];

  const hasSecretItems = plan.items.some((item) => item.visibility === "secret");
  const availableCompanions = companions.filter((entry) => entry.companionId !== plan.companionId);

  return (
    <div className="dj-plan-page dj-container">
      <div className="dj-plan-breadcrumb"><Link href="/dajeong">새 계획</Link><ChevronIcon size={14} /><span>계획 검토</span><ChevronIcon size={14} /><Link href={`/dajeong/plan/${plan.id}/today`}>오늘 일정 보기</Link></div>
      <section className="dj-plan-hero dj-animate">
        <div>
          <span className="dj-kicker"><SparkleIcon size={15} /> 상황을 읽고 하루로 만들었어요</span>
          <h1>{plan.title}</h1>
          <p>{plan.summary}</p>
          <div className="dj-hero-tags"><span>{plan.situation.occasionLabel}</span><span>{plan.situation.recipient}</span>{plan.situation.ageBand !== "미상" ? <span>{plan.situation.ageBand}</span> : null}{plan.situation.desiredMoods.slice(0, 2).map((mood) => <span key={mood}>{MOOD_LABEL[mood]}</span>)}{constraints.slice(0, 2).map((value) => <span key={value}>{value}</span>)}</div>
        </div>
        <div className="dj-readiness"><div className="dj-readiness-ring" style={{ "--readiness": `${plan.readiness * 3.6}deg` } as React.CSSProperties}><strong>{plan.readiness}</strong><span>조건 일치도</span></div></div>
      </section>

      {role !== "companion" && identity.id ? <NotificationPermissionPrompt plan={plan} personId={identity.id} /> : null}

      {role !== "companion" ? (
        <div className="dj-plan-header-actions">
          {plan.planKind === "shared" ? (
            <>
              <span className="dj-share-status"><UsersIcon size={13} /> {plan.companionName ?? "동반자"}와 공유 중</span>
              <button type="button" className="dj-visibility-toggle" onClick={unshare} disabled={shareBusy}>공유 해제</button>
            </>
          ) : (
            <button type="button" className="dj-visibility-toggle" onClick={() => setShareOpen((value) => !value)}>
              <UsersIcon size={13} /> 동반자와 공유
            </button>
          )}
          {hasSecretItems ? <span className="dj-share-status dj-secret-mode-badge"><LockIcon size={13} /> 일부 비공개 포함</span> : null}
          {hasSecretItems && plan.planKind === "shared" ? (
            <span className="dj-notify-group" role="group" aria-label="비공개 일정 알림 수준">
              {(["normal", "content_hidden", "off"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`dj-visibility-toggle ${((plan.notificationLevel ?? "content_hidden") === level) ? "dj-visibility-toggle-active" : ""}`}
                  onClick={() => setNotificationLevel(level)}
                >
                  {level === "normal" ? "일반 알림" : level === "content_hidden" ? "내용 숨긴 알림" : "알림 끄기"}
                </button>
              ))}
            </span>
          ) : null}
          {shareOpen ? (
            <div className="dj-share-panel dj-card">
              {availableCompanions.length ? availableCompanions.map((companion) => (
                <button key={companion.companionId} type="button" className="dj-btn dj-btn-secondary" onClick={() => shareWithCompanion(companion.companionId, companion.companionName)} disabled={shareBusy}>
                  {companion.companionName}와 공유하기
                </button>
              )) : <p>연결된 동반자가 없어요. <Link href="/dajeong/companions">동반자를 먼저 연결</Link>해 주세요.</p>}
            </div>
          ) : null}
        </div>
      ) : null}

      {plan.discovery ? (
        <div className={`dj-discovery-banner dj-discovery-${plan.discovery.status}`}>
          <span><MapPinIcon size={17} /></span>
          <div><strong>{plan.discovery.realPlaceCount > 0 ? `방문할 수 있는 장소 후보 ${plan.discovery.realPlaceCount}곳을 찾았어요` : "장소 정보를 더 확인하고 있어요"}</strong><p>{plan.discovery.message} · {checkedLabel(plan.discovery.checkedAt)}</p></div>
        </div>
      ) : null}

      {plan.schedule?.weather ? (
        <div className={`dj-weather-banner dj-weather-${plan.schedule.weather.status}`}>
          <div><strong>{plan.schedule.weather.status === "verified" ? "실제 예보를 일정에 반영했어요" : plan.schedule.weather.status === "user_report" ? "말해준 날씨를 임시 조건으로 반영했어요" : "날씨는 아직 확정하지 않았어요"}</strong><p>{plan.schedule.weather.message}{plan.schedule.weather.checkedAt ? ` · ${checkedLabel(plan.schedule.weather.checkedAt)}` : ""}</p></div>
        </div>
      ) : null}

      {plan.schedule?.warnings.length ? <div className="dj-schedule-warnings"><strong>출발 전 확인할 현실 조건</strong>{plan.schedule.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : null}

      <div className="dj-fact-row">
        <div><ClockIcon size={19} /><span>날짜·전체 시간</span><strong>{displayDate(plan.situation.targetDate)}{tripLabel} · {start}~{end}</strong>{plan.schedule?.estimatedHomeArrival ? <small>예상 귀가 {plan.schedule.estimatedHomeArrival}</small> : null}</div>
        <div><MapPinIcon size={19} /><span>활동 지역</span><strong>{plan.situation.region}</strong></div>
        <div><WalletIcon size={19} /><span>총 예상 비용</span><strong>{money(plan.total)}</strong></div>
        <div><ShieldIcon size={19} /><span>예약 확인</span><strong>{plan.items.filter((item) => item.reservationRequired).length}곳 필요</strong></div>
      </div>

      <section className="dj-revision-studio">
        <div className="dj-revision-heading"><span className="dj-concierge-avatar"><SparkleIcon size={18} /></span><div><strong>{DAJEONG_BRAND.assistantName}와 마음에 들 때까지 조정하세요</strong><p>사람의 취향과 기존 일정은 기억하고, 필요한 부분만 바꿉니다.</p></div></div>
        <div className="dj-concierge-chat" aria-live="polite" ref={chatRef}>
          {messages.slice(-16).map((message) => (
            <div key={message.id} className={`dj-chat-message dj-chat-${message.role} dj-chat-${message.status}`}>
              {message.role === "assistant" ? <span className="dj-chat-avatar"><SparkleIcon size={13} /></span> : null}
              <p>{message.text}{message.status === "searching" ? <i className="dj-thinking-dots"><b /><b /><b /></i> : null}</p>
            </div>
          ))}
          {proposal ? (
            <div className="dj-proposal-actions">
              <p>{proposal.reason}</p>
              <div><button type="button" onClick={acceptProposal}>이 순서로 바꿀게요</button><button type="button" onClick={keepCurrentOrder}>지금 순서 유지</button></div>
            </div>
          ) : null}
        </div>
        <form className="dj-revision-form" onSubmit={(event) => revise(event)}>
          <input value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="예: 엄마가 매운 걸 못 드셔. 식사와 동선을 자연스럽게 다시 맞춰줘" aria-label="계획 수정 요청" />
          <button type="submit" disabled={revising || instruction.trim().length < 2}>{revising ? <span className="dj-spinner dj-spinner-coral" /> : <ArrowIcon size={18} />}<span>조정</span></button>
        </form>
        <div className="dj-revision-examples">{revisionExamples.map((example) => <button key={example} type="button" onClick={() => revise(undefined, example)} disabled={revising}>{example}</button>)}</div>
        {revisionMessage ? <span className="dj-sr-only" role="status">{revisionMessage}</span> : null}
      </section>

      <div className="dj-plan-layout">
        <section className="dj-plan-main">
          <div className="dj-section-heading"><div><span>오늘의 여정</span><h2>실제로 따라갈 수 있는 시간표</h2>{plan.experienceFlow ? <small className="dj-flow-story">{plan.experienceFlow.labels.join(" → ")}</small> : null}</div><p>{plan.items.length}개의 경험 · {plan.schedule?.density === "compact" ? "알차게" : plan.schedule?.density === "relaxed" ? "여유롭게" : "균형 있게"}</p></div>
          {plan.logistics?.length ? <div className="dj-trip-logistics"><strong>현실 이동 기준</strong>{plan.logistics.map((item) => <div key={item.id}><span>{item.dayNumber}일차 · {item.time}</span><p><b>{item.title}</b>{item.note}</p></div>)}</div> : null}

          <section className="dj-prep-section">
            <div className="dj-prep-heading">
              <span className="dj-summary-eyebrow">데이트 전에 챙길 것</span>
              {role !== "companion" ? <button type="button" className="dj-visibility-toggle" onClick={() => sendPrepText("뭘 준비해야 할지 모르겠어, 추천해줘")}>AI에게 준비 추천 요청</button> : null}
            </div>
            {plan.prep?.filter((item) => item.status !== "cancelled").length ? (
              <div className="dj-prep-list">
                {plan.prep.filter((item) => item.status !== "cancelled").map((item) => (
                  <div key={item.id} className="dj-prep-row">
                    <div className="dj-prep-row-main">
                      <strong>{item.title}</strong>
                      <span>{item.date}{item.time ? ` · ${item.time}` : ""} · {PREP_HANDLING_LABEL[item.handling]} · {PREP_STATUS_LABEL[item.status]}</span>
                      {item.handlingReason ? <em>{item.handlingReason}</em> : null}
                      {item.visibility !== "shared" ? <span className="dj-secret-chip"><LockIcon size={12} /> {item.visibility === "secret" ? "동반자에게 비공개" : "나만 보기"}</span> : null}
                    </div>
                    {role !== "companion" ? (
                      <div className="dj-prep-row-actions">
                        <button type="button" onClick={() => sendPrepText("준비 완료했어", item.id)}>완료</button>
                        <button type="button" className={item.visibility === "secret" ? "dj-visibility-toggle-active" : ""} onClick={() => sendPrepText(item.visibility === "secret" ? `${item.title}은 이제 공개해도 돼` : `${item.title} 준비는 여자친구한테 비밀로 해줘`, item.id)}>{item.visibility === "secret" ? "공개" : "비공개"}</button>
                        <button type="button" onClick={() => sendPrepText("이건 그냥 취소하자", item.id)}>취소</button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="dj-companion-empty">{plan.prepDeclined ? "따로 준비할 건 없다고 기억했어요." : "아직 준비 목록이 비어 있어요. “꽃이랑 케이크 준비하고 싶어”처럼 말하거나 위 버튼을 눌러보세요."}</p>
            )}
          </section>

          <div className="dj-timeline">
            {plan.items.map((item, index) => <Fragment key={item.id}>{(plan.situation.planScope === "trip" && (index === 0 || plan.items[index - 1]?.dayNumber !== item.dayNumber)) ? <div className="dj-plan-day-divider"><span>{item.dayNumber ?? 1}일차</span><strong>{index === 0 ? displayDate(plan.situation.targetDate) : "다음 날"}</strong></div> : null}<TimelineItem item={item} isLast={index === plan.items.length - 1} changed={changed.includes(item.category)} highlight={plan.experienceFlow?.highlightItemId === item.id} onReplace={(optionId) => replace(item, optionId)} onAsk={(nextInstruction) => reviseItem(item, nextInstruction)} onApplyProposal={applyItemProposal} onToggleSecret={toggleSecret} onSetDisclosure={setDisclosure} /></Fragment>)}
          </div>
        </section>

        <aside className="dj-plan-summary dj-card">
          <span className="dj-summary-eyebrow">하루 한눈에 보기</span>
          <div className="dj-summary-heading"><span>총 예상 비용</span><strong>{money(plan.total)}</strong></div>
          <div className="dj-budget-meter"><i style={{ width: `${spendPercent}%` }} /></div>
          <div className="dj-summary-lines">{plan.items.map((item) => <div key={item.id}><span>{plan.situation.planScope === "trip" ? `${item.dayNumber ?? 1}일차 · ` : ""}{item.time} · {item.categoryLabel}</span><strong>{money(item.price)}</strong></div>)}</div>
          <div className={`dj-budget-remaining ${overBudget ? "dj-over-budget" : ""}`}>
            <div><span>{overBudget ? "초과 금액" : "남겨둔 여유"}</span><strong>{money(Math.abs(plan.budgetRemaining))}</strong></div>
            <p>{overBudget ? "더 가벼운 선택으로 바꿔 주세요." : "교통비와 현장 변동을 위해 일부러 남겨뒀어요."}</p>
          </div>
          <div className="dj-booking-summary"><strong>확인할 예약</strong>{plan.items.filter((item) => item.reservationRequired).map((item) => <span key={item.id}><i />{item.dayNumber && plan.situation.planScope === "trip" ? `${item.dayNumber}일차 ` : ""}{item.time} {item.title}</span>)}</div>
          {role !== "companion" ? (
            <>
              <button className="dj-btn dj-btn-primary dj-confirm-button" type="button" onClick={confirmPlan} disabled={overBudget}>확정하고 예약 준비하기 <ArrowIcon size={17} /></button>
              <p className="dj-summary-trust"><ShieldIcon size={14} /> 다음 화면에서 예약할 곳과 예약금을 먼저 확인합니다. 최종 승인 전에는 결제하거나 예약 완료로 표시하지 않아요.</p>
            </>
          ) : (
            <p className="dj-summary-trust"><ShieldIcon size={14} /> 계획 확정과 예약 준비는 계획을 만든 사람만 진행할 수 있어요.</p>
          )}
        </aside>
      </div>

      <div className="dj-honesty-note"><ShieldIcon size={20} /><div><strong>추천과 실제 확정을 분명히 나눕니다</strong><p>{plan.notice}</p></div></div>
    </div>
  );
}
