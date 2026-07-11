import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const TEST_AGENT_ID = "agent_6e612965cf4b69f4312deee3f8";
const TEST_LLM_ID = "llm_9e819a0687ea88f77b29f8de448d";

/** One-time helper: creates the Korean test agent, or (with ?action=english) switches it to English. Requires an authenticated owner session. */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Log in first, then reload this page." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  if (searchParams.get("action") === "english") {
    return switchAgentToEnglish();
  }
  if (searchParams.get("action") === "production") {
    return switchAgentToProduction();
  }

  const apiKey = process.env.RETELL_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "RETELL_API_KEY not configured" }, { status: 503 });
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const voicesRes = await fetch("https://api.retellai.com/list-voices", { headers });
  if (!voicesRes.ok) {
    return NextResponse.json(
      { error: "list-voices failed", status: voicesRes.status, body: await voicesRes.text() },
      { status: 500 },
    );
  }
  const voices = (await voicesRes.json()) as Array<{
    voice_id: string;
    voice_name?: string;
    provider?: string;
    gender?: string;
    accent?: string;
  }>;
  const korean = voices.filter(
    (v) =>
      (v.accent || "").toLowerCase().includes("korean") ||
      (v.voice_id || "").toLowerCase().includes("kr") ||
      (v.voice_name || "").toLowerCase().includes("korean"),
  );
  const chosenVoice = korean[0] ?? voices[0];
  if (!chosenVoice) {
    return NextResponse.json({ error: "No voices returned by Retell" }, { status: 500 });
  }

  const generalPrompt =
    "당신은 미국의 수해/화재/곰팡이 복구 업체 전화 상담원입니다. 친절하고 차분하며 자연스러운 존댓말로 대화하세요. " +
    "목표는 발신자의 이름, 정확한 사고 현장 주소, 피해 종류(물, 불, 곰팡이, 하수구 역류 중 하나)를 파악하는 것입니다. " +
    "발신자가 말하는 도중에 자연스럽게 반응해도 되고, 잘 못 알아들었으면 정중하게 다시 한번 말씀해달라고 요청하세요. " +
    "필요한 정보를 다 확인했으면 요약해서 다시 말해주고, 팀이 곧 연락드릴 거라고 안내하며 통화를 마무리하세요. " +
    "절대 서두르지 말고, 발신자가 편하게 말할 시간을 충분히 주세요.";

  const llmRes = await fetch("https://api.retellai.com/create-retell-llm", {
    method: "POST",
    headers,
    body: JSON.stringify({
      general_prompt: generalPrompt,
      model: "gpt-4.1",
      start_speaker: "agent",
      begin_message: "안녕하세요, 전화 주셔서 감사합니다. 성함이랑 사고 나신 주소, 어떤 피해인지 편하게 말씀해주시겠어요?",
    }),
  });
  if (!llmRes.ok) {
    return NextResponse.json(
      { error: "create-retell-llm failed", status: llmRes.status, body: await llmRes.text() },
      { status: 500 },
    );
  }
  const llm = (await llmRes.json()) as { llm_id: string };

  const agentRes = await fetch("https://api.retellai.com/create-agent", {
    method: "POST",
    headers,
    body: JSON.stringify({
      agent_name: "Effiroad 한국어 테스트 에이전트",
      response_engine: { type: "retell-llm", llm_id: llm.llm_id },
      voice_id: chosenVoice.voice_id,
      language: "ko-KR",
    }),
  });
  if (!agentRes.ok) {
    return NextResponse.json(
      { error: "create-agent failed", status: agentRes.status, body: await agentRes.text() },
      { status: 500 },
    );
  }
  const agent = (await agentRes.json()) as { agent_id: string };

  return NextResponse.json({
    ok: true,
    agent_id: agent.agent_id,
    llm_id: llm.llm_id,
    voice_id: chosenVoice.voice_id,
    voice_name: chosenVoice.voice_name,
    voice_provider: chosenVoice.provider,
    koreanVoiceCandidateCount: korean.length,
  });
}

