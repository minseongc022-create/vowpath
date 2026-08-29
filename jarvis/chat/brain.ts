/**
 * 자비스의 머리 — 말을 알아듣고, 실제로 일을 하고, 사람처럼 답한다
 *
 * ★ 흐름
 *
 *   말 → (규칙 | LLM)으로 **무슨 일인지만** 고름 → 코드가 실행 → 결과로 답
 *
 * LLM은 두 군데에만 쓴다:
 *   · 어떤 일인지 고를 때 (규칙이 못 잡았을 때만)
 *   · 실행 **결과를** 자연스러운 말로 풀 때
 *
 * 실행 자체는 언제나 코드다. 그래서 LLM이 헛소리를 해도 실제로 벌어지는 일은
 * 항상 여기 적힌 것뿐이고, LLM이 죽어도(키 없음·타임아웃) 기능은 살아 있다.
 *
 * ★ 말만 하고 안 하는 걸 막는다
 *
 * 옛 구현의 가장 큰 불만이 "그렇게 말씀해 주시면 처리됩니다"라고 **안내만
 * 하고 끝나는 것**이었다. 사장님 입장에서는 시킨 일이 안 된 것이다.
 * 그래서 모든 답에는 `did`(실제로 한 일)가 붙고, 안 했으면 왜 못 했는지를 쓴다.
 */

import { openAiJsonCompletion } from "@/lib/openai-json";
import { openAiTextCompletion } from "@/lib/openai-chat";
import type { JarvisState } from "../core/types";
import { describeRules } from "../core/rules";
import { discardPendingDrafts } from "../core/store";
import { runCycle } from "../engine/autopilot";
import { planForGoal } from "../engine/goal";
import {
  parseIntent,
  readGoalKrw,
  INTENT_MENU,
  MIN_GOAL_KRW,
  MAX_GOAL_KRW,
  type Intent,
  type IntentName,
} from "./intents";

export const BRAIN_VERSION = "2.0";

export type BrainReply = {
  text: string;
  /** 실제로 한 일 — 말만 하고 안 한 걸 구분하기 위해 */
  did: IntentName;
  attachments?: import("../core/types").ChatTurn["attachments"];
};

// ─────────────────────────────────────────────────────────────
// 1단계: 무슨 일인지 고른다
// ─────────────────────────────────────────────────────────────

type LlmPick = { intent: string; goalKrw?: number };

function isLlmPick(v: unknown): v is LlmPick {
  return typeof v === "object" && v !== null && typeof (v as LlmPick).intent === "string";
}

async function decideIntent(message: string): Promise<Intent> {
  // 규칙이 확실히 잡으면 그걸 쓴다 — 되돌릴 수 없는 일은 LLM에 맡기지 않는다
  const byRule = parseIntent(message);
  if (byRule) return byRule;

  // 아무 말투나 알아듣는 건 LLM이 한다
  try {
    const picked = await openAiJsonCompletion<LlmPick>({
      system:
        "너는 한국 쇼핑몰 자동화 비서 '자비스'의 의도 분류기다. " +
        "사장님의 말을 읽고 아래 중 **하나**를 고른다. 확신이 없으면 반드시 talk을 고른다.\n\n" +
        INTENT_MENU.map((m) => `- ${m.name}: ${m.when}`).join("\n") +
        "\n\n⚠️ publish는 '지금 토스에 올려라'가 문장의 분명한 뜻일 때만 고른다. " +
        "조금이라도 애매하면 talk이다 — 잘못 고르면 사장님이 보지도 않은 상품이 팔린다.\n\n" +
        '{"intent": "...", "goalKrw": 숫자 또는 생략} 형태 JSON만 답한다.',
      user: message,
      temperature: 0,
      timeoutMs: 8_000,
      validate: isLlmPick,
    });

    const valid = INTENT_MENU.some((m) => m.name === picked.intent);
    if (!valid) return { name: "talk" };

    // LLM이 publish를 골라도 한 번 더 규칙으로 확인한다.
    // 되돌릴 수 없는 일은 두 갈래가 모두 동의할 때만 한다.
    if (picked.intent === "publish" && !parseIntent(message)) {
      return { name: "talk" };
    }

    return {
      name: picked.intent as IntentName,
      goalKrw: picked.goalKrw ?? readGoalKrw(message) ?? undefined,
    };
  } catch {
    // LLM이 죽어도 대화는 굴러가야 한다
    return { name: "talk" };
  }
}

// ─────────────────────────────────────────────────────────────
// 2단계: 실제로 한다
// ─────────────────────────────────────────────────────────────

