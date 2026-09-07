import type { ConciergeMessage, DajeongPlan, ItemVisibility, PacePreference, PlanCollaboration, PlanItem, PlanParticipant } from "./types";

export type PlanActor = { id: string; name: string; relation?: string };

function nowIso(now = new Date()): string {
  return now.toISOString();
}

function participant(actor: PlanActor, role: PlanParticipant["role"], now = new Date()): PlanParticipant {
  return { id: actor.id, name: actor.name, relation: actor.relation, role, joinedAt: nowIso(now), preferences: [], constraints: [] };
}

export function ensurePlanCollaboration(plan: DajeongPlan, owner: PlanActor, now = new Date()): DajeongPlan {
  if (plan.collaboration) {
    if (plan.collaboration.participants.some((entry) => entry.id === owner.id) || plan.collaboration.visibility !== "shared") return plan;
    return {
      ...plan,
      collaboration: {
        ...plan.collaboration,
        participants: [...plan.collaboration.participants, participant(owner, plan.collaboration.share?.access === "editor" ? "editor" : "viewer", now)],
      },
    };
  }
  const collaboration: PlanCollaboration = {
    ownerId: owner.id,
    visibility: "personal",
    revision: 0,
    updatedAt: nowIso(now),
    participants: [participant(owner, "owner", now)],
  };
  return { ...plan, updatedAt: nowIso(now), collaboration };
}

export function setPlanVisibility(plan: DajeongPlan, visibility: PlanCollaboration["visibility"], actor: PlanActor, now = new Date()): DajeongPlan {
  const base = ensurePlanCollaboration(plan, actor, now);
  if (base.collaboration?.ownerId !== actor.id) return base;
  return {
    ...base,
    updatedAt: nowIso(now),
    collaboration: {
      ...base.collaboration,
      visibility,
      revision: base.collaboration.revision + 1,
      updatedAt: nowIso(now),
      pendingDisclosure: undefined,
    },
  };
}

export function attachShare(
  plan: DajeongPlan,
  owner: PlanActor,
  values: { token: string; ownerToken: string; access: "viewer" | "editor"; companionName?: string },
  now = new Date(),
): DajeongPlan {
  const base = setPlanVisibility(plan, "shared", owner, now);
  const companionId = `invited_${values.token.slice(0, 10)}`;
  const people = [...(base.collaboration?.participants ?? [])];
  if (!people.some((entry) => entry.id === companionId)) {
    people.push(participant({ id: companionId, name: values.companionName?.trim() || "초대된 동반자", relation: plan.situation.recipient }, values.access === "editor" ? "editor" : "viewer", now));
  }
  return {
    ...base,
    collaboration: {
      ...base.collaboration!,
      participants: people,
      share: { token: values.token, ownerToken: values.ownerToken, access: values.access, createdAt: nowIso(now) },
    },
  };
}

export function setItemVisibility(plan: DajeongPlan, itemId: string, visibility: ItemVisibility, actor: PlanActor, now = new Date()): DajeongPlan {
  const base = ensurePlanCollaboration(plan, actor, now);
  if (base.collaboration?.ownerId !== actor.id) return base;
  return {
    ...base,
    updatedAt: nowIso(now),
    items: base.items.map((item) => item.id === itemId ? { ...item, visibility } : item),
    collaboration: {
      ...base.collaboration,
      revision: base.collaboration.revision + 1,
      updatedAt: nowIso(now),
      pendingDisclosure: undefined,
    },
  };
}

function targetIds(plan: DajeongPlan, instruction: string, requestedItemId?: string): string[] {
  if (requestedItemId && plan.items.some((item) => item.id === requestedItemId)) return [requestedItemId];
  if (/마지막|맨\s*끝/.test(instruction)) return plan.items.at(-1) ? [plan.items.at(-1)!.id] : [];
  if (/케이크/.test(instruction)) return plan.items.filter((item) => item.category === "cake").map((item) => item.id);
  if (/꽃/.test(instruction)) return plan.items.filter((item) => item.category === "flower").map((item) => item.id);
  if (/선물/.test(instruction)) return plan.items.filter((item) => item.category === "gift").map((item) => item.id);
  if (/저녁까지만\s*(보여|공개)/.test(instruction)) {
    const mealIndex = plan.items.findLastIndex((item) => item.category === "meal");
    return mealIndex >= 0 ? plan.items.slice(mealIndex + 1).map((item) => item.id) : [];
  }
  return [];
}

