"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { DAJEONG_BRAND } from "../lib/brand";
import { resolveIdentity } from "../lib/identity";
import { getPersonProfile, listPlans, rememberPersonProfile, savePlan } from "../lib/storage";
import type { DajeongPlan, PlanRequest, PlanningConversationResult, PlanningQuestionKey, PlanRevisionResult } from "../lib/types";
import { ArrowIcon, ArrowUpIcon, CalendarIcon, CategoryIcon, CheckIcon, HeartIcon, InfoIcon, PlusIcon, SparkleIcon } from "./DajeongIcons";
import { ThemePicker } from "./DajeongTheme";

const examples = [
  { key: "flower", title: "꽃", prompt: "꽃 사고 싶은데 예쁜 거 예약 좀 해줘", tone: "dj-prompt-flower", icon: <CategoryIcon category="flower" size={22} /> },
  { key: "weekend", title: "주말", prompt: "이번 주말에 여자친구랑 놀러 가고 싶어", tone: "dj-prompt-weekend", icon: <CalendarIcon size={21} /> },
  { key: "meal", title: "식당", prompt: "오늘 저녁 분위기 좋은 식당 잡아줘", tone: "dj-prompt-meal", icon: <CategoryIcon category="meal" size={22} /> },
  { key: "birthday", title: "생일", prompt: "여자친구 생일인데 특별하게 보내고 싶어", tone: "dj-prompt-birthday", icon: <CategoryIcon category="gift" size={22} /> },
  { key: "gift", title: "선물", prompt: "여자친구 선물 같이 골라줘", tone: "dj-prompt-gift", icon: <HeartIcon size={21} /> },
];

type HomeConversationEntry = {
  id: string;
  role: "user" | "assistant";
  text: string;
  plan?: DajeongPlan;
};

function homeEntry(role: HomeConversationEntry["role"], text: string, plan?: DajeongPlan): HomeConversationEntry {
  return { id: `home_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`, role, text, plan };
}

function displayDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function requestMessages(entries: HomeConversationEntry[], latest: string) {
  return [
    ...entries.filter((entry) => !entry.plan).map((entry) => ({ role: entry.role, text: entry.text })),
    { role: "user" as const, text: latest },
  ];
}

