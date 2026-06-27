import { buildLinkIntakeUrl, createLinkIntakeSession } from "./call-intake/link-intake-flow";
import { findCallLogByCallSid } from "./call-logs";
import { resolveShopDisplayName } from "./link-intake-brand";
import { smsMissedCallTextbackBody } from "./sms-templates";
import { sendSms } from "./send-sms";
import { shouldSendSmsOnce, markSmsSent } from "./sms-dedupe";
import { findUserById } from "./users-db";

const MISSED_STATUSES = new Set([
  "no-answer",
  "busy",
  "failed",
  "canceled",
  "cancelled",
]);

/** Send SMS link when inbound call ends without completed intake. */
export async function maybeSendMissedCallTextback(params: {
  userId: string;
  callSid: string;
  from: string;
  to: string;
  status: string;
  durationSec?: number;
}): Promise<boolean> {
  const status = params.status.toLowerCase();
  if (!MISSED_STATUSES.has(status)) return false;

  const existing = await findCallLogByCallSid(params.userId, params.callSid);
  if (existing?.verificationComplete) return false;

  const dedupeId = `missed-textback:${params.callSid}`;
  if (!(await shouldSendSmsOnce(params.userId, dedupeId))) return false;

  const customerPhone = params.from?.trim();
  if (!customerPhone || customerPhone.length < 8) return false;

  const user = await findUserById(params.userId);
  const shopName = resolveShopDisplayName(user?.shopName);

  const session = await createLinkIntakeSession({
    userId: params.userId,
    callSid: params.callSid,
    from: params.from,
    to: params.to,
    shopName,
    menuPriority: null,
  });

  const url = buildLinkIntakeUrl(session.token);
  const body = smsMissedCallTextbackBody({ shopName, url });

  const result = await sendSms(customerPhone, body, "missed-call-textback", {
    context: {
      userId: params.userId,
      operation: "missed_call_textback",
      callSid: params.callSid,
    },
  });

  if (result.ok) await markSmsSent(params.userId, dedupeId);
  return result.ok;
}