export type PrivacyInstructionResult = { handled: boolean; plan: DajeongPlan; message: string; audience: "shared" | "owner_only" };

export function applyPrivacyInstruction(plan: DajeongPlan, instruction: string, actor: PlanActor, requestedItemId?: string, now = new Date()): PrivacyInstructionResult {
  const text = instruction.trim();
  const base = ensurePlanCollaboration(plan, actor, now);
  const owner = base.collaboration?.ownerId === actor.id;
  if (!owner && /숨|비밀|시크릿|비공개|공개|공유/.test(text)) {
    return { handled: true, plan: base, message: "공개 범위는 계획 소유자만 바꿀 수 있어요.", audience: "shared" };
  }
  if (/여자친구도\s*볼\s*수|동반자도\s*볼\s*수|공유된\s*거야/.test(text)) {
    const ids = targetIds(base, text, requestedItemId);
    const target = ids.length === 1 ? base.items.find((item) => item.id === ids[0]) : undefined;
    const visible = base.collaboration?.visibility === "shared" && (!target || (target.visibility ?? "shared") === "shared");
    return { handled: true, plan: base, message: visible ? "네. 지금은 동반자에게도 상세정보가 보이는 공유 상태예요." : "아니요. 지금은 동반자에게 상세정보가 보이지 않는 상태예요.", audience: owner ? "owner_only" : "shared" };
  }
  if (/전체.{0,5}(시크릿|비공개)|시크릿\s*계획|나만\s*(볼|보는)/.test(text)) {
    const next = setPlanVisibility(base, "secret", actor, now);
    return { handled: true, plan: next, message: "전체 계획을 시크릿으로 전환했어요. 소유자만 볼 수 있고 직접 공개하기 전에는 공유되지 않아요.", audience: "owner_only" };
  }
  if (/공유\s*해제|공유하지\s*마|개인\s*계획/.test(text)) {
    const next = setPlanVisibility(base, "personal", actor, now);
    return { handled: true, plan: next, message: "공유를 해제하고 나만 보는 계획으로 바꿨어요.", audience: "owner_only" };
  }
  const asksHide = /숨겨|비밀로|비공개|보여주지\s*마/.test(text);
  if (asksHide) {
    const ids = targetIds(base, text, requestedItemId);
    if (!ids.length) return { handled: true, plan: base, message: "숨길 일정을 선택하거나 ‘마지막 일정’처럼 대상을 알려주세요.", audience: "owner_only" };
    const hideCompletely = /이후|자체를|통째|완전히/.test(text) || /저녁까지만/.test(text);
    let next = base;
    ids.forEach((id) => { next = setItemVisibility(next, id, hideCompletely ? "owner_only" : "details_hidden", actor, now); });
    return { handled: true, plan: next, message: hideCompletely ? "선택한 일정은 동반자 화면에서 완전히 숨겼어요. 하루온은 전체 동선 계산에는 계속 반영합니다." : "선택한 일정의 장소·예약·가격 상세를 동반자에게 숨겼어요. 공유 화면에는 비공개 일정으로만 보여요.", audience: "owner_only" };
  }
  if (/이제\s*(공개|보여)|공개해도\s*돼|비밀\s*해제|공개\s*(확정|진행)|응.{0,4}공개|그래.{0,4}공개/.test(text)) {
    const ids = targetIds(base, text, requestedItemId);
    const protectedIds = ids.length ? ids : base.items.filter((item) => (item.visibility ?? "shared") !== "shared").map((item) => item.id);
    if (/공개\s*(확정|진행)|응.{0,4}공개|그래.{0,4}공개/.test(text) && base.collaboration?.pendingDisclosure) {
      let next = base;
      base.collaboration.pendingDisclosure.itemIds.forEach((id) => { next = setItemVisibility(next, id, "shared", actor, now); });
      if (next.collaboration?.visibility === "secret") next = setPlanVisibility(next, "shared", actor, now);
      return { handled: true, plan: next, message: "확인한 범위를 동반자에게 공개했어요. 공유 화면도 같은 상태로 갱신됩니다.", audience: "shared" };
    }
    const next = {
      ...base,
      collaboration: { ...base.collaboration!, pendingDisclosure: { itemIds: protectedIds, requestedAt: nowIso(now) } },
    };
    return { handled: true, plan: next, message: `서프라이즈 정보 ${protectedIds.length || "전체"}개를 공개하려고 해요. 정말 공개하려면 “공개 확정”이라고 말해 주세요.`, audience: "owner_only" };
  }
  return { handled: false, plan: base, message: "", audience: "shared" };
}