export async function think(
  state: JarvisState,
  message: string,
): Promise<BrainReply> {
  const intent = await decideIntent(message);

  switch (intent.name) {
    case "source_now": {
      const result = await runCycle(state, { force: true, deadlineAt: Date.now() + 45_000 });
      if (result.draftsCreated > 0) {
        const lines = [
          `${result.draftsCreated}개 만들었습니다. 올리기 전에 한 번 봐주세요.`,
          "",
          ...result.actions.slice(1, 6).map((a) => `· ${a}`),
        ];
        return {
          text: lines.join("\n"),
          did: "source_now",
          attachments: [
            { kind: "drafts", draftIds: state.drafts.slice(0, result.draftsCreated).map((d) => d.id) },
          ],
        };
      }
      // 못 찾았으면 **왜인지**를 숫자로 말한다 — "없습니다"로 끝내지 않는다
      const run = result.sourcingRun;
      const lines = [result.idleReason ?? "이번엔 기준을 넘는 상품이 없었습니다."];
      if (run && Object.keys(run.rejections).length) {
        lines.push("", "어디서 걸렸는지:");
        for (const [why, n] of Object.entries(run.rejections).slice(0, 4)) {
          lines.push(`· ${why} — ${n}건`);
        }
        lines.push("", "기준을 낮추면 팔수록 손해라, 대신 검색 범위를 넓혀가며 계속 찾겠습니다.");
      }
      return {
        text: lines.join("\n"),
        did: "source_now",
        attachments: run ? [{ kind: "sourcing", run }] : undefined,
      };
    }

    case "status": {
      const pending = state.drafts.filter((d) => d.status === "pending_review").length;
      const published = state.drafts.filter((d) => d.status === "published").length;
      const goal = planForGoal({
        monthlyGoalKrw: state.settings.monthlyGoalKrw,
        publishedSkus: published,
      });

      const lines = [
        `검수 대기 ${pending}건 · 등록 완료 ${published}건`,
        `자동 운전 ${state.settings.autopilotEnabled ? "켜짐 (10분마다)" : "꺼짐"}`,
        "",
        goal.reason,
      ];
      if (state.lastSourcingRun) {
        lines.push("", `마지막 소싱: ${state.lastSourcingRun.summary}`);
      }
      return { text: lines.join("\n"), did: "status" };
    }

    case "show_drafts": {
      const pending = state.drafts.filter((d) => d.status === "pending_review");
      if (!pending.length) {
        return {
          text: "지금 검수 대기 중인 상품이 없습니다. 「상품 찾아줘」라고 하시면 바로 한 바퀴 돌리겠습니다.",
          did: "show_drafts",
        };
      }
      const lines = [
        `검수 대기 ${pending.length}건입니다.`,
        "",
        ...pending
          .slice(0, 8)
          .map(
            (d) =>
              `· ${d.candidate.title} — ${d.candidate.priceKrw.toLocaleString()}원 (개당 ${d.candidate.netProfitKrw.toLocaleString()}원 남음)`,
          ),
      ];
      return {
        text: lines.join("\n"),
        did: "show_drafts",
        attachments: [{ kind: "drafts", draftIds: pending.map((d) => d.id) }],
      };
    }

    case "show_detail": {
      const pending = state.drafts.filter((d) => d.status === "pending_review");
      const target = intent.keyword
        ? pending.find((d) => d.candidate.keyword.includes(intent.keyword!))
        : pending[0];
      if (!target) {
        return { text: "보여드릴 상세페이지가 아직 없습니다.", did: "show_detail" };
      }
      return {
        text: `「${target.candidate.title}」 상세페이지입니다.`,
        did: "show_detail",
        attachments: [{ kind: "detail", draftId: target.id }],
      };
    }

    case "discard_drafts": {
      const removed = discardPendingDrafts(state);
      return {
        text:
          removed > 0
            ? `${removed}건 비웠습니다. 이미 올라간 상품은 그대로 뒀습니다.`
            : "비울 초안이 없었습니다.",
        did: "discard_drafts",
      };
    }

    case "autopilot_on": {
      state.settings.autopilotEnabled = true;
      return {
        text: "자동 운전 켰습니다. 10분마다 도매를 훑어서 기준을 넘는 상품만 검수 대기로 올리겠습니다. 사장님은 마지막에 확인만 해주시면 됩니다.",
        did: "autopilot_on",
      };
    }

    case "autopilot_off": {
      state.settings.autopilotEnabled = false;
      return {
        text: "자동 운전 멈췄습니다. 이미 만들어 둔 초안은 그대로 있습니다. 다시 시작하시려면 「다시 해줘」라고 말씀해 주세요.",
        did: "autopilot_off",
      };
    }

    case "set_goal": {
      const goalKrw = intent.goalKrw ?? readGoalKrw(message);
      if (!goalKrw) {
        return {
          text: `목표 금액을 못 읽었습니다. ${(MIN_GOAL_KRW / 10_000).toLocaleString()}만원에서 ${(MAX_GOAL_KRW / 10_000).toLocaleString()}만원 사이로 말씀해 주세요 — 예: 「월 500만원」`,
          did: "talk",
        };
      }
      state.settings.monthlyGoalKrw = goalKrw;
      const published = state.drafts.filter((d) => d.status === "published").length;
      const plan = planForGoal({ monthlyGoalKrw: goalKrw, publishedSkus: published });
      return {
        text: `월 목표를 ${(goalKrw / 10_000).toLocaleString()}만원으로 잡았습니다.\n\n${plan.reason}`,
        did: "set_goal",
      };
    }

    case "explain_rules": {
      const lines = [
        "이런 기준으로 고릅니다:",
        "",
        ...describeRules().map((r) => `· ${r}`),
        "",
        "마진 하한과 가격 범위는 **손익분기선**이라 상품이 없다고 낮추지 않습니다 — 낮추면 팔수록 손해라서요. 대신 검색어와 도매 소스를 넓혀가며 찾습니다.",
      ];
      return { text: lines.join("\n"), did: "explain_rules" };
    }

    case "publish":
      // 실제 등록은 API 라우트가 한다 (토스 인증이 필요하다).
      // 여기서는 무엇이 올라갈지만 확인해 준다.
      return {
        text: `검수 화면에서 승인하시면 바로 올라갑니다. 지금 대기 중인 건 ${state.drafts.filter((d) => d.status === "pending_review").length}건입니다.`,
        did: "publish",
      };

    case "talk":
    default:
      return { text: await smallTalk(state, message), did: "talk" };
  }
}

