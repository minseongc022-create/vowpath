/**
 * 자비스의 판단 — 사장님이 뭐라고 하든 맞는 행동을 고른다
 *
 * ★ 고치려는 문제
 *
 * "추가적은 소싱 해"라고 했더니 자비스가 "그렇게 말씀해 주시면 바로
 * 처리됩니다"라고만 답했다. 시킨 일이 안 된 것이다. 원인은 실행이 정규식에만
 * 걸려 있었고, LLM은 실행할 수 없다고 프롬프트에 박혀 있었기 때문이다.
 *
 * ★ 고치는 방법: 고르는 것과 하는 것을 분리한다
 *
 * LLM은 **어떤 행동인지만** 고른다(function calling). 실행은 서버 코드가
 * 한다. 그래서 LLM이 이상한 소리를 해도 실제로 벌어지는 일은 코드에 적힌
 * 것뿐이고, 동시에 말투는 아무래도 상관없어진다.
 *
 * ★ 위험한 행동은 LLM에게 주지 않는다
 *
 * 송장 등록은 이 목록에 없다. 송장번호를 한 자리 잘못 읽으면 고객 배송 조회가
 * 통째로 깨지는데, 그건 LLM이 아니라 정규식이 판단해야 하는 영역이다.
 * 여기 있는 건 전부 **틀려도 되돌릴 수 있는** 것들이다.
 */

import type { JarvisAction } from "./jarvis-actions";
import { readGoalKrw } from "./jarvis-actions";

export const JARVIS_PLANNER_VERSION = "1.0";

