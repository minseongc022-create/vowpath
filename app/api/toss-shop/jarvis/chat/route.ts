import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import {
  ackOwnerTodos,
  autoRegisterReturnLocations,
  confirmFulfillmentTracking,
  getJarvisChatContext,
  getReturnAddressBrief,
  getSupplierOrderBrief,
  markWholesaleOrdered,
  runAutopilotForMerchant,
  runDiscoveryForMerchant,
  runStoreOperations,
  sendOwnerTestAlert,
  setJarvisActivity,
  setMonthlyGoal,
  setOwnerAlertPhone,
  syncReturnLocationsForMerchant,
} from "@/toss-shop/lib/store";
import {
  parseChatAction,
  pickJobForTracking,
  renderStatusReply,
  type JarvisStatusSummary,
} from "@/toss-shop/lib/seller-engine/jarvis-chat";
import {
  ACTION_LABELS,
  parseExtraAction,
  readGoalKrw,
  type ActionResult,
  type JarvisAction,
} from "@/toss-shop/lib/seller-engine/jarvis-actions";
import { planJarvisAction } from "@/toss-shop/lib/seller-engine/jarvis-planner";
import { answerAsJarvis } from "@/toss-shop/lib/seller-engine/jarvis-persona";

/**
 * 자비스와의 대화 — 말하면 실제로 실행된다.
 *
 * ★ 세 갈래로 판단한다
 *
 *  1. 결정적 파싱 — 송장번호처럼 틀리면 손해가 나는 것. 정규식이 먼저 잡는다.
 *  2. LLM 계획 — 그 외 아무 말투나. LLM은 **어떤 행동인지만** 고르고 실행은
 *     서버가 한다. "추가적은 소싱 해" 같은 말이 안내로 끝나지 않게 하는 부분.
 *  3. 순수 대화 — 시킨 게 아니면 그냥 답한다.
 *
 * 어느 갈래로 가든 실제로 벌어지는 일은 아래 executeAction에 적힌 것뿐이다.
 */
