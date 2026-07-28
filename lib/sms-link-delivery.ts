import { buildSmsWithLink } from "./sms-templates";
import { sendSms, type SmsSendOptions, type SmsSendResult } from "./send-sms";

export { buildSmsWithLink } from "./sms-templates";

export async function sendSmsMessages(
  phone: string,
  messages: string[],
  label: string,
  options: SmsSendOptions = {},
): Promise<SmsSendResult> {
  for (const body of messages) {
    const result = await sendSms(phone, body, label, options);
    if (!result.ok) return result;
  }
  return { ok: true };
}

export async function sendSmsWithSafeLink(
  phone: string,
  intro: string,
  url: string,
  label: string,
  options: SmsSendOptions = {},
  optOut = true,
): Promise<SmsSendResult> {
  return sendSmsMessages(phone, buildSmsWithLink(intro, url, optOut), label, options);
}
