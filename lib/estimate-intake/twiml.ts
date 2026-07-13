import {
  twimlGatherPhoneNumber,
  twimlGatherSpeechField,
  twimlResponse,
  twimlSay,
} from "../twilio-xml";
import { buildTwilioCallbackUrl } from "../twilio-callback-url";
import type { EstimateState } from "./types";

function smsFirstName(fullName?: string): string {
  const first = fullName?.trim().split(/\s+/)[0];
  return first && first.length >= 2 ? first : "there";
}

function estimateUrl(callSid: string, extra?: Record<string, string>): string {
  return buildTwilioCallbackUrl("/api/twilio/estimate", { callSid, ...extra });
}

const RETRY_PREFIX = "I'm sorry about that — could you say that one more time? ";

/** Builds the spoken question for the current phase. Prepends a warm apology when this
 * is a retry (the previous answer for this same phase came back blank). */
function questionPrompt(state: EstimateState): string {
  const first = smsFirstName(state.answers.name);
  const retry = state.attempt > 1;
  const prefix = retry ? RETRY_PREFIX : "";

  if (state.phase === "ask_name") {
    if (retry) return `${prefix}Could I get your name, please?`;
    return state.channel === "link"
      ? "I'll text you a quick estimate form to fill out — could I get your name, please?"
      : "Wonderful — let's get your estimate request started. Could I get your name, please?";
  }
  if (state.phase === "ask_phone") {
    return retry
      ? `${prefix}What's the best callback number for you?`
      : `Thank you, ${first}! And what's the best callback number for you?`;
  }
  if (state.phase === "ask_address") {
    return `${prefix}What's the address of the property?`;
  }
  if (state.phase === "ask_damage_type") {
    return `${prefix}What type of damage are we looking at? For example, water, fire, mold, or something else?`;
  }
  if (state.phase === "ask_noticed_when") {
    return `${prefix}When did you first notice this?`;
  }
  if (state.phase === "ask_preferred_time") {
    return retry
      ? `${prefix}What's a good day and time for us to come take a look?`
      : "And last question — what's a good day and time for us to come take a look?";
  }
  return "Thank you!";
}

/** Renders the TwiML for whatever phase the estimate session is currently on. */
export function twimlForEstimateState(state: EstimateState): string {
  if (state.phase === "done") {
    return twimlResponse(twimlSay("One moment please."));
  }

  const url = estimateUrl(state.callSid);
  const prompt = questionPrompt(state);

  if (state.phase === "ask_phone") {
    return twimlResponse(twimlGatherPhoneNumber(url, prompt));
  }
  return twimlResponse(
    twimlGatherSpeechField(url, prompt, undefined, phaseSpeechHints(state.phase)),
  );
}

/** Question-specific words that make the phone speech recognizer far more
 *  reliable on the answers that get garbled most (damage types, addresses,
 *  day/time). Empty for open-ended fields like the caller's name. */
function phaseSpeechHints(phase: EstimateState["phase"]): string | undefined {
  if (phase === "ask_damage_type") {
    return "water, water damage, fire, fire damage, smoke, soot, mold, mildew, sewage, sewage backup, flood, flooding, storm, leak, burst pipe, roof leak, basement, crawl space, no heat, no cooling, air conditioning";
  }
  if (phase === "ask_address") {
    return "street, avenue, boulevard, drive, lane, road, court, place, way, apartment, unit, suite, north, south, east, west";
  }
  if (phase === "ask_noticed_when") {
    return "today, yesterday, this morning, last night, this week, last week, a few days ago, just now, over the weekend";
  }
  if (phase === "ask_preferred_time") {
    return "today, tomorrow, morning, afternoon, evening, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday, as soon as possible, anytime";
  }
  return undefined;
}

export function twimlEstimateLinkGoodbye(name?: string): string {
  const first = smsFirstName(name);
  return twimlResponse(
    twimlSay(
      `Perfect, ${first}! I've just sent the estimate form to your phone. ` +
        `We'll follow up as soon as we've had a chance to review it. Have a wonderful day!`,
    ),
  );
}

export function twimlEstimateLinkFailedGoodbye(): string {
  return twimlResponse(
    twimlSay(
      "I'm so sorry — that text didn't go through on our end. " +
        "Please give us a call back and we'll be glad to get your estimate started another way. Take care!",
    ),
  );
}

export function twimlEstimatePhoneGoodbye(name?: string): string {
  const first = smsFirstName(name);
  return twimlResponse(
    twimlSay(
      `Thank you so much, ${first}! We've got everything we need, and our team will be in touch ` +
        `shortly to schedule your estimate. Take care, and have a wonderful day!`,
    ),
  );
}
