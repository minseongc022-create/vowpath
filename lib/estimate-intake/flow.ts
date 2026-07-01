import { resolveCallbackFromCallerId } from "../call-intake/caller-id";
import { normalizePhone } from "../parse-contact";
import type {
  EstimateAnswers,
  EstimateChannel,
  EstimateLinkPhase,
  EstimatePhase,
  EstimatePhonePhase,
  EstimateState,
} from "./types";

const LINK_PHASE_ORDER: EstimateLinkPhase[] = ["ask_name", "ask_phone"];
const PHONE_PHASE_ORDER: EstimatePhonePhase[] = [
  "ask_name",
  "ask_phone",
  "ask_address",
  "ask_damage_type",
  "ask_noticed_when",
  "ask_preferred_time",
];

function phaseOrderFor(channel: EstimateChannel): EstimatePhase[] {
  return channel === "link" ? LINK_PHASE_ORDER : PHONE_PHASE_ORDER;
}

export function newEstimateState(params: {
  callSid: string;
  userId: string;
  from: string;
  to: string;
  channel: EstimateChannel;
  afterHours?: boolean;
}): EstimateState {
  const order = phaseOrderFor(params.channel);
  return {
    callSid: params.callSid,
    userId: params.userId,
    from: params.from,
    to: params.to,
    channel: params.channel,
    phase: order[0],
    answers: {},
    afterHours: params.afterHours,
    attempt: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const ANSWER_KEY_BY_PHASE: Record<EstimatePhase, keyof EstimateAnswers | null> = {
  ask_name: "name",
  ask_phone: "callbackPhone",
  ask_address: "address",
  ask_damage_type: "damageType",
  ask_noticed_when: "noticedWhen",
  ask_preferred_time: "preferredTime",
  done: null,
};

export function isEstimateComplete(state: EstimateState): boolean {
  return state.phase === "done";
}

/**
 * Applies the caller's answer for the current phase, then advances to the next phase
 * in this channel's question sequence. The callback-number step always resolves (it
 * falls back to Twilio caller ID), so it can never block the flow. Every other step
 * gets one silent retry on a blank answer before moving on regardless — a stuck call
 * is worse than one missing field.
 */
export function applyEstimateAnswer(
  state: EstimateState,
  raw: { speech?: string; digits?: string | null },
): EstimateState {
  const key = ANSWER_KEY_BY_PHASE[state.phase];
  const answers = { ...state.answers };
  let answered = false;

  if (key === "callbackPhone") {
    const fromDigits = (raw.digits ?? "").replace(/\D/g, "");
    const candidateRaw = fromDigits.length >= 10 ? fromDigits : raw.speech ?? "";
    const candidate = normalizePhone(candidateRaw);
    answers.callbackPhone = candidate ?? resolveCallbackFromCallerId(state.from);
    answered = true;
  } else if (key) {
    const trimmed = raw.speech?.trim();
    if (trimmed) {
      answers[key] = trimmed;
      answered = true;
    }
  } else {
    answered = true;
  }

  if (!answered && state.attempt < 2) {
    return { ...state, attempt: state.attempt + 1 };
  }

  const order = phaseOrderFor(state.channel);
  const idx = order.indexOf(state.phase);
  const next = order[idx + 1];

  return {
    ...state,
    answers,
    phase: next ?? "done",
    attempt: 1,
  };
}