function hiddenPlaceholder(item: PlanItem): PlanItem {
  return {
    ...item,
    category: "moment",
    categoryLabel: "비공개 일정",
    title: "비공개 일정",
    subtitle: "계획 소유자가 세부 내용을 준비하고 있어요.",
    location: "",
    price: 0,
    provider: "하루온",
    handoffKind: "self",
    href: "#",
    imageUrl: "",
    referenceImageUrl: undefined,
    imageAlt: "비공개 일정",
    reason: "시간은 함께 쓰는 일정에 반영되어 있지만 상세정보는 공유되지 않았어요.",
    notes: [],
    reservationRequired: false,
    reality: undefined,
    experience: undefined,
    alternatives: [],
    travelFromPrevious: item.travelFromPrevious ? { ...item.travelFromPrevious, note: "비공개 일정으로 이동", weatherExposure: "unknown" } : undefined,
  };
}

function filterConversation(messages: ConciergeMessage[] | undefined, hiddenItems: PlanItem[]): ConciergeMessage[] | undefined {
  const sensitive = hiddenItems.flatMap((item) => [item.title, item.location, item.category === "flower" ? "꽃" : item.category === "cake" ? "케이크" : item.category === "gift" ? "선물" : ""]).filter((value) => value.length >= 1);
  return messages?.filter((message) => (message.audience ?? "shared") === "shared" && !sensitive.some((term) => message.text.includes(term))).map((message) => ({ ...message, actorId: undefined }));
}