function model(): string {
  return process.env.JARVIS_OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

/**
 * LLM에게 주는 행동 목록.
 *
 * 설명문은 사장님이 실제로 쓸 법한 말을 그대로 적었다. 추상적으로 적으면
 * ("소싱 관련 요청") LLM이 애매한 말을 전부 여기로 밀어 넣는다.
 */
const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "run_now",
      description:
        "지금 한 바퀴 돌려서 상품을 만들고 토스에 올린다. '지금 돌려', '실행해', '상품 올려', '일해' 등.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "discover",
      description:
        "도매꾹·도매매를 새로 넓게 훑어 팔 만한 상품을 찾아온다. '소싱 해', '더 찾아봐', '싹 다 뒤져', '올릴 게 없다는데 더 찾아' 등. 올릴 상품이 없다는 말이 나온 뒤라면 대개 이것이다.",
      parameters: {
        type: "object",
        properties: {
          deep: {
            type: "boolean",
            description: "'싹 다', '전부', '더 넓게' 처럼 범위를 크게 요구하면 true",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "operate",
      description:
        "이미 올린 상품을 손본다. 안 팔리는 상품 가격을 내리고, 최저가에서도 안 팔리면 숨긴다. '안 팔리는 거 가격 내려', '상품 정리해', '운영 좀 해', '할인 걸어' 등.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "register_returns",
      description: "대기 중인 공급처 반품지를 토스에 직접 등록한다. '반품지 등록해줘' 등.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "status",
      description: "현재 상황 보고. '어떻게 돼가', '상태', '잘 되고 있어?' 등.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "supplier_order_info",
      description: "발주해야 할 주문의 배송지·수량 정보를 달라는 요청.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "mark_ordered",
      description: "도매처에 발주를 넣었다는 보고. '발주했어', '주문 넣었다' 등.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "return_addresses",
      description: "토스 셀러센터에 등록해야 할 반품지 주소 목록을 달라는 요청.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "sync_return_locations",
      description: "반품지를 등록했으니 토스에서 다시 읽어 확인하라는 요청.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "set_goal",
      description:
        "월 목표 순이익을 바꾼다. '월 천만원 벌게 해줘', '목표 700만원으로' 등. 금액이 분명할 때만.",
      parameters: {
        type: "object",
        properties: {
          goalKrw: { type: "number", description: "월 목표 순이익(원). 예: 10000000" },
        },
        required: ["goalKrw"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "test_alert",
      description: "문자 알림이 실제로 오는지 지금 한 통 보내본다.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "ack_alerts",
      description:
        "밀린 작업 알림을 봤다는 확인. '확인했어', '알림 그만', '봤어' 등. 반복 문자를 멈춘다.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

const PLANNER_SYSTEM = `사장님의 말에서 **지금 실행할 행동 하나**를 고르는 것이 당신의 유일한 일입니다.

판단 기준:
- 사장님이 뭔가를 시켰으면 반드시 도구를 호출하세요. "그렇게 말씀해 주시면 처리됩니다" 같은
  안내는 금지입니다 — 사장님은 이미 시켰습니다.
- 말투는 상관없습니다. "소싱 해", "더 찾아봐", "추가적은 소싱 해"는 전부 discover입니다.
- 시킨 게 아니라 순수한 질문·잡담이면 도구를 부르지 말고 그냥 답하세요.
- 확실하지 않으면 부르지 마세요. 잘못 실행하는 것보다 되묻는 게 낫습니다.

한 번에 하나만 고릅니다.`;

export type PlannedAction = {
  action: JarvisAction | null;
  /** 도구를 안 골랐을 때 LLM이 한 말 */
  say?: string;
};

/**
 * 사장님 말에서 실행할 행동을 고른다.
 *
 * 키가 없거나 실패하면 null을 돌려준다 — 그 경우 호출 쪽이 정규식 결과나
 * 일반 대화로 떨어진다. 여기서 막힌다고 대화가 죽으면 안 된다.
 */
export async function planJarvisAction(input: {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  statusBlock: string;
}): Promise<PlannedAction> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { action: null };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model(),
        messages: [
          { role: "system", content: `${PLANNER_SYSTEM}\n\n[현재 상태]\n${input.statusBlock}` },
          ...input.history.slice(-6),
          { role: "user", content: input.message },
        ],
        tools: TOOLS,
        tool_choice: "auto",
        temperature: 0,
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return { action: null };

    const json = (await res.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
          tool_calls?: Array<{ function?: { name?: string; arguments?: string } }>;
        };
      }>;
    };
    const msg = json.choices?.[0]?.message;
    const call = msg?.tool_calls?.[0]?.function;
    if (!call?.name) return { action: null, say: msg?.content?.trim() || undefined };

    let args: Record<string, unknown> = {};
    try {
      args = call.arguments ? (JSON.parse(call.arguments) as Record<string, unknown>) : {};
    } catch {
      args = {};
    }

    return { action: toAction(call.name, args, input.message) };
  } catch {
    return { action: null };
  }
}

/**
 * LLM이 고른 이름을 실제 행동으로 바꾼다.
 *
 * 모르는 이름은 버린다 — LLM이 없는 도구를 지어냈을 때 그걸 실행하려 들면
 * 안 된다. 금액도 LLM 값을 그대로 믿지 않고 사장님 원문에서 다시 읽어본다:
 * "700만원"을 700으로 넘기는 실수가 실제로 나오는데, 그러면 목표가 700원이 된다.
 */
function toAction(
  name: string,
  args: Record<string, unknown>,
  rawMessage: string,
): JarvisAction | null {
  switch (name) {
    case "run_now":
    case "status":
    case "supplier_order_info":
    case "mark_ordered":
    case "return_addresses":
    case "sync_return_locations":
    case "test_alert":
    case "ack_alerts":
    case "operate":
    case "register_returns":
      return { name };
    case "discover":
      return { name: "discover", deep: args.deep === true };
    case "set_goal": {
      // 원문에서 읽은 값을 우선한다. LLM의 숫자는 단위를 자주 놓친다.
      const fromText = readGoalKrw(rawMessage);
      const fromLlm = typeof args.goalKrw === "number" ? args.goalKrw : null;
      const goalKrw = fromText ?? fromLlm;
      if (!goalKrw) return null;
      return { name: "set_goal", goalKrw };
    }
    // add_return_location은 일부러 LLM 도구 목록에 없다. 우편번호를 한 자리
    // 잘못 읽으면 반품 택배가 다른 동네로 가고 되돌릴 수 없다 — 정규식이
    // 판단해야 하는 영역이다.
    default:
      return null;
  }
}
