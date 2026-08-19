/**
 * Giu pickup SMS — Korea (+82) via Twilio.
 * Set GIU_TWILIO_FROM (e.g. Twilio number with VN geo enabled).
 */
export async function sendGiuPickupSms(
  phoneRaw: string,
  body: string,
): Promise<{ ok: boolean; skipped?: boolean }> {
  const phone = normalizeVnPhone(phoneRaw);
  if (!phone) {
    console.warn("[giu-sms] invalid phone", phoneRaw);
    return { ok: false };
  }

  if (process.env.NODE_ENV !== "production" && isGiuSmsPreview()) {
    console.info(`[giu-sms] preview → ${phone}: ${body}`);
    return { ok: true, skipped: true };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from =
    process.env.GIU_TWILIO_FROM?.trim() || process.env.TWILIO_PHONE_NUMBER?.trim();

  if (!sid || !token || !from) {
    console.info(`[giu-sms] no Twilio config — log only → ${phone}: ${body}`);
    return { ok: true, skipped: true };
  }

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(sid, token);
    await client.messages.create({ body, from, to: phone });
    return { ok: true };
  } catch (e) {
    console.warn("[giu-sms] send failed", e);
    return { ok: false };
  }
}

export async function notifyPickupCode(input: {
  phone: string;
  code: string;
  merchantName: string;
  totalVnd: number;
  pickupWindow: string;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const amount = new Intl.NumberFormat("ko-KR").format(input.totalVnd);
  const body =
    `[Giu] 결제 완료 · 앱에서 픽업 QR을 보여주세요\n` +
    `${input.merchantName} · ${amount}원\n` +
    `픽업: ${input.pickupWindow}\n` +
    `giucuu.com`;
  return sendGiuPickupSms(input.phone, body);
}

export async function notifyMerchantNewOrder(input: {
  phone: string;
  customerName: string;
  boxTitle: string;
  totalVnd: number;
  quantity: number;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const amount = new Intl.NumberFormat("ko-KR").format(input.totalVnd);
  const body =
    `[지우쿠] 새 주문이 왔어요 · ${input.customerName} 손님\n` +
    `${input.boxTitle} · ${input.quantity}개 · ${amount}원\n` +
    `가게 앱에서 픽업을 확인해 주세요\n` +
    `giucuu.com/cua-hang/panel`;
  return sendGiuPickupSms(input.phone, body);
}

export async function notifyCustomerPickupReminder(input: {
  phone: string;
  merchantName: string;
  kind: "70" | "30";
  link: string;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const body =
    input.kind === "70"
      ? `[지우쿠] ${input.merchantName} 픽업이 1시간 10분 뒤 마감돼요.\n` +
        `못 가실 것 같으면 아래에서 연장 요청이나 환불을 눌러 주세요\n` +
        input.link
      : `[지우쿠] ${input.merchantName} 픽업 마감 30분 전이에요.\n` +
        `늦으실 것 같으면 지금 연장 요청을 보내 주세요 (가게 승인 필요)\n` +
        input.link;
  return sendGiuPickupSms(input.phone, body);
}

export async function notifyMerchantExtensionRequest(input: {
  phone: string;
  customerName: string;
  link: string;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const body =
    `[지우쿠] ${input.customerName} 손님이 픽업 연장을 요청했어요.\n` +
    `가게 앱에서 내용 확인 후 승인·거절해 주세요\n` +
    input.link;
  return sendGiuPickupSms(input.phone, body);
}

export async function notifyMerchantExtensionPing(input: {
  phone: string;
  customerName: string;
  link: string;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const body =
    `[지우쿠] ${input.customerName} 손님 연장 요청이 아직 대기 중이에요.\n` +
    `잠시 확인 부탁드려요\n` +
    input.link;
  return sendGiuPickupSms(input.phone, body);
}

export async function notifyCustomerExtensionApproved(input: {
  phone: string;
  merchantName: string;
  when: string;
  link: string;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const body =
    `[지우쿠] ${input.merchantName}에서 연장을 승인해 주셨어요.\n` +
    `약속 시간: ${input.when}\n` +
    `QR로 픽업해 주세요\n` +
    input.link;
  return sendGiuPickupSms(input.phone, body);
}

export async function notifyCustomerExtensionRejected(input: {
  phone: string;
  merchantName: string;
  link: string;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const body =
    `[지우쿠] ${input.merchantName}에서 연장이 어렵다고 답변하셨어요.\n` +
    `앱 채팅으로 시간을 조율하거나 환불 요청을 눌러 주세요\n` +
    input.link;
  return sendGiuPickupSms(input.phone, body);
}

function isGiuSmsPreview(): boolean {
  const v = process.env.GIU_SMS_PREVIEW?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function normalizeVnPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("82")) return `+${digits}`;
  if (digits.startsWith("010") || digits.startsWith("011")) return `+82${digits.slice(1)}`;
  if (digits.startsWith("84")) return `+${digits}`;
  if (digits.startsWith("0")) return `+82${digits.slice(1)}`;
  if (raw.trim().startsWith("+")) return raw.trim();
  return `+82${digits}`;
}