export function projectPlanForViewer(plan: DajeongPlan, actorId: string): DajeongPlan | null {
  const collaboration = plan.collaboration;
  if (!collaboration || collaboration.ownerId === actorId) return plan;
  if (collaboration.visibility !== "shared") return null;
  const hiddenItems = plan.items.filter((item) => (item.visibility ?? "shared") !== "shared");
  const visibleItems = plan.items
    .filter((item) => (item.visibility ?? "shared") !== "owner_only")
    .map((item) => (item.visibility ?? "shared") === "details_hidden" ? hiddenPlaceholder(item) : { ...item, alternatives: [] });
  const visibleIds = new Set(visibleItems.filter((item) => item.title !== "비공개 일정").map((item) => item.id));
  const hasSecret = visibleItems.length !== plan.items.length || visibleItems.some((item) => item.title === "비공개 일정");
  const publicTotal = visibleItems.reduce((sum, item) => sum + item.price, 0);
  const execution = plan.execution ? {
    ...plan.execution,
    tasks: plan.execution.tasks.filter((task) => visibleIds.has(task.itemId)).map((task) => ({ ...task, dependsOnTaskIds: task.dependsOnTaskIds?.filter((id) => plan.execution?.tasks.some((candidate) => candidate.id === id && visibleIds.has(candidate.itemId))) })),
    requestedItemIds: plan.execution.requestedItemIds.filter((id) => visibleIds.has(id)),
    unconfirmedPriceTaskIds: plan.execution.unconfirmedPriceTaskIds.filter((id) => plan.execution?.tasks.some((task) => task.id === id && visibleIds.has(task.itemId))),
    approval: undefined,
    payableNow: 0,
    depositTotal: 0,
    estimatedTotal: publicTotal,
    onsiteEstimated: 0,
    message: "결제·예약의 비공개 상세는 계획 소유자에게만 표시됩니다.",
  } : undefined;
  return {
    ...plan,
    title: hasSecret ? `${plan.situation.recipient}와 함께 보는 일정` : plan.title,
    summary: hasSecret ? "공개된 일정만 보여드려요. 비공개 시간도 전체 동선에는 반영되어 있습니다." : plan.summary,
    items: visibleItems,
    subtotal: publicTotal,
    total: publicTotal,
    reserve: 0,
    budget: publicTotal,
    budgetRemaining: 0,
    versions: undefined,
    revisions: plan.revisions.filter((revision) => (revision.audience ?? "shared") === "shared"),
    sourceRequest: hasSecret ? "공유된 함께 보기 일정" : plan.sourceRequest,
    situation: hasSecret ? { ...plan.situation, preferences: [], constraints: [], requestedCategories: visibleItems.filter((item) => item.title !== "비공개 일정").map((item) => item.category), excludedCategories: [], explicitUnknowns: [], personMemoryUpdate: undefined, personProfile: undefined, singleCategory: undefined, lodgingPreference: undefined } : plan.situation,
    conversation: filterConversation(plan.conversation, hiddenItems),
    execution,
    logistics: hasSecret ? [] : plan.logistics,
    schedule: hasSecret && plan.schedule ? { ...plan.schedule, warnings: ["비공개 일정까지 포함해 이동과 종료시간을 계산했어요."] } : plan.schedule,
    experienceFlow: hasSecret ? undefined : plan.experienceFlow,
    collaboration: {
      ...collaboration,
      ownerId: "owner",
      share: collaboration.share ? { token: collaboration.share.token, access: collaboration.share.access, createdAt: collaboration.share.createdAt } : undefined,
      pendingDisclosure: undefined,
      participants: collaboration.participants.map((entry, index) => ({ ...entry, id: entry.id === actorId ? actorId : entry.role === "owner" ? "owner" : `participant_${index}`, preferences: [], constraints: [], pacePreference: undefined })),
    },
  };
}

export function mergeViewerPlanUpdate(ownerPlan: DajeongPlan, viewerPlan: DajeongPlan, actor: PlanActor): DajeongPlan {
  const editableIds = new Set(ownerPlan.items.filter((item) => (item.visibility ?? "shared") === "shared").map((item) => item.id));
  const viewerById = new Map(viewerPlan.items.filter((item) => editableIds.has(item.id)).map((item) => [item.id, item]));
  const kept = ownerPlan.items
    .filter((item) => !editableIds.has(item.id) || viewerById.has(item.id))
    .map((item) => editableIds.has(item.id) ? { ...viewerById.get(item.id)!, visibility: item.visibility } : item);
  const added = viewerPlan.items.filter((item) => !ownerPlan.items.some((existing) => existing.id === item.id) && item.title !== "비공개 일정").map((item) => ({ ...item, visibility: "shared" as const }));
  const messageIds = new Set(ownerPlan.conversation?.map((message) => message.id) ?? []);
  const revisionIds = new Set(ownerPlan.revisions.map((revision) => revision.id));
  const actorProfile = viewerPlan.collaboration?.participants.find((entry) => entry.id === actor.id);
  return {
    ...ownerPlan,
    situation: {
      ...ownerPlan.situation,
      region: viewerPlan.situation.region,
      budget: viewerPlan.situation.budget,
      targetDate: viewerPlan.situation.targetDate,
      transport: viewerPlan.situation.transport,
      availabilityEndTime: viewerPlan.situation.availabilityEndTime,
      scheduleDensity: viewerPlan.situation.scheduleDensity,
      densitySpecified: viewerPlan.situation.densitySpecified,
      homeByTime: viewerPlan.situation.homeByTime,
      temporaryCondition: viewerPlan.situation.temporaryCondition,
    },
    items: [...kept, ...added],
    conversation: [...(ownerPlan.conversation ?? []), ...(viewerPlan.conversation ?? []).filter((message) => !messageIds.has(message.id)).map((message) => ({ ...message, actorId: actor.id, actorName: actor.name, audience: "shared" as const }))].slice(-30),
    revisions: [...viewerPlan.revisions.filter((revision) => !revisionIds.has(revision.id)).map((revision) => ({ ...revision, actorId: actor.id, actorName: actor.name, audience: "shared" as const })), ...ownerPlan.revisions].slice(0, 12),
    collaboration: ownerPlan.collaboration ? {
      ...ownerPlan.collaboration,
      participants: ownerPlan.collaboration.participants.some((entry) => entry.id === actor.id)
        ? ownerPlan.collaboration.participants.map((entry) => entry.id === actor.id && actorProfile ? { ...entry, pacePreference: actorProfile.pacePreference, preferences: actorProfile.preferences, constraints: actorProfile.constraints } : entry)
        : [...ownerPlan.collaboration.participants, actorProfile ?? participant(actor, ownerPlan.collaboration.share?.access === "editor" ? "editor" : "viewer")],
    } : ownerPlan.collaboration,
  };
}