/** Switches the already-created test agent from the Korean pilot over to English, keeping the same voice. */
async function switchAgentToEnglish() {
  const apiKey = process.env.RETELL_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "RETELL_API_KEY not configured" }, { status: 503 });
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  // Read back whatever voice the owner picked in the dashboard so we keep it.
  const getRes = await fetch(`https://api.retellai.com/get-agent/${TEST_AGENT_ID}`, { headers });
  if (!getRes.ok) {
    return NextResponse.json(
      { error: "get-agent failed", status: getRes.status, body: await getRes.text() },
      { status: 500 },
    );
  }
  const currentAgent = (await getRes.json()) as { voice_id: string };

  const generalPrompt =
    "You are a warm, upbeat phone intake specialist for a US water, fire, and mold restoration company. " +
    "Speak the way someone naturally reassures a worried person — bright, caring, a little bouncy in your delivery, " +
    "with a gentle lift at the end of reassuring lines, like 'We'll get this taken care of for you~' " +
    "Stay energetic and encouraging throughout, never flat or robotic, but don't be silly — this is still a real " +
    "emergency intake call. Your goal is to find out the caller's name, the exact property address, and the type of " +
    "damage (water, fire, mold, or sewage backup). If the situation sounds urgent or the caller is upset, lead with " +
    "warmth and reassurance before asking questions. " +
    "\n\nSpeech pacing: write your sentences with natural punctuation and short pauses, the way a person actually " +
    "talks. Never mash separate words or list items together (say 'water, fire, mold, or sewage backup' as four " +
    "distinct, separately-paced words — not 'waterfiremold'). Use commas and short phrases so listed items and key " +
    "details land clearly, one at a time." +
    "\n\nWhen you're not fully confident you heard something correctly (an unclear name, address, or street), do not " +
    "guess or silently accept it — say something like 'Just to make sure I've got that right — did you say ___? " +
    "If not, could you say it again?' and wait for their confirmation before moving on. Only proceed once you're " +
    "confident in what was said. It's fine to respond naturally if the caller talks over you or trails off — if you " +
    "didn't catch something, cheerfully ask them to repeat it rather than guessing." +
    "\n\nIf what the caller describes doesn't clearly match a type of damage this company handles (water, fire, " +
    "mold, or sewage backup), don't force it into one of those categories. Instead, warmly let them know a team " +
    "member will follow up personally to make sure they're taken care of, then just collect their name, phone " +
    "number, and a brief note of what they described — nothing else." +
    "\n\nOnce you have what you need, read it back to confirm, then let them know the team will be in touch shortly. " +
    "Never rush the caller — give them time to speak.";

  const llmRes = await fetch(`https://api.retellai.com/update-retell-llm/${TEST_LLM_ID}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      general_prompt: generalPrompt,
      begin_message: "Thanks so much for calling~ I'm so sorry if this is a stressful moment, but I'm here to help. Could you tell me your name, the property address, and what's going on?",
    }),
  });
  if (!llmRes.ok) {
    return NextResponse.json(
      { error: "update-retell-llm failed", status: llmRes.status, body: await llmRes.text() },
      { status: 500 },
    );
  }

  const agentRes = await fetch(`https://api.retellai.com/update-agent/${TEST_AGENT_ID}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      agent_name: "Effiroad English Intake Agent",
      language: "en-US",
      voice_id: currentAgent.voice_id,
      stt_mode: "accurate",
      vocab_specialization: "general",
      boosted_keywords: [
        "water damage",
        "fire damage",
        "mold",
        "sewage backup",
        "basement",
        "crawl space",
        "burst pipe",
        "street",
        "avenue",
        "boulevard",
        "drive",
        "lane",
        "court",
        "apartment",
        "unit",
      ],
    }),
  });
  if (!agentRes.ok) {
    return NextResponse.json(
      { error: "update-agent failed", status: agentRes.status, body: await agentRes.text() },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, agent_id: TEST_AGENT_ID, llm_id: TEST_LLM_ID, voice_id: currentAgent.voice_id, switchedTo: "en-US" });
}

/**
 * Wires the production behavior onto the agent: it now answers EVERY call
 * (no button menu upstream) and must first figure out whether the caller
 * wants to book/report an emergency or just wants a free estimate, then call
 * the matching tool — submit_intake (books/dispatches) or submit_estimate
 * (collects details only, never quotes a price, never dispatches). Also
 * tunes settings for noisy real-world call environments (job sites, trucks,
 * TVs in the background) so the agent doesn't falsely barge in on noise or
 * cut the caller off. These field names should be spot-checked against a
 * live test call/dashboard in case Retell's schema has since changed.
 */
