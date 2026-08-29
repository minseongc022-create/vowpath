/**
 * 자동 운전 — 10분마다 도는 한 바퀴
 *
 * ★ 한 바퀴가 하는 일
 *
 *   1. 목표에서 오늘 몇 개가 필요한지 역산한다
 *   2. 그만큼 소싱한다 (없으면 왜 없는지 숫자로 남긴다)
 *   3. 찾은 후보로 상세페이지까지 만들어 **검수 대기**에 올린다
 *   4. 사장님이 승인하면 그때 토스에 올라간다
 *
 * ★ 왜 검수 앞에서 멈추는가
 *
 * 사장님이 원한 건 "매번 판단하는 것"이 아니라 "마지막에 한 번 보는 것"이다.
 * 그래서 사람 개입은 승인 한 번뿐이고, 나머지는 전부 자동이다.
 * (`autoPublish`를 켜면 그 한 번도 생략된다.)
 *
 * ★ 서버리스 시간 제한
 *
 * 함수는 60초에 강제 종료되고, 죽는 순간 **그 사이클 작업이 통째로 저장되지
 * 않는다** — 저장은 끝에 한 번 하기 때문이다. 그러면 10분마다 같은 일을
 * 반복하며 영원히 아무것도 못 남긴다. 그래서 시간이 모자라면 만들던 것까지만
 * 하고 정상 종료해 저장한다.
 */

import type { Draft, JarvisState, SourcingRun } from "../core/types";
import { emptyReportWindow } from "../core/types";
import { sourceCandidates, supplierKey } from "./sourcing";
import { buildDetailPage } from "./detail-page";
import { planForGoal, type GoalPlan } from "./goal";

export const AUTOPILOT_VERSION = "2.0";

/** 한 사이클에 새로 만들 초안 상한 — 검수 대기가 감당 못 하게 쌓이면 의미가 없다 */
const MAX_DRAFTS_PER_CYCLE = 4;

/** 검수 대기가 이만큼 쌓여 있으면 새로 만들지 않는다 — 사장님이 먼저 봐야 한다 */
const PENDING_BACKPRESSURE = 12;

export type CycleResult = {
  ranAt: string;
  draftsCreated: number;
  sourcingRun?: SourcingRun;
  goal: GoalPlan;
  actions: string[];
  /** 왜 아무것도 안 했는지 — 0건일 때 항상 채워진다 */
  idleReason?: string;
};