// ─────────────────────────────────────────────────────────────
// 그냥 대화 — 사장님이 아무 말이나 해도 자연스럽게
// ─────────────────────────────────────────────────────────────

async function smallTalk(state: JarvisState, message: string): Promise<string> {
  const pending = state.drafts.filter((d) => d.status === "pending_review").length;
  const published = state.drafts.filter((d) => d.status === "published").length;

  try {
    return await openAiTextCompletion({
      messages: [
        {
          role: "system",
          content:
            "너는 '자비스'다. 한국에서 토스쇼핑 위탁판매(드랍십)를 대신 굴려주는 비서다. " +
            "사장님(사용자)에게 존댓말로, 짧고 담백하게 답한다. 이모지는 쓰지 않는다.\n\n" +
            "지금 상황: " +
            `검수 대기 ${pending}건, 등록 완료 ${published}건, ` +
            `월 목표 ${(state.settings.monthlyGoalKrw / 10_000).toLocaleString()}만원, ` +
            `자동 운전 ${state.settings.autopilotEnabled ? "켜짐" : "꺼짐"}.\n\n` +
            "네가 할 수 있는 일: 도매에서 상품 찾기, 상세페이지 만들기, 검수 대기에 올리기, " +
            "자동 운전 켜고 끄기, 월 목표 바꾸기, 소싱 기준 설명하기.\n\n" +
            "규칙:\n" +
            "- 확인되지 않은 숫자를 지어내지 않는다. 모르면 모른다고 한다.\n" +
            "- 실제로 하지 않은 일을 했다고 말하지 않는다.\n" +
            "- 사장님이 뭘 시키려는 것 같으면, 어떻게 말하면 되는지 한 줄로 알려준다.\n" +
            "- 3~4문장을 넘기지 않는다.",
        },
        { role: "user", content: message },
      ],
      temperature: 0.5,
      timeoutMs: 12_000,
    });
  } catch {
    // LLM이 없거나 죽어도 대화가 멈추면 안 된다
    return [
      "제가 할 수 있는 건 이렇습니다:",
      "· 「상품 찾아줘」 — 도매를 훑어 기준을 넘는 상품을 찾습니다",
      "· 「지금 어때?」 — 진행 상황을 알려드립니다",
      "· 「만든 거 보여줘」 — 검수 대기 중인 상품을 봅니다",
      "· 「월 500만원 목표」 — 목표를 바꾸면 소싱 속도가 따라옵니다",
      "· 「어떤 기준으로 골라?」 — 소싱 기준을 설명합니다",
    ].join("\n");
  }
}