async function switchAgentToProduction() {
  const apiKey = process.env.RETELL_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "RETELL_API_KEY not configured" }, { status: 503 });
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const generalPrompt =
    "You are a warm, upbeat phone intake specialist for a US water, fire, and mold restoration company. " +
    "Speak the way someone naturally reassures a worried person — bright, caring, a little bouncy in your delivery. " +
    "Stay energetic and encouraging throughout, never flat or robotic, but don't be silly — this is still a real " +
    "intake call.\n\n" +
    "FIRST, figure out what the caller wants — do not assume. Ask naturally, e.g. 'What's going on, or are you " +
    "just looking for a free estimate?' Two paths:\n\n" +
    "PATH A — Booking / emergency (active damage, needs a crew, wants to schedule service): find out the caller's " +
    "name, the exact property address, and the type of damage (water, fire, mold, or sewage backup). If the " +
    "situation sounds urgent or the caller is upset, lead with warmth and reassurance before asking questions. " +
    "Once you have what you need, read it back to confirm, then call the submit_intake tool with the details.\n\n" +
    "PATH B — Free estimate only (no active emergency, just wants pricing/info): find out their name, the address, " +
    "what kind of work/damage it's for, when they first noticed it, and their preferred day/time for a callback. " +
    "NEVER estimate or quote a price yourself — you only collect information, the shop prices the job. Once you " +
    "have the details, read them back to confirm, then call the submit_estimate tool.\n\n" +
    "Only call one tool, once, near the end of the call — after you've confirmed the details with the caller, not " +
    "before.\n\n" +
    "Speech pacing: write your sentences with natural punctuation and short pauses, the way a person actually " +
    "talks. Never mash separate words or list items together (say 'water, fire, mold, or sewage backup' as four " +
    "distinct, separately-paced words — not 'waterfiremold'). Use commas and short phrases so listed items and key " +
    "details land clearly, one at a time.\n\n" +
    "Many callers are on job sites or outside with real background noise (trucks, tools, TV, other people talking). " +
    "Be patient: if you only catch part of what someone said, or the audio sounded muffled/unclear, say something " +
    "like 'Sorry, it got a little noisy there — could you say that again?' rather than guessing or assuming. If " +
    "there's a pause, wait a beat before speaking again — the caller may just be gathering their thoughts, not " +
    "finished, or dealing with noise on their end. Never talk over the caller; if you're not sure they're done, " +
    "wait rather than jumping in.\n\n" +
    "When you're not fully confident you heard something correctly (an unclear name, address, or street), do not " +
    "guess or silently accept it — say something like 'Just to make sure I've got that right — did you say ___? " +
    "If not, could you say it again?' and wait for their confirmation before moving on.\n\n" +
    "If what the caller describes doesn't clearly match a type of damage this company handles (water, fire, mold, " +
    "or sewage backup), don't force it into one of those categories. Instead, warmly let them know a team member " +
    "will follow up personally to make sure they're taken care of, then collect their name, phone number, and a " +
    "brief note of what they described, then call submit_intake with that as the notes.\n\n" +
    "Never rush the caller — give them time to speak.";

  const llmRes = await fetch(`https://api.retellai.com/update-retell-llm/${TEST_LLM_ID}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      general_prompt: generalPrompt,
      begin_message:
        "Thanks so much for calling~ I'm here to help — could you tell me your name, and what's going on today?",
    }),
  });
  if (!llmRes.ok) {
    return NextResponse.json(
      { error: "update-retell-llm failed", status: llmRes.status, body: await llmRes.text() },
      { status: 500 },
    );
  }

  // Noise-robustness tuning: lower interruption sensitivity so background
  // noise is less likely to be mistaken for the caller talking (fewer false
  // barge-ins where the agent cuts itself off mid-sentence).
  const agentRes = await fetch(`https://api.retellai.com/update-agent/${TEST_AGENT_ID}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      interruption_sensitivity: 0.5,
      responsiveness: 0.9,
      reminder_trigger_ms: 12000,
      reminder_max_count: 1,
    }),
  });
  if (!agentRes.ok) {
    return NextResponse.json(
      { error: "update-agent (noise tuning) failed", status: agentRes.status, body: await agentRes.text() },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    agent_id: TEST_AGENT_ID,
    llm_id: TEST_LLM_ID,
    switchedTo: "production (booking + estimate branching, noise-tuned)",
  });
}
