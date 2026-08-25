/**
 * 자비스의 인격 — 사장님의 직원처럼 말하고 판단한다
 *
 * ★ 왜 "친절한 AI 비서" 톤이 아닌가
 *
 * 사장님이 원하는 건 상냥한 챗봇이 아니라 **일 잘하는 직원**이다. 좋은 직원은
 * 모르는 걸 아는 척하지 않고, 나쁜 소식을 늦게 전하지 않고, 물어보면 근거를
 * 대며 답한다. 그래서 이 프롬프트는 공손함보다 정확성과 솔직함을 우선한다.
 *
 * ★ 숫자를 지어내지 못하게 막는 게 핵심
 *
 * LLM은 그럴듯한 숫자를 만들어내는 데 아주 능하다. 이 시스템 전체가
 * "추정을 사실처럼 쓰지 않는다"는 원칙 위에 서 있는데(certainty-gate,
 * market-scanner의 synthetic 판별 등), 대화창에서 자비스가 "이번 달 300만원
 * 예상됩니다" 같은 말을 지어내면 그 원칙이 무너진다. 그래서 실제 상태값을
 * 컨텍스트로 넣어주고, **그 안에 없는 숫자는 말하지 말라고** 강하게 지시한다.
 */

import type { JarvisStatusSummary } from "./jarvis-chat";
import { renderStatusReply } from "./jarvis-chat";

export const JARVIS_PERSONA_VERSION = "1.0";

function model(): string {
  return process.env.JARVIS_OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

const SYSTEM_PROMPT = `당신은 "자비스"입니다. 토스쇼핑에서 위탁판매를 하는 1인 사장님의 직원이자 비서입니다.
목표는 사장님이 월 순이익 1,000만원을 달성하게 만드는 것입니다.

말투:
- 사장님을 "사장님"이라고 부릅니다. 존댓말을 쓰되 과하게 굽신거리지 않습니다.
- 짧고 명확하게. 사족·인사말·"물론이죠!" 같은 추임새를 넣지 않습니다.
- 이모지는 쓰지 않습니다.

절대 규칙:
1. 아래 [현재 상태]에 없는 숫자를 절대 만들어내지 마세요. 매출·수익·상품 수·주문 수를
   추측해서 말하면 안 됩니다. 모르면 "그건 아직 데이터가 없습니다"라고 말하세요.
2. 하지 않은 일을 했다고 말하지 마세요. 당신은 이 대화에서 직접 실행할 수 없습니다 —
   실행·송장등록·반품지동기화는 사장님이 그렇게 말하면 시스템이 따로 처리합니다.
   그런 요청을 받으면 "그렇게 말씀해 주시면 바로 처리됩니다"라고 안내만 하세요.
3. 나쁜 소식을 숨기지 마세요. 막힌 게 있으면 먼저 말합니다.
4. 사장님이 물어보지 않은 조언을 길게 늘어놓지 마세요.

당신이 자동으로 하는 일: 시장 분석, 상품 소싱, 가격 결정, 상세페이지 제작,
토스 등록, 광고 손익분기 계산, 주문 감지, 발주 준비, 송장 등록.

사장님이 해야만 하는 일 (토스가 API를 막아둬서 코드로 못 하는 것):
- 반품지 주소를 토스 셀러센터에 등록하는 것 (등록하면 그 공급처는 영구 자동)
- 공급처에서 나온 송장번호를 알려주는 것
- 고객 CS 응대`;

export type AnswerInput = {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  status: JarvisStatusSummary;
};

/**
 * 대화로 답한다.
 *
 * OPENAI_API_KEY가 없으면 상태 요약으로 답한다 — 아무 말도 못 하는 것보다
 * 사실을 말해주는 게 낫고, 이 경로에서도 숫자를 지어내지 않는다.
 */
export async function answerAsJarvis(input: AnswerInput): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return [
      "지금은 자유 대화 기능이 꺼져 있습니다 (OPENAI_API_KEY 미설정).",
      "대신 이런 말은 바로 알아듣고 처리합니다:",
      "· 「지금 돌려」 — 즉시 한 바퀴 실행",
      "· 「상태 어때」 — 현재 상황 보고",
      "· 「반품지 등록했어」 — 토스에서 다시 확인해 연결",
      "· 「1234567890 CJ대한통운」 — 송장 등록",
      "",
      renderStatusReply(input.status),
    ].join("\n");
  }

  const statusBlock = [
    `자비스 가동: ${input.status.running ? "돌고 있음" : "멈춤"}`,
    `등록된 상품: ${input.status.publishedCount}개`,
    `승인 대기 초안: ${input.status.pendingReviewCount}개`,
    `진행 중인 주문: ${input.status.activeOrders}건`,
    `송장 대기: ${input.status.awaitingTracking}건`,
    `반품지 등록 대기: ${input.status.pendingReturnAddresses}곳`,
    `이번 달 실제 순익: ${input.status.monthlyNetKrw.toLocaleString()}원 (목표 ${input.status.goalKrw.toLocaleString()}원)`,
    input.status.todos.length
      ? `사장님 할 일: ${input.status.todos.join(" / ")}`
      : "사장님 할 일: 없음",
  ].join("\n");

  const messages = [
    { role: "system" as const, content: `${SYSTEM_PROMPT}\n\n[현재 상태]\n${statusBlock}` },
    // 최근 대화만 넘긴다 — 오래된 맥락이 지금 상태와 충돌하면 헛말이 나온다
    ...input.history.slice(-8),
    { role: "user" as const, content: input.message },
  ];

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model(),
        messages,
        temperature: 0.3,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      return `대화 기능이 잠깐 막혔습니다 (${res.status}).\n\n${renderStatusReply(input.status)}`;
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content?.trim();
    return text || renderStatusReply(input.status);
  } catch {
    return `대화 기능에 연결하지 못했습니다.\n\n${renderStatusReply(input.status)}`;
  }
}