export async function POST(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    message?: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  };
  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: "메시지가 비어 있습니다" }, { status: 400 });

  const merchantId = session.merchantId;
  const parsed = parseChatAction(message);
  const ctx = await getJarvisChatContext(merchantId);

  try {
    // ── 1. 결정적으로 잡힌 것 ────────────────────────────────────
    if (parsed.confident && parsed.intent !== "talk") {
      const action: JarvisAction = {
        name: parsed.intent,
        trackingNumber: parsed.tracking?.trackingNumber,
        deliveryCompany: parsed.tracking?.deliveryCompany,
        alertPhone: parsed.alertPhone,
        goalKrw: readGoalKrw(message) ?? undefined,
      };
      // 목표 금액이 분명히 들어 있으면 그게 우선이다 — "월 천만원 벌게 해줘"가
      // 상태 조회로 읽히면 시킨 일이 통째로 사라진다.
      if (action.goalKrw && parsed.intent === "status") action.name = "set_goal";
      return NextResponse.json(await executeAction(merchantId, action, ctx.jobs, ctx.status));
    }

    // 송장번호는 있는데 택배사가 없으면 되물어야 한다 — 추측하면 안 된다
    if (parsed.intent === "register_tracking" && !parsed.confident) {
      return NextResponse.json({
        reply:
          "송장번호는 읽었는데 택배사가 안 보입니다. 택배사도 같이 알려주세요 — 예: 「1234567890 CJ대한통운」",
        steps: [],
        did: "need_courier",
      });
    }

    // ── 2. LLM 없이도 잡히는 지시 (소싱·목표·확인) ───────────────
    // LLM보다 먼저 본다. 대화 기능이 막혀도 이건 동작해야 하고, 실제로
    // 사장님이 가장 자주 쓰는 지시들이다.
    const extra = parseExtraAction(message);
    if (extra) {
      return NextResponse.json(await executeAction(merchantId, extra, ctx.jobs, ctx.status));
    }

    // ── 3. LLM이 행동을 고른다 ───────────────────────────────────
    const planned = await planJarvisAction({
      message,
      history: body.history ?? [],
      statusBlock: statusBlock(ctx.status),
    });
    if (planned.action) {
      return NextResponse.json(
        await executeAction(merchantId, planned.action, ctx.jobs, ctx.status),
      );
    }

    // ── 4. 그냥 대화 ─────────────────────────────────────────────
    const reply =
      planned.say ??
      (await answerAsJarvis({ message, history: body.history ?? [], status: ctx.status }));
    return NextResponse.json({ reply, steps: [], did: "talk" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "CHAT_FAIL";
    return NextResponse.json(
      { reply: `처리하다가 막혔습니다 — ${msg}`, steps: [], did: "error" },
      { status: 200 },
    );
  }
}

function statusBlock(s: JarvisStatusSummary): string {
  return [
    `등록된 상품 ${s.publishedCount}개 · 승인 대기 ${s.pendingReviewCount}개`,
    `진행 중 주문 ${s.activeOrders}건 · 송장 대기 ${s.awaitingTracking}건`,
    `반품지 등록 대기 ${s.pendingReturnAddresses}곳`,
    `이번 달 순익 ${s.monthlyNetKrw.toLocaleString()}원 / 목표 ${s.goalKrw.toLocaleString()}원`,
  ].join("\n");
}

/**
 * 실제로 일을 한다.
 *
 * 어떤 갈래로 들어왔든 여기만 통과한다. 그래서 "자비스가 뭘 할 수 있는가"는
 * 이 함수 하나만 읽으면 전부 안다.
 */
async function executeAction(
  merchantId: string,
  action: JarvisAction,
  jobs: Awaited<ReturnType<typeof getJarvisChatContext>>["jobs"],
  status: JarvisStatusSummary,
): Promise<ActionResult> {
  const steps: string[] = [ACTION_LABELS[action.name] ?? "처리하는 중"];

  switch (action.name) {
    // ── 지금 돌려 ───────────────────────────────────────────────
    case "run_now": {
      await setJarvisActivity(merchantId, { label: "시장 보고 상품 만드는 중" });
      const report = await runAutopilotForMerchant(merchantId);
      await setJarvisActivity(merchantId, { label: "끝", done: true });

      const created = report.stats.draftsCreated;
      const lines = [
        created > 0
          ? `한 바퀴 돌렸습니다 — 새 상품 ${created}개를 준비했어요.`
          : "한 바퀴 돌렸는데, 이번엔 기준을 통과한 새 상품이 없었습니다.",
      ];
      if (report.actions.length) lines.push("", ...report.actions.slice(0, 5).map((a) => `· ${a}`));
      if (created === 0) {
        lines.push("", "「더 찾아봐」라고 하시면 도매꾹을 더 넓게 훑어보겠습니다.");
      }
      steps.push(...report.actions.slice(0, 4));
      return { reply: lines.join("\n"), steps, did: "run_now" };
    }

    // ── 더 찾아봐 (도매꾹 직접 발굴) ────────────────────────────
    case "discover": {
      await setJarvisActivity(merchantId, { label: "도매꾹 구석구석 뒤지는 중" });
      const r = await runDiscoveryForMerchant(merchantId, {
        size: action.deep ? 48 : 24,
        budgetMs: action.deep ? 45_000 : 25_000,
      });
      await setJarvisActivity(merchantId, { label: "끝", done: true });

      if (!r.configured) {
        return {
          reply:
            "도매꾹 API 키가 연결돼 있지 않아 찾을 수가 없습니다.\n" +
            "이게 없으면 실측 공급처·원가를 못 잡고, 그러면 확실성 게이트를 통과하는 상품이 영원히 안 나옵니다.",
          steps,
          did: "discover",
        };
      }
      if (r.apiSilent) {
        // 원인을 그대로 전한다. "없습니다"로 뭉뚱그리면 사장님은 물건이 없는
        // 줄 알고 기다리게 되고, 실제로는 연동이 끊겨 영원히 아무것도 안 온다.
        const cause = r.apiError
          ? `도매꾹이 이렇게 답했습니다 — ${r.apiError.message} (${r.apiError.code})`
          : "도매꾹이 아무 응답도 주지 않았습니다.";
        return {
          reply:
            `키워드 ${r.scanned}개를 물어봤는데 한 건도 못 받았습니다.\n${cause}\n\n` +
            "물건이 없는 게 아니라 연동 문제입니다. 도매꾹 로그인 → API Key 관리에서 " +
            "키가 살아 있는지, 허용 IP가 걸려 있진 않은지 확인해 주세요.",
          steps,
          did: "discover",
        };
      }

      const lines = [
        `도매꾹·도매매 키워드 ${r.scanned}개를 훑었습니다.`,
        `쓸 만한 공급처가 잡힌 키워드 ${r.found}개 · 새 상품 ${r.added}개 확보 (누적 ${r.total}개).`,
      ];
      if (r.truncated) {
        lines.push("시간이 다 돼서 여기서 끊었습니다. 「더 찾아봐」 하시면 그다음부터 이어서 봅니다.");
      }
      if (r.added > 0) {
        lines.push("", "새로 찾은 걸로 후보를 다시 만들었습니다. 「지금 돌려」 하시면 등록까지 갑니다.");
      } else {
        lines.push("", "이 구간에선 새로 건질 게 없었습니다. 「더 찾아봐」로 다음 구간을 보겠습니다.");
      }
      steps.push(`${r.scanned}개 키워드 확인`, `새 상품 ${r.added}개`);
      return { reply: lines.join("\n"), steps, did: "discover" };
    }

    // ── 반품지 등록했어 ─────────────────────────────────────────
    case "sync_return_locations": {
      const result = await syncReturnLocationsForMerchant(merchantId);
      if (result.error) {
        return {
          reply: `반품지 목록을 못 읽었습니다 — ${result.error}\n토스 API 연동을 먼저 확인해 주세요.`,
          steps,
          did: "sync_return_locations",
        };
      }
      const lines = [`토스에서 반품지 ${result.locationCount}곳을 확인했습니다.`];
      if (result.matched > 0) {
        lines.push(
          `그중 ${result.matched}곳이 기다리던 공급처와 연결됐어요 — 이제 그 상품들은 반품이 공급처로 바로 갑니다 (비용 0원).`,
        );
      }
      lines.push(
        result.stillPending > 0
          ? `아직 ${result.stillPending}곳이 남았습니다.`
          : "남은 게 없습니다. 전부 연결됐어요.",
      );
      return { reply: lines.join("\n"), steps, did: "sync_return_locations" };
    }

    // ── 송장 등록 ───────────────────────────────────────────────
    case "register_tracking": {
      if (!action.trackingNumber || !action.deliveryCompany) {
        return {
          reply: "송장번호와 택배사를 같이 알려주세요 — 예: 「1234567890 CJ대한통운」",
          steps,
          did: "register_tracking",
        };
      }
      const { job, ambiguous, candidateCount } = pickJobForTracking(jobs);
      if (!job) {
        return {
          reply: "지금 송장을 기다리는 주문이 없습니다. 주문이 들어오면 알려드릴게요.",
          steps,
          did: "register_tracking",
        };
      }
      const updated = await confirmFulfillmentTracking({
        merchantId,
        jobId: job.id,
        trackingNumber: action.trackingNumber,
        deliveryCompany: action.deliveryCompany,
      });
      const done = updated.status === "tracking_registered";
      // 실패를 성공처럼 말하지 않는다. "등록했습니다"라고 해놓고 실제로는
      // 안 올라갔으면 고객은 배송 조회를 못 하고, 사장님은 그걸 모른다.
      const lines = [
        done
          ? `「${job.productName}」 송장 등록 완료했습니다 (${updated.deliveryCompany ?? action.deliveryCompany} ${action.trackingNumber}). 고객에게 배송 조회가 열렸어요.`
          : `「${job.productName}」 송장을 토스에 못 올렸습니다 — ${updated.trackingError ?? "원인 미상"}.\n` +
            "송장번호는 기록해뒀습니다. 택배사 이름을 다르게 알려주시면 다시 시도하겠습니다.",
      ];
      if (ambiguous) {
        lines.push(
          "",
          `⚠️ 송장을 기다리는 주문이 ${candidateCount}건이라 가장 오래 기다린 것에 넣었습니다. 다른 주문이었다면 알려주세요.`,
        );
      }
      return { reply: lines.join("\n"), steps, did: "register_tracking" };
    }

    // ── 발주 정보 / 발주했어 / 반품지 주소 ──────────────────────
    case "supplier_order_info":
      return { reply: await getSupplierOrderBrief(merchantId), steps, did: "supplier_order_info" };

    case "mark_ordered": {
      const r = await markWholesaleOrdered(merchantId);
      if (r.marked === 0) {
        return {
          reply: "발주 대기로 잡혀 있는 주문이 없습니다. 이미 다 넘어갔거나, 아직 주문이 안 들어왔어요.",
          steps,
          did: "mark_ordered",
        };
      }
      const lines = [
        `${r.marked}건 발주 완료로 넘겼습니다 — ${r.names.join(", ")}`,
        "공급처 송장 나오면 「1234567890 CJ대한통운」처럼 보내주세요. 토스 등록은 제가 합니다.",
      ];
      if (r.remaining > 0) {
        lines.push("", `아직 ${r.remaining}건 남았습니다. 「발주 정보 줘」 하시면 다음 걸 드릴게요.`);
      }
      return { reply: lines.join("\n"), steps, did: "mark_ordered" };
    }

    case "return_addresses":
      return { reply: await getReturnAddressBrief(merchantId), steps, did: "return_addresses" };

    // ── 상품 손보기 (안 팔리면 가격 인하 → 바닥이면 숨김) ────────
    case "operate": {
      await setJarvisActivity(merchantId, { label: "안 팔리는 상품 손보는 중" });
      const r = await runStoreOperations(merchantId);
      await setJarvisActivity(merchantId, { label: "끝", done: true });

      if (!r.configured) {
        return { reply: "토스 연동이 안 돼 있어 상품을 손볼 수가 없습니다.", steps, did: "operate" };
      }
      const lines: string[] = [];
      if (r.cuts === 0 && r.hides === 0) {
        lines.push(
          r.notes[0] ?? `손댈 상품이 없습니다 — ${r.holds}개는 그대로 두는 게 맞습니다.`,
          "",
          "팔리고 있는 상품, 올린 지 얼마 안 된 상품, 최근에 가격을 만진 상품은 건드리지 않습니다.",
        );
      } else {
        if (r.cuts > 0) lines.push(`가격을 내린 상품 ${r.cuts}개`);
        if (r.hides > 0) lines.push(`숨긴 상품 ${r.hides}개 (최저가에서도 안 팔려서)`);
        lines.push("", ...r.notes.map((n) => `· ${n}`));
      }
      if (r.failures.length) {
        lines.push("", "못 바꾼 것:", ...r.failures.map((f) => `· ${f}`));
      }
      steps.push(`가격 인하 ${r.cuts}건`, `숨김 ${r.hides}건`);
      return { reply: lines.join("\n"), steps, did: "operate" };
    }

    // ── 반품지 자동 등록 ────────────────────────────────────────
    case "register_returns": {
      await setJarvisActivity(merchantId, { label: "반품지 등록하는 중" });
      const r = await autoRegisterReturnLocations(merchantId);
      await setJarvisActivity(merchantId, { label: "끝", done: true });

      if (!r.configured) {
        return { reply: "토스 연동이 안 돼 있어 반품지를 등록할 수 없습니다.", steps, did: "register_returns" };
      }
      if (r.registered === 0 && r.remaining === 0) {
        return {
          reply: "등록할 반품지가 없습니다. 지금은 전부 공급처로 바로 반품되고 있어요 (비용 0원).",
          steps,
          did: "register_returns",
        };
      }
      const lines = [`공급처 반품지 ${r.registered}곳을 토스에 등록했습니다.`];
      if (r.remaining > 0) lines.push(`${r.remaining}곳 남았습니다 — 다음에 이어서 등록하겠습니다.`);
      if (r.errors.length) lines.push("", "못 넣은 것:", ...r.errors.map((e) => `· ${e}`));
      steps.push(`반품지 ${r.registered}곳 등록`);
      return { reply: lines.join("\n"), steps, did: "register_returns" };
    }

    // ── 알림 ────────────────────────────────────────────────────
    case "set_alert_phone": {
      if (!action.alertPhone) {
        return { reply: "번호를 못 읽었습니다. 「내 번호 010-1234-5678」처럼 알려주세요.", steps, did: "set_alert_phone" };
      }
      await setOwnerAlertPhone(merchantId, action.alertPhone);
      const shown = action.alertPhone.replace(/^\+82/, "0");
      return {
        reply:
          `알림 번호를 ${shown} 로 저장했습니다.\n` +
          "발주가 12시간, 송장이 6시간 넘게 밀리면 문자 드리고, 「확인했어」 하실 때까지 10분마다 다시 보냅니다.",
        steps,
        did: "set_alert_phone",
      };
    }

    case "test_alert": {
      const r = await sendOwnerTestAlert(merchantId);
      if (r.ok) {
        return {
          reply: `${(r.phone ?? "").replace(/^\+82/, "0")} 로 문자 한 통 보냈습니다. 안 오면 바로 말씀해 주세요.`,
          steps,
          did: "test_alert",
        };
      }
      return {
        reply:
          `문자를 못 보냈습니다 — ${r.error}\n` +
          (r.phone
            ? "번호는 저장돼 있으니, 발송 설정 쪽 문제입니다."
            : "먼저 「내 번호 010-…」 으로 번호를 알려주세요."),
        steps,
        did: "test_alert",
      };
    }

    case "ack_alerts": {
      await ackOwnerTodos(merchantId);
      return {
        reply: "알겠습니다. 되풀이 문자 멈췄습니다. 새로운 일이 생기면 그때 다시 알려드릴게요.",
        steps,
        did: "ack_alerts",
      };
    }

    // ── 목표 ────────────────────────────────────────────────────
    case "set_goal": {
      if (!action.goalKrw) {
        return {
          reply: "목표 금액을 못 읽었습니다. 「목표 월 700만원」처럼 말씀해 주세요.",
          steps,
          did: "set_goal",
        };
      }
      await setMonthlyGoal(merchantId, action.goalKrw);
      const man = Math.round(action.goalKrw / 10_000).toLocaleString();
      return {
        reply:
          `월 목표를 ${man}만원으로 잡았습니다.\n` +
          "여기서 필요한 SKU 수를 역산해 소싱량을 다시 계산했습니다. 「지금 돌려」 하시면 그 기준으로 돕니다.",
        steps,
        did: "set_goal",
      };
    }

    // ── 상태 ────────────────────────────────────────────────────
    case "status":
    default:
      return { reply: renderStatusReply(status), steps, did: "status" };
  }
}