export function canDeliverPlanNotification(plan: DajeongPlan, actorId: string, itemId?: string): boolean {
  const collaboration = plan.collaboration;
  if (!collaboration || collaboration.ownerId === actorId) return true;
  if (collaboration.visibility !== "shared") return false;
  if (!itemId) return !plan.items.some((item) => (item.visibility ?? "shared") !== "shared");
  const item = plan.items.find((entry) => entry.id === itemId);
  return Boolean(item && (item.visibility ?? "shared") === "shared");
}

export function calendarItemsForActor(plan: DajeongPlan, actorId: string): PlanItem[] {
  const projected = projectPlanForViewer(plan, actorId);
  return projected?.items.filter((item) => item.title !== "비공개 일정") ?? [];
}

export function learnPacePreference(plan: DajeongPlan, instruction: string, actor: PlanActor, now = new Date()): DajeongPlan {
  if (!/(난\s*원래|나는\s*원래|보통|항상|데이트할\s*때|앞으로)/.test(instruction)) return plan;
  const density = /여기저기|알차|많이\s*다니/.test(instruction) ? "compact" : /여유|천천히|쉬엄|이동\s*(적|싫)/.test(instruction) ? "relaxed" : undefined;
  const stops = Number(instruction.match(/(?:하루에\s*)?(\d)\s*(?:군데|곳)/)?.[1]) || undefined;
  const cafeHours = Number(instruction.match(/카페.{0,10}(\d)\s*시간/)?.[1]) || undefined;
  if (!density && !stops && !cafeHours && !/이동\s*(너무\s*)?많/.test(instruction)) return plan;
  const base = ensurePlanCollaboration(plan, actor, now);
  const existing = base.collaboration!.participants.find((entry) => entry.id === actor.id)?.pacePreference;
  const pace: PacePreference = {
    density: density ?? existing?.density,
    preferredDailyStops: stops ?? existing?.preferredDailyStops,
    cafeMinutes: cafeHours ? cafeHours * 60 : existing?.cafeMinutes,
    avoidFrequentMoves: /이동\s*(너무\s*)?많|이동\s*(적|싫)/.test(instruction) || existing?.avoidFrequentMoves,
    evidenceCount: (existing?.evidenceCount ?? 0) + 1,
    updatedAt: nowIso(now),
  };
  return {
    ...base,
    collaboration: {
      ...base.collaboration!,
      participants: base.collaboration!.participants.map((entry) => entry.id === actor.id ? { ...entry, pacePreference: pace } : entry),
    },
  };
}