export async function runCycle(
  state: JarvisState,
  opts?: { deadlineAt?: number; force?: boolean },
): Promise<CycleResult> {
  const ranAt = new Date().toISOString();
  const actions: string[] = [];

  // 오래된 상태(테스트 픽스처 포함)에는 이 필드가 없을 수 있다 — 30분 보고가
  // 그 때문에 죽으면 안 되니 여기서 한 번 채운다
  state.reportWindow ??= emptyReportWindow();
  state.reportWindow.cyclesRun += 1;

  const published = state.drafts.filter((d) => d.status === "published").length;
  const pending = state.drafts.filter((d) => d.status === "pending_review").length;

  const goal = planForGoal({
    monthlyGoalKrw: state.settings.monthlyGoalKrw,
    publishedSkus: published,
  });

  // ── 돌지 말아야 할 이유가 있는가 ─────────────────────────
  if (!state.settings.autopilotEnabled && !opts?.force) {
    return {
      ranAt,
      draftsCreated: 0,
      goal,
      actions,
      idleReason: "자동 운전이 꺼져 있습니다. 「자동으로 해줘」라고 하시면 다시 켭니다.",
    };
  }

  if (pending >= PENDING_BACKPRESSURE && !opts?.force) {
    return {
      ranAt,
      draftsCreated: 0,
      goal,
      actions,
      idleReason: `검수 대기가 ${pending}건 쌓여 있어 새로 만들지 않았습니다. 먼저 확인해 주세요.`,
    };
  }

  if (goal.dailyTarget === 0 && !opts?.force) {
    return {
      ranAt,
      draftsCreated: 0,
      goal,
      actions,
      idleReason: goal.reason,
    };
  }

  // ── 몇 개를 만들지 ───────────────────────────────────────
  const want = Math.max(1, Math.min(MAX_DRAFTS_PER_CYCLE, goal.dailyTarget));

  // 이미 갖고 있는 공급처는 다시 소싱하지 않는다
  const existing = new Set<string>();
  for (const d of state.drafts) {
    existing.add(supplierKey(d.candidate.supplier.platform, d.candidate.supplier.itemNo));
  }
  for (const c of state.candidates) {
    existing.add(supplierKey(c.supplier.platform, c.supplier.itemNo));
  }

  // 매번 같은 검색어 앞쪽만 훑으면 뒤쪽은 영원히 기회를 못 받는다.
  // 이미 본 상품 수를 위치로 삼아 조금씩 밀어가며 전체를 돈다.
  const keywordOffset = existing.size;

  const { candidates, run } = await sourceCandidates({
    want,
    // keywordCount를 안 넘긴다 — sourceCandidates의 기본값(DEFAULT_KEYWORD_COUNT)이
    // 넓게 훑는 기준이다. 여기서 24로 좁혀 덮어쓰면 그 기본값을 올려도
    // 자동 운전 쪽은 계속 좁게 도는 결함이 생긴다(실제로 이런 식으로
    // 어긋난 상수가 여러 번 사고를 냈다).
    keywordOffset,
    existingSupplierKeys: existing,
    deadlineAt: opts?.deadlineAt,
  });

  state.lastSourcingRun = run;
  state.reportWindow.keywordsTried += run.keywordsTried;
  state.reportWindow.productsSeen += run.productsSeen;
  state.reportWindow.candidatesFound += run.candidatesFound;
  actions.push(run.summary);

  if (!candidates.length) {
    return {
      ranAt,
      draftsCreated: 0,
      sourcingRun: run,
      goal,
      actions,
      idleReason: run.summary,
    };
  }

  // ── 상세페이지까지 만들어 검수 대기에 올린다 ─────────────
  let created = 0;
  for (const candidate of candidates) {
    if (opts?.deadlineAt && Date.now() > opts.deadlineAt) {
      actions.push("시간이 부족해 남은 후보는 다음 사이클로 넘겼습니다.");
      break;
    }

    const page = buildDetailPage(candidate);

    const draft: Draft = {
      id: `d_${Date.now().toString(36)}_${created}`,
      candidate,
      status: "pending_review",
      detailHtml: page.html,
      sellingPoints: page.sellingPoints,
      listingPayload: {
        name: candidate.title,
        salePrice: candidate.priceKrw,
        imageUrls: candidate.supplier.imageUrls.slice(0, 10),
        detailHtml: page.html,
      },
      checklist: buildChecklist(candidate),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    state.drafts.unshift(draft);
    state.candidates.unshift(candidate);
    created++;
    actions.push(
      `「${candidate.keyword}」 — ${candidate.priceKrw.toLocaleString()}원 · 개당 ${candidate.netProfitKrw.toLocaleString()}원 남음`,
    );
  }

  state.lastAutopilotAt = ranAt;
  state.reportWindow.draftsCreated += created;

  return {
    ranAt,
    draftsCreated: created,
    sourcingRun: run,
    goal,
    actions,
    idleReason: created === 0 ? run.summary : undefined,
  };
}

/**
 * 사장님이 등록 전에 알아야 할 것.
 *
 * 확인된 사실만 넣는다. "아마 괜찮을 것"은 체크리스트가 아니라 추측이고,
 * 추측을 체크리스트에 넣으면 확인했다는 착각만 만든다.
 */
function buildChecklist(candidate: import("../core/types").Candidate): string[] {
  const list: string[] = [];

  list.push(
    `공급처 ${candidate.supplier.platform === "domeme" ? "도매매" : "도매꾹"} · 낱개 1개 발주 확인됨 · 개당 ${candidate.supplier.landedCostKrw.toLocaleString()}원(배송비 포함)`,
  );
  list.push(
    `팔면 ${candidate.netProfitKrw.toLocaleString()}원 남습니다 (실마진 ${candidate.marginPct}% — 수수료·광고비·반품충당 반영 후)`,
  );
  list.push(`${candidate.priceFloorKrw.toLocaleString()}원 아래로 내리면 적자입니다`);

  if (candidate.maxBidKrw > 0) {
    list.push(
      `광고를 켠다면 클릭당 ${candidate.maxBidKrw.toLocaleString()}원까지 (손익분기 ${candidate.breakevenCpcKrw.toLocaleString()}원)`,
    );
  } else {
    list.push("이 마진으로는 광고 입찰이 성립하지 않습니다 — 광고 없이 노출로만 가야 합니다");
  }

  // 왜 **이것을** 골랐는지 — 관문 통과는 "팔아도 된다"일 뿐이고,
  // 여러 개가 통과했을 때 이걸 고른 이유는 따로 말해줘야 한다
  if (candidate.score != null) {
    const why = (candidate.scoreReasons ?? []).slice(0, 3).join(" · ");
    list.push(`판단 점수 ${candidate.score}점으로 골랐습니다${why ? ` — ${why}` : ""}`);
  }

  if (!candidate.supplier.live) {
    list.push("⚠ 공급처 정보가 실시간 조회가 아닌 검색 결과 기반입니다 — 발주 전 한 번 확인해 주세요");
  }

  return list;
}