export function HomePlanner() {
  const [request, setRequest] = useState("");
  const [draft, setDraft] = useState<Partial<PlanRequest>>({});
  const [pendingQuestion, setPendingQuestion] = useState<PlanningQuestionKey>(null);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [loading, setLoading] = useState<"analyze" | "plan" | null>(null);
  const [searchStage, setSearchStage] = useState("");
  const [error, setError] = useState("");
  const [completedPlan, setCompletedPlan] = useState<DajeongPlan | null>(null);
  const [conversation, setConversation] = useState<HomeConversationEntry[]>([]);
  const [plans, setPlans] = useState<DajeongPlan[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [localName, setLocalName] = useState("");
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();

  useEffect(() => {
    const refresh = () => setPlans(listPlans());
    // Same reasoning as PlansWorkspace: the sidebar's "recent plans" must scope to whoever is
    // actually signed in right now, so resolve identity before the first read.
    void resolveIdentity().then((identity) => {
      setLocalName(identity.name);
      refresh();
    });
    window.addEventListener("dajeong:plans-updated", refresh);
    return () => window.removeEventListener("dajeong:plans-updated", refresh);
  }, []);

  // 이름을 아직 모를 때 "나님"처럼 어색하게 부르지 않는다.
  const knownName = session?.user?.name?.trim() || (localName && localName !== "나" ? localName : "");

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversation.length, searchStage, completedPlan, error, quickReplies.length]);

  function resetConversation() {
    setRequest("");
    setDraft({});
    setPendingQuestion(null);
    setQuickReplies([]);
    setCompletedPlan(null);
    setConversation([]);
    setSearchStage("");
    setError("");
    setSidebarOpen(false);
  }

  async function createPlan(result: PlanningConversationResult) {
    setLoading("plan");
    setError("");
    setQuickReplies([]);
    setSearchStage(result.understanding.situation.planScope === "trip" ? "숙소와 실제 장소를 함께 찾고 있어요" : "취향에 맞는 실제 장소를 찾고 있어요");
    const timer = window.setInterval(() => {
      setSearchStage((current) => current.includes("실제 장소") || current.includes("숙소")
        ? "사진·리뷰·영업 정보와 가격을 확인하고 있어요"
        : current.includes("사진")
          ? "체크인과 일정 사이 이동이 자연스럽게 이어지는지 맞추고 있어요"
          : "예산 안에서 하루의 하이라이트를 고르고 있어요");
    }, 1500);
    try {
      const remembered = getPersonProfile(result.understanding.situation.recipient);
      const payload: PlanRequest = {
        ...result.draft,
        request: result.draft.request || result.understanding.situation.occasionLabel,
        personProfile: result.draft.personProfile ?? remembered ?? undefined,
      };
      const response = await fetch("/api/dajeong/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({})) as { plan?: DajeongPlan; error?: string };
      if (!response.ok || !data.plan) throw new Error(data.error || "계획을 만들지 못했어요. 방금 답변을 그대로 한 번 더 보내 주세요.");
      rememberPersonProfile(data.plan.situation, {
        ageBand: data.plan.situation.ageBand,
        preferences: data.plan.situation.preferences,
        moodPreferences: data.plan.situation.desiredMoods,
        memoryUpdate: data.plan.situation.personMemoryUpdate,
      });
      savePlan(data.plan);
      setPlans(listPlans());
      setCompletedPlan(data.plan);
      setConversation((current) => [...current, homeEntry("assistant", "후보와 동선을 다 정했어요. 마음에 들지 않는 부분은 여기서 바로 말로 바꿀 수도 있어요.", data.plan)]);
      setSearchStage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "잠시 후 다시 시도해 주세요.");
      setSearchStage("");
    } finally {
      window.clearInterval(timer);
      setLoading(null);
    }
  }

  async function reviseCompletedPlan(nextRequest: string) {
    if (!completedPlan) return;
    const currentPlan = completedPlan;
    setLoading("plan");
    setSearchStage("지금 계획을 기억하면서 말씀하신 부분을 이해하고 있어요");
    setError("");
    try {
      const response = await fetch("/api/dajeong/plans/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: currentPlan, instruction: nextRequest }),
      });
      const result = await response.json().catch(() => ({})) as PlanRevisionResult & { error?: string };
      if (!response.ok || !result.plan) throw new Error(result.error || "계획을 조정하지 못했어요.");
      savePlan(result.plan);
      if (result.profileUpdate) rememberPersonProfile(result.plan.situation, { memoryUpdate: result.profileUpdate });
      setPlans(listPlans());
      setCompletedPlan(result.plan);
      setConversation((current) => [...current, homeEntry("assistant", result.message, result.plan)]);
    } catch (err) {
      setCompletedPlan(currentPlan);
      setError(err instanceof Error ? err.message : "잠시 후 다시 말해 주세요.");
    } finally {
      setSearchStage("");
      setLoading(null);
    }
  }

  async function sendMessage(nextRequest: string) {
    const text = nextRequest.trim();
    if (text.length < 1 || loading) return;
    setRequest("");
    setQuickReplies([]);
    setConversation((current) => [...current, homeEntry("user", text)]);
    if (completedPlan) {
      await reviseCompletedPlan(text);
      return;
    }
    setLoading("analyze");
    setSearchStage("말씀하신 내용을 앞 대화와 함께 이해하고 있어요");
    setError("");
    try {
      const response = await fetch("/api/dajeong/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: requestMessages(conversation, text),
          draft,
          currentQuestion: pendingQuestion,
        }),
      });
      const result = await response.json().catch(() => ({})) as PlanningConversationResult & { error?: string };
      if (!response.ok || !result.understanding) throw new Error(result.error || "말씀하신 내용을 이해하지 못했어요.");
      const remembered = getPersonProfile(result.understanding.situation.recipient);
      const nextDraft = remembered && !result.draft.personProfile ? { ...result.draft, personProfile: remembered } : result.draft;
      const nextResult = { ...result, draft: nextDraft };
      setDraft(nextDraft);
      setPendingQuestion(result.questionKey);
      setQuickReplies(result.quickReplies);
      setConversation((current) => [...current, homeEntry("assistant", result.reply)]);
      setSearchStage("");
      if (result.ready) await createPlan(nextResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "잠시 후 다시 말해 주세요.");
      setSearchStage("");
    } finally {
      setLoading((current) => current === "analyze" ? null : current);
    }
  }

  function analyze(event?: FormEvent, value?: string) {
    event?.preventDefault();
    const nextRequest = (value ?? request).trim();
    if (!nextRequest) {
      setError("편하게 한마디만 말해 주세요. 하루위드가 이어서 물어볼게요.");
      return;
    }
    void sendMessage(nextRequest);
  }

  function handleComposerKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      analyze();
    }
  }

  return (
    <div className="dj-chat-shell">
      <aside className={`dj-chat-sidebar ${sidebarOpen ? "dj-sidebar-open" : ""}`}>
        <div className="dj-sidebar-head"><strong>{DAJEONG_BRAND.name}</strong><button type="button" onClick={() => setSidebarOpen(false)} aria-label="닫기">×</button></div>
        <button type="button" className="dj-new-chat" onClick={resetConversation}><PlusIcon size={19} /> 새 계획</button>
        <Link href="/dajeong/plans" className="dj-sidebar-plans"><HeartIcon size={18} /> 내 계획 <b>{plans.length}</b></Link>
        <div className="dj-sidebar-label">최근 대화</div>
        <nav className="dj-conversation-list" aria-label="최근 계획">
          {plans.length ? plans.slice(0, 12).map((plan) => (
            <Link key={plan.id} href={`/dajeong/plan/${plan.id}`} onClick={() => setSidebarOpen(false)}><strong>{plan.title}</strong><span>{displayDate(plan.situation.targetDate)} · {plan.situation.region}</span></Link>
          )) : <p>아직 준비한 계획이 없어요.</p>}
        </nav>
        <div className="dj-sidebar-foot">
          <p><SparkleIcon size={14} /> 발견부터 실행 준비까지 한 대화에서 이어가요.</p>
        </div>
      </aside>
      {sidebarOpen ? <button className="dj-sidebar-backdrop" type="button" aria-label="대화 목록 닫기" onClick={() => setSidebarOpen(false)} /> : null}

      <main className="dj-chat-main">
        <header className="dj-chat-topbar">
          <button className="dj-mobile-sidebar-button" type="button" onClick={() => setSidebarOpen(true)} aria-label="대화 목록 열기"><span /><span /><span /></button>
          <div className="dj-greeting">
            <strong>{knownName ? `${knownName}님` : "반가워요"}</strong>
            <small>좋은 하루가 될 거예요!</small>
          </div>
          <div className="dj-topbar-actions">
            <ThemePicker />
            <Link href="/dajeong/plans" className="dj-topbar-plans">내 계획</Link>
          </div>
        </header>

        <section className="dj-home-conversation" aria-live="polite">
          <div className="dj-home-hero">
            <div className="dj-hero-title">
              <span className="dj-hero-orb"><SparkleIcon size={25} /></span>
              <h1>어떤 하루가 필요하세요?</h1>
            </div>
            <p>정해진 게 없어도 괜찮아요. 누구와 무엇을 하고 싶은지만 말하면 제가 필요한 것을 하나씩 여쭤볼게요.</p>
          </div>

          {!conversation.length ? (
            <div className="dj-prompt-suggestions">
              <p>이렇게 물어보세요!</p>
              <div className="dj-prompt-grid">
                {examples.map((example) => (
                  <button key={example.key} type="button" onClick={() => setRequest(example.prompt)}>
                    <span className={example.tone}>{example.icon}</span>
                    <span><strong>{example.title}</strong><small>{example.prompt}</small></span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {conversation.map((entry) => entry.role === "user" ? (
            <div key={entry.id} className="dj-home-message dj-home-user"><div><p>{entry.text}</p></div></div>
          ) : entry.plan ? (
            <div key={entry.id} className="dj-home-message dj-home-assistant"><span className="dj-home-avatar"><SparkleIcon size={16} /></span><div className="dj-plan-ready-message"><span><CheckIcon size={15} /> {entry.text}</span><strong>{entry.plan.title}</strong><p>{entry.plan.items.length}개 일정 · 예상 {entry.plan.total.toLocaleString("ko-KR")}원 · {entry.plan.situation.region}</p><Link href={`/dajeong/plan/${entry.plan.id}`}>후보들 같이 보러 가기 <ArrowIcon size={17} /></Link></div></div>
          ) : (
            <div key={entry.id} className="dj-home-message dj-home-assistant"><span className="dj-home-avatar"><SparkleIcon size={16} /></span><div><p>{entry.text}</p></div></div>
          ))}

          {searchStage ? <div className="dj-home-message dj-home-assistant dj-home-searching"><span className="dj-home-avatar"><SparkleIcon size={16} /></span><div><p>{searchStage}</p><i><b /><b /><b /></i></div></div> : null}
          {error ? <div className="dj-home-message dj-home-assistant dj-home-error"><span className="dj-home-avatar">!</span><div><p>{error}</p></div></div> : null}
          <div ref={conversationEndRef} aria-hidden="true" />
        </section>

        <div className="dj-home-composer-wrap">
          <form className="dj-home-composer" onSubmit={(event) => analyze(event)}>
            <button type="button" className="dj-composer-plus" onClick={resetConversation} aria-label="새 계획 시작"><PlusIcon size={20} /></button>
            <textarea value={request} onChange={(event) => setRequest(event.target.value)} onKeyDown={handleComposerKey} placeholder={pendingQuestion ? "대답을 편하게 말해 주세요" : "어떤 하루가 필요한지 말해 주세요"} aria-label={`${DAJEONG_BRAND.assistantName}에게 상황 말하기`} rows={1} />
            <button type="submit" className="dj-composer-send" disabled={Boolean(loading) || request.trim().length < 1} aria-label="보내기"><ArrowUpIcon size={20} /></button>
          </form>
          <p><InfoIcon size={13} /> 실제 장소와 리뷰를 확인하고, 결제·예약은 금액 확인 후 승인받아요.</p>
        </div>
      </main>
    </div>
  );
}
