/** Missed-call textback disabled — TCPA requires express consent before texting. */
export async function maybeSendMissedCallTextback(_params: {
  userId: string;
  callSid: string;
  from: string;
  to: string;
  status: string;
  durationSec?: number;
}): Promise<boolean> {
  console.info("[missed-call-textback] skipped — no SMS without caller opt-in (TCPA)");
  return false;
}
