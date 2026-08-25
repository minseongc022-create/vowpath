import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import {
  confirmFulfillmentTracking,
  getJarvisChatContext,
  getReturnAddressBrief,
  getSupplierOrderBrief,
  markWholesaleOrdered,
  runAutopilotForMerchant,
  setOwnerAlertPhone,
  syncReturnLocationsForMerchant,
} from "@/toss-shop/lib/store";
import {
  parseChatAction,
  pickJobForTracking,
  renderStatusReply,
} from "@/toss-shop/lib/seller-engine/jarvis-chat";
import { answerAsJarvis } from "@/toss-shop/lib/seller-engine/jarvis-persona";

/**
 * 자비스와의 대화 — 말로 지시하면 실제로 실행된다.
 *
 * ★ 돈이 걸린 행동은 LLM을 거치지 않는다
 *
 * 송장 등록·반품지 동기화·실행은 정규식으로 확실하게 잡히면 그 즉시 실행한다
 * (jarvis-chat.ts의 결정적 파싱). LLM은 그 외의 대화에만 쓰인다. 송장번호를
 * 한 자리 잘못 읽으면 고객 배송 조회가 깨지고 페널티로 돌아오기 때문이다.
 *
 * OPENAI_API_KEY가 없어도 핵심 기능(실행·상태·송장·반품지)은 전부 동작한다.
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

  const action = parseChatAction(message);
  const ctx = await getJarvisChatContext(session.merchantId);

  try {
    // ── 지금 한 번 돌려 ──────────────────────────────────────────
    if (action.intent === "run_now" && action.confident) {
      const report = await runAutopilotForMerchant(session.merchantId);
      const created = report.stats.draftsCreated;
      const lines = [
        created > 0
          ? `방금 한 바퀴 돌렸습니다 — 새 상품 ${created}개를 준비했어요.`
          : "방금 한 바퀴 돌렸는데, 이번엔 기준을 통과한 새 상품이 없었습니다.",
      ];
      if (report.actions.length) {
        lines.push("", ...report.actions.slice(0, 4).map((a) => `· ${a}`));
      }
      return NextResponse.json({ reply: lines.join("\n"), did: "run_now" });
    }

    // ── 반품지 등록했어 → 다시 확인 ──────────────────────────────
    if (action.intent === "sync_return_locations" && action.confident) {
      const result = await syncReturnLocationsForMerchant(session.merchantId);
      if (result.error) {
        return NextResponse.json({
          reply: `반품지 목록을 못 읽었습니다 — ${result.error}\n토스 API 연동을 먼저 확인해 주세요.`,
          did: "sync_return_locations",
        });
      }
      const lines = [`토스에서 반품지 ${result.locationCount}곳을 확인했습니다.`];
      if (result.matched > 0) {
        lines.push(
          `그중 ${result.matched}곳이 기다리던 공급처와 연결됐어요 — 이제 그 상품들은 반품이 공급처로 바로 갑니다 (비용 0원).`,
        );
      }
      if (result.stillPending > 0) {
        lines.push(`아직 ${result.stillPending}곳이 남았습니다.`);
      } else {
        lines.push("남은 게 없습니다. 전부 연결됐어요.");
      }
      return NextResponse.json({ reply: lines.join("\n"), did: "sync_return_locations" });
    }

    // ── 송장 등록 ────────────────────────────────────────────────
    if (action.intent === "register_tracking") {
      if (!action.confident || !action.tracking) {
        return NextResponse.json({
          reply:
            "송장번호는 읽었는데 택배사가 안 보입니다. 택배사도 같이 알려주세요 — 예: 「1234567890 CJ대한통운」",
          did: "need_courier",
        });
      }
      const { job, ambiguous, candidateCount } = pickJobForTracking(ctx.jobs);
      if (!job) {
        return NextResponse.json({
          reply: "지금 송장을 기다리는 주문이 없습니다. 주문이 들어오면 알려드릴게요.",
          did: "no_pending_order",
        });
      }
      const updated = await confirmFulfillmentTracking({
        merchantId: session.merchantId,
        jobId: job.id,
        trackingNumber: action.tracking.trackingNumber,
        deliveryCompany: action.tracking.deliveryCompany,
      });
      const done = updated.status === "tracking_registered";
      const lines = [
        done
          ? `「${job.productName}」 송장 등록 완료했습니다 (${action.tracking.deliveryCompany} ${action.tracking.trackingNumber}). 고객에게 배송 조회가 열렸어요.`
          : `「${job.productName}」에 송장을 기록했습니다. 토스 등록은 다음 사이클에 자동으로 올라갑니다.`,
      ];
      if (ambiguous) {
        lines.push(
          "",
          `⚠️ 송장을 기다리는 주문이 ${candidateCount}건이라 가장 오래 기다린 것에 넣었습니다. 다른 주문이었다면 알려주세요.`,
        );
      }
      return NextResponse.json({ reply: lines.join("\n"), did: "register_tracking" });
    }

    // ── 발주 정보 줘 ─────────────────────────────────────────────
    if (action.intent === "supplier_order_info" && action.confident) {
      return NextResponse.json({
        reply: await getSupplierOrderBrief(session.merchantId),
        did: "supplier_order_info",
      });
    }

    // ── 발주했어 ─────────────────────────────────────────────────
    if (action.intent === "mark_ordered" && action.confident) {
      const r = await markWholesaleOrdered(session.merchantId);
      if (r.marked === 0) {
        return NextResponse.json({
          reply:
            "발주 대기로 잡혀 있는 주문이 없습니다. 이미 다 넘어갔거나, 아직 주문이 안 들어왔어요.",
          did: "mark_ordered",
        });
      }
      const lines = [
        `${r.marked}건 발주 완료로 넘겼습니다 — ${r.names.join(", ")}`,
        "공급처 송장 나오면 「1234567890 CJ대한통운」처럼 보내주세요. 토스 등록은 제가 합니다.",
      ];
      if (r.remaining > 0) {
        lines.push("", `아직 ${r.remaining}건 남았습니다. 「발주 정보 줘」 하시면 다음 걸 드릴게요.`);
      }
      return NextResponse.json({ reply: lines.join("\n"), did: "mark_ordered" });
    }

    // ── 반품지 주소 줘 ───────────────────────────────────────────
    if (action.intent === "return_addresses" && action.confident) {
      return NextResponse.json({
        reply: await getReturnAddressBrief(session.merchantId),
        did: "return_addresses",
      });
    }

    // ── 내 번호는 이거야 ─────────────────────────────────────────
    if (action.intent === "set_alert_phone" && action.confident && action.alertPhone) {
      await setOwnerAlertPhone(session.merchantId, action.alertPhone);
      const shown = action.alertPhone.replace(/^\+82/, "0");
      return NextResponse.json({
        reply:
          `알림 번호를 ${shown} 로 저장했습니다.\n` +
          "발주가 12시간, 송장이 6시간 넘게 밀리면 그때만 문자 드릴게요 — 그 외엔 안 보냅니다.",
        did: "set_alert_phone",
      });
    }

    // ── 상태 ─────────────────────────────────────────────────────
    if (action.intent === "status" && action.confident) {
      return NextResponse.json({ reply: renderStatusReply(ctx.status), did: "status" });
    }

    // ── 그 외 — 대화 ─────────────────────────────────────────────
    const reply = await answerAsJarvis({
      message,
      history: body.history ?? [],
      status: ctx.status,
    });
    return NextResponse.json({ reply, did: "talk" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "CHAT_FAIL";
    return NextResponse.json(
      { reply: `처리하다가 막혔습니다 — ${msg}`, did: "error" },
      { status: 200 },
    );
  }
}
